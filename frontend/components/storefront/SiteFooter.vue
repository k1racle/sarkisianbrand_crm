<script setup lang="ts">
import { ArrowUpRight, Mail, MapPin, Phone } from '@lucide/vue';
</script>

<template>
  <footer class="sb-footer">
    <div class="sb-footer__brand">
      <NuxtLink to="/" class="sb-logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
      <p>Профессиональные материалы и инструменты для мастеров маникюра. От мастера — мастерам.</p>
      <div class="sb-footer__socials">
        <a href="https://vk.com/" target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте"><img src="/storefront/icons/vk.svg" alt="" /></a>
        <a href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><img src="/storefront/icons/telegram.svg" alt="" /></a>
        <a href="https://max.ru/" target="_blank" rel="noopener noreferrer" aria-label="MAX"><img src="/storefront/icons/max.svg" alt="" /></a>
      </div>
    </div>
    <div><h3>Покупателям</h3><NuxtLink to="/catalog">Каталог</NuxtLink><NuxtLink to="/account">Личный кабинет</NuxtLink><NuxtLink to="/favorites">Избранное</NuxtLink><NuxtLink to="/cart">Корзина</NuxtLink></div>
    <div><h3>Компания</h3><a href="/#about">О бренде</a><a href="/#delivery">Доставка и оплата</a><NuxtLink to="/b2b-login">Кабинет B2B <ArrowUpRight :size="14" /></NuxtLink><a href="#support">Поддержка</a></div>
    <div><h3>Связаться</h3><a href="tel:+79184496394"><Phone :size="15" /> 8 (918) 449-63-94</a><a href="mailto:info@sarkisianbrand.ru"><Mail :size="15" /> info@sarkisianbrand.ru</a><span><MapPin :size="15" /> Россия</span></div>
    <div class="sb-footer__bottom"><span>© {{ new Date().getFullYear() }} SARKISIAN BRAND</span><span>Политика конфиденциальности</span><span>Публичная оферта</span><span>Правила возврата</span></div>
  </footer>
</template>
