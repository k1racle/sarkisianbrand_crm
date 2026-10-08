import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';

// Inspect every real controller, including future endpoints. No network or writes.
function controllers(dir: string): any[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? controllers(join(dir, entry.name))
    : entry.name.endsWith('.controller.ts') ? Object.values(require(join(dir, entry.name))) : []);
}
const reflector = new Reflector();
const endpoints = controllers(join(__dirname, '..')).filter(c => typeof c === 'function' && c.prototype)
  .flatMap(controller => Object.getOwnPropertyNames(controller.prototype).filter(name => name !== 'constructor').map(name => {
    const handler = controller.prototype[name];
    const meta = (key: string) => reflector.getAllAndOverride<any>(key, [handler, controller]);
    const guards = [...(Reflect.getMetadata(GUARDS_METADATA, controller) || []), ...(Reflect.getMetadata(GUARDS_METADATA, handler) || [])];
    return { controller, name, handler, roles: meta('roles') as string[] || [], permissions: meta(PERMISSIONS_KEY) as string[] || [], protected: guards.includes(RolesGuard) && Reflect.hasMetadata(METHOD_METADATA, handler) };
  })).filter(e => e.protected);

describe('Workspace permissions across all roles and protected endpoints', () => {
  it.each(endpoints)('$controller.name.$name declares explicit operations and roles', e => {
    expect(e.permissions.length).toBeGreaterThan(0);
    expect(e.roles.length).toBeGreaterThan(0);
    expect(e.permissions.every(key => /^[a-z_]+(?:\.[a-z_]+)+$/.test(key))).toBe(true);
  });

  it.each(Object.values(UserRole))('%s: legacy grants, DENY, profiles, empty profiles and blocked accounts', async role => {
    let grants: string[] = [], denied: string[] = [], profile = false, active = true;
    const db: any = {
      user: { findUnique: async () => ({ id: 'fixture', role, isActive: active, accessProfileMode: profile, departmentId: null }) },
      rolePermission: { findMany: async () => grants.map(key => ({ permission: { key } })) },
      userPermission: { findMany: async () => denied.map(key => ({ permission: { key }, effect: 'DENY' })) },
      crmAccessAssignment: { findMany: async () => [{ profileId: 'profile', profile: { archivedAt: null }, snapshot: { name: 'Test', grants: grants.map(permissionKey => ({ permissionKey, scope: 'COMPANY', departmentIds: [] })) } }] },
      crmDepartment: { findMany: async () => [] },
    };
    const guard = new RolesGuard(reflector, db);
    for (const endpoint of endpoints) {
      const ctx = { getClass: () => endpoint.controller, getHandler: () => endpoint.handler, switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'fixture', role } }) }) } as ExecutionContext;
      const attempt = async () => { try { return await guard.canActivate(ctx); } catch (e) { if ((e as any).status !== 403) throw e; return false; } };
      const eligible = endpoint.roles.includes(role);
      grants = endpoint.permissions; denied = []; profile = false; active = true;
      expect({ endpoint: endpoint.name, allowed: await attempt() }).toEqual({ endpoint: endpoint.name, allowed: eligible });
      // Every required operation can be individually revoked, even for ADMIN.
      for (const key of grants) { denied = [key]; expect(await attempt()).toBe(false); }
      denied = []; profile = true;
      expect(await attempt()).toBe(eligible);
      grants = []; expect(await attempt()).toBe(false);
      grants = endpoint.permissions; active = false; expect(await attempt()).toBe(false);
    }
  });
});
