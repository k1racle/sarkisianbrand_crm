export type StudioOffer = {id:string;discountPercent:number;coinPrice:number;validDays:number;minimumAmount:number;maximumDiscount:number|null;isActive:boolean}
export type StudioRun = {id:string;briefId:string;technique:'combined'|'hardware'|'classic';checkpoints:string[];startedAt:string}
export type StudioWallet = {balance:number;earned:number;upgrades:string[];activeRun:StudioRun|null;purchases:{id:string;code:string;discountPercent:number;coinPrice:number;expiresAt:string;minimumAmount:number;maximumDiscount:number|null;status:string}[]}
export function useStudioRewards() {
  const config=useRuntimeConfig(),{user,authHeaders}=useStorefront()
  const wallet=useState<StudioWallet|null>('studio-wallet',()=>null),offers=useState<StudioOffer[]>('studio-offers',()=>[])
  const settings=useState('studio-settings',()=>({enabled:true,dailyRunLimit:20,minimumRunSeconds:60})),loading=ref(false),error=ref('')
  const api=<T,>(path:string,options:any={})=>$fetch<T>(`/studio${path}`,{baseURL:config.public.apiBase,headers:authHeaders.value,timeout:10000,retry:0,...options})
  async function refresh() {
    loading.value=true;error.value=''
    const actor=user.value?.id
    try {
      const catalog=await api<{offers:StudioOffer[];settings:typeof settings.value}>('/rewards');offers.value=catalog.offers;settings.value=catalog.settings
      if(actor){const next=await api<StudioWallet>('/me');if(user.value?.id===actor)wallet.value=next}
      else if(!user.value)wallet.value=null
    }catch(e:any){error.value=e?.data?.message||'Не удалось загрузить магазин наград. Попробуйте ещё раз.'}
    finally{loading.value=false}
  }
  async function start(briefId:string){return api<StudioRun>('/runs',{method:'POST',body:{briefId}})}
  async function checkpoint(runId:string,technique:string,step:string){return api(`/runs/${runId}/checkpoint`,{method:'POST',body:{technique,step}})}
  async function complete(runId:string,design:any){const r=await api<{balance:number;reward:number}>(`/runs/${runId}/complete`,{method:'POST',body:{kind:design.kind,shape:design.shape,length:design.length,nails:design.nails.map((n:any)=>({color:n.color,pattern:n.pattern}))}});if(wallet.value){wallet.value.balance=r.balance;wallet.value.activeRun=null}return r}
  async function spend(itemId:string,requestId:string){const key=`studio-shop:${user.value?.id}:${itemId}`,pending=sessionStorage.getItem(key)||requestId;sessionStorage.setItem(key,pending);const r=await api<{balance:number;upgrades:string[]}>('/shop',{method:'POST',body:{itemId,requestId:pending}});if(wallet.value){wallet.value.balance=r.balance;wallet.value.upgrades=r.upgrades}sessionStorage.removeItem(key);return r}
  async function buy(offerId:string){
    const key=`studio-purchase:${user.value?.id}:${offerId}`
    const requestId=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,requestId)
    const result=await api<{balance:number}>('/rewards/buy',{method:'POST',body:{offerId,requestId}})
    if(wallet.value)wallet.value.balance=result.balance
    sessionStorage.removeItem(key);await refresh()
  }
  watch(()=>user.value?.id,()=>{wallet.value=null;void refresh()})
  return {user,wallet,offers,settings,loading,error,refresh,start,checkpoint,complete,spend,buy}
}
