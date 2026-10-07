import { StaffGuard } from './staff.guard';
describe('staff chat boundary', () => {
 const context: any = { switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'actor', role: 'ADMIN' } }) }) };
 it('allows active employees with scoped access profiles', async () => {
   const guard = new StaffGuard({ user: { findUnique: async () => ({ role: 'MANAGER_SALES', isActive: true, accessProfileMode: true }) } } as any);
   await expect(guard.canActivate(context)).resolves.toBe(true);
 });
 it.each([{ role: 'CUSTOMER_B2C', isActive: true }, { role: 'SUPERVISOR', isActive: false }, null])('rejects current database identity %j despite old admin claims', async actor => {
   const guard = new StaffGuard({ user: { findUnique: async () => actor } } as any);
   await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403 });
 });
});
