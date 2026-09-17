/* Actual parent editor logic with in-memory API fixtures. No network/DB/browser writes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'),Vue=require('vue'),{parse}=require('@vue/compiler-sfc');
const filename=path.resolve(__dirname,'../components/workspace/StoreWorkspacePage.vue');
const script=parse(fs.readFileSync(filename,'utf8')).descriptor.scriptSetup.content.replace(/^import .*;\s*$/gm,'');
function harness(){
 const states=new Map(),calls=[],guards={},settings={confirm:false,handler:()=>{throw new Error('Unexpected fixture request');}};
 const context={...Vue,URL,AbortController,defineProps:()=>({pageSection:'appearance'}),useRoute:()=>({path:'/admin-workspace/appearance',query:{}}),
  useRuntimeConfig:()=>({public:{apiBase:'http://mock.invalid/api/v1'}}),
  useWorkspaceSession:()=>({token:Vue.ref('invalid-test-token'),user:Vue.ref({id:'mock-admin',role:'ADMIN'})}),
  useWorkspaceAccess:()=>({can:()=>true}),useContextMenu:()=>({openContextMenu(){},copyText(){}}),
  useState:(key,initial)=>{if(!states.has(key))states.set(key,Vue.ref(initial()));return states.get(key);},
  useCatalogDialog:()=>({panel:Vue.ref(null),keyboard(){}}),watch:(source,cb,options)=>{if(options?.immediate)cb(source());},
  onMounted(){},onBeforeUnmount(){},onBeforeRouteLeave:cb=>guards.leave=cb,onBeforeRouteUpdate:cb=>guards.update=cb,
  window:{confirm:()=>settings.confirm},confirm:()=>settings.confirm,setTimeout:()=>0,clearTimeout(){},
  document:{querySelector:()=>null},navigateTo:async()=>{},
  $fetch:async(endpoint,options)=>{calls.push({endpoint,options});return settings.handler(endpoint,options);},
 };
 vm.runInNewContext(stripTypeScriptTypes(script,{mode:'strip'})+'\nglobalThis.api={storefrontBanners,appearanceBaseline,appearanceSnapshot,appearanceDirty,appearanceOrderDirty,bannerEditor,bannerEditorDirty,bannerEditorError,savingAppearance,openBannerEditor,closeBannerEditor,addStorefrontBanner,saveBannerEditor,deleteStorefrontBanner,moveAppearance};',context,{filename});
 const api=context.api;api.storefrontBanners.value=[{id:'a',title:'Первый',imageUrl:'/storefront/hero.jpg',sortOrder:0,isActive:true},{id:'b',title:'Второй',imageUrl:'/storefront/hero.jpg',sortOrder:1,isActive:true}];api.appearanceBaseline.value=api.appearanceSnapshot();
 return {api,calls,guards,settings};
}
async function main(){
 {
  const {api:a,guards:g,settings:s}=harness();a.openBannerEditor(a.storefrontBanners.value[0]);a.bannerEditor.value.title='Черновик';
  assert.equal(a.storefrontBanners.value[0].title,'Первый');assert.equal(a.appearanceDirty.value,true);
  assert.equal(a.closeBannerEditor(),false);assert.equal(g.leave(),false);
  s.confirm=true;assert.equal(a.closeBannerEditor(),true);assert.equal(a.appearanceDirty.value,false);
  a.addStorefrontBanner();assert.equal(a.storefrontBanners.value.length,2);a.closeBannerEditor();a.moveAppearance('banners','a',1);assert.equal(a.storefrontBanners.value[0].id,'b');
 }
 {
  const {api:a,settings:s,calls}=harness();a.openBannerEditor(a.storefrontBanners.value[0]);a.bannerEditor.value.title='Черновик';s.handler=()=>{throw new Error('fixture failure');};
  await a.saveBannerEditor();assert.equal(a.bannerEditor.value.title,'Черновик');assert.equal(a.storefrontBanners.value[0].title,'Первый');assert.equal(a.savingAppearance.value,false);assert.ok(a.bannerEditorError.value);
  s.handler=()=>({id:'a',title:'Сохранён',imageUrl:'/storefront/hero.jpg',sortOrder:0,isActive:true});await a.saveBannerEditor();
  assert.equal(a.bannerEditor.value,null);assert.equal(a.storefrontBanners.value[0].title,'Сохранён');assert.equal(a.appearanceDirty.value,false);assert.equal(calls.length,2);
 }
 {
  const {api:a,settings:s,calls,guards:g}=harness();a.openBannerEditor(a.storefrontBanners.value[0]);let finish;s.handler=()=>new Promise(resolve=>finish=resolve);
  const pending=a.saveBannerEditor();assert.equal(a.savingAppearance.value,true);assert.equal(a.closeBannerEditor(),false);assert.equal(g.leave(),false);
  await a.saveBannerEditor();await a.deleteStorefrontBanner(a.storefrontBanners.value[1]);assert.equal(calls.length,1);
  finish({id:'a',title:'Первый',imageUrl:'/storefront/hero.jpg',sortOrder:0,isActive:true});await pending;assert.equal(a.savingAppearance.value,false);
 }
 {
  const {api:a,settings:s,calls}=harness();a.addStorefrontBanner();await a.saveBannerEditor();assert.equal(calls.length,0);assert.ok(a.bannerEditorError.value);a.bannerEditor.value.imageUrl='/storefront/hero.jpg';
  s.handler=()=>({id:'new-saved',imageUrl:'/storefront/hero.jpg',sortOrder:2,isActive:true});await a.saveBannerEditor();assert.equal(a.storefrontBanners.value.length,3);assert.equal(a.storefrontBanners.value[2].id,'new-saved');assert.equal(a.appearanceDirty.value,false);
 }
 {
  const {api:a,settings:s}=harness();s.confirm=true;s.handler=()=>{throw new Error('delete failure');};await a.deleteStorefrontBanner(a.storefrontBanners.value[0]);assert.equal(a.storefrontBanners.value.length,2);assert.equal(a.savingAppearance.value,false);
  s.handler=()=>({});await a.deleteStorefrontBanner({...a.storefrontBanners.value[0]});assert.equal(a.storefrontBanners.value.length,1);assert.equal(a.storefrontBanners.value[0].id,'b');assert.equal(a.appearanceDirty.value,false);
 }
 console.log('Banner isolated draft, discard guard, failed retry, single-flight, create/delete and local reorder PASS. Actual API/DB writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
