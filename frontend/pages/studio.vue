<script setup lang="ts">
import SarkisianStudio from '~/components/sarkisian-studio/SarkisianStudio.vue'

useHead({
  title: 'SARKISIAN Studio — игра для мастеров',
  meta: [{
    name: 'description',
    content: 'Создавайте дизайн ногтей, принимайте игровые заказы и развивайте свою студию в браузерной игре SARKISIAN.',
  }],
})
</script>

<template>
  <SiteShell editorial>
    <div class="sb-studio-page">
      <ClientOnly>
        <SarkisianStudio asset-base="/studio-assets/" site-base="/" />
        <template #fallback>
          <div class="sb-studio-loading" role="status">Открываем студию…</div>
        </template>
      </ClientOnly>
    </div>
  </SiteShell>
</template>

<style scoped>
.sb-studio-page {
  padding: clamp(12px, 2.2vw, 32px);
}

.sb-studio-loading {
  display: grid;
  min-height: 55vh;
  place-items: center;
  color: #fff;
  font-size: 18px;
}

@media (max-width: 600px) {
  .sb-studio-page {
    padding: 0;
  }
}
</style>
