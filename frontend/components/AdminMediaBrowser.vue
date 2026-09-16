<script setup lang="ts">
import { Upload } from '@lucide/vue';
const props = withDefaults(defineProps<{ apiBase?: string; token?: string; disabled?: boolean; showCancel?: boolean }>(), { disabled: false, showCancel: false });
const emit = defineEmits<{ select: [asset: MediaAsset]; cancel: [] }>();
type MediaAsset = { id: string; url: string; originalName: string; mime: string; size: number; createdAt: string };
const config = useRuntimeConfig();
const session = useWorkspaceSession();
const apiBase = computed(() => props.apiBase ?? String(config.public.apiBase || ''));
const token = computed(() => props.token ?? session.token.value);
const fileInput = ref<HTMLInputElement | null>(null);
const q = ref('');
const page = ref(1);
const limit = 24;
const total = ref(0);
const assets = ref<MediaAsset[]>([]);
const loaded = ref(false);
const loading = ref(false);
const uploading = ref(false);
const error = ref('');
const status = ref('');
const selectedId = ref('');
const maxBytes = 8 * 1024 * 1024;
const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const controllers = new Set<AbortController>();
let listController: AbortController | undefined;
let listVersion = 0;
let identity = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let selectionIdentity = -1;
let mounted = false;
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)));
const selected = computed(() => assets.value.find(asset => asset.id === selectedId.value));
const busy = computed(() => props.disabled || uploading.value);
function canonicalUrl(value: string) {
  return /^\/api\/v1\/media\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/.test(value);
}
function displayUrl(value: string) {
  if (!canonicalUrl(value)) return '';
  try { return new URL(value, new URL(apiBase.value, String(config.public.siteUrl || 'http://localhost:3001')).origin).href; }
  catch { return ''; }
}
const supported = (asset: MediaAsset) => allowedMimes.has(asset.mime) && Boolean(displayUrl(asset.url));
const sizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
const dateLabel = (value: string) => Number.isNaN(new Date(value).getTime()) ? 'Дата не указана' : new Date(value).toLocaleDateString('ru-RU');
function failure(caught: any, fallback: string) {
  const code = caught?.statusCode || caught?.response?.status;
  if (code === 401) return 'Сессия завершилась. Войдите в рабочее пространство заново.';
  if (code === 403) return 'Недостаточно прав для доступа к медиабиблиотеке или загрузки файлов.';
  if (code === 413) return 'Сервер отклонил файл: допустимо не более 8 MiB.';
  if ([400, 415, 422].includes(code)) return 'Сервер отклонил файл или параметры запроса. Проверьте формат и размер изображения.';
  if (code === 503) return 'Медиабиблиотека временно недоступна. Попробуйте позже.';
  return fallback;
}
async function request<T>(path: string, options: Record<string, any> = {}, controller = new AbortController()) {
  if (!token.value) throw { statusCode: 401 };
  controllers.add(controller);
  try { return await $fetch<T>(path, { baseURL: apiBase.value, headers: { Authorization: `Bearer ${token.value}` }, signal: controller.signal, timeout: 30000, ...options }); }
  finally { controllers.delete(controller); }
}
async function load(targetPage = 1) {
  if (!mounted || props.disabled || uploading.value) return;
  if (timer) clearTimeout(timer); timer = undefined;
  listController?.abort(); listController = new AbortController();
  const currentIdentity = identity, version = ++listVersion;
  loading.value = true; loaded.value = false; error.value = ''; selectedId.value = '';
  try {
    const result = await request<{ items: MediaAsset[]; total: number; page: number; limit: number }>('/media', { query: { q: q.value.trim(), page: targetPage, limit } }, listController);
    if (currentIdentity !== identity || version !== listVersion || !mounted) return;
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0) throw new Error('Invalid media list');
    const items = result.items.map(asset => {
      if (!asset?.id || typeof asset.url !== 'string' || typeof asset.originalName !== 'string' || typeof asset.mime !== 'string' || !Number.isFinite(asset.size) || asset.size < 0) throw new Error('Invalid media asset');
      return { id: asset.id, url: asset.url, originalName: asset.originalName, mime: asset.mime, size: asset.size, createdAt: asset.createdAt };
    });
    total.value = result.total;
    if (targetPage > pages.value) { loading.value = false; await load(pages.value); return; }
    assets.value = items; page.value = targetPage; loaded.value = true;
  } catch (caught) { if (currentIdentity === identity && version === listVersion && mounted) error.value = failure(caught, 'Не удалось загрузить медиабиблиотеку. Повторите загрузку.'); }
  finally { if (currentIdentity === identity && version === listVersion) loading.value = false; }
}
function stopRequests() {
  ++identity; ++listVersion; controllers.forEach(controller => controller.abort());
  listController = undefined; if (timer) clearTimeout(timer); timer = undefined;
  selectionIdentity = -1; loading.value = false; uploading.value = false;
  if (fileInput.value) fileInput.value.value = '';
}
function chooseFile() {
  if (busy.value) return;
  selectionIdentity = identity;
  if (fileInput.value) { fileInput.value.value = ''; fileInput.value.click(); }
}
async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  input.value = '';
  if (!file || busy.value || selectionIdentity !== identity) return;
  selectionIdentity = -1; error.value = ''; status.value = '';
  if (!allowedMimes.has(file.type) || !/\.(?:jpe?g|png|webp|avif)$/i.test(file.name)) { error.value = 'Выберите JPEG, PNG, WebP или AVIF. Другие форматы не поддерживаются.'; return; }
  if (file.size <= 0 || file.size > maxBytes) { error.value = 'Размер файла должен быть больше нуля и не превышать 8 MiB.'; return; }
  listController?.abort(); ++listVersion; loading.value = false;
  const currentIdentity = identity;
  const body = new FormData(); body.append('file', file);
  uploading.value = true;
  try {
    // Do not set Content-Type: the browser supplies the multipart boundary.
    const asset = await request<MediaAsset>('/media/upload', { method: 'POST', body });
    if (currentIdentity !== identity || props.disabled || !mounted) return;
    if (!asset?.id || typeof asset.originalName !== 'string' || !supported(asset) || !Number.isFinite(asset.size) || asset.size <= 0) throw new Error('Invalid upload response');
    const safeAsset: MediaAsset = { id: asset.id, url: asset.url, originalName: asset.originalName, mime: asset.mime, size: asset.size, createdAt: asset.createdAt };
    uploading.value = false;
    status.value = 'Изображение загружено. Сохраните изменения в основном редакторе после выбора.';
    emit('select', safeAsset);
    await nextTick();
    if (mounted && currentIdentity === identity && !props.disabled) { await load(1); selectedId.value = safeAsset.id; }
  } catch (caught) { if (currentIdentity === identity) error.value = failure(caught, 'Не удалось подтвердить загрузку. Файл уже мог быть принят сервером — проверьте библиотеку перед повторной попыткой.'); }
  finally { if (currentIdentity === identity) uploading.value = false; }
}
function chooseSelected() {
  if (busy.value || loading.value || !selected.value || !supported(selected.value)) return;
  const asset = selected.value;
  emit('select', asset);
}
watch(q, () => { if (!mounted) return; if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = undefined; load(1); }, 250); });
watch(() => [apiBase.value, token.value, props.disabled], () => {
  stopRequests(); assets.value = []; total.value = 0; loaded.value = false; page.value = 1; selectedId.value = ''; error.value = ''; status.value = '';
  if (mounted && !props.disabled) load(1);
});
onMounted(() => { mounted = true; load(1); });
onBeforeUnmount(() => { mounted = false; stopRequests(); });
defineExpose({ chooseFile, refresh: load, cancelPending: stopRequests });
</script>

