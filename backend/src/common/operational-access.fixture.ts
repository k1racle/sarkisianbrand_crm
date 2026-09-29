// In-memory unit-test helpers. Never used by production services.
import { ForbiddenException } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from '../crm/read-access';

export const operationActor = { id: 'actor', role: 'IT_SUPPORT', isActive: true, departmentId: 'sales' };
export const operationDepartments = [{ id: 'sales', parentId: null, archivedAt: null }, { id: 'branch', parentId: 'sales', archivedAt: null }, { id: 'other', parentId: null, archivedAt: null }];
export function operationPolicy(id = 'actor', key = 'oms.read', scope = 'COMPANY', writeScope = 'COMPANY', denied: string[] = [], extras: Record<string, string> = {}) {
  const permissions = ['oms.read', 'oms.write', 'marketplace.read', 'marketplace.write', 'helpdesk.read', 'helpdesk.write', 'customers.read', 'customers.write'];
  const decisions = resolveProfileScopes({ ...operationActor, id }, permissions.map(permissionKey => {
    const selectedScope = extras[permissionKey] || (permissionKey.endsWith('.write') ? writeScope : scope);
    return { permissionKey, profileId: 'test-draft', profileName: 'Unit test only', scope: selectedScope, departmentIds: selectedScope === 'SELECTED_DEPARTMENTS' ? ['other'] : [] };
  }), operationDepartments, denied);
  return new CrmReadPolicy(id, decisions, key);
}
export function operationAccess(scope = 'COMPANY', writeScope = 'COMPANY', denied: string[] = [], extras: Record<string, string> = {}) {
  return { resolve: jest.fn(async (_db, id, key) => {
    if (!id || id === 'inactive') throw new ForbiddenException();
    return operationPolicy(id, key, scope, writeScope, denied, extras);
  }) } as any;
}
export function matchesOperation(row: any, where: any): boolean {
  if (where === undefined) return true;
  if (where === null || typeof where !== 'object' || where instanceof Date) return where == null ? row == null : row === where;
  const list = (v: any) => Array.isArray(v) ? v : [v];
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'AND') return list(value).every(v => matchesOperation(row, v));
    if (key === 'OR') return list(value).some(v => matchesOperation(row, v));
    if (key === 'NOT') return list(value).every(v => !matchesOperation(row, v));
    if (key === 'in') return value.includes(row);
    if (key === 'notIn') return !value.includes(row);
    if (key === 'not') return !matchesOperation(row, value);
    if (key === 'is') return row != null && matchesOperation(row, value);
    if (key === 'some') return (row || []).some(v => matchesOperation(v, value));
    if (key === 'contains') return String(row || '').toLowerCase().includes(value.toLowerCase());
    if (key === 'mode') return true;
    if (key === 'gte') return row >= value;
    if (key === 'lt') return row < value;
    return matchesOperation(row?.[key], value);
  });
}
export function projectOperation(row: any, select: any): any {
  if (row == null || !select) return row;
  return Object.fromEntries(Object.entries(select).filter(([,v]) => v).map(([key, value]: [string, any]) => [key, value === true ? row[key] : Array.isArray(row[key]) ? row[key].filter(v => matchesOperation(v, value.where)).slice(0, value.take).map(v => projectOperation(v, value.select)) : projectOperation(row[key], value.select)]));
}
