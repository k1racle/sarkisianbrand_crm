import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BusinessContextMiddleware, businessMembership } from './business-context';

describe('Business organization request context (no network/database)', () => {
  const middleware = new BusinessContextMiddleware();
  const enter = <T>(organizationId: any, action: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    try { middleware.use({ headers: organizationId === undefined ? {} : { 'x-b2b-organization-id': organizationId } }, {}, () => action().then(resolve, reject)); }
    catch (error) { reject(error); }
  });
  it('accepts a single legacy membership but refuses to guess between organizations', async () => {
    const db: any = { organizationMember: { findMany: jest.fn().mockResolvedValue([{ organizationId: 'one' }]) } };
    expect((await businessMembership(db, 'user')).organizationId).toBe('one');
    db.organizationMember.findMany.mockResolvedValue([{ organizationId: 'one' }, { organizationId: 'two' }]);
    await expect(businessMembership(db, 'user')).rejects.toBeInstanceOf(ConflictException);
  });
  it('keeps simultaneous selected organizations isolated and enforces current user membership', async () => {
    const first = randomUUID(), second = randomUUID();
    const db: any = { organizationMember: { findMany: jest.fn(async ({ where }: any) => {
      expect(where).toMatchObject({ userId: 'user', isActive: true, user: { role: 'CUSTOMER_B2B', isActive: true } });
      await new Promise(resolve => setTimeout(resolve, where.organizationId === first ? 8 : 1));
      return [{ organizationId: where.organizationId }];
    }) } };
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => enter(index % 2 ? second : first, () => businessMembership(db, 'user'))));
    results.forEach((row, index) => expect(row.organizationId).toBe(index % 2 ? second : first));
    await businessMembership(db, 'user'); const calls = db.organizationMember.findMany.mock.calls; expect(calls[calls.length - 1][0].where).not.toHaveProperty('organizationId');
  });
  it('never falls back to another organization when a selection is foreign or access is revoked', async () => {
    const db: any = { organizationMember: { findMany: jest.fn().mockResolvedValue([]) } };
    await expect(enter(randomUUID(), () => businessMembership(db, 'user'))).rejects.toBeInstanceOf(NotFoundException);
    expect(db.organizationMember.findMany).toHaveBeenCalledTimes(1);
  });
  it.each(['', 'other-company', ['one', 'two']])('rejects malformed selection %j before a service runs', async value => {
    const work = jest.fn(); await expect(enter(value, work)).rejects.toBeInstanceOf(BadRequestException); expect(work).not.toHaveBeenCalled();
  });
});
