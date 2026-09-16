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
  <main class="admin-media-page">
    <header class="page-header"><div><p class="kicker">SARKISIAN / МЕДИАТЕКА</p><h1>Медиатека</h1><span>Общие изображения для сайта и рабочих разделов. Загрузите файл или выберите уже добавленный.</span></div></header>
    <section class="admin-media-page__body">
      <AdminMediaBrowser @select="selected = $event; copied = false; copyError = ''" />
      <section v-if="selected" class="admin-media-selection" aria-labelledby="media-selection-title">
        <h2 id="media-selection-title"><Images :size="20" /> {{ selected.originalName }}</h2>
        <label>Ссылка на изображение<input :value="selected.url" readonly @focus="($event.target as HTMLInputElement).select()" /></label>
        <button type="button" @click="copyUrl"><Copy :size="18" /> {{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}</button>
        <p v-if="copyError" role="alert">{{ copyError }}</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.admin-media-page{min-width:0;color:var(--sb-ink);font-family:var(--sb-font)}
.admin-media-page__body{display:grid;gap:24px;padding:28px clamp(18px,3.5vw,54px)}
.admin-media-selection{display:grid;gap:16px;min-width:0;padding:24px;border:1px solid rgba(255,255,255,.9);border-radius:24px;background:rgba(255,255,255,.8);box-shadow:inset 0 1px 0 #fff}
.admin-media-selection h2{display:flex;align-items:center;gap:10px;overflow-wrap:anywhere;margin:0}
.admin-media-selection label{display:grid;gap:8px}.admin-media-selection input{min-width:0;width:100%}
.admin-media-selection button{justify-self:start;display:flex;align-items:center;gap:10px}
@media(max-width:800px){.admin-media-page__body{padding:20px 16px}.admin-media-selection{padding:20px}.admin-media-selection h2{font-size:var(--sb-type-title)}}
</style>
