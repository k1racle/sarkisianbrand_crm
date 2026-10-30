<script setup lang="ts">
import { FileText, PlayCircle } from '@lucide/vue';
import type { CourseAsset } from '~/shared/course-types';

const props = defineProps<{ courseId: string; lessonId: string; token: string }>();
const config = useRuntimeConfig();
const assets = ref<CourseAsset[]>([]), loading = ref(true), opening = ref(''), error = ref('');
const activeId = ref(''), mediaUrl = ref('');
const pdfBlob = ref<Blob | null>(null), pdfNotice = ref('');
let revision = 0, timer: ReturnType<typeof setTimeout> | undefined;
const base = computed(() => `/lms/my/${encodeURIComponent(props.courseId)}/lessons/${encodeURIComponent(props.lessonId)}/assets`);
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ` : `${Math.max(1, Math.ceil(bytes / 1024))} КБ`;
function stop() { clearTimeout(timer); activeId.value = ''; mediaUrl.value = ''; pdfBlob.value = null; pdfNotice.value = ''; }
async function load() {
  const current = ++revision, token = props.token; stop(); opening.value = ''; loading.value = true; error.value = ''; assets.value = [];
  try { const result = await $fetch<CourseAsset[]>(base.value, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token}` }, retry: 0 }); if (current === revision && token === props.token && Array.isArray(result)) assets.value = result; }
  catch { if (current === revision) error.value = 'Не удалось загрузить файлы урока. Проверьте соединение и попробуйте ещё раз.'; }
  finally { if (current === revision) loading.value = false; }
}
async function start(asset: CourseAsset, refresh = false) {
  if (opening.value || (!refresh && !props.token)) return;
  const current = revision, token = props.token;
  opening.value = asset.id; error.value = '';
  try {
    const result = await $fetch<{ url: string; expiresIn: number }>(`${base.value}/${encodeURIComponent(asset.id)}/session`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', retry: 0 });
    if (current !== revision || token !== props.token) return;
    // Never expose a bearer token or follow a server-provided external URL.
    const expected = `/api/v1/lms/media/${encodeURIComponent(asset.id)}`;
    if (result.url !== expected || !Number.isFinite(result.expiresIn) || result.expiresIn < 2 || !import.meta.client || new URL(config.public.apiBase, window.location.origin).origin !== window.location.origin) throw new Error('Неверный адрес');
    if (!refresh || activeId.value !== asset.id) { pdfBlob.value = null; pdfNotice.value = ''; }
    activeId.value = asset.id; mediaUrl.value = expected;
    if (asset.mimeType === 'application/pdf' && !pdfBlob.value) {
      if (asset.size > 50 * 1024 * 1024) pdfNotice.value = 'Этот PDF слишком большой для просмотра на странице. Скачайте его по ссылке ниже.';
      else {
        try {
          const response = await fetch(expected, { credentials:'same-origin', cache:'no-store' });
          if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) throw new Error('PDF unavailable');
          const blob = await response.blob();
          if (blob.size !== asset.size || blob.size > 50 * 1024 * 1024) throw new Error('Invalid PDF size');
          if (current !== revision || token !== props.token) return;
          pdfBlob.value = blob;
        } catch { if (current === revision && token === props.token) pdfNotice.value = 'Не удалось открыть PDF на странице. Попробуйте скачать его по ссылке ниже.'; }
      }
    }
    clearTimeout(timer); timer = setTimeout(() => { void start(asset, true); }, Math.max(1000, (result.expiresIn - Math.min(60, Math.floor(result.expiresIn / 2))) * 1000));
  } catch {
    if (current === revision) { stop(); error.value = 'Не удалось открыть файл или доступ к нему закончился. Обновите список и попробуйте ещё раз.'; }
  } finally { if (current === revision) opening.value = ''; }
}
onMounted(load);
watch(() => [props.courseId, props.lessonId, props.token], () => { void load(); });
onBeforeUnmount(() => { revision++; stop(); });
</script>

<template>
  <section class="site-course-assets" aria-label="Файлы урока">
    <p v-if="loading" role="status">Загружаем файлы…</p>
    <template v-else-if="assets.length"><h3>Материалы урока</h3><ul><li v-for="asset in assets" :key="asset.id"><component :is="asset.mimeType.startsWith('video/') ? PlayCircle : FileText" :size="18" aria-hidden="true"/><span>{{asset.filename}} <small>{{size(asset.size)}}</small></span><button type="button" class="site-courses-button" :disabled="!!opening" @click="start(asset)">{{opening===asset.id ? 'Открываем…' : activeId===asset.id ? 'Открыт' : 'Открыть'}}</button></li></ul>
      <template v-if="activeId && mediaUrl"><video v-if="assets.find(item => item.id === activeId)?.mimeType.startsWith('video/')" :src="mediaUrl" controls playsinline preload="metadata"/><img v-else-if="assets.find(item => item.id === activeId)?.mimeType.startsWith('image/')" :src="mediaUrl" alt="Изображение урока" loading="lazy"/><template v-else><CrmPdfViewer v-if="pdfBlob" :key="activeId" :blob="pdfBlob"/><p v-if="pdfNotice">{{pdfNotice}}</p><a :href="mediaUrl" download rel="noopener noreferrer">Скачать презентацию PDF</a></template></template>
    </template>
    <p v-if="error" role="alert">{{error}} <button type="button" class="site-courses-button" @click="load()">Обновить</button></p>
  </section>
</template>
