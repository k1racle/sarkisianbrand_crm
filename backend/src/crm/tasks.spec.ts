import { CrmService } from './crm.service';
describe('CRM task hierarchy and board', () => {
  let rows: any[], db: any, service: CrmService;
  beforeEach(() => {
    rows = [
      { id:'parent', title:'Project', status:'IN_PROGRESS', progress:50, parentId:null, position:0 },
      { id:'a', title:'A', status:'DONE', progress:100, parentId:'parent', position:0 },
      { id:'b', title:'B', status:'TODO', progress:0, parentId:'parent', position:1 },
    ];
    const matches = (row: any, where: any) => Object.entries(where || {}).every(([key,value]: any) => typeof value === 'object' && value ? row[key] !== value.not : row[key] === value);
    db = { $executeRaw: jest.fn(), auditLog:{create:jest.fn()}, task: {
      findUnique: jest.fn(({where}) => Promise.resolve(rows.find(row => row.id === where.id))),
      findFirst: jest.fn(({where}) => Promise.resolve(rows.find(row => matches(row,where)))),
      findMany: jest.fn(({where}) => Promise.resolve(rows.filter(row => matches(row,where)).map(row => ({...row})))),
      findUniqueOrThrow: jest.fn(({where}) => Promise.resolve(rows.find(row => row.id === where.id))),
      update: jest.fn(({where,data}) => { const row = rows.find(item => item.id === where.id); Object.assign(row,Object.fromEntries(Object.entries(data).filter(([,v]) => v !== undefined))); return Promise.resolve({...row}); }),
      count: jest.fn(({where}) => Promise.resolve(rows.filter(row => matches(row,where)).length)),
    }};
    db.$transaction = (fn: any) => fn(db); service = new CrmService(db);
  });
  it('rolls child completion up into parent percentage', async () => { await service.updateTask('b',{status:'DONE'} as any); expect(rows[0].progress).toBe(100); expect(rows[2].completedAt).toBeInstanceOf(Date); });
  it('rejects completion while a child remains open', async () => { await expect(service.updateTask('parent',{status:'DONE'} as any)).rejects.toThrow('подзадачи'); expect(db.task.update).not.toHaveBeenCalled(); });
  it('reopens a done parent when a child is reopened', async () => { rows[0].status='DONE'; rows[2].status='DONE'; rows[2].progress=100; await service.updateTask('a',{status:'TODO'} as any); expect(rows[0].status).toBe('IN_PROGRESS'); expect(rows[0].progress).toBe(50); });
  it('does not let manual parent percentages override children', async () => { await service.updateTask('parent',{progress:99}); expect(rows[0].progress).toBe(50); });
  it('rejects hierarchy cycles', async () => { await expect(service.updateTask('parent',{parentId:'b'})).rejects.toThrow('вложенность'); });
  it('refuses orphaning active subtasks by archiving their parent', async () => { await expect(service.archiveTask('parent')).rejects.toThrow('подзадачи'); });
  it('moves and reorders atomically in a single locked transaction', async () => {
    rows.push({id:'c',status:'TODO',progress:0,position:2}); await service.moveTask('c','TODO' as any,'b');
    expect(rows.find(x=>x.id==='c').position).toBe(0); expect(rows.find(x=>x.id==='b').position).toBe(1); expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
  it('rejects empty task titles and whitespace-only comments', async () => { await expect(service.updateTask('a',{title:'  '})).rejects.toThrow('название'); await expect(service.addTaskComment('a',{body:'\n '},'user')).rejects.toThrow('комментария'); });
});