<template>
  <section class="admin-media-library aml-browser" aria-label="Медиабиблиотека">
    <input ref="fileInput" type="file" class="aml-file-input" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" :disabled="busy" aria-label="Загрузить изображение" @change="uploadFile" />
    <p class="aml-help">JPEG, PNG, WebP или AVIF, до 8 MiB. Сервер проверяет содержимое. Общие файлы не удаляются.</p>
    <p v-if="status" class="aml-message" role="status">{{ status }}</p>
          <div class="aml-toolbar"><label class="aml-search"><span>Поиск по названию</span><input v-model="q" type="search" maxlength="120" :disabled="busy" placeholder="Название файла" @keydown.enter.prevent="load(1)" /></label><button type="button" class="aml-button aml-button--white" :disabled="busy || loading" @click="load(page)">Обновить список</button><button type="button" class="aml-button" :disabled="busy" @click="chooseFile"><Upload :size="18" /> Загрузить файл</button></div>
          <p v-if="error" class="aml-message" role="alert">{{ error }} <button type="button" class="aml-button aml-button--white" :disabled="busy" @click="load(page)">Повторить загрузку списка</button></p>
          <p v-if="loading || uploading" class="aml-message" role="status">{{ uploading ? 'Загружаем изображение…' : 'Загружаем медиабиблиотеку…' }}</p>
          <div v-else-if="loaded && assets.length" class="aml-grid" role="group" aria-label="Изображения медиабиблиотеки">
            <button v-for="asset in assets" :key="asset.id" type="button" class="aml-asset" :class="{ 'is-selected': selectedId === asset.id }" :disabled="!supported(asset) || busy" :aria-pressed="selectedId === asset.id" :aria-label="`Выбрать ${asset.originalName}`" @click="selectedId = asset.id">
              <div class="aml-image"><img v-if="supported(asset)" :src="displayUrl(asset.url)" :alt="asset.originalName" loading="lazy" /><span v-else>Формат недоступен</span></div>
              <span class="aml-filename">{{ asset.originalName }}</span><small>{{ asset.mime.replace('image/', '').toUpperCase() }} · {{ sizeLabel(asset.size) }}</small><small>{{ dateLabel(asset.createdAt) }}</small>
            </button>
          </div>
          <p v-else-if="loaded && !error" class="aml-message">{{ q.trim() ? 'По этому запросу файлов не найдено.' : 'В медиабиблиотеке пока нет файлов.' }}</p>
          <nav v-if="pages > 1" class="aml-pagination" aria-label="Страницы медиабиблиотеки"><button type="button" class="aml-button aml-button--white" :disabled="loading || busy || page === 1" @click="load(page - 1)">Назад</button><span>Страница {{ page }} из {{ pages }}</span><button type="button" class="aml-button aml-button--white" :disabled="loading || busy || page === pages" @click="load(page + 1)">Далее</button></nav>
          <footer class="aml-footer"><span>{{ selected?.originalName || 'Изображение не выбрано' }}</span><div class="aml-actions"><button v-if="showCancel" type="button" class="aml-button aml-button--white" @click="emit('cancel')">Отмена</button><button type="button" class="aml-button" :disabled="!selected || !supported(selected) || loading || busy" @click="chooseSelected">Использовать изображение</button></div></footer>

  </section>
</template>

