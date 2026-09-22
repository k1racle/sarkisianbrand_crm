// Store only explicitly allowlisted business fields; never request bodies or credentials.
export const taskHistoryFields=['title','description','status','priority','progress','assignedToId','parentId','leadId','startDate','dueDate','labels','estimateMinutes'];
export const leadHistoryFields=['title','contactName','contactPhone','contactEmail','status','stageId','managerId','amount','probability','expectedCloseAt','nextContactAt','lostReason','tags'];
function value(v:any){return v===undefined||v===null?null:v instanceof Date?v.toISOString():typeof v==='object'&&!Array.isArray(v)?String(v):v;}
export async function recordCrmChange(db:any,actorId:string|undefined,resource:'crm.task'|'crm.lead',resourceId:string,before:any,after:any,fields:string[],action='Изменено'){
 const changes=fields.flatMap(field=>JSON.stringify(value(before?.[field]))===JSON.stringify(value(after?.[field]))?[]:[{field,from:value(before?.[field]),to:value(after?.[field])}]);
 if(!changes.length)return;
 await db.auditLog.create({data:{actorId:actorId||null,resource,resourceId,action,payload:{changes}}});
}
