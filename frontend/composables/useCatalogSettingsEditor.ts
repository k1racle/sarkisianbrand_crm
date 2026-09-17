export function useCatalogSettingsEditor(path:string, dirty:Ref<boolean>|ComputedRef<boolean>) {
  const config=useRuntimeConfig();const {token,user}=useWorkspaceSession();const access=useWorkspaceAccess();
  const busy=ref(false),loading=ref(false),error=ref(''),notice=ref('');
  const canEdit=computed(()=>!!token.value&&['ADMIN','CONTENT_MANAGER','MANAGER_SALES','SUPERVISOR'].includes(user.value?.role||'')&&access.can('catalog.write'));
  let generation=0;let controller:AbortController|undefined;
  let reader:((data:any)=>void)|undefined;
  watch(token,value=>{++generation;controller?.abort();loading.value=false;if(value&&reader)void read(reader);});
  function mayLeave(){return !busy.value && (!dirty.value||window.confirm('Изменения не сохранены. Покинуть редактор?'));}
  onBeforeRouteLeave(()=>mayLeave());
  function unload(event:BeforeUnloadEvent){if(dirty.value||busy.value){event.preventDefault();event.returnValue='';}}
  onMounted(()=>window.addEventListener('beforeunload',unload));
  onBeforeUnmount(()=>{++generation;controller?.abort();window.removeEventListener('beforeunload',unload);});
  function errorText(e:any){const m=e?.data?.message;return Array.isArray(m)?m.join('. '):m||'Не удалось выполнить действие. Изменения сохранены в черновике.';}
  async function read(accept:(data:any)=>void){
    reader=accept;
    if(!token.value||busy.value)return;
    controller?.abort();controller=new AbortController();const current=++generation;
    loading.value=true;error.value='';
    try{const data=await $fetch(path,{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${token.value}`},signal:controller.signal,timeout:20000});if(current===generation)accept(data);}
    catch(e){if(current===generation)error.value=errorText(e);}
    finally{if(current===generation)loading.value=false;}
  }
  async function write(suffix:string,method:'POST'|'PATCH',body:any,accept:(data:any)=>void){
    if(busy.value||loading.value||!canEdit.value||!token.value)return false;
    busy.value=true;error.value='';notice.value='';
    try{const data=await $fetch(path+suffix,{baseURL:config.public.apiBase,method,headers:{Authorization:`Bearer ${token.value}`},body,timeout:20000});accept(data);notice.value='Изменения сохранены.';return true;}
    catch(e){error.value=errorText(e);return false;}
    finally{busy.value=false;}
  }
  return {busy,loading,error,notice,canEdit,read,write,mayLeave};
}
