/** Native mouse dragging + touch long-press. Short swipes keep native scrolling. */
export function useCrmCardDrag(onDrop: (id: string, status: string, beforeId?: string) => void) {
  const active = ref(''), over = ref('');
  let timer: ReturnType<typeof setTimeout> | undefined, source: HTMLElement | null = null;
  let x = 0, y = 0, touchId = '', suppressUntil = 0;
  function clear() { if (timer) clearTimeout(timer); timer = undefined; source?.classList.remove('crm-card-lifted'); source = null; touchId = ''; active.value = ''; over.value = ''; }
  function move(event: TouchEvent) {
    const point = event.touches[0]; if (!point) return;
    if (!active.value) { if (Math.hypot(point.clientX - x, point.clientY - y) > 9) clear(); return; }
    event.preventDefault();
    const target = document.elementFromPoint(point.clientX, point.clientY)?.closest<HTMLElement>('[data-crm-drop]');
    over.value = target?.dataset.crmDrop || '';
    const board = target?.closest<HTMLElement>('.kanban,.board,.crm-content-board');
    if (board) { const rect = board.getBoundingClientRect(); if (point.clientX > rect.right - 45) board.scrollLeft += 24; if (point.clientX < rect.left + 45) board.scrollLeft -= 24; }
    if (point.clientY > window.innerHeight - 70) window.scrollBy(0, 15);
    if (point.clientY < 90) window.scrollBy(0, -15);
  }
  function end(event: TouchEvent) {
    if (active.value) {
      const point = event.changedTouches[0], element = document.elementFromPoint(point.clientX, point.clientY);
      const column = element?.closest<HTMLElement>('[data-crm-drop]'), card = element?.closest<HTMLElement>('[data-crm-card]');
      suppressUntil = Date.now() + 500;
      if (column?.dataset.crmDrop && card?.dataset.crmCard !== active.value) onDrop(active.value, column.dataset.crmDrop, card?.dataset.crmCard);
    }
    clear();
  }
  function touchStart(event: TouchEvent, id: string) {
    if (event.touches.length !== 1 || (event.target as HTMLElement).closest('button,input,textarea,select,a')) return;
    clear(); source = event.currentTarget as HTMLElement; x = event.touches[0].clientX; y = event.touches[0].clientY; touchId = id;
    timer = setTimeout(() => { active.value = touchId; source?.classList.add('crm-card-lifted'); navigator.vibrate?.(15); }, 350);
  }
  function start(event: DragEvent, id: string) {
    if ((event.target as HTMLElement).closest('button,input,textarea,select,a')) { event.preventDefault(); return; }
    active.value = id; if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }
  }
  function finish() { suppressUntil = Date.now() + 300; clear(); }
  const allowClick = () => Date.now() > suppressUntil;
  onMounted(() => { document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', end); document.addEventListener('touchcancel', clear); });
  onBeforeUnmount(() => { clear(); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); document.removeEventListener('touchcancel', clear); });
  return { active, over, start, finish, touchStart, allowClick };
}
