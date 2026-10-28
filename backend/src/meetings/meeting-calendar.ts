// RFC 5545: CRLF, escaped TEXT values and folding by UTF-8 octets.
export const calendarText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
export function calendarFold(line:string){
  let result='',size=0;
  for(const char of line){const bytes=Buffer.byteLength(char,'utf8');if(size+bytes>75){result+='\r\n ';size=1;}result+=char;size+=bytes;}
  return result;
}
type CalendarEvent={id:string;title:string;agenda:string;location:string;meetingUrl:string;startsAt:Date;endsAt:Date;createdAt:Date;updatedAt:Date;status:string;calendarSequence:number;reminderMinutes:number;cancellationReason:string|null;members:{userId:string;response:string;declineReason:string}[]};
const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function meetingCalendar(rows:CalendarEvent[],actorId:string,siteUrl:string){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SARKISIAN//CRM Calendar//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Календарь SARKISIAN CRM'];
  for(const row of rows){
    const mine=row.members.find(m=>m.userId===actorId),cancelled=row.status==='CANCELLED'||mine?.response==='DECLINED';
    const url=`${siteUrl.replace(/\/+$/,'')}/crm/meetings?meeting=${encodeURIComponent(row.id)}`;
    const response=mine?.response==='ACCEPTED'?'Участие подтверждено':mine?.response==='DECLINED'?'Вы отказались от участия':mine?'Подтвердите участие в CRM':'Вы организатор';
    const description=[row.agenda,row.meetingUrl?`Онлайн: ${row.meetingUrl}`:'',response,row.status==='CANCELLED'?`Событие отменено: ${row.cancellationReason??''}`:'',`Карточка и ответ на приглашение: ${url}`].filter(Boolean).join('\n\n');
    lines.push('BEGIN:VEVENT',`UID:${row.id}@crm.sarkisianbrand.ru`,`DTSTAMP:${stamp(row.updatedAt)}`,`CREATED:${stamp(row.createdAt)}`,`LAST-MODIFIED:${stamp(row.updatedAt)}`,`SEQUENCE:${row.calendarSequence}`,`DTSTART:${stamp(row.startsAt)}`,`DTEND:${stamp(row.endsAt)}`,`SUMMARY:${calendarText(row.title)}`,`DESCRIPTION:${calendarText(description)}`,`LOCATION:${calendarText(row.location||'Онлайн')}`,`URL:${url}`,`STATUS:${cancelled?'CANCELLED':'CONFIRMED'}`,'CLASS:PRIVATE');
    if(!cancelled&&row.reminderMinutes>0)lines.push('BEGIN:VALARM',`TRIGGER:-PT${row.reminderMinutes}M`,'ACTION:DISPLAY',`DESCRIPTION:${calendarText(row.title)}`,'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(calendarFold).join('\r\n')+'\r\n';
}
