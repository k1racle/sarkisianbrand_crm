<script setup lang="ts">
import { Upload, FolderPlus, Folder, FileText, Search, LayoutGrid, List, Trash2, RotateCcw, Download, MoveRight, Pencil, X, ChevronRight, HardDrive, UsersRound, Clock3, Check } from '@lucide/vue';
useHead({ title: 'Файлы — SARKISIAN CRM' });
const { request, upload, download, message, size } = useCrmDrive();
const { can } = useWorkspaceAccess();
const writable = computed(() => can('crm.write'));
const scope = ref('PERSONAL'), view = ref('files'), layout = ref('grid'), search = ref(''), sort = ref('name');
const parentId = ref<string | null>(null), data = ref<any>({ items: [], crumbs: [], total: 0, used: 0, quota: 1024 ** 3 });
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), selected = ref<string[]>([]), preview = ref<any>(null), picker = ref(false);
const editing = ref<'folder' | 'rename' | null>(null), name = ref(''), fileInput = ref<HTMLInputElement | null>(null), hover = ref('');
const queue = ref<any[]>([]), uploading = computed(() => queue.value.some(item => item.state === 'loading' || item.state === 'waiting'));
const { panel: namePanel, keyboard: nameKeyboard } = useCatalogDialog(computed(() => !!editing.value), () => { if (!busy.value) editing.value = null; });
let sequence = 0;
async function load(more = false) {
  const seq = ++sequence; loading.value = true; error.value = '';
  try {
    const result = await request<any>('drive', { query: { scope: scope.value, parentId: parentId.value || undefined, view: view.value, search: search.value || undefined, sort: sort.value, direction: sort.value === 'name' ? 'asc' : 'desc', offset: more ? data.value.items.length : 0 } });
    if (seq !== sequence) return;
    data.value = { ...result, items: more ? [...data.value.items, ...result.items] : result.items };
    if (!more) selected.value = [];
  } catch (e) { if (seq === sequence) error.value = message(e); } finally { if (seq === sequence) loading.value = false; }
}
async function navigate(id: string | null = null) { parentId.value = id; view.value = 'files'; search.value = ''; await load(); }
function location(nextScope: string, nextView = 'files') { if (busy.value) return; scope.value = nextScope; view.value = nextView; parentId.value = null; search.value = ''; if (nextView === 'recent') sort.value = 'updatedAt'; load(); }
async function run(action: () => Promise<any>) {
  if (busy.value) return; busy.value = true; error.value = ''; notice.value = '';
  try { await action(); await load(); return true; } catch (e) { const failure = message(e); await load(); error.value = failure; return false; } finally { busy.value = false; }
}
function toggle(id: string) { selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id]; }
const chosen = computed(() => data.value.items.filter((item: any) => selected.value.includes(item.id)));
function open(item: any) { if (busy.value || view.value === 'trash') { toggle(item.id); return; } item.kind === 'FOLDER' ? navigate(item.id) : preview.value = item; }
function edit(kind: 'folder' | 'rename') { editing.value = kind; name.value = kind === 'rename' ? chosen.value[0]?.name || '' : ''; }
async function saveName() {
  if (!name.value.trim()) return;
  const ok = await run(() => editing.value === 'folder' ? request('drive/folders', { method: 'POST', body: { name: name.value, scope: scope.value, parentId: parentId.value } }) : request(`drive/${selected.value[0]}`, { method: 'PATCH', body: { name: name.value } }));
  if (ok) editing.value = null;
}
async function move(destination: { id: string | null }, ids = [...selected.value]) {
  const ok = await run(async () => { for (const id of ids) if (id !== destination.id) await request(`drive/${id}`, { method: 'PATCH', body: { parentId: destination.id } }); });
  if (ok) { picker.value = false; notice.value = 'Перемещено'; }
}
async function trash() {
  const ids = [...selected.value];
  if (!window.confirm(`Переместить в корзину: ${ids.length}? Можно будет восстановить. Вложения этих файлов временно исчезнут из задач.`)) return;
  await run(async () => { for (const id of ids) await request(`drive/${id}`, { method: 'DELETE' }); });
}
async function restore() { const ids = [...selected.value]; await run(async () => { for (const id of ids) await request(`drive/${id}/restore`, { method: 'POST' }); }); }
async function saveFile() { try { await download(chosen.value[0]); } catch (e) { error.value = message(e); } }
async function processQueue() {
  if (queue.value.some(item => item.state === 'loading')) return;
  for (const entry of queue.value.filter(item => item.state === 'waiting')) {
    entry.state = 'loading';
    try { await upload(entry.file, entry.scope, entry.parentId, p => entry.progress = p); entry.state = 'done'; }
    catch (e) { entry.state = 'error'; entry.error = message(e); }
  }
  await load();
  if (queue.value.some(item => item.state === 'waiting')) processQueue();
}
function addFiles(files: File[], target = parentId.value) {
  if (!writable.value || view.value === 'trash') return;
  for (const file of files) queue.value.push({ id: crypto.randomUUID(), file: markRaw(file), scope: scope.value, parentId: target, progress: 0, state: file.size > 30 * 1024 ** 2 || !file.size ? 'error' : 'waiting', error: 'Выберите непустой файл до 30 МиБ' });
  processQueue();
}
function picked(event: Event) { const input = event.target as HTMLInputElement; addFiles(Array.from(input.files || [])); input.value = ''; }
function retry(entry: any) { if (!entry.file.size || entry.file.size > 30 * 1024 ** 2) return; entry.state = 'waiting'; processQueue(); }
function dragStart(event: DragEvent, item: any) {
  if (!writable.value || busy.value || view.value === 'trash' || (event.target as HTMLElement).closest('button,input')) { event.preventDefault(); return; }
  const ids = selected.value.includes(item.id) ? selected.value : [item.id];
  event.dataTransfer?.setData('application/x-crm-drive', JSON.stringify(ids)); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}
