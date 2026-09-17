/** Isolated editor with save/discard guard, keyboard focus and route protection. */
export function useWorkspaceEntityDraft<T>(busy: Ref<boolean>) {
  const selected = ref<T | null>(null);
  const baseline = ref('');
  const draftDirty = computed(() => selected.value !== null && JSON.stringify(selected.value) !== baseline.value);
  const clone = (entity: T) => JSON.parse(JSON.stringify(entity));
  function setEntity(entity: T) { selected.value = clone(entity); baseline.value = JSON.stringify(selected.value); }
  function closeEditor() {
    if (busy.value) return false;
    if (draftDirty.value && !window.confirm('Закрыть карточку без сохранения изменений?')) return false;
    selected.value = null; baseline.value = ''; return true;
  }
  function markSaved(entity?: T) { if (entity) selected.value = clone(entity); baseline.value = JSON.stringify(selected.value); }
  onBeforeRouteLeave(() => !busy.value && (!draftDirty.value || window.confirm('Есть несохранённые изменения. Покинуть страницу?')));
  const { panel: entityPanel, keyboard: entityKeys } = useCatalogDialog(computed(() => selected.value !== null), closeEditor);
  return { selected, draftDirty, setEntity, closeEditor, markSaved, entityPanel, entityKeys };
}
