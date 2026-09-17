/** Touch/pen counterpart of the existing native drag handlers. No new save endpoints. */
export default defineNuxtPlugin((app) => {
  const rows = ['.cs-category-row','.cs-badge-row','.banner-admin-card','.menu-admin-row','.social-admin-row','.sb-cma-row','.sb-cms-block-editor','.image-card','.sca-link-editor','.sca-order-row','.sca-subpanel','.stages>article'];
  type Move = { id:number; handle:HTMLButtonElement; row:HTMLElement; selector:string; x:number; y:number; started:boolean; target:HTMLElement|null; ghost:HTMLElement|null; data:Map<string,string> };
  let move:Move|null=null;
  function fire(target:HTMLElement,type:string) {
    const event=new Event(type,{bubbles:true,cancelable:true});
    const data=move!.data;
    Object.defineProperty(event,'dataTransfer',{value:{effectAllowed:'move',dropEffect:'move',files:[],setData:(key:string,value:string)=>data.set(key,value),getData:(key:string)=>data.get(key)||'',clearData:()=>data.clear()}});
    return target.dispatchEvent(event);
  }
  function finish(drop=false) {
    if(!move)return;
    const current=move;
    if(drop && current.started && current.target && current.target!==current.row)fire(current.target,'drop');
    if(current.started)fire(current.handle,'dragend');
    current.target?.classList.remove('workspace-sort-target');
    current.row.classList.remove('workspace-sort-dragging');
    current.ghost?.remove();
    try{current.handle.releasePointerCapture(current.id);}catch{/* Capture may already be released. */}
    move=null;
  }
  function down(event:PointerEvent) {
    if(move || !['touch','pen'].includes(event.pointerType) || !(event.target instanceof Element))return;
    const handle=event.target.closest<HTMLButtonElement>('button[draggable="true"]');
    if(!handle || handle.disabled || !handle.closest('.workspace-frame,.editor-drawer,.pipeline-settings'))return;
    const selector=rows.find(item=>handle.closest(item));
    const row=selector?handle.closest<HTMLElement>(selector):null;
    if(!selector || !row)return;
    move={id:event.pointerId,handle,row,selector,x:event.clientX,y:event.clientY,started:false,target:null,ghost:null,data:new Map()};
    try{handle.setPointerCapture(event.pointerId);}catch{/* Delegated events still work without capture. */}
  }
  function drag(event:PointerEvent) {
    if(!move || event.pointerId!==move.id)return;
    if(!move.started){
      if(Math.hypot(event.clientX-move.x,event.clientY-move.y)<8)return;
      if(!fire(move.handle,'dragstart')){finish();return;}
      move.started=true;move.row.classList.add('workspace-sort-dragging');
      move.ghost=document.createElement('div');move.ghost.className='workspace-sort-ghost';
      move.ghost.textContent=move.handle.getAttribute('aria-label')||'Перемещение элемента';document.body.appendChild(move.ghost);
    }
    event.preventDefault();
    move.ghost!.style.left=`${Math.max(8,Math.min(event.clientX+12,innerWidth-248))}px`;
    move.ghost!.style.top=`${Math.max(8,event.clientY-48)}px`;
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>(move.selector)||null;
    if(target!==move.target){move.target?.classList.remove('workspace-sort-target');move.target=target;if(target!==move.row)target?.classList.add('workspace-sort-target');}
    let scroll:HTMLElement|null=move.row.parentElement;
    while(scroll && !(scroll.scrollHeight>scroll.clientHeight && /auto|scroll/.test(getComputedStyle(scroll).overflowY)))scroll=scroll.parentElement;
    const box=scroll?.getBoundingClientRect();const top=box?.top||0,bottom=box?.bottom||innerHeight;
    const delta=event.clientY<top+40?-20:event.clientY>bottom-40?20:0;
    if(delta){if(scroll)scroll.scrollBy(0,delta);else window.scrollBy(0,delta);}
  }
  function up(event:PointerEvent){if(move?.id===event.pointerId){if(move.started)event.preventDefault();finish(true);}}
  function cancel(event:PointerEvent){if(move?.id===event.pointerId)finish();}
  app.hook('app:mounted',()=>{
    document.addEventListener('pointerdown',down,true);
    document.addEventListener('pointermove',drag,{capture:true,passive:false});
    document.addEventListener('pointerup',up,true);
    document.addEventListener('pointercancel',cancel,true);
  });
  app.vueApp.onUnmount(()=>{
    finish();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',drag,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);
  });
});
