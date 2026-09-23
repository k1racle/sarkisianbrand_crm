<script setup lang="ts">
import { Paperclip, Upload, FolderOpen, X, FileText } from '@lucide/vue';
const props = defineProps<{ taskId?: string; leadId?: string; publicationId?: string }>(), emit = defineEmits(['busy', 'changed']);
const apiRoot = props.publicationId ? '/crm/content-plan' : '/crm';
const filesPath = computed(() => props.publicationId ? `${props.publicationId}/files` : props.leadId ? `leads/${props.leadId}/files` : `tasks/${props.taskId}/files`);
const { request, upload, message, size } = useCrmDrive(apiRoot), { can } = useWorkspaceAccess();
const writable = computed(() => can(props.publicationId ? 'content_plan.write' : 'crm.write'));
const files = ref<any[]>([]), error = ref(''), busy = ref(false), loading = ref(false), picker = ref(false), preview = ref<any>(null), input = ref<HTMLInputElement | null>(null), progress = ref(0);
let sequence = 0;
watch(filesPath, async path => { const seq = ++sequence; loading.value = true; error.value = ''; files.value = []; try { const result = await request<any[]>(path); if (seq === sequence) files.value = result; } catch (e) { error.value = message(e); } finally { if (seq === sequence) loading.value = false; } }, { immediate: true });
watch(busy, value => emit('busy', value));
async function attach(node: any) {
  const attached = await request<any>(filesPath.value, { method: 'POST', body: { nodeId: node.id } });
  files.value = [attached, ...files.value.filter(x => x.nodeId !== node.id)];
  emit('changed');
}
async function choose(node: any) { if (busy.value) return; busy.value = true; error.value = ''; try { await attach(node); picker.value = false; } catch (e) { error.value = message(e); } finally { busy.value = false; } }
async function picked(event: Event) {
  const element = event.target as HTMLInputElement, selected = Array.from(element.files || []); element.value = '';
  if (busy.value) return; busy.value = true; error.value = '';
  for (const file of selected) {
    let uploaded = false;
    try { progress.value = 0; const node = await upload(file, 'TEAM', null, value => progress.value = value); uploaded = true; await attach(node); }
    catch (e) { error.value = `${file.name}: ${message(e)}${uploaded ? ' Файл сохранён на диске команды; прикрепите его через «С диска».' : ''}`; break; }
  }
  busy.value = false;
}
async function detach(item: any) {
  if (busy.value || !window.confirm('Убрать вложение из карточки? Сам файл останется на диске команды.')) return;
  busy.value = true; error.value = '';
  try { await request(`${filesPath.value}/${item.nodeId}`, { method: 'DELETE' }); files.value = files.value.filter(x => x.nodeId !== item.nodeId); emit('changed'); }
  catch (e) { error.value = message(e); } finally { busy.value = false; }
}
</script>
<template>
  <section class="crm-task-files"><header class="crm-work-header"><h3 class="crm-icon-heading"><Paperclip :size="18" aria-hidden="true" /><span>Вложения · {{ files.length }}</span></h3><div v-if="writable" class="crm-work-actions"><button class="crm-work-button crm-button" :disabled="busy" @click="input?.click()"><Upload :size="16" />Загрузить</button><button class="crm-work-button crm-button" :disabled="busy" @click="picker = true"><FolderOpen :size="16" />С диска</button><input ref="input" class="crm-visually-hidden" type="file" multiple @change="picked" /></div></header><p class="crm-muted">Вложения доступны команде и сохраняются в разделе «Файлы».</p><p v-if="error" class="crm-work-error" role="alert">{{ error }}</p><p v-if="loading">Загружаем вложения…</p><progress v-if="busy" :value="progress" max="100" aria-label="Загрузка вложения" /><p v-if="!loading && !files.length" class="crm-muted">Пока нет вложений</p><div v-for="item in files" :key="item.nodeId" class="crm-attachment"><button class="crm-work-button crm-button" @click="preview = item.node"><FileText :size="20" /><span>{{ item.node.name }}<small>{{ size(item.node.size) }}</small></span></button><button v-if="writable" class="crm-icon-button crm-button crm-button--icon" :disabled="busy" :aria-label="`Убрать вложение ${item.node.name}`" @click="detach(item)"><X :size="18" /></button></div>
    <CrmDrivePicker :api-root="apiRoot" v-if="picker" @close="!busy && (picker = false)" @choose="choose" /><CrmFilePreview :api-root="apiRoot" v-if="preview" :item="preview" @close="preview = null" />
  </section>
</template>
