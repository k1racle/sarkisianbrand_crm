<script setup lang="ts">
import { Download, Smartphone, X } from '@lucide/vue';
const { installed, installBusy, installHelp, ios, install } = useCrmPwa();
const { panel, keyboard } = useCatalogDialog(computed(() => installHelp.value), () => { installHelp.value = false; });
</script>
<template>
  <button v-if="!installed" type="button" class="crm-install-button" aria-label="Установить CRM" title="Установить CRM" :disabled="installBusy" @click="install"><Download :size="20" aria-hidden="true" /><span>Установить CRM</span></button>
  <Teleport to="body">
    <div v-if="installHelp" class="crm-dialog-backdrop" @click.self="installHelp = false">
      <section ref="panel" class="crm-install-dialog" role="dialog" aria-modal="true" aria-labelledby="crm-install-title" tabindex="-1" @keydown="keyboard">
        <header><Smartphone :size="26" aria-hidden="true" /><button type="button" class="crm-icon-button" aria-label="Закрыть инструкцию" @click="installHelp = false"><X :size="20" /></button></header>
        <h2 id="crm-install-title">CRM на вашем устройстве</h2>
        <p>Открывайте рабочее пространство с отдельной иконки на домашнем экране.</p>
        <ol v-if="ios"><li>Откройте CRM в Safari.</li><li>Нажмите «Поделиться» и выберите «На экран Домой».</li><li>Подтвердите добавление.</li></ol>
        <ol v-else><li>Откройте меню браузера.</li><li>Выберите «Установить приложение» или «Добавить на главный экран», если этот пункт доступен.</li><li>Подтвердите установку.</li></ol>
        <p class="crm-install-note">Если пункта установки нет, продолжайте работу в браузере. Для загрузки клиентов и сохранения изменений требуется интернет.</p>
        <button type="button" class="crm-primary-button" @click="installHelp = false">Понятно</button>
      </section>
    </div>
  </Teleport>
</template>
