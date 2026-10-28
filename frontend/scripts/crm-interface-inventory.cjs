/* Reachable CRM presentation inventory. Reads source only; no API, credentials or DB. */
const fs=require('node:fs'),path=require('node:path');
const {parse}=require('@vue/compiler-sfc'),{parse:parseTemplate}=require('@vue/compiler-dom');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const relative=p=>path.relative(root,p).split(path.sep).join('/');
const components=walk(path.join(root,'components')).filter(p=>p.endsWith('.vue'));
const map=new Map(components.map(p=>[path.basename(p,'.vue').toLowerCase(),p]));
const queue=[...walk(path.join(root,'pages/crm')).filter(p=>p.endsWith('.vue')),path.join(root,'components/crm/CrmShell.vue')];
const seen=new Set(),owners=[],missing=[],unlabelled=[];
const plain=(n,key)=>n.props.find(p=>p.type===6&&p.name===key)?.value?.content||'';
const hasProp=(n,key)=>n.props.some(p=>p.type===6&&p.name===key||p.type===7&&p.name==='bind'&&p.arg?.content===key);
const meaningful=n=>n.type===2&&n.content.trim()||n.type===5||(n.children||[]).some(meaningful);
const chrome=new Set(['crm-navigation-action','crm-icon-button','crm-install-button','crm-theme-toggle','crm-sidebar-search','crm-sidebar-profile','crm-sidebar-signout','crm-all-sections','crm-notification-trigger']);
while(queue.length){const full=queue.shift(),file=relative(full);if(seen.has(file)||!fs.existsSync(full))continue;seen.add(file);
 const source=fs.readFileSync(full,'utf8'),sfc=parse(source,{filename:full}).descriptor;if(!sfc.template)continue;
 let ast;try{ast=parseTemplate(sfc.template.content);}catch(error){throw new Error(file+': '+error.message);}const counts={buttons:0,inputs:0,selects:0,textareas:0};
 const labels=new Set();function collect(n){if(n.type===1&&n.tag==='label'&&plain(n,'for'))labels.add(plain(n,'for'));for(const c of n.children||[])collect(c);}collect(ast);
 function visit(n,parents=[]){if(n.type===1){const cls=plain(n,'class').split(/\s+/),type=plain(n,'type'),line=n.loc.start.line;
  const target=map.get(n.tag.replaceAll('-','').toLowerCase())||map.get(n.tag.toLowerCase());
  if(target&&(!relative(target).startsWith('components/storefront/')||/SitePromoCodesEditor|SiteGiftCardsEditor/.test(target)))queue.push(target);
  if(n.tag==='button'){counts.buttons++;if(!cls.includes('crm-button')&&!cls.includes('crm-tab')&&!cls.includes('crm-card-action')&&!cls.some(c=>chrome.has(c))&&!cls.includes('crm-widget-handle'))missing.push({file,line,tag:n.tag,kind:'button',class:plain(n,'class')});
   if(!meaningful(n)&&!hasProp(n,'aria-label')&&!hasProp(n,'aria-labelledby')&&!plain(n,'title'))unlabelled.push({file,line,kind:'icon-button'});
  }
  if(['input','select','textarea'].includes(n.tag)&&type!=='hidden'){counts[n.tag==='input'?'inputs':n.tag==='select'?'selects':'textareas']++;
   const expected=['checkbox','radio'].includes(type)?'crm-check':'crm-input';
   if(!['file','range','color'].includes(type)&&!cls.includes(expected))missing.push({file,line,tag:n.tag,kind:expected,class:plain(n,'class')});
   if(!hasProp(n,'hidden')&&!hasProp(n,'aria-label')&&!hasProp(n,'aria-labelledby')&&!parents.some(p=>p.tag==='label')&&!labels.has(plain(n,'id')))unlabelled.push({file,line,kind:n.tag,id:plain(n,'id'),type});
  }
 }for(const c of n.children||[])visit(c,n.type===1?[...parents,n]:parents);}visit(ast);
 owners.push({file,...counts,scopedStyles:sfc.styles.length});
}
owners.sort((a,b)=>a.file.localeCompare(b.file));
const report={owners,missing,unlabelled,summary:{owners:owners.length,buttons:owners.reduce((n,o)=>n+o.buttons,0),fields:owners.reduce((n,o)=>n+o.inputs+o.selects+o.textareas,0),missing:missing.length,unlabelled:unlabelled.length}};
if(require.main===module){const output=path.join(root,'.screenshots/crm-interface-inventory.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,...report.summary}));}
module.exports=report;
