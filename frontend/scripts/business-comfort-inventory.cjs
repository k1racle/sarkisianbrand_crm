// Code-derived inventory for the B2B / salon comfort review. No API or session access.
const fs=require('node:fs'),path=require('node:path');
const {parse}=require('@vue/compiler-sfc'),{parse:parseTemplate}=require('@vue/compiler-dom');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.screenshots/crm-comfort-business');
const componentFiles=fs.readdirSync(path.join(root,'components')).filter(file=>/^(Business|Salon).*\.vue$/.test(file)).map(file=>'components/'+file);
const files=[...componentFiles,'components/B2BPortalRail.vue','components/UserProfileDrawer.vue','components/storefront/SiteBusinessRegistrationDrawer.vue','pages/business-registration.vue','pages/b2b.vue','pages/b2b-login.vue','pages/b2b-invite.vue','pages/booking/[organizationId].vue'];
function text(node){return(node.children||[]).map(child=>child.type===2?child.content:child.type===5?'{{'+child.content.content+'}}':text(child)).join(' ').replace(/\s+/g,' ').trim();}
function inventory(){return files.map(file=>{
 const source=fs.readFileSync(path.join(root,file),'utf8'),{descriptor,errors}=parse(source,{filename:file});if(errors.length)throw errors;
 const result={file,lines:source.split('\n').length,components:[],branches:[],forms:[],controls:[],links:[]};
 if(!descriptor.template)return result;
 const ast=parseTemplate(descriptor.template.content),offset=descriptor.template.loc.start.line-1;
 const visit=node=>{
  if(node.type===1){
   const line=offset+node.loc.start.line,props=node.props||[];
   const attr=name=>props.find(prop=>prop.type===6&&prop.name===name)?.value?.content;
   const directive=name=>props.find(prop=>prop.type===7&&prop.name===name)?.exp?.content;
   const bindings=props.filter(prop=>prop.type===7&&prop.name==='bind').map(prop=>({name:prop.arg?.content,value:prop.exp?.content}));
   const events=props.filter(prop=>prop.type===7&&prop.name==='on').map(prop=>({event:prop.arg?.content,handler:prop.exp?.content}));
   if(/^[A-Z]/.test(node.tag))result.components.push({tag:node.tag,line,condition:directive('if')||directive('else-if')});
   for(const prop of props.filter(prop=>prop.type===7&&['if','else-if','else','show'].includes(prop.name)))result.branches.push({line,tag:node.tag,kind:prop.name,expression:prop.exp?.content||'else'});
   if(node.tag==='form'||attr('role')==='dialog')result.forms.push({line,tag:node.tag,class:attr('class'),role:attr('role'),label:attr('aria-label'),submit:events.find(event=>event.event==='submit')?.handler});
   if(['button','input','select','textarea','summary'].includes(node.tag)||attr('role')==='tab')result.controls.push({line,tag:node.tag,type:attr('type'),role:attr('role'),label:attr('aria-label')||text(node).slice(0,180),class:attr('class'),model:directive('model'),events,bindings});
   if(['a','NuxtLink'].includes(node.tag))result.links.push({line,label:text(node).slice(0,120),to:attr('to')||attr('href'),bindings});
  }
  for(const child of node.children||[])visit(child);
 };
 visit(ast);return result;
});}
function main(){fs.mkdirSync(output,{recursive:true});const rows=inventory();const data={generatedAt:new Date().toISOString(),scope:'All current B2B/salon entrypoints and related components',screens:rows,references:[{title:'Attio table views',url:'https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views'},{title:'Pipedrive list view',url:'https://support.pipedrive.com/en/article/list-view'}]};fs.writeFileSync(path.join(output,'source-inventory.json'),JSON.stringify(data,null,2));console.log(JSON.stringify({output,files:rows.length,branches:rows.reduce((sum,row)=>sum+row.branches.length,0),forms:rows.reduce((sum,row)=>sum+row.forms.length,0),controls:rows.reduce((sum,row)=>sum+row.controls.length,0),components:rows.map(row=>({file:row.file,branches:row.branches.length,forms:row.forms.length,controls:row.controls.length}))},null,2));}
module.exports={inventory,files};if(require.main===module)main();
