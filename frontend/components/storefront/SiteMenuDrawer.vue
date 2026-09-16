<script setup lang="ts">
import { X } from '@lucide/vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const { content } = useStorefrontContent();
const socialIcon = (key: string) => ({ vk: '/storefront/icons/vk.svg', telegram: '/storefront/icons/telegram.svg', max: '/storefront/icons/max.svg' } as Record<string, string>)[String(key).toLowerCase()];
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-menu-drawer" role="dialog" aria-modal="true" aria-label="Меню магазина">
          <header class="sb-drawer-head">
            <div><h2>Меню</h2></div>
            <button aria-label="Закрыть меню" @click="emit('close')"><X :size="20" /></button>
          </header>

          <nav class="sb-menu-links" aria-label="Информация о магазине">
            <SiteMenuLink v-for="item in content.menuItems" :key="item.id" :item="item" arrow @activate="emit('close')" />
            <SiteMenuLink v-if="!content.menuItems.some(item => item.url === '/b2b-login')" :item="{ label: 'Кабинет B2B', url: '/b2b-login' }" arrow @activate="emit('close')" />
          </nav>

          <div class="sb-menu-contact">
            <h3>Мы на связи</h3>
            <a href="tel:+79184496394">8 (918) 449-63-94</a>
            <a href="mailto:info@sarkisianbrand.ru">info@sarkisianbrand.ru</a>
            <div class="sb-menu-socials">
              <a v-for="social in content.socialLinks" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer" :aria-label="social.name">
                <img v-if="socialIcon(social.iconKey)" :src="socialIcon(social.iconKey)" alt="" /><span v-else>{{ social.name }}</span>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
