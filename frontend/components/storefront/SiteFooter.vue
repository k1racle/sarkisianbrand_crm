<script setup lang="ts">
import { siteContentPhoneHref, type SiteContentAction } from '~/shared/site-content';
import { ArrowUpRight, Mail, MapPin, Phone } from '@lucide/vue';
const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const { openFavorites, openCart, openAuth } = useStorefrontPanels();
const { user } = useStorefront();
const socialIcon = (key: string) => ({ vk: '/storefront/icons/vk.svg', telegram: '/storefront/icons/telegram.svg', max: '/storefront/icons/max.svg' } as Record<string, string>)[String(key).toLowerCase()];
function footerAction(action: SiteContentAction) {
  if (action === 'account') user.value ? navigateTo('/account') : openAuth();
  else if (action === 'favorites') openFavorites();
  else if (action === 'cart') openCart();
}
</script>

<template>
  <footer data-v-ui-f6ad9abec0e4 id="contacts" class="sb-footer" :class="{ 'has-custom-columns': siteContent.footer.columns.length !== 2, 'has-no-columns': siteContent.footer.columns.length === 0 }" :style="{ '--site-footer-count': siteContent.footer.columns.length }">
    <div data-v-ui-f6ad9abec0e4 class="sb-footer__brand">
      <NuxtLink data-v-ui-f6ad9abec0e4 to="/" class="sb-logo"><img data-v-ui-f6ad9abec0e4 :src="storefrontMediaUrl(siteContent.brand.logoUrl)" :alt="siteContent.brand.name" /></NuxtLink>
      <p data-v-ui-f6ad9abec0e4>{{ siteContent.brand.footerText }}</p>
      <div data-v-ui-f6ad9abec0e4 class="sb-footer__socials">
        <a data-v-ui-f6ad9abec0e4 v-for="social in content.socialLinks" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer" :aria-label="social.name">
          <img data-v-ui-f6ad9abec0e4 v-if="socialIcon(social.iconKey)" :src="socialIcon(social.iconKey)" alt="" /><ArrowUpRight data-v-ui-f6ad9abec0e4 v-else :size="18" />
        </a>
      </div>
    </div>
    <div data-v-ui-f6ad9abec0e4 v-for="column in siteContent.footer.columns" :key="column.id">
      <h3 data-v-ui-f6ad9abec0e4>{{ column.title }}</h3>
      <template v-for="item in column.items" :key="item.id">
        <button data-v-ui-f6ad9abec0e4 v-if="item.action !== 'none'" type="button" class="sb-footer-link" @click="footerAction(item.action)"><span data-v-ui-f6ad9abec0e4>{{ item.label }}</span></button>
        <NuxtLink data-v-ui-f6ad9abec0e4 v-else :to="item.url" :target="item.newTab ? '_blank' : undefined" :rel="item.newTab ? 'noopener noreferrer' : undefined" class="sb-footer-link"><span data-v-ui-f6ad9abec0e4>{{ item.label }}</span></NuxtLink>
      </template>
    </div>
    <div data-v-ui-f6ad9abec0e4><h3 data-v-ui-f6ad9abec0e4>Связаться</h3><a data-v-ui-f6ad9abec0e4 :href="siteContentPhoneHref(siteContent.contacts.phone)" class="sb-footer-link"><Phone data-v-ui-f6ad9abec0e4 :size="15" /><span data-v-ui-f6ad9abec0e4>{{ siteContent.contacts.phone }}</span></a><a data-v-ui-f6ad9abec0e4 :href="`mailto:${siteContent.contacts.email}`" class="sb-footer-link"><Mail data-v-ui-f6ad9abec0e4 :size="15" /><span data-v-ui-f6ad9abec0e4>{{ siteContent.contacts.email }}</span></a><span data-v-ui-f6ad9abec0e4><MapPin data-v-ui-f6ad9abec0e4 :size="15" /> {{ siteContent.contacts.country }}</span></div>
    <div data-v-ui-f6ad9abec0e4 class="sb-footer__bottom"><span data-v-ui-f6ad9abec0e4>© {{ new Date().getFullYear() }} {{ siteContent.brand.name }}</span><NuxtLink data-v-ui-f6ad9abec0e4 v-for="item in siteContent.footer.legalLinks" :key="item.id" :to="item.url" :target="item.newTab ? '_blank' : undefined" :rel="item.newTab ? 'noopener noreferrer' : undefined" class="sb-footer-link"><span data-v-ui-f6ad9abec0e4>{{ item.label }}</span></NuxtLink></div>
  </footer>
</template>

