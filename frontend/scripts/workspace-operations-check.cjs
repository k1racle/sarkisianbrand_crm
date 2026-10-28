/* Execute actual CRM/B2B code against local promises only; no browser/API/DB. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');const Vue=require('vue');const {parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');
const root=path.resolve(__dirname,'..');
function harness(file){
 const source=fs.readFileSync(path.join(root,file),'utf8'),d=parse(source).descriptor;
 assert.deepEqual(compileTemplate({source:d.template.content,id:'check',filename:file,compilerOptions:{bindingMetadata:compileScript(d,{id:'check'}).bindings}}).errors,[]);
 const calls=[],hooks={leave:[],update:[]},state={confirm:false,handler:()=>{throw {data:{message:'Mock failure'}}}},route=Vue.reactive({query:{section:'clients'}}),token=Vue.ref('invalid-mock-token'),payload=Vue.reactive({});
 const request=async(endpoint,options={})=>{calls.push({endpoint,options});return state.handler(endpoint,options);};
 const companies=[{id:'fixture-organization',name:'Fixture salon',role:'OWNER'}];
 const businessSession={token,user:Vue.ref({id:'fixture-owner',role:'CUSTOMER_B2B'}),generation:Vue.ref(0),organizations:Vue.ref(companies),selectedOrganizationId:Vue.ref(companies[0].id),organizationRevision:Vue.ref(0),hydrate:()=>{},restore:async()=>({role:'CUSTOMER_B2B'}),loadOrganizations:async()=>businessSession.organizations.value,selectOrganization:id=>{businessSession.selectedOrganizationId.value=id;businessSession.organizationRevision.value++;},request};
 const ctx={...Vue,AbortController,URL,Intl,crypto:require('node:crypto').webcrypto,console,document:{querySelector:()=>null,getElementById:()=>null},window:{confirm:()=>state.confirm,getComputedStyle:()=>({display:'none'})},setTimeout:()=>0,clearTimeout:()=>{},
  useState:(key,init)=>{if(!(key in payload))payload[key]=init();return Vue.toRef(payload,key);},
  useHead:()=>{},onMounted:()=>{},onBeforeUnmount:()=>{},onBeforeRouteLeave:f=>hooks.leave.push(f),onBeforeRouteUpdate:f=>hooks.update.push(f),watch:()=>{},
  useRoute:()=>route,useRouter:()=>({push:async()=>{assert.equal(ctx.result.saving.value,false,'Own successful navigation must run after save unlock');},replace:async()=>{}}),
  useRuntimeConfig:()=>({public:{apiBase:'http://mock.invalid/api/v1',siteUrl:'http://mock.invalid'}}),
  useWorkspaceSession:()=>({token,user:Vue.ref({id:'mock-user',role:'ADMIN'})}),useB2BSession:()=>businessSession,
  useBusinessWorkspace:()=>({canUseSalon:Vue.ref(true),area:Vue.ref('salon')}),
  useWorkspaceAccess:()=>({can:()=>true}),useContextMenu:()=>({openContextMenu:()=>{},copyText:()=>{}}),useCatalogDialog:()=>({panel:Vue.ref(null),keyboard:()=>{}}),
  $fetch:request,
 };
 for(const name of ['useWorkspaceOperation','useWorkspaceEntityDraft']){const helper=stripTypeScriptTypes(fs.readFileSync(path.join(root,'composables',name+'.ts'),'utf8')).replace(/^export /gm,'');vm.runInNewContext(helper+'\nthis.'+name+'='+name,ctx);}
 for(const name of ['salon-calendar','salon-masters','product-images','request-key','confirmed-availability']){
  const helper=stripTypeScriptTypes(fs.readFileSync(path.join(root,'shared',name+'.ts'),'utf8')).replace(/^export /gm,'');vm.runInNewContext(helper,ctx);
 }
 ctx.createRequestKey=ctx.requestKey;
 const script=stripTypeScriptTypes(d.scriptSetup.content.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];?\r?$/gm,''));
 const members=file.includes('b2b')?'open,close,draft,dialog,dialogDirty,saveClient,load,refreshSection,startPortal,portalReady,clients,profile,cart,catalog,checkout,saving,error,productImage,failedImages':file.includes('organizations')?'openOrganization,saveOrganization,selected,actionBusy,error,openNewOrganization,closeEditor,organizationTab':'openCustomer,editCustomer,preview,previewError,recordOpen,saveCustomer,selected,actionBusy,error';
 vm.runInNewContext(script+'\nthis.result={'+members+'}',ctx);
 return {api:ctx.result,state,calls,hooks,route,session:businessSession};
}
async function main(){
 let count=0;function passed(){count++;}
 for(const file of ['pages/crm/customers.vue','pages/crm/organizations.vue']){
  const h=harness(file),a=h.api,open=a.editCustomer||a.openOrganization,save=a.saveCustomer||a.saveOrganization;
  if(a.openCustomer){await a.openCustomer({id:'fixture'});assert.equal(a.recordOpen.value,true);assert.match(a.previewError.value,/Mock failure/);passed();}
  await open({id:'fixture'});assert.equal(a.selected.value,null);assert.match(a.error.value,/Mock failure/);passed();
  h.state.handler=async endpoint=>endpoint.endsWith('/team')?[]:{id:'fixture',firstName:'Before',name:'Before',canWrite:true};await open({id:'fixture'});
  const field=file.includes('organizations')?'name':'firstName';
  a.selected.value[field]='Unsaved';assert.equal(h.hooks.leave.every(f=>f()),false);passed();
  h.state.handler=()=>{throw {data:{message:['Validation failed','Keep draft']}}};await save();assert.equal(a.selected.value[field],'Unsaved');assert.match(a.error.value,/Validation failed/);assert.equal(a.actionBusy.value,false);passed();
  let release;h.state.handler=()=>new Promise(resolve=>release=resolve);const pending=save();await save();assert.equal(a.actionBusy.value,true);assert.equal(h.hooks.leave.every(f=>f()),false);release({id:'fixture',name:'Saved'});h.state.handler=async()=>file.includes('organizations')?[]:{};await pending;assert.equal(a.actionBusy.value,false);passed();
 }
 const creating=harness('pages/crm/organizations.vue'),organization=creating.api;
 creating.state.handler=async()=>[];await organization.openNewOrganization();
 assert.equal(organization.selected.value.name,'');const beforeValidation=creating.calls.length;
 await organization.saveOrganization();assert.equal(creating.calls.length,beforeValidation,'Empty organization does not send a mutation');assert.match(organization.error.value,/название/);passed();
 organization.selected.value.name='  New salon  ';creating.state.handler=()=>{throw {data:{message:'Invalid tax details'}}};
 await organization.saveOrganization();assert.equal(organization.selected.value.name,'  New salon  ');assert.equal(organization.closeEditor(),false,'Rejected creation retains its draft and discard guard');assert.match(organization.error.value,/tax details/);passed();
 let creationBody;
 creating.state.handler=async(endpoint,options)=>{if(options.method==='POST'){creationBody=options.body;return {id:'created-organization',name:options.body.name,canWrite:true};}return [];};
 await organization.saveOrganization();assert.equal(creationBody.name,'New salon');assert.equal(organization.selected.value.id,'created-organization');assert.equal(organization.closeEditor(),true,'Saved creation is clean');passed();
 if(process.argv.includes('--crm-only')) { console.log(count+' CRM operation groups PASS: load errors, draft guards, validation, single-flight and save unlock. Network writes: 0.'); return; }
 const b=harness('pages/b2b.vue'),a=b.api;
 const recovery=harness('pages/b2b.vue');let restores=0;
 recovery.session.selectedOrganizationId.value='';
 recovery.session.restore=async()=>{restores++;throw new Error('Temporary offline');};
 await recovery.api.startPortal();assert.equal(recovery.api.portalReady.value,false);assert.match(recovery.api.error.value,/Данные входа сохранены/);
 recovery.session.restore=async()=>{restores++;return {id:'fixture-owner',role:'CUSTOMER_B2B'};};
 recovery.session.loadOrganizations=async()=>{recovery.session.selectedOrganizationId.value='fixture-organization';return recovery.session.organizations.value;};
 recovery.state.handler=async endpoint=>endpoint==='/b2b/profile'?{id:'fixture-organization',membership:{role:'OWNER',canOrder:true},capabilities:{salon:true}}:[];
 await recovery.api.refreshSection();assert.equal(restores,2,'Retry after initial /me outage must restore before organization selection changes can short-circuit load');assert.equal(recovery.api.portalReady.value,true);assert.equal(recovery.api.error.value,'');passed();
 a.open('client');a.draft.firstName='Draft';assert.equal(a.close(),false);assert.equal(a.dialog.value,'client');passed();
 await a.saveClient();assert.equal(a.draft.firstName,'Draft');assert.equal(a.dialog.value,'client');assert.match(a.error.value,/Mock failure/);passed();
 a.portalReady.value=true;b.state.handler=async(endpoint)=>endpoint==='/b2b/profile'?{id:'fixture-organization',membership:{role:'OWNER',canOrder:true},capabilities:{salon:true}}:[{id:'one'}];await a.load();assert.deepEqual(b.calls.slice(-2).map(x=>x.endpoint),['/b2b/profile','/b2b/clients']);passed();
 a.open('client');a.draft.firstName='Draft';
 let release;b.state.handler=()=>new Promise(resolve=>release=resolve);const pending=a.saveClient();await a.saveClient();assert.equal(a.saving.value,true);assert.equal(a.close(),false);release({id:'saved'});b.state.handler=async()=>[];await pending;assert.equal(a.saving.value,false);passed();
 a.profile.value={id:'fixture-organization',membership:{canOrder:true}};a.catalog.value=[{id:'p',variants:[{id:'v',b2bPrice:100,availabilityStatus:'CURRENT',available:1}]}];a.cart.v=1;
 a.catalog.value[0].variants[0].availabilityStatus='UNAVAILABLE';const beforeUnavailable=b.calls.length;
 await a.checkout();assert.equal(b.calls.length,beforeUnavailable,'Outdated 1C stock must not create an order');assert.equal(a.cart.v,1);assert.match(a.error.value,/остатки 1С уточняются/i);passed();
 a.catalog.value[0].variants[0].availabilityStatus='CURRENT';
 let failedKey;
 b.state.handler=async(endpoint,opts)=>{failedKey=opts.body.requestKey;throw {data:{message:'No confirmation yet'}};};
 await a.checkout();assert.equal(a.cart.v,1,'Unconfirmed checkout keeps the cart');assert.equal(a.saving.value,false);assert.match(a.error.value,/No confirmation/);assert.ok(failedKey);passed();
 let retryKey;
 b.state.handler=async(endpoint,opts)=>{if(opts.method==='POST'){retryKey=opts.body.requestKey;return {orderNumber:'MOCK'};}return [];};await a.checkout();assert.equal(a.cart.v,undefined);assert.equal(retryKey,failedKey,'Retry keeps its idempotency key to avoid a duplicate order');passed();
 const product={id:'p',images:[{url:'/broken.jpg'}]};a.failedImages.value.p='/broken.jpg';assert.equal(a.productImage(product),'');passed();
 console.log(count+' CRM/B2B operation groups PASS: failures, draft guards, single-flight, scoped reads, checkout unlock. Network writes: 0.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
