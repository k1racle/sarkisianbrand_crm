import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../common/guards/roles.guard';
import { CrmController } from './crm.controller';
import { CrmDriveController } from './drive.controller';
import { Customer360Controller } from '../customer360/customer360.controller';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';

// Inspect actual decorated endpoints: a read grant must never authorize a write.
const controllers = [CrmController, CrmDriveController, Customer360Controller];
const endpoints = controllers.flatMap(controller => Object.getOwnPropertyNames(controller.prototype)
  .filter(name => name !== 'constructor' && Reflect.hasMetadata(METHOD_METADATA, controller.prototype[name]))
  .map(name => ({ controller, name, handler: controller.prototype[name], method: Reflect.getMetadata(METHOD_METADATA, controller.prototype[name]) })));
const reads = endpoints.filter(endpoint => (Reflect.getMetadata(PERMISSIONS_KEY, endpoint.handler) || []).every((key: string) => key.endsWith('.read')));
// Assignment pickers can be GET while intentionally requiring write access.
const writes = endpoints.filter(endpoint => !reads.includes(endpoint));

describe('Executive CRM read access (real endpoint metadata and RolesGuard, no network)', () => {
  let allowed: string[];
  let overrides: { effect: string; permission: { key: string } }[];
  const db: any = { user: { findUnique: jest.fn() }, rolePermission: { findMany: jest.fn() }, userPermission: { findMany: jest.fn() } };
  const guard = new RolesGuard(new Reflector(), db);
  const context = (endpoint: typeof endpoints[number], role = 'EXECUTIVE'): ExecutionContext => ({
    getClass: () => endpoint.controller, getHandler: () => endpoint.handler,
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'fixture-employee', role } }) }),
  } as ExecutionContext);
  beforeEach(() => {
    jest.resetAllMocks(); allowed = ['crm.read', 'customers.read']; overrides = [];
    db.user.findUnique.mockResolvedValue({ id: 'fixture-employee', role: 'EXECUTIVE', isActive: true, accessProfileMode: false });
    db.rolePermission.findMany.mockImplementation(({ where }) => Promise.resolve(allowed
      .filter(key => where.permission.key.in.includes(key)).map(key => ({ permission: { key } }))));
    db.userPermission.findMany.mockImplementation(({ where }) => Promise.resolve(overrides
      .filter(item => where.permission.key.in.includes(item.permission.key))));
  });

  it.each(reads)('$controller.name.$name allows confirmed read permission', async endpoint => {
    await expect(guard.canActivate(context(endpoint))).resolves.toBe(true);
    expect(db.rolePermission.findMany.mock.calls[0][0].where.role).toBe('EXECUTIVE');
  });
  it.each(writes)('$controller.name.$name rejects a read-only executive', async endpoint => {
    await expect(guard.canActivate(context(endpoint))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(reads)('$controller.name.$name respects DENY even with an ALLOW', async endpoint => {
    overrides = allowed.flatMap(key => [{ effect: 'ALLOW', permission: { key } }, { effect: 'DENY', permission: { key } }]);
    await expect(guard.canActivate(context(endpoint))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(reads)('$controller.name.$name rejects an ungranted executive', async endpoint => {
    allowed = [];
    await expect(guard.canActivate(context(endpoint))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['CUSTOMER_B2C', 'CUSTOMER_B2B', 'CONTENT_MANAGER', 'IT_SUPPORT'])('does not expand the CRM role boundary to %s', async role => {
    overrides = [{ effect: 'ALLOW', permission: { key: 'crm.read' } }];
    await expect(guard.canActivate(context(reads.find(endpoint => endpoint.name === 'dashboard')!, role))).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.rolePermission.findMany).not.toHaveBeenCalled();
  });
  it('keeps writing dependent on a separate explicit grant', async () => {
    allowed.push('crm.write');
    await expect(guard.canActivate(context(writes.find(endpoint => endpoint.name === 'createTask')!))).resolves.toBe(true);
    overrides = [{ effect: 'DENY', permission: { key: 'crm.write' } }];
    await expect(guard.canActivate(context(writes.find(endpoint => endpoint.name === 'createTask')!))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
