/* One-off mechanical extraction. Does not alter scripts/business data or contact APIs.
 * CSS scoping is compiled by Vue itself; stable attributes replace compiler-generated IDs.
 * Run without --apply for a dry-run. Original SFCs are backed up before an explicit rewrite.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parse,compileStyle}=require('@vue/compiler-sfc');
const {parse:parseTemplate}=require('@vue/compiler-dom');
const postcss=require('postcss');
const root=path.resolve(__dirname,'..'),apply=process.argv.includes('--apply');
const adminFiles=[
 'app.vue','pages/admin.vue','pages/workspace-login.vue','pages/b2b-login.vue','pages/b2b.vue',
 'pages/crm/index.vue','pages/crm/customers.vue','pages/crm/organizations.vue','pages/crm/deals.vue','pages/crm/tasks.vue','pages/media-library.vue',
 'components/AdminNewProduct.vue','components/AdminOrderDrawer.vue','components/AdminProductEditor.vue','components/B2BPortalRail.vue',
 'components/BotCommandsSettings.vue','components/CrmPipelineSettings.vue','components/CrmTaskAutomation.vue','components/EcosystemAccounts.vue',
 'components/EcosystemIntegrations.vue','components/EcosystemTrash.vue','components/IntegrationBrandLogo.vue',
 'components/PlatformChatDrawer.vue','components/TaskReminderCenter.vue','components/UserProfileDrawer.vue','components/WorkspaceContextMenu.vue','components/WorkspaceLoading.vue',
 'components/workspace/ChannelsWorkspacePage.vue','components/workspace/ReportsWorkspacePage.vue','components/workspace/StoreWorkspacePage.vue',
 'components/workspace/SupportWorkspacePage.vue','components/workspace/SystemWorkspacePage.vue',
 'components/storefront/SiteCatalogMenuEditor.vue','components/storefront/SitePagesEditor.vue',
];
const siteFiles=['pages/index.vue','components/storefront/SiteFooter.vue'];
const plan=[],sections={admin:[],site:[]};
// Move shared resets/font files to one foundation; isolate legacy storefront
// selectors so generic .header/.product-grid/footer cannot affect workspaces.
const foundations=[],legacy={admin:[],site:[]};
for(const name of ['main.css','design-system.css','typography.css']){
 const sheet=postcss.parse(fs.readFileSync(path.join(root,'assets/css',name),'utf8'));
 function route(nodes,target){for(const original of nodes){const node=original.clone();
  if(node.type==='comment'){target.push(node.toString());continue;}
  if(node.type==='atrule'&&['font-face'].includes(node.name)){foundations.push(node.toString());continue;}
  if(node.type==='rule'){
   const generic=node.selectors.every(selector=>/^(:root|\*|body|html|button|input|select|textarea|a)(:(focus-visible|hover))?$/.test(selector.trim()));
   if(generic){foundations.push(node.toString());continue;}
   if(name==='main.css'){
    const adminSelectors=node.selectors.filter(selector=>/\.admin-|\.kpi(?:\b|-)|\.table-(?:head|row)|\.status\b|\.refresh\b|\.login-error\b/.test(selector));
    const siteSelectors=node.selectors.filter(selector=>!adminSelectors.includes(selector));
    if(adminSelectors.length){const admin=node.clone();admin.selectors=adminSelectors.map(s=>':where(.workspace-frame,.admin-dialog) '+s);legacy.admin.push(admin.toString());}
    if(siteSelectors.length){node.selectors=siteSelectors.map(s=>':where(.sb-storefront) '+s);target.push(node.toString());}
   }else target.push(node.toString());
   continue;
  }
  if(node.type==='atrule'&&node.nodes&&!/keyframes$/.test(node.name)){
   const inner=[];route(node.nodes,inner);if(inner.length){node.removeAll();node.append(postcss.parse(inner.join('\n')).nodes);target.push(node.toString());}
  }else target.push(node.toString());
 }}
 route(sheet.nodes,legacy[name==='design-system.css'?'admin':'site']);
}
for(const [owner,files]of [['admin',adminFiles],['site',siteFiles]])for(const file of files){
 const filename=path.join(root,file),source=fs.readFileSync(filename,'utf8'),{descriptor,errors}=parse(source,{filename});
 if(errors.length)throw Error(file+': '+errors.join(', '));
 if(!descriptor.styles.length&&!/\sstyle\s*=/.test(descriptor.template?.content||''))continue;
 const marker='data-v-ui-'+crypto.createHash('sha256').update(file).digest('hex').slice(0,12);
 const edits=[],css=[];
 for(const style of descriptor.styles){
  if(style.src)throw Error('External style needs manual review: '+file);
  const compiled=compileStyle({source:style.content,filename,id:marker,scoped:style.scoped});
  if(compiled.errors.length)throw Error(file+': '+compiled.errors.join(', '));
  css.push(compiled.code);
  const start=source.lastIndexOf('<style',style.loc.start.offset),end=source.indexOf('</style>',style.loc.end.offset)+8;
  if(start<0||end<8)throw Error('Unresolved style block: '+file);
  edits.push({start,end,value:''});
 }
 if(descriptor.template){
  const ast=parseTemplate(descriptor.template.content),offset=descriptor.template.loc.start.offset;
  const iconNames=new Set((descriptor.scriptSetup?.content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@lucide\/vue/g)||[]).flatMap(v=>v.slice(v.indexOf('{')+1,v.indexOf('}')).split(',').map(n=>n.trim().split(/\s+as\s+/).at(-1))));
  let inline=0;
  function walk(node){
   if(node.type===1){
    const styled=descriptor.styles.some(s=>s.scoped);
    const annotate=styled&&(node.tagType===0||node.tag==='NuxtLink'||node.tag==='component'||iconNames.has(node.tag));
    const attr=node.props.find(p=>p.type===6&&p.name==='style');
    const attributes=[];
    if(annotate)attributes.push(marker);
    if(attr?.value){
     const inlineClass='ui-inline-'+marker.slice(8)+'-'+(++inline);
     // Unique attribute selector avoids modifying v-bind:class or existing classes.
     attributes.push(inlineClass);css.push('['+inlineClass+']{'+attr.value.content+'}');
     edits.push({start:offset+attr.loc.start.offset,end:offset+attr.loc.end.offset,value:''});
    }
    if(attributes.length)edits.push({start:offset+node.loc.start.offset+1+node.tag.length,end:offset+node.loc.start.offset+1+node.tag.length,value:' '+attributes.join(' ')});
   }
   for(const child of node.children||[])walk(child);
  }
  walk(ast);
 }
 let rewritten=source;for(const edit of edits.sort((a,b)=>b.start-a.start))rewritten=rewritten.slice(0,edit.start)+edit.value+rewritten.slice(edit.end);
 const reparsed=parse(rewritten,{filename});if(reparsed.errors.length)throw Error('Rewrite failed: '+file);
 const combined=css.join('\n');postcss.parse(combined,{from:file});
 sections[owner].push('/* Component: '+file+'; owner: '+marker+' */\n'+combined);
 plan.push({file,source,rewritten,marker,styleBlocks:descriptor.styles.length});
}
console.log(JSON.stringify({apply,components:plan.length,styleBlocks:plan.reduce((n,p)=>n+p.styleBlocks,0),adminBytes:sections.admin.join('\n').length,siteBytes:sections.site.join('\n').length,files:plan.map(p=>p.file)},null,2));
if(apply){
 if(!plan.length)throw Error('Already extracted; refusing to overwrite canonical styles with empty output.');
 const backup=path.join(root,'.screenshots/ui-css-migration-backup.json');fs.mkdirSync(path.dirname(backup),{recursive:true});
 if(fs.existsSync(backup))throw Error('Existing migration backup: review before another extraction.');
 fs.writeFileSync(backup,JSON.stringify(plan.map(({file,source,rewritten})=>({file,source,rewritten})),null,2));
 fs.writeFileSync(path.join(root,'assets/css/admin-components.css'),sections.admin.join('\n\n')+'\n');
 fs.writeFileSync(path.join(root,'assets/css/site-components.css'),sections.site.join('\n\n')+'\n');
 fs.writeFileSync(path.join(root,'assets/css/foundation.css'),foundations.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'assets/css/admin-legacy.css'),legacy.admin.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'assets/css/site-legacy.css'),legacy.site.join('\n')+'\n');
 for(const item of plan)fs.writeFileSync(path.join(root,item.file),item.rewritten);
}
