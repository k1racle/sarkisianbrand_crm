export const presentationSelect = { displayName:true,address:true,phones:true,emails:true,socialLinks:true,logoVersion:true } as const;
export function publicPresentation(value:any, organizationId:string) {
 return { displayName:value?.displayName||'',address:value?.address||'',phones:value?.phones||[],emails:value?.emails||[],socialLinks:value?.socialLinks||[],logoUrl:value?.logoVersion?`/api/v1/salon-booking/${organizationId}/logo?v=${value.logoVersion}`:null };
}
