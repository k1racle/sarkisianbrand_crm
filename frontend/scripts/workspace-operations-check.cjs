/* Execute actual CRM/B2B code against local promises only; no browser/API/DB. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');const Vue=require('vue');const {parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');
const root=path.resolve(__dirname,'..');
function harness(file){
 const source=fs.readFileSync(path.join(root,file),'utf8'),d=parse(source).descriptor;
 assert.deepEqual(compileTemplate({source:d.template.content,id:'check',filename:file,compilerOptions:{bindingMetadata:compileScript(d,{id:'check'}).bindings}}).errors,[]);
 const calls=[],hooks={leave:[],update:[]},state={confirm:false,handler:()=>{throw {data:{message:'Mock failure'}}}},route=Vue.reactive({query:{section:'clients'}}),token=Vue.ref('invalid-mock-token');
 const ctx={...Vue,AbortController,console,window:{confirm:()=>state.confirm},setTimeout:()=>0,clearTimeout:()=>{},
  onMounted:()=>{},onBeforeUnmount:()=>{},onBeforeRouteLeave:f=>hooks.leave.push(f),onBeforeRouteUpdate:f=>hooks.update.push(f),watch:()=>{},
  useRoute:()=>route,useRouter:()=>({push:async()=>{assert.equal(ctx.result.saving.value,false,'Own successful navigation must run after save unlock');}}),
  useRuntimeConfig:()=>({public:{apiBase:'http://mock.invalid/api/v1',siteUrl:'http://mock.invalid'}}),
  useWorkspaceSession:()=>({token,user:Vue.ref({id:'mock-user',role:'ADMIN'})}),useB2BSession:()=>({token,hydrate:()=>{},restore:async()=>({role:'CUSTOMER_B2B'})}),
  useWorkspaceAccess:()=>({can:()=>true}),useContextMenu:()=>({openContextMenu:()=>{},copyText:()=>{}}),useCatalogDialog:()=>({panel:Vue.ref(null),keyboard:()=>{}}),resolveProductImageUrl:x=>x,
  $fetch:async(endpoint,options={})=>{calls.push({endpoint,options});return state.handler(endpoint,options);},
 };
 for(const name of ['useWorkspaceOperation','useWorkspaceEntityDraft']){const helper=stripTypeScriptTypes(fs.readFileSync(path.join(root,'composables',name+'.ts'),'utf8')).replace(/^export /gm,'');vm.runInNewContext(helper+'\nthis.'+name+'='+name,ctx);}
 const script=stripTypeScriptTypes(d.scriptSetup.content.replace(/^import[^\n]*\n/gm,''));
 const members=file.includes('b2b')?'open,close,draft,dialog,dialogDirty,saveClient,load,portalReady,clients,profile,cart,catalog,checkout,saving,error,productImage,failedImages':file.includes('organizations')?'openOrganization,saveOrganization,selected,actionBusy,error,form,createOpen,closeCreate,createOrganization':'openCustomer,saveCustomer,selected,actionBusy,error';
 vm.runInNewContext(script+'\nthis.result={'+members+'}',ctx);
 return {api:ctx.result,state,calls,hooks,route};
}
async function main(){
 let count=0;function passed(){count++;}
 for(const file of ['pages/crm-customers.vue','pages/crm-organizations.vue']){
  const h=harness(file),a=h.api,open=a.openCustomer||a.openOrganization,save=a.saveCustomer||a.saveOrganization;
  await open({id:'fixture'});assert.equal(a.selected.value,null);assert.match(a.error.value,/Mock failure/);passed();
  h.state.handler=async()=>({id:'fixture',firstName:'Before',name:'Before'});await open({id:'fixture'});
  a.selected.value.firstName='Unsaved';assert.equal(h.hooks.leave.every(f=>f()),false);passed();
  h.state.handler=()=>{throw {data:{message:['Validation failed','Keep draft']}}};await save();assert.equal(a.selected.value.firstName,'Unsaved');assert.match(a.error.value,/Validation failed/);assert.equal(a.actionBusy.value,false);passed();
  let release;h.state.handler=()=>new Promise(resolve=>release=resolve);const pending=save();await save();assert.equal(a.actionBusy.value,true);assert.equal(h.hooks.leave.every(f=>f()),false);release({id:'fixture',name:'Saved'});h.state.handler=async()=>file.includes('organizations')?[]:{};await pending;assert.equal(a.actionBusy.value,false);passed();
 }
 const b=harness('pages/b2b.vue'),a=b.api;
 a.open('client');a.draft.firstName='Draft';assert.equal(a.close(),false);assert.equal(a.dialog.value,'client');passed();
 await a.saveClient();assert.equal(a.draft.firstName,'Draft');assert.equal(a.dialog.value,'client');assert.match(a.error.value,/Mock failure/);passed();
 a.portalReady.value=true;b.state.handler=async(endpoint)=>endpoint==='/b2b/profile'?{membership:{canOrder:true}}:[{id:'one'}];await a.load();assert.deepEqual(b.calls.slice(-2).map(x=>x.endpoint),['/b2b/profile','/b2b/clients']);passed();
 let release;b.state.handler=()=>new Promise(resolve=>release=resolve);const pending=a.saveClient();await a.saveClient();assert.equal(a.saving.value,true);assert.equal(a.close(),false);release({id:'saved'});b.state.handler=async()=>[];await pending;assert.equal(a.saving.value,false);passed();
 a.profile.value={membership:{canOrder:true}};a.catalog.value=[{id:'p',variants:[{id:'v',b2bPrice:100}]}];a.cart.v=1;
 b.state.handler=async(endpoint,opts)=>opts.method==='POST'?{orderNumber:'MOCK'}:[];await a.checkout();assert.equal(a.cart.v,undefined);passed();
 const product={id:'p',images:[{url:'/broken.jpg'}]};a.failedImages.value.p='/broken.jpg';assert.equal(a.productImage(product),'');passed();
 console.log(count+' CRM/B2B operation groups PASS: failures, draft guards, single-flight, scoped reads, checkout unlock. Network writes: 0.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
