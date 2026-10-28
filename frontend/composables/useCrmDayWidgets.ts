import { createDefaultDayWidgets, DAY_WIDGETS, decodeDayWidgetSettings, encodeDayWidgetSettings, sanitizeDayWidgetLayout, type DayWidgetId, type DayWidgetLayout, type DayWidgetWidth } from '~/shared/crm-day-widgets';
import type { ComputedRef } from 'vue';

/** Employee display preferences are local to this browser; business data never enters storage. */
export function useCrmDayWidgets(allowed: ComputedRef<DayWidgetId[]>) {
  const session = useWorkspaceSession();
  const access = useWorkspaceAccess();
  const saved = ref<DayWidgetLayout>(createDefaultDayWidgets());
  const draft = ref<DayWidgetLayout>(createDefaultDayWidgets());
  const editing = ref(false), ready = ref(false), notice = ref(''), storageWarning = ref('');
  let mounted = false, owner = '', externalChange = false, lastAllowed: string | null = null;
  const identity = () => `${session.user.value?.id || ''}:${session.generation.value}`;
  const storageKey = () => session.user.value?.id ? `sarkisian-crm-day-widgets:v1:${encodeURIComponent(session.user.value.id)}` : null;
  const current = computed(() => editing.value ? draft.value : saved.value);
  const available = computed(() => ready.value ? current.value.filter(widget => allowed.value.includes(widget.id)) : []);
  const visible = computed(() => available.value.filter(widget => widget.visible));
  const hidden = computed(() => available.value.filter(widget => !widget.visible));
  const dirty = computed(() => editing.value && encodeDayWidgetSettings(saved.value) !== encodeDayWidgetSettings(draft.value));
  function hydrate() {
    if (!import.meta.client || !mounted) return;
    const nextOwner = identity();
    if (owner === nextOwner && ready.value) return;
    owner = nextOwner; editing.value = false; externalChange = false; notice.value = ''; storageWarning.value = '';
    saved.value = createDefaultDayWidgets(); draft.value = createDefaultDayWidgets(); ready.value = Boolean(session.user.value?.id);
    const key = storageKey(); if (!key) return;
    try {
      const result = decodeDayWidgetSettings(localStorage.getItem(key)); saved.value = result.layout; draft.value = sanitizeDayWidgetLayout(result.layout);
      if (result.recovered) storageWarning.value = 'Сохранённые настройки не удалось прочитать полностью. Показан восстановленный вид; сохраните его заново.';
    } catch { storageWarning.value = 'Браузер не разрешил прочитать настройки. Сейчас показан стандартный вид.'; }
  }
  function begin() { hydrate(); if (!ready.value) return; draft.value = sanitizeDayWidgetLayout(saved.value); editing.value = true; notice.value = ''; }
  function cancel() { if (externalChange) { owner = ''; hydrate(); } else { draft.value = sanitizeDayWidgetLayout(saved.value); editing.value = false; } notice.value = 'Изменения отменены.'; }
  function reset() { if (!editing.value) return; draft.value = createDefaultDayWidgets(); notice.value = 'Стандартный вид восстановлен в черновике. Нажмите «Сохранить» или отмените изменения.'; }
  function save() {
    if (!editing.value || !ready.value || owner !== identity()) return;
    const next = sanitizeDayWidgetLayout(draft.value), key = storageKey();
    let persisted = false;
    try { if (key) { const encoded = encodeDayWidgetSettings(next); localStorage.setItem(key, encoded); persisted = localStorage.getItem(key) === encoded; } } catch { /* Apply in memory and explicitly disclose the persistence failure. */ }
    saved.value = next; draft.value = sanitizeDayWidgetLayout(next); editing.value = false; externalChange = false;
    storageWarning.value = persisted ? '' : 'Браузер не разрешил сохранить настройки. Изменения применены до закрытия страницы и могут исчезнуть после перезагрузки.';
    notice.value = persisted ? 'Вид сохранён для вашего аккаунта в этом браузере.' : 'Вид применён на этой странице.';
  }
  function setWidth(id: DayWidgetId, width: number) {
    if (!editing.value || !allowed.value.includes(id)) return;
    const definition = DAY_WIDGETS.find(widget => widget.id === id);
    if (!definition?.widths.includes(width as DayWidgetWidth)) return;
    draft.value = draft.value.map(widget => widget.id === id ? { ...widget, width: width as DayWidgetWidth } : widget);
  }
  function setVisible(id: DayWidgetId, value: boolean) {
    if (!editing.value || !allowed.value.includes(id)) return;
    draft.value = draft.value.map(widget => widget.id === id ? { ...widget, visible: value } : widget);
  }
  function move(id: DayWidgetId, direction: -1 | 1) {
    if (!editing.value) return;
    const items = available.value.filter(widget => widget.visible), index = items.findIndex(widget => widget.id === id), other = items[index + direction];
    if (!other) return;
    const copy = [...draft.value], from = copy.findIndex(widget => widget.id === id), to = copy.findIndex(widget => widget.id === other.id);
    [copy[from], copy[to]] = [copy[to], copy[from]]; draft.value = copy;
    notice.value = `Виджет «${DAY_WIDGETS.find(widget => widget.id === id)?.title}» перемещён ${direction < 0 ? 'выше' : 'ниже'}.`;
  }
  function reorder(source: DayWidgetId, target: DayWidgetId) {
    if (!editing.value || source === target || !allowed.value.includes(source) || !allowed.value.includes(target)) return;
    const next = [...draft.value], from = next.findIndex(widget => widget.id === source), to = next.findIndex(widget => widget.id === target);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1); next.splice(to, 0, item); draft.value = next;
    notice.value = `Положение «${DAY_WIDGETS.find(widget => widget.id === source)?.title}» изменено.`;
  }
  function isEnabled(id: DayWidgetId) { return ready.value && saved.value.some(widget => widget.id === id && widget.visible) && allowed.value.includes(id); }
  watch([() => session.user.value?.id, session.generation], () => { owner = ''; ready.value = false; editing.value = false; saved.value = createDefaultDayWidgets(); draft.value = createDefaultDayWidgets(); if (mounted) hydrate(); }, { flush: 'sync' });
  watch(() => access.ready.value ? allowed.value.join(',') : null, signature => {
    // A routine token/access recheck temporarily hides the protected UI, but
    // must not discard the same employee's draft if their grants return intact.
    if (signature === null) return;
    if (lastAllowed !== null && lastAllowed !== signature && editing.value) { draft.value = sanitizeDayWidgetLayout(saved.value); editing.value = false; notice.value = 'Доступные разделы изменились. Несохранённая настройка отменена.'; }
    lastAllowed = signature;
  }, { immediate: true });
  const storageChanged = (event: StorageEvent) => { if (event.key !== storageKey()) return; if (editing.value) { externalChange = true; storageWarning.value = 'В другой вкладке изменён вид рабочего стола. Ваш черновик сохранится, если нажать «Сохранить»; «Отмена» загрузит вид из другой вкладки.'; return; } owner = ''; hydrate(); };
  onMounted(() => { mounted = true; hydrate(); window.addEventListener('storage', storageChanged); });
  onBeforeUnmount(() => { mounted = false; window.removeEventListener('storage', storageChanged); });
  return { ready, editing, dirty, notice, storageWarning, current, available, visible, hidden, saved, hydrate, begin, cancel, reset, save, setWidth, setVisible, move, reorder, isEnabled };
}