function dragOver(event: DragEvent, target: string) {
  if (!writable.value || busy.value || view.value === 'trash') return;
  if (event.dataTransfer?.types.some(type => ['Files', 'application/x-crm-drive'].includes(type))) { event.preventDefault(); hover.value = target; }
}
function drop(event: DragEvent, target: string | null) {
  hover.value = ''; if (busy.value || !writable.value || view.value === 'trash') return;
  const transfer = event.dataTransfer; if (!transfer) return;
  if (transfer.files.length) {
    if (Array.from(transfer.items).some(item => item.webkitGetAsEntry?.()?.isDirectory)) { error.value = 'Создайте папку на диске и перетащите в неё файлы. Загрузка папки с устройства целиком пока не поддерживается.'; return; }
    addFiles(Array.from(transfer.files), target); return;
  }
  try { const ids = JSON.parse(transfer.getData('application/x-crm-drive')); if (Array.isArray(ids) && ids.every(id => data.value.items.some((x: any) => x.id === id))) move({ id: target }, ids); } catch { /* Unrelated drag data */ }
}
function beforeUnload(event: BeforeUnloadEvent) { if (uploading.value || editing.value && name.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => !uploading.value && (!editing.value || !name.value || window.confirm('Закрыть без сохранения названия?')));
onMounted(() => { load(); window.addEventListener('beforeunload', beforeUnload); });
onBeforeUnmount(() => { sequence++; window.removeEventListener('beforeunload', beforeUnload); });
</script>
<template>
  <main class="crm-work-page crm-drive-page crm-standard">
    <header class="crm-work-header crm-page-header"><div><p class="eyebrow">Рабочее пространство</p><h1>Файлы</h1><p class="crm-muted">Документы и материалы команды — всё по папкам.</p></div><div v-if="writable" class="crm-work-actions"><button class="crm-work-button crm-button" :disabled="busy || view !== 'files' || !!search" @click="edit('folder')"><FolderPlus :size="18" />Новая папка</button><button class="crm-primary-button crm-button crm-button--primary" :disabled="view === 'trash'" @click="fileInput?.click()"><Upload :size="18" />Загрузить файлы</button><input ref="fileInput" class="crm-visually-hidden" type="file" multiple aria-label="Выбрать файлы" @change="picked" /></div></header>
    <div class="crm-drive-layout">
      <aside class="crm-drive-nav" aria-label="Разделы диска"><button class="crm-button" :class="{ active: scope === 'PERSONAL' && view === 'files' }" @click="location('PERSONAL')"><HardDrive :size="20" />Мой диск</button><button class="crm-button" :class="{ active: scope === 'TEAM' && view === 'files' }" @click="location('TEAM')"><UsersRound :size="20" />Диск команды</button><button class="crm-button" :class="{ active: view === 'recent' }" @click="location(scope, 'recent')"><Clock3 :size="20" />Недавние</button><button class="crm-button" :class="{ active: view === 'trash' }" @click="location(scope, 'trash')"><Trash2 :size="20" />Корзина</button><div class="crm-drive-storage"><small>{{ scope === 'TEAM' ? 'Командный диск' : 'Личный диск' }}</small><progress :value="data.used" :max="data.quota" :aria-label="`Занято ${size(data.used)} из ${size(data.quota)}`" /><small>{{ size(data.used) }} из {{ size(data.quota) }}</small></div></aside>
      <section class="crm-drive-surface crm-surface" :class="{ 'is-drop-target': hover === 'surface' }" @dragover.stop="dragOver($event, 'surface')" @dragleave.self="hover = ''" @drop.prevent.stop="drop($event, parentId)">
        <div class="crm-drive-toolbar"><form class="crm-drive-search crm-input-group" @submit.prevent="load()"><Search :size="18" /><input class="crm-input" v-model="search" aria-label="Поиск файлов" placeholder="Найти файл или папку" /><button class="crm-work-button crm-button" type="submit">Найти</button></form><select class="crm-input" v-model="sort" aria-label="Сортировка файлов" @change="load()"><option value="name">По названию</option><option value="updatedAt">Сначала новые</option><option value="size">По размеру</option></select><div class="crm-work-actions"><button class="crm-icon-button crm-button crm-button--icon" :aria-pressed="layout === 'grid'" aria-label="Плитка" @click="layout = 'grid'"><LayoutGrid :size="18" /></button><button class="crm-icon-button crm-button crm-button--icon" :aria-pressed="layout === 'list'" aria-label="Список" @click="layout = 'list'"><List :size="18" /></button></div></div>
        <nav class="crm-drive-crumbs" aria-label="Папка"><button class="crm-button crm-button--text" @click="navigate()" @dragover.stop="dragOver($event, 'root')" @drop.prevent.stop="drop($event, null)">{{ scope === 'TEAM' ? 'Диск команды' : 'Мой диск' }}</button><template v-if="view === 'files' && !search" v-for="crumb in data.crumbs" :key="crumb.id"><ChevronRight :size="14" /><button class="crm-button" @click="navigate(crumb.id)" @dragover.stop="dragOver($event, crumb.id)" @drop.prevent.stop="drop($event, crumb.id)">{{ crumb.name }}</button></template><span v-if="search">/ Результаты поиска</span><span v-else-if="view !== 'files'">/ {{ view === 'trash' ? 'Корзина' : 'Недавние' }}</span></nav>
        <p class="crm-muted">{{ scope === 'TEAM' ? 'Доступно сотрудникам с доступом к CRM.' : 'Эти файлы доступны только вам.' }} {{ view === 'trash' ? 'Восстановите файл или папку, чтобы вернуть их в работу.' : 'До 30 МиБ на файл.' }}</p>
        <p v-if="error" class="crm-work-error" role="alert">{{ error }} <button class="crm-work-button crm-button" @click="load()">Повторить</button></p><p v-if="notice" role="status">{{ notice }}</p>
        <div v-if="selected.length" class="crm-drive-selection"><span>Выбрано: {{ selected.length }}</span><template v-if="writable"><button v-if="view === 'trash'" class="crm-work-button crm-button" :disabled="busy" @click="restore"><RotateCcw :size="16" />Восстановить</button><template v-else><button v-if="selected.length === 1" class="crm-work-button crm-button" :disabled="busy" @click="edit('rename')"><Pencil :size="16" />Название</button><button class="crm-work-button crm-button" :disabled="busy" @click="picker = true"><MoveRight :size="16" />Переместить</button><button class="crm-work-button danger crm-button crm-button--danger" :disabled="busy" @click="trash"><Trash2 :size="16" />В корзину</button></template></template><button v-if="view !== 'trash' && chosen.length === 1 && chosen[0].kind === 'FILE'" class="crm-work-button crm-button" @click="saveFile"><Download :size="16" />Скачать</button><button class="crm-icon-button crm-button crm-button--icon" aria-label="Снять выделение" @click="selected = []"><X :size="18" /></button></div>
        <p v-if="loading" role="status">Загружаем содержимое…</p>
        <div v-else-if="!data.items.length" class="crm-work-empty"><Folder :size="48" /><h2>{{ search ? 'Ничего не найдено' : view === 'trash' ? 'Корзина пуста' : 'Здесь пока нет файлов' }}</h2><p>{{ search ? 'Попробуйте другое название.' : view === 'trash' ? 'Удалённые файлы можно будет восстановить здесь.' : 'Перетащите файлы сюда или нажмите «Загрузить файлы».' }}</p></div>
        <div class="crm-drive-items" :class="`crm-drive-${layout}`"><article v-for="item in data.items" :key="item.id" class="crm-drive-item crm-item-card" :class="{ selected: selected.includes(item.id), 'is-drop-target': hover === item.id, 'is-folder': item.kind === 'FOLDER' }" :draggable="writable && !busy && view !== 'trash'" @dragstart="dragStart($event, item)" @dragend="hover = ''" @dragover.stop="item.kind === 'FOLDER' && dragOver($event, item.id)" @drop.prevent.stop="item.kind === 'FOLDER' && drop($event, item.id)">
          <input class="crm-drive-checkbox crm-check" type="checkbox" :checked="selected.includes(item.id)" :aria-label="`Выбрать ${item.name}`" @change="toggle(item.id)" />
          <button class="crm-file-open crm-button crm-card-action" :aria-label="`${item.kind === 'FOLDER' ? 'Открыть папку' : 'Предпросмотр'} ${item.name}`" @click="open(item)"><CrmDriveThumbnail :item="item" /><strong>{{ item.name }}</strong><small>{{ item.kind === 'FOLDER' ? 'Папка' : size(item.size) }}</small><time>{{ new Date(item.updatedAt).toLocaleDateString('ru-RU') }}</time></button>
        </article></div>
        <button v-if="data.items.length < data.total" class="crm-work-button crm-button" :disabled="loading" @click="load(true)">Показать ещё · {{ data.total - data.items.length }}</button>
      </section>
    </div>
    <section v-if="queue.length" class="crm-upload-queue" aria-label="Очередь загрузки"><header class="crm-work-header"><h2>Загрузки {{ queue.filter(x => x.state === 'done').length }}/{{ queue.length }}</h2><button v-if="!uploading" class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть загрузки" @click="queue = []"><X :size="18" /></button></header><p v-if="uploading" class="crm-muted">Дождитесь окончания загрузки перед переходом на другую страницу.</p><div v-for="entry in queue" :key="entry.id" class="crm-upload-row"><FileText :size="20" /><div><strong>{{ entry.file.name }}</strong><small v-if="entry.state === 'error'" class="crm-work-error">{{ entry.error }}</small><progress v-else-if="entry.state !== 'done'" :value="entry.progress" max="100" :aria-label="`Загрузка ${entry.file.name}`" /><small>{{ entry.state === 'done' ? 'Загружен' : entry.state === 'loading' ? `${entry.progress}%` : entry.state === 'waiting' ? 'В очереди' : 'Не загружен' }}</small></div><Check v-if="entry.state === 'done'" :size="18" /><button v-if="entry.state === 'error'" class="crm-work-button crm-button" @click="retry(entry)">Повторить</button></div></section>
    <div v-if="editing" class="crm-work-overlay" @click.self="!busy && (editing = null)"><form ref="namePanel" tabindex="-1" @keydown="nameKeyboard" class="admin-dialog crm-drive-picker" role="dialog" aria-modal="true" :aria-label="editing === 'folder' ? 'Новая папка' : 'Переименовать'" @submit.prevent="saveName"><h2>{{ editing === 'folder' ? 'Новая папка' : 'Переименовать' }}</h2><label class="crm-work-field">Название<input class="crm-input" v-model="name" autofocus required maxlength="180" :disabled="busy" /></label><p v-if="error" role="alert" class="crm-work-error">{{ error }}</p><footer class="crm-work-actions"><button type="button" class="crm-work-button crm-button" :disabled="busy" @click="editing = null">Отмена</button><button class="crm-primary-button crm-button crm-button--primary" :disabled="busy || !name.trim()">{{ busy ? 'Сохраняем…' : 'Сохранить' }}</button></footer></form></div>
    <CrmDrivePicker v-if="picker" :scope="scope" mode="folder" :exclude="selected" @close="!busy && (picker = false)" @choose="move" />
    <CrmFilePreview v-if="preview" :item="preview" @close="preview = null" />
  </main>
</template>
