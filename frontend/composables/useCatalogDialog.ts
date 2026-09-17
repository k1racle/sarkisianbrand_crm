export function useCatalogDialog(open:ComputedRef<boolean>,close:()=>unknown){
  const panel=ref<HTMLElement|null>(null);let previousFocus:HTMLElement|null=null;let previousOverflow='';let locked=false;
  function release(){if(!locked)return;locked=false;document.documentElement.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  watch(open,async value=>{if(!import.meta.client)return;if(value){if(!locked){previousFocus=document.activeElement as HTMLElement;previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';locked=true;}await nextTick();if(open.value)panel.value?.focus();}else release();});
  function keyboard(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab'||!panel.value)return;
    const controls=[...panel.value.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);if(!first){event.preventDefault();panel.value.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.value)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===panel.value)){event.preventDefault();first.focus();}
  }
  onBeforeUnmount(()=>{if(import.meta.client)release();});return {panel,keyboard};
}
