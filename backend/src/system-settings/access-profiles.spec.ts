import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyScopeGuard } from '../common/guards/company-scope.guard';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { AccessProfilesController } from './access-profiles.controller';
import { AccessProfilesService } from './access-profiles.service';
import { CreateAccessProfileDto, PreviewAccessProfilesDto, UpdateAccessProfileDto } from './dto/access-profile.dto';

const uuid = '8c60f023-20a7-45a0-aa87-c9d589970b22';
const valid = { name: 'Продажи', description: '', grants: [{ permissionKey: 'crm.read', scope: 'OWN', departmentIds: [] }] };
describe('Draft access profiles API boundary', () => {
  it('requires authenticated ADMIN and system.manage for every profile endpoint', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AccessProfilesController)).toEqual([JwtAuthGuard, RolesGuard, CompanyScopeGuard]);
    expect(Reflect.getMetadata('roles', AccessProfilesController)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AccessProfilesController)).toEqual(['system.manage']);
  });
  it.each([{ denied: [] }, { denied: [{ effect: 'DENY', permission: { key: 'system.manage' } }] }])('does not bypass permission checks for administrator', async ({ denied }) => {
    const db: any = { rolePermission: { findMany: jest.fn().mockResolvedValue(denied.length ? [{ permission: { key: 'system.manage' } }] : []) }, userPermission: { findMany: jest.fn().mockResolvedValue(denied) } };
    const guard = new RolesGuard(new Reflector(), db);
    await expect(guard.canActivate({ getHandler: () => AccessProfilesController.prototype.create, getClass: () => AccessProfilesController,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: uuid, role: 'ADMIN' } }) }) } as any)).rejects.toThrow('нет разрешения');
  });
  it.each(['MANAGER_SALES', 'EXECUTIVE', 'CUSTOMER_B2B'])('rejects %s even if it has a personal permission override', async role => {
    const db: any = { rolePermission: { findMany: jest.fn() }, userPermission: { findMany: jest.fn() } };
    const guard = new RolesGuard(new Reflector(), db);
    await expect(guard.canActivate({ getHandler: () => AccessProfilesController.prototype.preview, getClass: () => AccessProfilesController,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: uuid, role } }) }) } as any)).rejects.toThrow('Недостаточно прав');
    expect(db.rolePermission.findMany).not.toHaveBeenCalled();
  });
  it('does not expose assignment or activation endpoints before server-wide enforcement exists', () => {
    const methods = Object.getOwnPropertyNames(AccessProfilesController.prototype).filter(key => key !== 'constructor');
    expect(methods).toEqual(['catalog', 'list', 'preview', 'get', 'create', 'update', 'archive', 'restore']);
    for (const key of methods) expect(String(Reflect.getMetadata(PATH_METADATA, (AccessProfilesController.prototype as any)[key]))).not.toMatch(/assign|activate/);
  });
  it.each([
    { ...valid, name: '   ' }, { ...valid, name: 'x'.repeat(81) },
    { ...valid, grants: [{ ...valid.grants[0], scope: 'ALL_OR_NOTHING' }] },
    { ...valid, grants: [valid.grants[0], valid.grants[0]] },
    { ...valid, grants: [{ ...valid.grants[0], departmentIds: ['not-a-uuid'] }] },
    { ...valid, grants: [{ ...valid.grants[0], departmentIds: [uuid, uuid] }] },
  ])('rejects malformed profile DTO', async body => {
    expect((await validate(plainToInstance(CreateAccessProfileDto, body))).length).toBeGreaterThan(0);
  });
  it('accepts a zero-grant draft and never treats it as full access', async () => {
    expect(await validate(plainToInstance(CreateAccessProfileDto, { ...valid, grants: [] }))).toEqual([]);
  });
  it('requires version on updates and versioned profile references on preview', async () => {
    expect((await validate(plainToInstance(UpdateAccessProfileDto, valid))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(PreviewAccessProfilesDto, { employeeId: uuid, profiles: [{ id: uuid }] }))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(PreviewAccessProfilesDto, { employeeId: uuid, profiles: [{ id: uuid, version: 1 }] }))).toEqual([]);
  });
  it('converts duplicate normalized profile names to a recoverable conflict', async () => {
    const prisma: any = { $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }) };
    await expect(new AccessProfilesService(prisma).save(valid as any, uuid)).rejects.toThrow('таким названием');
  });
});
