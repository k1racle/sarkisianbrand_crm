<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
const props = defineProps<{ blob: Blob }>();
const canvas = ref<HTMLCanvasElement | null>(null), stage = ref<HTMLElement | null>(null);
const pageNumber = ref(1), pages = ref(0), zoom = ref(1), loading = ref(true), error = ref(''), pageText = ref('');
const dimensions = ref({ width: '100%', height: 'auto' });
let documentTask: any, documentPdf: any, renderTask: any, observer: ResizeObserver | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0, disposed = false;
async function render() {
  if (!documentPdf || !canvas.value || !stage.value) return;
  const current = ++version; loading.value = true;
  renderTask?.cancel();
  try {
    const page = await documentPdf.getPage(pageNumber.value); if (disposed || current !== version) return;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min((Math.max(180, stage.value.clientWidth - 24) / base.width) * zoom.value, 2);
    const viewport = page.getViewport({ scale });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(6000000 / (viewport.width * viewport.height)));
    canvas.value.width = Math.max(1, Math.floor(viewport.width * pixelRatio)); canvas.value.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
    dimensions.value = { width: `${viewport.width}px`, height: `${viewport.height}px` };
    renderTask = page.render({ canvas: canvas.value, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
    await renderTask.promise;
    const text = await page.getTextContent();
    if (current === version && !disposed) pageText.value = text.items.map((item: any) => item.str || '').join(' ');
  } catch (e: any) { if (!disposed && current === version && e?.name !== 'RenderingCancelledException') error.value = 'Не удалось отобразить страницу. Документ можно скачать.'; }
  finally { if (current === version && !disposed) loading.value = false; }
}
watch([pageNumber, zoom], () => { error.value = ''; render(); });
onMounted(async () => {
  try {
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
    if (disposed) return;
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    documentTask = pdfjs.getDocument({ data: new Uint8Array(await props.blob.arrayBuffer()), useWasm: false, cMapUrl: '/crm/pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '/crm/pdf/fonts/' });
    documentPdf = await documentTask.promise; if (disposed) { documentPdf.destroy(); return; }
    pages.value = documentPdf.numPages; await render();
    let lastWidth = stage.value?.clientWidth;
    observer = new ResizeObserver(() => { if (stage.value?.clientWidth === lastWidth) return; lastWidth = stage.value?.clientWidth; clearTimeout(timer); timer = setTimeout(render, 150); });
    if (stage.value) observer.observe(stage.value);
  } catch (e: any) { if (!disposed) { error.value = e?.name === 'PasswordException' ? 'Документ защищён паролем. Скачайте его для открытия.' : 'Не удалось открыть PDF. Попробуйте скачать документ.'; loading.value = false; } }
});
onBeforeUnmount(() => { disposed = true; version++; clearTimeout(timer); observer?.disconnect(); renderTask?.cancel(); documentTask?.destroy(); });
</script>
<template><div class="crm-pdf-viewer"><nav class="crm-work-actions" aria-label="Страницы PDF"><button class="crm-icon-button crm-button crm-button--icon" aria-label="Предыдущая страница PDF" :disabled="loading || pageNumber <= 1" @click="pageNumber--"><ChevronLeft :size="18" /></button><span>Страница {{ pageNumber }} из {{ pages || '…' }}</span><button class="crm-icon-button crm-button crm-button--icon" aria-label="Следующая страница PDF" :disabled="loading || pageNumber >= pages" @click="pageNumber++"><ChevronRight :size="18" /></button><select class="crm-input" v-model.number="zoom" aria-label="Масштаб PDF"><option :value="1">По ширине</option><option :value="1.5">150%</option><option :value="2">200%</option></select></nav><p v-if="loading" role="status">Отрисовываем страницу…</p><p v-if="error" class="crm-work-error" role="alert">{{ error }}</p><div ref="stage" class="crm-pdf-stage"><canvas ref="canvas" :style="dimensions" role="img" :aria-label="`Страница ${pageNumber} PDF`" /></div><details v-if="pageText" class="crm-pdf-text"><summary>Текст страницы</summary><p>{{ pageText }}</p></details></div></template>
