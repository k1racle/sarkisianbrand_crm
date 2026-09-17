/* Isolated editor contracts: no HTTP, browser, database or external services. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const vue=require('vue');
const {parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');
function harness(){
  const token=vue.ref(''),dirty=vue.ref(false),calls=[],mounted=[],unmounted=[];
  let fetcher=async()=>({revision:0,items:[]}),guard;
  const scope=vue.effectScope();
  const context={...vue,AbortController,window:{confirm:()=>false,addEventListener(){},removeEventListener(){}},
    useRuntimeConfig:()=>({public:{apiBase:'mock-only'}}),useWorkspaceSession:()=>({token,user:vue.ref({role:'ADMIN'})}),useWorkspaceAccess:()=>({can:()=>true}),
    onBeforeRouteLeave:fn=>{guard=fn;},onMounted:fn=>mounted.push(fn),onBeforeUnmount:fn=>unmounted.push(fn),
    $fetch:async(url,options)=>{calls.push({url,options});return fetcher(url,options);}};
  const source=fs.readFileSync(path.resolve(__dirname,'../composables/useCatalogSettingsEditor.ts'),'utf8').replace(/^export /gm,'');
  vm.runInNewContext(stripTypeScriptTypes(source,{mode:'strip'})+'\nglobalThis.makeEditor=useCatalogSettingsEditor;',context);
  const editor=scope.run(()=>context.makeEditor('/admin/catalog/categories',dirty));
  return {...editor,token,dirty,calls,setFetch:fn=>{fetcher=fn;},guard:()=>guard(),dispose(){unmounted.forEach(fn=>fn());scope.stop();}};
}
async function main(){
  for(const name of ['SiteCategoriesEditor','SiteProductBadgesEditor']){
    const filename=path.resolve(__dirname,'../components/storefront/'+name+'.vue');const parsed=parse(fs.readFileSync(filename,'utf8'),{filename});assert.deepEqual(parsed.errors,[]);
    const compiled=compileScript(parsed.descriptor,{id:name});assert.deepEqual(compileTemplate({source:parsed.descriptor.template.content,filename,id:name,compilerOptions:{bindingMetadata:compiled.bindings}}).errors,[]);
  }
  console.log('PASS category/badge SFCs and templates');
  {
    const h=harness();let accepted;
    await h.read(data=>{accepted=data;});assert.equal(h.calls.length,0);
    h.token.value='mock-jwt';await vue.nextTick();await new Promise(setImmediate);
    assert.equal(accepted.revision,0);assert.equal(h.calls.length,1);assert.equal(h.loading.value,false);h.dispose();
  }
  console.log('PASS token hydration starts previously deferred reads');
  {
    const h=harness();h.token.value='mock-jwt';await vue.nextTick();h.dirty.value=true;
    h.setFetch(async()=>{throw {data:{message:'Конфликт версии'}};});let accepted=false;
    assert.equal(await h.write('/layout','PATCH',{revision:0,nodes:[]},()=>{accepted=true;}),false);
    assert.equal(accepted,false);assert.equal(h.dirty.value,true);assert.equal(h.error.value,'Конфликт версии');assert.equal(h.busy.value,false);assert.equal(h.guard(),false);
    h.setFetch(async()=>({revision:1}));assert.equal(await h.write('/layout','PATCH',{revision:0,nodes:[]},data=>{assert.equal(data.revision,1);h.dirty.value=false;}),true);
    assert.equal(h.error.value,'');assert.equal(h.dirty.value,false);assert.equal(h.guard(),true);h.dispose();
  }
  console.log('PASS failed CAS retains draft; explicit retry accepts returned revision');
  {
    const h=harness();h.token.value='mock-jwt';await vue.nextTick();let release;
    h.setFetch(()=>new Promise(resolve=>{release=resolve;}));const pending=h.write('','POST',{},()=>{});
    assert.equal(h.busy.value,true);assert.equal(h.guard(),false);assert.equal(await h.write('','POST',{},()=>{}),false);assert.equal(h.calls.length,1);
    release({revision:1});assert.equal(await pending,true);assert.equal(h.busy.value,false);h.dispose();
  }
  console.log('PASS single-flight saves and navigation blocked while saving');
  {
    const h=harness();h.token.value='mock-jwt';await vue.nextTick();const pending=[];const accepted=[];
    h.setFetch(()=>new Promise(resolve=>pending.push(resolve)));const first=h.read(data=>accepted.push(data.revision));const second=h.read(data=>accepted.push(data.revision));
    pending[1]({revision:2});await second;pending[0]({revision:1});await first;assert.deepEqual(accepted,[2]);assert.equal(h.calls[0].options.signal.aborted,true);h.dispose();
  }
  console.log('PASS superseded reads cannot overwrite current settings');
  console.log('5 isolated catalog editor groups PASS. Actual network calls/writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
