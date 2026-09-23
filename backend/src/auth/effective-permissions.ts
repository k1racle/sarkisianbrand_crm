type RoleGrant = { permission: { key: string } };
type Override = RoleGrant & { effect: string };

/** Shared by HTTP authorization, /auth/access and the administrator's access review. */
export function effectivePermissions(roleGrants: RoleGrant[], overrides: Override[]) {
  const allowed = new Set(roleGrants.map(item => item.permission.key));
  const denied = new Set(overrides.filter(item => item.effect === 'DENY').map(item => item.permission.key));
  overrides.filter(item => item.effect === 'ALLOW').forEach(item => allowed.add(item.permission.key));
  return { permissions: [...allowed].filter(key => !denied.has(key)).sort(), denied: [...denied].sort() };
}
