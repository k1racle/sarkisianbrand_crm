<script setup lang="ts">
import { Download, FileText, X } from '@lucide/vue';
const props = defineProps<{ item: any; apiRoot?: string }>(), emit = defineEmits(['close']);
const { request, download, message, size } = useCrmDrive(props.apiRoot);
const loading = ref(true), error = ref(''), url = ref(''), text = ref('');
const pdf = shallowRef<Blob | null>(null);
const opened = ref(false);
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), () => emit('close'));
const supported = computed(() => ['image/png','image/jpeg','image/webp','application/pdf','text/plain'].includes(props.item.mime));
let generation = 0;
watch(() => props.item.id, async () => {
  const current = ++generation;
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = ''; text.value = ''; pdf.value = null; loading.value = true; error.value = '';
  try {
    if (!supported.value) return;
    if (props.item.mime === 'text/plain' && props.item.size > 1024 * 1024) { error.value = 'Для текста больше 1 МиБ доступно скачивание.'; return; }
    const blob = await request<Blob>(`drive/${props.item.id}/content`, { responseType: 'blob' });
    if (current !== generation) return;
    if (props.item.mime === 'application/pdf') pdf.value = blob;
    else if (props.item.mime === 'text/plain') text.value = await blob.text();
    else url.value = URL.createObjectURL(new Blob([blob], { type: props.item.mime }));
  } catch (e) { if (current === generation) error.value = message(e); }
  finally { if (current === generation) loading.value = false; }
}, { immediate: true });
async function save() { try { await download(props.item); } catch (e) { error.value = message(e); } }
onMounted(() => { opened.value = true; });
onBeforeUnmount(() => { generation++; if (url.value) URL.revokeObjectURL(url.value); });
</script>
<template>
  <div class="crm-work-overlay" @click.self="emit('close')">
    <section ref="panel" tabindex="-1" @keydown="keyboard" class="admin-dialog crm-file-preview" role="dialog" aria-modal="true" :aria-label="`Предпросмотр: ${item.name}`">
      <header class="crm-work-header"><div><h2>{{ item.name }}</h2><small>{{ size(item.size) }} · Закрытый файл CRM</small></div><button class="crm-work-button crm-button" @click="save"><Download :size="18" />Скачать</button><button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть предпросмотр" autofocus @click="emit('close')"><X :size="20" /></button></header>
      <div class="crm-preview-body">
        <p v-if="loading" role="status">Открываем файл…</p><p v-else-if="error" role="alert">{{ error }}</p>
        <img v-else-if="url && item.mime.startsWith('image/')" :src="url" :alt="item.name" />
        <CrmPdfViewer v-else-if="pdf" :key="item.id" :blob="pdf" />
        <pre v-else-if="item.mime === 'text/plain'">{{ text }}</pre>
        <div v-else class="crm-work-empty"><FileText :size="40" /><h3>Этот формат можно скачать</h3><p>Предпросмотр доступен для изображений, PDF и текстовых файлов.</p></div>
      </div>
    </section>
  </div>
</template>
