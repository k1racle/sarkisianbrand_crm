import {calendarFold,calendarText,meetingCalendar} from './meeting-calendar';
describe('Calendar interoperability',()=>{
 const row={id:'event',title:'Совещание, команда; запуск',agenda:'Повестка\nBEGIN:VEVENT\nEND:VCALENDAR',location:'Москва, офис',meetingUrl:'https://example.test/room',startsAt:new Date('2030-03-01T07:00:00Z'),endsAt:new Date('2030-03-01T08:00:00Z'),createdAt:new Date('2030-02-01Z'),updatedAt:new Date('2030-02-02Z'),status:'SCHEDULED',calendarSequence:2,reminderMinutes:30,cancellationReason:null,members:[{userId:'me',response:'PENDING',declineReason:''}]};
 it('escapes user content without creating properties or extra events',()=>{
  const result=meetingCalendar([row],'me','https://crm.example');
  expect(result.match(/\r\nBEGIN:VEVENT\r\n/g)).toHaveLength(1);
  expect(result).toContain('DTSTART:20300301T070000Z\r\n');
  expect(result).toContain('SUMMARY:Совещание\\, команда\\; запуск');
  expect(result).toContain('TRIGGER:-PT30M');
  expect(result).toContain('Повестка\\nBEGIN:VEVENT\\nEND:VCALENDAR');
  expect(calendarText('x\\y\r\nz')).toBe('x\\\\y\\nz');
 });
 it('folds Cyrillic and emoji by UTF-8 bytes without splitting characters',()=>{
  const source='DESCRIPTION:'+('Совещание 💅 '.repeat(30)),folded=calendarFold(source);
  for(const line of folded.split('\r\n'))expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  expect(folded.replace(/\r\n /g,'')).toBe(source);
 });
 it('keeps the UID stable on updates and cancels the same event',()=>{
  const before=meetingCalendar([row],'me','https://crm.example');
  const after=meetingCalendar([{...row,status:'CANCELLED',calendarSequence:3,cancellationReason:'Перенос'}],'me','https://crm.example');
  expect(before.match(/UID:[^\r]+/)![0]).toBe(after.match(/UID:[^\r]+/)![0]);
  expect(after).toContain('SEQUENCE:3');expect(after).toContain('STATUS:CANCELLED');expect(after).not.toContain('BEGIN:VALARM');
 });
 it('does not publish other participants or their reasons; declined personal invitations cancel',()=>{
  const result=meetingCalendar([{...row,members:[{userId:'me',response:'DECLINED',declineReason:'private'},{userId:'someone',response:'DECLINED',declineReason:'sensitive'}]}],'me','https://crm.example');
  expect(result).toContain('STATUS:CANCELLED');expect(result).not.toContain('sensitive');expect(result).not.toContain('private');
 });
});
