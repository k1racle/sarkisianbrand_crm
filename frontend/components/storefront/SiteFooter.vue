<script setup lang="ts">
import { ArrowUpRight, Mail, MapPin, Phone } from '@lucide/vue';
const { content, loadStorefrontContent } = useStorefrontContent();
await loadStorefrontContent();
const { openFavorites, openCart, openAuth } = useStorefrontPanels();
const { user } = useStorefront();
const socialIcon = (key: string) => ({ vk: '/storefront/icons/vk.svg', telegram: '/storefront/icons/telegram.svg', max: '/storefront/icons/max.svg' } as Record<string, string>)[String(key).toLowerCase()];
</script>

<template>
  <footer id="contacts" class="sb-footer">
    <div class="sb-footer__brand">
      <NuxtLink to="/" class="sb-logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
      <p>Профессиональные материалы и инструменты для мастеров маникюра. От мастера — мастерам.</p>
      <div class="sb-footer__socials">
        <a v-for="social in content.socialLinks" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer" :aria-label="social.name">
          <img v-if="socialIcon(social.iconKey)" :src="socialIcon(social.iconKey)" alt="" /><ArrowUpRight v-else :size="18" />
        </a>
      </div>
    </div>
    <div><h3>Покупателям</h3><NuxtLink to="/catalog" class="sb-footer-link"><span>Каталог</span></NuxtLink><button class="sb-footer-link" @click="user ? navigateTo('/account') : openAuth()"><span>Личный кабинет</span></button><button class="sb-footer-link" @click="openFavorites"><span>Избранное</span></button><button class="sb-footer-link" @click="openCart"><span>Корзина</span></button></div>
    <div><h3>Компания</h3><NuxtLink to="/about" class="sb-footer-link"><span>О бренде</span></NuxtLink><NuxtLink to="/delivery" class="sb-footer-link"><span>Доставка и оплата</span></NuxtLink><NuxtLink to="/club" class="sb-footer-link"><span>О клубе</span></NuxtLink><NuxtLink to="/contacts" class="sb-footer-link"><span>Контакты</span></NuxtLink><NuxtLink to="/b2b-login" class="sb-footer-link"><span>Кабинет B2B</span></NuxtLink></div>
    <div><h3>Связаться</h3><a href="tel:+79184496394" class="sb-footer-link"><Phone :size="15" /><span>8 (918) 449-63-94</span></a><a href="mailto:info@sarkisianbrand.ru" class="sb-footer-link"><Mail :size="15" /><span>info@sarkisianbrand.ru</span></a><span><MapPin :size="15" /> Россия</span></div>
    <div class="sb-footer__bottom"><span>© {{ new Date().getFullYear() }} SARKISIAN BRAND</span><NuxtLink to="/privacy" class="sb-footer-link"><span>Политика конфиденциальности</span></NuxtLink><NuxtLink to="/oferta" class="sb-footer-link"><span>Публичная оферта</span></NuxtLink><NuxtLink to="/returns" class="sb-footer-link"><span>Правила возврата</span></NuxtLink></div>
  </footer>
</template>
