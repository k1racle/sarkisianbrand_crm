import { normalizeTaskPipeline, taskColumnLabels, CrmTaskPipelinesService } from './task-pipelines.service';

describe('Task pipeline settings', () => {
 it('rejects missing, blank, oversized and duplicate column labels', () => {
  for (const labels of [{}, { ...taskColumnLabels, TODO: ' ' }, { ...taskColumnLabels, TODO: 'x'.repeat(61) }, { ...taskColumnLabels, TODO: ' готово ' }]) {
   expect(() => normalizeTaskPipeline({ name: 'Отдел', labels })).toThrow();
  }
 });
 it('rejects stale settings without overwriting another editor', async () => {
  const db: any = { $executeRaw: jest.fn(), crmTaskPipeline: { findUnique: jest.fn().mockResolvedValue({ version: 2 }), update: jest.fn() } };
  db.$transaction = (fn: any) => fn(db);
  const access: any = { resolve: jest.fn().mockResolvedValue({ company: () => true }) };
  await expect(new CrmTaskPipelinesService(db, access).save('actor', { name: 'Отдел', labels: taskColumnLabels, expectedVersion: 1 }, 'pipeline')).rejects.toThrow('уже изменены');
  expect(db.crmTaskPipeline.update).not.toHaveBeenCalled();
 });
 it('does not broaden write scope because read access is company-wide', async () => {
  const db: any = { $executeRaw: jest.fn(), crmTaskPipeline: { create: jest.fn() } }; db.$transaction = (fn: any) => fn(db);
  const access: any = { resolve: jest.fn().mockResolvedValueOnce({ company: () => true }).mockResolvedValueOnce({ company: () => false }) };
  await expect(new CrmTaskPipelinesService(db, access).save('actor', { name: 'Отдел', labels: taskColumnLabels })).rejects.toThrow('всей компании');
  expect(db.crmTaskPipeline.create).not.toHaveBeenCalled();
 });
});
