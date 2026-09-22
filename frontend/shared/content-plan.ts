export const contentPlatforms: Record<string,string> = { INSTAGRAM:'Instagram',YOUTUBE:'YouTube',VK:'ВКонтакте',TELEGRAM:'Telegram',MAX:'MAX',TIKTOK:'TikTok',OTHER:'Другая площадка' };
export const contentFormats: Record<string,string> = { REELS:'Reels',SHORTS:'Shorts',STORY:'Stories',POST:'Пост',VIDEO:'Видео',LIVE:'Эфир' };
export const contentStages: Record<string,string> = { IDEA:'Идея',SCRIPT:'Сценарий',SHOOTING:'Съёмка',EDITING:'Монтаж',REVIEW:'Согласование',SCHEDULED:'Готово к публикации',PUBLISHED:'Опубликовано' };
export function contentLocal(iso: string | null, zone: string) {
 if(!iso)return '';
 const p=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Convert wall-clock time in an explicit IANA zone. Reject DST gaps rather than shifting silently.
export function contentInstant(local:string,zone:string){
 if(!local)return null;
 const desired=new Date(local+'Z').getTime();if(!Number.isFinite(desired))throw new Error('Проверьте дату и время');
 let guess=desired;
 for(let i=0;i<4;i++){const rendered=new Date(contentLocal(new Date(guess).toISOString(),zone)+'Z').getTime();const delta=desired-rendered;guess+=delta;if(!delta)break;}
 const result=new Date(guess).toISOString();if(contentLocal(result,zone)!==local.slice(0,16))throw new Error('Такого времени нет в выбранном часовом поясе. Выберите другое время.');return result;
}
