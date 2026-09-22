<script setup lang="ts">
import { Folder, FileText, ChevronRight, X } from '@lucide/vue';
const props = withDefaults(defineProps<{ scope?: string; mode?: 'folder' | 'file'; exclude?: string[]; apiRoot?: string }>(), { scope: 'TEAM', mode: 'file', exclude: () => [], apiRoot: '/crm' });
const emit = defineEmits(['close', 'choose']);
const opened = ref(false);
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), () => emit('close'));
const { request, message } = useCrmDrive(props.apiRoot);
const parentId = ref<string | null>(null), data = ref<any>({ items: [], crumbs: [], total: 0 }), loading = ref(false), error = ref('');
let sequence = 0;
async function load(id: string | null = null, more = false) {
  const seq = ++sequence; loading.value = true; error.value = '';
  try {
    const result = await request<any>('drive', { query: { scope: props.scope, parentId: id || undefined, offset: more ? data.value.items.length : 0 } });
    if (seq !== sequence) return;
    data.value = { ...result, items: more ? [...data.value.items, ...result.items] : result.items }; parentId.value = id;
  } catch (e) { error.value = message(e); } finally { if (seq === sequence) loading.value = false; }
}
onMounted(() => { opened.value = true; load(); });
</script>
<template>
  <div class="crm-work-overlay" @click.self="emit('close')"><section ref="panel" tabindex="-1" @keydown="keyboard" class="admin-dialog crm-drive-picker" role="dialog" aria-modal="true" aria-label="Выбор на диске">
    <header class="crm-work-header"><h2>{{ mode === 'folder' ? 'Куда переместить' : 'Прикрепить с диска команды' }}</h2><button class="crm-icon-button crm-button crm-button--icon" aria-label="Закрыть выбор файла" @click="emit('close')"><X :size="20" /></button></header>
    <nav class="crm-drive-crumbs" aria-label="Путь к папке"><button class="crm-button crm-button--text" @click="load()">Корень диска</button><template v-for="crumb in data.crumbs" :key="crumb.id"><ChevronRight :size="14" /><button class="crm-button" @click="load(crumb.id)">{{ crumb.name }}</button></template></nav>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="loading" role="status">Загружаем…</p>
    <div class="crm-picker-items"><button v-for="item in data.items.filter((i: any) => !exclude.includes(i.id) && (mode === 'file' || i.kind === 'FOLDER'))" :key="item.id" :disabled="loading" class="crm-picker-item crm-button crm-button--row" @click="item.kind === 'FOLDER' ? load(item.id) : emit('choose', item)"><component :is="item.kind === 'FOLDER' ? Folder : FileText" :size="24" /><span>{{ item.name }}</span><ChevronRight v-if="item.kind === 'FOLDER'" :size="16" /></button></div>
    <p v-if="!loading && !data.items.length" class="crm-muted">Папка пуста</p>
    <button v-if="data.items.length < data.total" class="crm-work-button crm-button" :disabled="loading" @click="load(parentId, true)">Показать ещё</button>
    <footer class="crm-work-actions"><button class="crm-work-button crm-button" @click="emit('close')">Отмена</button><button v-if="mode === 'folder'" class="crm-primary-button crm-button crm-button--primary" :disabled="loading || !!error" @click="emit('choose', { id: parentId })">Переместить сюда</button></footer>
  </section></div>
</template>
