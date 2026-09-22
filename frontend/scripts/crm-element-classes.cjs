/* Mechanical class assignment only. Emit a patch; caller applies with apply_patch. */
const fs=require('node:fs'),{parse}=require('@vue/compiler-sfc'),{baseParse}=require('@vue/compiler-dom');
const file=process.argv[2],source=fs.readFileSync(file,'utf8'),sfc=parse(source).descriptor;
if(!sfc.template)process.exit(0);
const template=sfc.template.content,ast=baseParse(template),edits=[];
const has=(node,tag)=>(node.children||[]).some(n=>n.tag===tag||has(n,tag));
const surface=['panel','partner-panel','queue-card','knowledge-card','contact-inbox__settings','contact-inbox__panel','sb-promo-panel','sb-gift-panel','loyalty-settings-panel','crm-drive-surface','crm-content-toolbar','crm-content-empty'];
function walk(n,parent){if(n.type===1){const cls=n.props.find(p=>p.type===6&&p.name==='class'),tokens=(cls?.value?.content||'').split(/\s+/),add=[];const plain=(name)=>n.props.find(p=>p.type===6&&p.name===name)?.value?.content;const directives=n.props.filter(p=>p.type===7).map(p=>p.exp?.content||'').join(' ');
 if(n.tag==='main')add.push('crm-standard');
 if(n.tag==='button'||['NuxtLink','a'].includes(n.tag)&&tokens.some(t=>/button|primary|light/.test(t))){
  add.push('crm-button');
  if(tokens.some(x=>['crm-publication','crm-file-open','task-card','deal'].includes(x)))add.push('crm-card-action');
  else if(tokens.some(x=>['primary','save','send','submit','partner-primary','loyalty-save','crm-primary-button','studio-primary','contact-inbox__button--dark'].includes(x))||tokens.some(x=>['sb-promo-button','sb-gift-button'].includes(x))&&!tokens.some(x=>x.endsWith('--white'))||/^(openCreate\(|createOpen\s*=|saveSelected|saveOrganization|saveCustomer|createTask|createLead|addComment|addActivity)/.test(directives))add.push('crm-button--primary');
  if(has(n,'RefreshCw'))add.push('crm-button--refresh');
  if(tokens.some(x=>['danger','archive','delete'].includes(x)))add.push('crm-button--danger');
  if(tokens.includes('crm-icon-button')||plain('aria-label')&&!(n.children||[]).some(c=>c.type===2&&c.content.trim()))add.push('crm-button--icon');
  if(tokens.some(t=>['crm-subtask-open','crm-picker-item'].includes(t)))add.push('crm-button--row');
  if(parent&&(parent.props||[]).some(p=>p.type===6&&p.name==='class'&&/crm-drive-crumbs/.test(p.value?.content||'')))add.push('crm-button--text');
 }
 if(['input','select','textarea'].includes(n.tag)&&!['file','hidden','range','color'].includes(plain('type')))add.push(['checkbox','radio'].includes(plain('type'))?'crm-check':'crm-input');
 if(n.tag==='header'&&has(n,'h1'))add.push('crm-page-header');
 if(tokens.some(t=>surface.includes(t)))add.push('crm-surface');
 if(tokens.some(t=>['accent','revenue'].includes(t))&&n.tag==='article')add.push('crm-surface--tint');
 if(tokens.some(t=>['kanban','board','crm-content-board'].includes(t)))add.push('crm-board');
 if(parent&&(parent.props||[]).some(p=>p.type===6&&p.name==='class'&&/^(kanban|board|crm-content-board)( |$)/.test(p.value?.content||''))&&['article','section'].includes(n.tag))add.push('crm-board-column','crm-surface');
 if(parent&&(parent.props||[]).some(p=>p.type===6&&p.name==='class'&&p.value?.content==='knowledge')&&n.tag==='div'&&!tokens.includes('knowledge-grid'))add.push('crm-surface','crm-surface--tint');
 if(tokens.some(t=>['task-card','deal'].includes(t)))add.push('crm-item-card');
 if(tokens.some(t=>['crm-publication','crm-content-day','crm-drive-item'].includes(t)))add.push('crm-item-card');
 if(tokens.some(t=>['partner-status','sb-promo-badge','badge','crm-content-status'].includes(t)))add.push('crm-badge');
 if(tokens.some(t=>['toolbar','filters'].includes(t)))add.push('crm-toolbar');
 if(tokens.some(t=>['admin-body','hd-body','leader-body'].includes(t)))add.push('crm-page-content');
 if((n.tag==='label'&&has(n,'input')&&(n.children||[]).some(c=>/^(Search|Mail|Phone|Filter)$/.test(c.tag||'')))||tokens.some(t=>['sb-promo-search','sb-gift-search','crm-drive-search','crm-content-search'].includes(t)))add.push('crm-input-group');
 if(n.tag==='article'&&parent&&(parent.props||[]).some(p=>p.type===6&&p.name==='class'&&/kpis|kpi-grid|knowledge-grid/.test(p.value?.content||'')))add.push('crm-surface');
 const fresh=add.filter(x=>!tokens.includes(x));if(fresh.length){if(cls?.value){const pos=cls.value.loc.end.offset-1;edits.push({pos,text:' '+fresh.join(' ')});}else{edits.push({pos:n.loc.start.offset+1+n.tag.length,text:' class="'+fresh.join(' ')+'"'});}}
 }for(const child of n.children||[])walk(child,n);}
walk(ast);let next=template;for(const e of edits.sort((a,b)=>b.pos-a.pos))next=next.slice(0,e.pos)+e.text+next.slice(e.pos);
const nextSource=source.slice(0,sfc.template.loc.start.offset)+next+source.slice(sfc.template.loc.end.offset);
const oldLines=source.split('\n'),newLines=nextSource.split('\n');let patch='*** Begin Patch\n*** Update File: '+file.replaceAll('\\','/')+'\n';let changed=0;
oldLines.forEach((line,i)=>{if(line!==newLines[i]){patch+='@@\n-'+line.replace(/\r$/,'')+'\n+'+newLines[i].replace(/\r$/,'')+'\n';changed++;}});patch+='*** End Patch';
process.stdout.write(JSON.stringify({changed,patch}));
