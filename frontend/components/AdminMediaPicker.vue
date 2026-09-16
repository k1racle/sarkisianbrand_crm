<script setup lang="ts">
import { Images, Upload, X } from '@lucide/vue';
import { useId } from 'vue';
const props = withDefaults(defineProps<{ modelValue?: string | null; apiBase?: string; token?: string; disabled?: boolean; label?: string; showPreview?: boolean }>(), { modelValue: '', disabled: false, label: 'Изображение', showPreview: true });
type MediaAsset = { id: string; url: string; originalName: string; mime: string; size: number; createdAt: string };
const emit = defineEmits<{ 'update:modelValue': [value: string]; selected: [asset: MediaAsset] }>();
const config = useRuntimeConfig();
const session = useWorkspaceSession();
const apiBase = computed(() => props.apiBase ?? String(config.public.apiBase || ''));
const token = computed(() => props.token ?? session.token.value);
const dialogId = 'media-picker-' + useId();
const inputId = dialogId + '-url';
const opened = ref(false);
const dialogEl = ref<HTMLElement | null>(null);
const browser = ref<{ chooseFile: () => void; cancelPending: () => void } | null>(null);
const urlDraft = ref(props.modelValue || '');
const error = ref('');
const status = ref('');
let generation = 0;
let mounted = false;
let previousFocus: HTMLElement | null = null;
let previousOverflow = '';
function displayUrl(value: string) {
  const raw = String(value || '').trim();
  if (!raw || /[\x00-\x20\\]/.test(raw) || !/^(?:\/(?!\/)|https?:\/\/)/i.test(raw)) return '';
  try {
    if (/^\/api(?:\/|$)/.test(raw)) return new URL(raw, new URL(apiBase.value, String(config.public.siteUrl || 'http://localhost:3001')).origin).href;
    if (raw.startsWith('/')) return raw;
    const parsed = new URL(raw);
    return parsed.username || parsed.password ? '' : raw;
  } catch { return ''; }
}
const currentPreview = computed(() => displayUrl(props.modelValue || ''));
async function openLibrary(upload = false) {
  if (props.disabled || opened.value) return;
  const current = ++generation;
  error.value = ''; status.value = '';
  previousFocus = document.activeElement as HTMLElement;
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  opened.value = true;
  await nextTick();
  if (current !== generation || !opened.value || props.disabled || !mounted) return;
  dialogEl.value?.querySelector<HTMLButtonElement>('button')?.focus();
  if (upload) browser.value?.chooseFile();
}
function closeLibrary() {
  ++generation;
  browser.value?.cancelPending();
  opened.value = false;
  error.value = '';
  document.documentElement.style.overflow = previousOverflow;
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
}
function chooseAsset(asset: MediaAsset) {
  if (!opened.value || props.disabled) return;
  if (!/^\/api\/v1\/media\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/.test(asset.url)) {
    error.value = 'Сервер вернул некорректный адрес файла.'; return;
  }
  emit('update:modelValue', asset.url); emit('selected', asset);
  urlDraft.value = asset.url;
  closeLibrary();
  status.value = 'Изображение выбрано. Сохраните изменения в основном редакторе.';
}
function applyManualUrl() {
  if (props.disabled) return;
  const value = urlDraft.value.trim();
  error.value = ''; status.value = '';
  if (value && (!value.startsWith('/') || !displayUrl(value))) {
    error.value = 'Укажите путь файла, начинающийся с /. Абсолютный адрес хоста не сохраняется.'; return;
  }
  emit('update:modelValue', value);
  status.value = 'Путь применён к полю. Сохраните основной редактор.';
}
function dialogKeys(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialogEl.value) return;
  const controls = [...dialogEl.value.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=file]),[tabindex="0"]')];
  const first = controls[0], last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function escapeDialog(event: KeyboardEvent) {
  if (!opened.value || event.key !== 'Escape') return;
  event.preventDefault(); event.stopImmediatePropagation(); closeLibrary();
}
watch(() => props.modelValue, value => { urlDraft.value = value || ''; });
watch(() => [apiBase.value, token.value, props.disabled], () => {
  if (mounted && opened.value) closeLibrary(); else ++generation;
  error.value = ''; status.value = ''; urlDraft.value = props.modelValue || '';
});
onMounted(() => { mounted = true; document.addEventListener('keydown', escapeDialog, true); });
onBeforeUnmount(() => {
  mounted = false; ++generation; browser.value?.cancelPending();
  document.removeEventListener('keydown', escapeDialog, true);
  if (opened.value) document.documentElement.style.overflow = previousOverflow;
});
</script>

<template>
  <div class="admin-media-library admin-media-picker">
    <span class="aml-label">{{ label }}</span>
    <div v-if="showPreview && currentPreview" class="aml-current"><img :src="currentPreview" :alt="label" /></div>
    <div class="aml-actions">
      <button type="button" class="aml-button" :disabled="disabled" @click="openLibrary(true)"><Upload :size="18" /> Загрузить файл</button>
      <button type="button" class="aml-button aml-button--white" :disabled="disabled" @click="openLibrary(false)"><Images :size="18" /> Выбрать из библиотеки</button>
    </div>
    <details class="aml-manual"><summary>Указать путь вручную</summary><div class="aml-url-row"><input :id="inputId" v-model="urlDraft" type="text" maxlength="2048" :disabled="disabled" :aria-label="'Путь: ' + label" placeholder="/api/v1/media/files/…" /><button type="button" class="aml-button aml-button--white" :disabled="disabled" @click="applyManualUrl">Применить путь</button></div></details>
    <p v-if="error && !opened" class="aml-message" role="alert">{{ error }}</p>
    <p v-if="status && !opened" class="aml-message" role="status">{{ status }}</p>
    <Teleport to="body"><Transition name="aml-dialog">
      <div v-if="opened" class="admin-media-library aml-backdrop" @click.self="closeLibrary" @keydown.stop="dialogKeys">
        <section ref="dialogEl" class="aml-panel" role="dialog" aria-modal="true" :aria-labelledby="dialogId" :aria-describedby="dialogId + '-description'">
          <header class="aml-head"><div><p class="aml-eyebrow">ОБЩАЯ БИБЛИОТЕКА</p><h2 :id="dialogId">Выбрать изображение</h2></div><button type="button" class="aml-close" aria-label="Закрыть медиабиблиотеку" @click="closeLibrary"><X :size="20" /></button></header>
          <p :id="dialogId + '-description'" class="aml-help">Выбор меняет только поле текущего редактора. Сохраняется путь файла без адреса хоста.</p>
          <p v-if="error" class="aml-message" role="alert">{{ error }}</p>
          <AdminMediaBrowser ref="browser" :api-base="apiBase" :token="token" :disabled="disabled" show-cancel @select="chooseAsset" @cancel="closeLibrary" />
        </section>
      </div>
    </Transition></Teleport>
  </div>
</template>
