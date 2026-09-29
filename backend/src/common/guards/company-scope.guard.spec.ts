import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { CrmReadAccess, CrmReadPolicy } from '../../crm/read-access';
import { resolveProfileScopes } from '../../auth/access-scope-policy';
import { COMPANY_SCOPE, CompanyScope, CompanyScopeGuard } from './company-scope.guard';
import { SystemSettingsController } from '../../system-settings/system-settings.controller';
import { AccessProfilesController } from '../../system-settings/access-profiles.controller';
import { AuditController } from '../../audit/audit.controller';
import { CrmController } from '../../crm/crm.controller';
import { MarketplacesController } from '../../marketplaces/marketplaces.controller';

describe('Company configuration boundary (unit, no DB)', () => {
  const actor = { id: 'actor', role: 'SUPERVISOR', isActive: true, departmentId: 'sales' };
  function fixture(scope = 'COMPANY', denied: string[] = []) {
    const policy = () => new CrmReadPolicy(actor.id, resolveProfileScopes(actor, ['crm.read', 'crm.write'].map(permissionKey => ({ permissionKey, profileId: 'test', profileName: 'Test', scope: permissionKey === 'crm.write' ? scope : 'COMPANY', departmentIds: permissionKey === 'crm.write' && scope === 'SELECTED_DEPARTMENTS' ? ['sales'] : [] })), [{ id: 'sales', parentId: null, archivedAt: null }], denied), 'crm.read');
    const db: any = { $transaction: jest.fn(fn => fn(db)) };
    const access: any = { resolve: jest.fn(async () => policy()) };
    return { guard: new CompanyScopeGuard(new Reflector(), db, access), db, access };
  }
  const context = (target: any, method: string, id: string | null = 'actor'): any => ({ getClass: () => target, getHandler: () => target.prototype[method], switchToHttp: () => ({ getRequest: () => ({ user: id ? { sub: id } : undefined }) }) });
  @CompanyScope('crm.read', 'crm.write') class Config { save() {} }
  class Records { read() {} }
  it('allows COMPANY but still resolves actual server permissions', async () => {
    const f = fixture(); expect(await f.guard.canActivate(context(Config, 'save'))).toBe(true);
    expect(f.access.resolve).toHaveBeenCalledWith(f.db, 'actor', 'crm.read');
    expect(f.db.$transaction.mock.calls[0][1].isolationLevel).toBe('RepeatableRead');
  });
  it.each(['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS'])('never upgrades %s writes to global settings', async scope => {
    await expect(fixture(scope).guard.canActivate(context(Config, 'save'))).rejects.toMatchObject({ status: 403 });
  });
  it('explicit DENY wins over company grant', async () => {
    await expect(fixture('COMPANY', ['crm.write']).guard.canActivate(context(Config, 'save'))).rejects.toMatchObject({ status: 403 });
  });
  it('missing actor is rejected by the real resolver before querying', async () => {
    const db: any = { $transaction: fn => fn(db) };
    await expect(new CompanyScopeGuard(new Reflector(), db, new CrmReadAccess()).canActivate(context(Config, 'save', null))).rejects.toMatchObject({ status: 403 });
  });
  it('does not replace record-level policies', async () => {
    const f = fixture('OWN'); expect(await f.guard.canActivate(context(Records, 'read'))).toBe(true);
    expect(f.access.resolve).not.toHaveBeenCalled();
  });
  it('protects settings, audit, pipelines, templates and marketplace integration routes', () => {
    expect(Reflect.getMetadata(COMPANY_SCOPE, SystemSettingsController)).toEqual(['system.manage']);
    expect(Reflect.getMetadata(COMPANY_SCOPE, AccessProfilesController)).toEqual(['system.manage']);
    expect(Reflect.getMetadata(COMPANY_SCOPE, AuditController)).toEqual(['security.audit.read']);
    for (const method of ['createPipeline', 'updatePipeline', 'archivePipeline', 'createStage', 'updateStage', 'deleteStage', 'reorderStages', 'createTaskTemplate', 'updateTaskTemplate', 'archiveTaskTemplate']) {
      expect(Reflect.getMetadata(COMPANY_SCOPE, CrmController.prototype[method])).toEqual(['crm.read', 'crm.write']);
    }
    expect(Reflect.getMetadata(COMPANY_SCOPE, MarketplacesController.prototype.saveIntegration)).toEqual(['marketplace.read', 'marketplace.configure']);
  });
});
