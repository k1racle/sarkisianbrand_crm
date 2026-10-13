<script setup lang="ts">
import { X } from '@lucide/vue';
const { siteContent } = useStorefrontContent();
const { t } = useHomeLocale();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const id = useId();
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) open.value = false; }
function close() { open.value = false; trigger.value?.focus(); }
onMounted(() => document.addEventListener('pointerdown', outside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside));
</script>
<template>
  <div ref="root" class="sh-courses" @keydown.esc.stop="close">
    <button ref="trigger" :aria-expanded="open" :aria-controls="id" @click="open = !open">{{ t('Курсы') }}</button>
    <div v-if="open" :id="id" class="sh-courses-popover" role="status"><strong>{{ t('Курсы SARKISIAN') }}</strong><p>{{ t('Обучающие программы появятся здесь позже.') }}</p><a :href="`mailto:${siteContent.contacts.email}`">{{ t('Узнать об обучении') }}</a><button :aria-label="t('Закрыть информацию о курсах')" @click="close"><X :size="18" /></button></div>
  </div>
</template>
