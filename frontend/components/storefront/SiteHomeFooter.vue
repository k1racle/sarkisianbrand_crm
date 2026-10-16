<script setup lang="ts">
import { siteContentPhoneHref } from '~/shared/site-content';
const { siteContent } = useStorefrontContent();
const { t } = useHomeLocale();
</script>

<template>
  <footer id="contacts" class="sh-footer sh-container">
    <div class="sh-footer-marks">
      <NuxtLink to="/" class="sh-signature" aria-label="SARKISIAN BRAND"><img src="/storefront/home/footer-signature.png" alt="SARKISIAN BRAND" loading="lazy" /></NuxtLink>
      <NuxtLink to="/" class="sh-footer-wordmark"><img src="/storefront/home/footer-wordmark.svg" alt="SARKISIAN" loading="lazy" /></NuxtLink>
    </div>
    <div class="sh-footer-links">
      <nav :aria-label="t('О бренде')"><NuxtLink to="/club/referrals">{{ t('Реферальная') }}<br />{{ t('программа') }}</NuxtLink><NuxtLink to="/about">{{ t('О бренде') }}</NuxtLink><NuxtLink to="/partnerships">{{ t('Сотрудничество') }}</NuxtLink></nav>
      <nav :aria-label="t('Каталог')"><NuxtLink to="/business">{{ t('Онлайн') }}<br />{{ t('запись') }}</NuxtLink><NuxtLink to="/catalog">{{ t('Каталог') }}</NuxtLink><SiteHomeCourses /></nav>
      <div class="sh-footer-contacts"><span>{{ t('Связаться') }}</span><a :href="siteContentPhoneHref(siteContent.contacts.phone)">{{ siteContent.contacts.phone }}</a><a :href="`mailto:${siteContent.contacts.email}`">{{ siteContent.contacts.email }}</a></div>
    </div>
    <div class="sh-footer-legal"><span>© {{ new Date().getFullYear() }} {{ siteContent.brand.name }}</span><NuxtLink v-for="link in siteContent.footer.legalLinks" :key="link.id" :to="link.url" :target="link.newTab ? '_blank' : undefined" :rel="link.newTab ? 'noopener noreferrer' : undefined">{{ t(link.label) }}</NuxtLink></div>
  </footer>
</template>
