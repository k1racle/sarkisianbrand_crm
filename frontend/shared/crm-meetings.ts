export type MeetingPerson={id:string;firstName?:string;lastName?:string;isActive:boolean;response?:string;declineReason?:string;respondedAt?:string|null};
export type CrmMeeting={id:string;title:string;agenda:string;kind:string;location:string;meetingUrl:string;reminderMinutes:number;startsAt:string;endsAt:string;timezone:string;status:string;organizerId:string;organizer:MeetingPerson;members:MeetingPerson[];version:number;canManage:boolean;canRespond?:boolean;myResponse?:string|null;myDeclineReason?:string;responses?:{accepted:number;pending:number;declined:number};cancellationReason?:string};
export const meetingKind=(kind:string)=>({TEAM:'Планёрка',MEETING:'Совещание',EVENT:'Мероприятие',INTERVIEW:'Собеседование',OTHER:'Другая встреча'}[kind]||kind);
export const meetingResponse=(response?:string|null)=>({ACCEPTED:'Участвует',DECLINED:'Не сможет',PENDING:'Ждём ответа'}[response||'PENDING']||'Ждём ответа');
export const calendarDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function meetingMonthDays(month:string){
  if(!/^\d{4}-\d{2}$/.test(month))return [];
  const [year,m]=month.split('-').map(Number),first=new Date(year,m-1,1),start=new Date(year,m-1,1-(first.getDay()+6)%7);
  return Array.from({length:42},(_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));
}
