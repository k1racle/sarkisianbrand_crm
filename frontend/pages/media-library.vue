<script setup lang="ts">
import { Copy, Images } from '@lucide/vue';
const selected = ref<any>(null);
const copied = ref(false);
const copyError = ref('');
useHead({ title: 'Медиатека — SARKISIAN', meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
async function copyUrl() {
  if (!selected.value?.url) return;
  copied.value = false; copyError.value = '';
  try { await navigator.clipboard.writeText(selected.value.url); copied.value = true; }
  catch { copyError.value = 'Не удалось скопировать ссылку. Выделите её в поле ниже.'; }
}
</script>

<template>
  <main data-v-ui-cdcb039fc38c class="admin-media-page">
    <header data-v-ui-cdcb039fc38c class="page-header"><div data-v-ui-cdcb039fc38c><p data-v-ui-cdcb039fc38c class="kicker">SARKISIAN / МЕДИАТЕКА</p><h1 data-v-ui-cdcb039fc38c>Медиатека</h1><span data-v-ui-cdcb039fc38c>Общие изображения для сайта и рабочих разделов. Загрузите файл или выберите уже добавленный.</span></div></header>
    <section data-v-ui-cdcb039fc38c class="admin-media-page__body">
      <AdminMediaBrowser @select="selected = $event; copied = false; copyError = ''" />
      <section data-v-ui-cdcb039fc38c v-if="selected" class="admin-media-selection" aria-labelledby="media-selection-title">
        <h2 data-v-ui-cdcb039fc38c id="media-selection-title"><Images data-v-ui-cdcb039fc38c :size="20" /> {{ selected.originalName }}</h2>
        <label data-v-ui-cdcb039fc38c>Ссылка на изображение<input data-v-ui-cdcb039fc38c :value="selected.url" readonly @focus="($event.target as HTMLInputElement).select()" /></label>
        <button data-v-ui-cdcb039fc38c type="button" @click="copyUrl"><Copy data-v-ui-cdcb039fc38c :size="18" /> {{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}</button>
        <p data-v-ui-cdcb039fc38c v-if="copyError" role="alert">{{ copyError }}</p>
      </section>
    </section>
  </main>
</template>


