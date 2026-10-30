<script setup lang="ts">
import { FileText, UploadCloud } from '@lucide/vue';
import type { CourseAsset } from '~/shared/course-types';

const props = defineProps<{ lessonId: string; kind: string; editable: boolean; allowUpload: boolean }>();
const emit = defineEmits<{ busyChange: [busy: boolean]; changed: [] }>();
const session = useWorkspaceSession();
const assets = ref<CourseAsset[]>([]), selected = ref<File | null>(null);
const loading = ref(true), uploading = ref(false), deleting = ref(''), error = ref(''), notice = ref('');
let revision = 0;
let pending: AbortController | null = null;
const base = computed(() => `/lms/admin/lessons/${encodeURIComponent(props.lessonId)}/assets`);
const accept = '.mp4,.webm,.pdf,.jpg,.jpeg,.png,.webp,video/mp4,video/webm,application/pdf,image/jpeg,image/png,image/webp';
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ` : `${Math.max(1, Math.ceil(bytes / 1024))} КБ`;
async function load() {
  const current = ++revision; loading.value = true; error.value = '';
  try { const result = await session.request<CourseAsset[]>(base.value); if (current === revision) assets.value = Array.isArray(result) ? result : []; }
  catch { if (current === revision) error.value = 'Не удалось загрузить список файлов. Попробуйте ещё раз.'; }
  finally { if (current === revision) loading.value = false; }
}
function pick(event: Event) {
  const input = event.target as HTMLInputElement;
  selected.value = input.files?.[0] || null; input.value = ''; error.value = ''; notice.value = '';
}
function clearSelection() { selected.value = null; error.value = ''; notice.value = ''; }
async function upload() {
  const file = selected.value;
  if (!file || uploading.value || !props.editable || !props.allowUpload) return;
  if (!/\.(mp4|webm|pdf|jpg|jpeg|png|webp)$/i.test(file.name)) { error.value = 'Выберите видео MP4 или WebM, презентацию PDF либо изображение JPEG, PNG или WebP.'; return; }
  if (/\.(jpg|jpeg|png|webp)$/i.test(file.name) && file.size > 8 * 1024 * 1024) { error.value = 'Изображение должно быть не больше 8 МиБ.'; return; }
  if (file.size < 5 || file.size > 500 * 1024 * 1024) { error.value = 'Размер файла должен быть от 5 байт до 500 МиБ.'; return; }
  uploading.value = true; emit('busyChange', true); error.value = ''; notice.value = ''; pending = new AbortController();
  try {
    await session.request(base.value, { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, timeout: 20 * 60 * 1000, signal: pending.signal });
    selected.value = null; notice.value = 'Файл добавлен к уроку.'; await load(); emit('changed');
  } catch (e: any) {
    if (!pending.signal.aborted) { error.value = typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось подтвердить загрузку. Обновите список файлов перед повторной попыткой.'; }
  } finally { uploading.value = false; emit('busyChange', false); pending = null; }
}
async function remove(asset: CourseAsset) {
  if (!props.editable || asset.everPublished !== false || uploading.value || deleting.value) return;
  if (!window.confirm(`Удалить файл «${asset.filename}»? Отменить это действие нельзя.`)) return;
  deleting.value = asset.id; emit('busyChange', true); error.value = ''; notice.value = '';
  try {
    const result = await session.request<{ status: 'deleted' | 'cleanup_pending' }>(`${base.value}/${encodeURIComponent(asset.id)}`, { method: 'DELETE', timeout: 30000 });
    if (result.status !== 'deleted' && result.status !== 'cleanup_pending') throw new Error('Некорректный ответ');
    notice.value = result.status === 'deleted' ? 'Файл удалён.' : 'Файл убран из урока. Очистка хранилища завершится позже.';
    await load(); emit('changed');
  } catch (e: any) { error.value = typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось подтвердить удаление. Обновите список файлов.'; }
  finally { deleting.value = ''; emit('busyChange', false); }
}
onMounted(load);
onBeforeUnmount(() => { revision++; pending?.abort(); });
</script>

<template>
  <section class="course-asset-editor" aria-label="Файлы урока">
    <div><h3>Видео, изображения и презентации</h3><p v-if="allowUpload" class="course-hint">Добавляйте к уроку видео MP4 или WebM и презентации PDF до 500 МиБ, изображения JPEG, PNG или WebP до 8 МиБ. Материалы доступны ученикам после публикации курса; в открытом просмотре они не показываются.</p><p v-else class="course-hint">Файлы, которые ещё не публиковались, можно удалить.</p></div>
    <p v-if="loading" class="course-hint" role="status">Загружаем список файлов…</p>
    <ul v-else-if="assets.length" class="course-asset-list"><li v-for="asset in assets" :key="asset.id"><FileText :size="17" aria-hidden="true"/><span>{{asset.filename}} <small v-if="!asset.isPublished && !asset.everPublished" class="course-lesson-state">Не опубликован</small></span><small>{{size(asset.size)}}</small><button v-if="editable && asset.everPublished===false" type="button" class="crm-button" :aria-label="`Удалить файл ${asset.filename}`" :disabled="uploading || !!deleting" @click="remove(asset)">{{deleting===asset.id ? 'Удаляем…' : 'Удалить'}}</button></li></ul>
    <p v-else class="course-hint">Файлы ещё не добавлены.</p>
    <p v-if="error" class="course-error" role="alert">{{error}} <button v-if="!uploading" class="crm-button" type="button" @click="load">Обновить список</button></p>
    <p v-if="notice" class="course-success" role="status">{{notice}}</p>
    <template v-if="editable && allowUpload"><label class="course-asset-picker"><span class="crm-button">Выбрать видео, изображение или PDF</span><input type="file" aria-label="Выбрать файл" :accept="accept" :disabled="uploading || !!deleting" @change="pick"/></label><p v-if="selected" class="course-asset-filename">Выбран файл: {{selected.name}} · {{size(selected.size)}}</p>
    <div class="course-actions"><button class="crm-button" type="button" :disabled="!selected || uploading || !!deleting" @click="upload"><UploadCloud :size="16"/> {{uploading ? 'Загружаем файл…' : 'Добавить файл'}}</button><button v-if="selected && !uploading" class="crm-button" type="button" :disabled="!!deleting" @click="clearSelection">Отменить выбор</button></div></template>
    <p v-else-if="!editable" class="course-hint">Добавление файлов недоступно для архивного курса.</p>
    <p v-if="uploading" class="course-hint" role="status">Не закрывайте урок до окончания загрузки.</p>
  </section>
</template>
