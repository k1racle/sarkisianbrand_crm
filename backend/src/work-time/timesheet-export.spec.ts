import { Workbook, ValueType } from 'exceljs';
import { TimesheetService } from './timesheet.service';
import { timesheetWorkbook } from './timesheet-export';

function fixture(){
  const permissions=['work_time.read','work_time.review','work_time.export','work_schedule.read'];
  const people=Array.from({length:30},(_,i)=>({id:`employee-${i}`,firstName:i===0?'=HYPERLINK("bad")':'Имя',lastName:i===0?'':'Фамилия',isActive:true,departmentId:'department-a',department:{id:'department-a',name:'Отдел'}}));
  const issues={overlap:false,unclosed:0,pending:0,missing:0,planUnavailable:false};
  const records:any[]=people.map(employee=>({employeeId:employee.id,departmentId:'department-a',month:'2026-09',timezone:'Europe/Moscow',status:'CLOSED',revision:3,edition:1,snapshot:{employee,month:'2026-09',timezone:'Europe/Moscow',serverTime:'2026-10-01T12:00Z',plannedMs:108000000,workedMs:108000000,breakMs:0,openSessions:0,needsAttention:false,issues,days:[{date:'2026-09-01',plannedMs:108000000,workedMs:108000000,breakMs:0,issues}],intervals:[{id:'s-'+employee.id,startedAt:'2026-08-31T20:00Z',endedAt:'2026-09-02T03:00Z',timezone:'Europe/Moscow',breaks:[{startedAt:'2026-09-01T01:00Z',endedAt:'2026-09-01T02:00Z'}]}]}}));
  const actor={id:'actor',role:'SUPERVISOR',isActive:true,timezone:'Europe/Moscow'};
  const db={user:{findUnique:jest.fn(async()=>actor),findMany:jest.fn(async(args:any)=>people)},rolePermission:{findMany:jest.fn(async()=>permissions.map(key=>({permission:{key}})))},userPermission:{findMany:jest.fn(async()=>[])},crmDepartment:{findMany:jest.fn(async()=>[{id:'department-a',name:'Отдел'}])},crmTimesheetPeriod:{findMany:jest.fn(async()=>records)},auditLog:{create:jest.fn(async()=>({}))},$queryRaw:jest.fn(async()=>[{now:new Date('2026-10-05T12:00Z')}])};
  const service=new TimesheetService({$transaction:async run=>run(db)} as any);
  return {service,db,permissions,records,people,actor};
}
const query={month:'2026-09',view:'ALL' as const,page:2};
describe('Timesheet Excel export',()=>{
  it('exports all pages while list stays paginated and strips intervals',async()=>{
    const {service,db}=fixture();const list=await service.list('actor',query);const report=await service.exportData('actor',query);
    expect(list.items).toHaveLength(5);expect(list.items[0].intervals).toBeUndefined();expect(report.items).toHaveLength(30);expect(report.summary.workedMs).toBe(30*108000000);expect(db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('denies export before querying people even when reading is allowed',async()=>{
    const {service,permissions,db}=fixture();permissions.splice(permissions.indexOf('work_time.export'),1);
    await expect(service.exportData('actor',query)).rejects.toThrow('Нет разрешения');expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it('honors personal DENY even for admin',async()=>{
    const {service,db,actor}=fixture();actor.role='ADMIN';db.userPermission.findMany.mockResolvedValue([{effect:'DENY',permission:{key:'work_time.export'}}] as never);
    await expect(service.exportData('actor',query)).rejects.toThrow('Нет разрешения');
  });
  it('scopes current employees and blocks foreign department filters',async()=>{
    const {service,db}=fixture();await service.exportData('actor',query);
    expect(db.user.findMany.mock.calls[0][0].where).toMatchObject({isActive:true,departmentId:{in:['department-a']}});
    await expect(service.exportData('actor',{...query,departmentId:'foreign'})).rejects.toThrow('Отдел не найден');
  });
  it('does not leak a closed snapshot from an old department',async()=>{
    const {service,records}=fixture();records[0].departmentId='old-department';expect((await service.exportData('actor',query)).items).toHaveLength(29);
  });
  it('redacts plans in saved reports after schedule permission removal',async()=>{
    const {service,permissions}=fixture();permissions.splice(permissions.indexOf('work_schedule.read'),1);
    const report=await service.exportData('actor',query);expect(report.summary.plannedMs).toBeNull();expect(report.items[0].days[0].plannedMs).toBeNull();
  });
  it('preserves closed data, typed text, durations over 24h, pauses and null totals in a real XLSX',async()=>{
    const {service,records}=fixture();records[1].snapshot.workedMs=null;records[1].snapshot.days[0].workedMs=null;
    const report=await service.exportData('actor',query),buffer=await timesheetWorkbook(report),book=new Workbook();await book.xlsx.load(buffer as any);
    expect(buffer.subarray(0,2).toString()).toBe('PK');expect(book.worksheets.map(s=>s.name)).toEqual(['Табель','По дням','Интервалы']);
    const sheet=book.getWorksheet('Табель')!;expect(sheet.getCell('A4').value).toBe('=HYPERLINK("bad")');expect(sheet.getCell('A4').type).toBe(ValueType.String);
    expect(sheet.getCell('F4').value).toEqual(new Date('1899-12-31T06:00:00.000Z'));expect(sheet.getCell('F4').numFmt).toBe('[h]:mm:ss');expect(sheet.getCell('G5').value).toBe('—');expect(sheet.getCell('J4').value).toBe('2026-10-01T12:00:00.000Z');expect(sheet.getCell('G34').value).toBe('—');
    expect(book.getWorksheet('Интервалы')!.getCell('C5').value).toBe('Перерыв');expect(book.getWorksheet('По дням')!.rowCount).toBe(33);
  });
});
