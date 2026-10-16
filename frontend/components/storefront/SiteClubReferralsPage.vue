<script setup lang="ts">
import { ArrowDown, ArrowRight, ArrowUpRight, Gift, Link2, UserRound } from '@lucide/vue';
import { safeSiteContentUrl } from '~/shared/site-content';

const props = defineProps<{ page: any }>();
const referral = computed(() => (props.page.blocks || []).find((block: any) => block.id === 'referral') || {});
const paragraphs = computed(() => String(referral.value.body || '').split(/\n+/).filter(Boolean));
const actionUrl = computed(() => safeSiteContentUrl(referral.value.buttonUrl) ? referral.value.buttonUrl : '/account?tab=referrals');
const actionLabel = computed(() => referral.value.buttonLabel || 'Моя ссылка и бонусы');
</script>

<template>
  <article class="sb-referrals-page">
    <section class="sb-referrals-hero" aria-labelledby="referrals-title">
      <div class="sb-referrals-hero__intro">
        <h1 id="referrals-title"><span>SARK</span><span>ISIAN</span><span>CLUB</span></h1>
        <p>{{ page.lead || 'Рассказывайте друзьям о любимых материалах SARKISIAN и получайте бонусы за их покупки.' }}</p>
      </div>
      <div class="sb-referrals-hero__aside">
        <span class="sb-referrals-rule"></span>
        <p>Порекомендуйте то, чем сами работаете. Друзья оформят заказ по вашей ссылке, а бонусы появятся в личном кабинете.</p>
        <NuxtLink :to="actionUrl">{{ actionLabel }} <ArrowUpRight :size="18" aria-hidden="true" /></NuxtLink>
      </div>
      <a class="sb-referrals-scroll" href="#how-it-works" aria-label="Как работает программа"><ArrowDown :size="20" /></a>
    </section>

    <section class="sb-referrals-manifesto" aria-label="Как работает клуб">
      <div class="sb-referrals-manifesto__line"><h2>ОДИН КЛУБ</h2><p>Для тех, кто выбирает SARKISIAN и делится находками с друзьями.</p></div>
      <div class="sb-referrals-manifesto__line sb-referrals-manifesto__line--second"><h2>СВОЙ ФОРМАТ</h2><span>Личные покупки и рекомендации — в одном кабинете</span></div>
      <div class="sb-referrals-benefits">
        <p><Link2 :size="18" /> Ваша персональная ссылка</p>
        <p><Gift :size="18" /> Бонусы за подходящие покупки</p>
        <p><UserRound :size="18" /> Баланс и начисления в кабинете</p>
      </div>
    </section>

    <section class="sb-referrals-brand" aria-label="SARKISIAN CLUB">
      <p>Покупайте любимое</p>
      <h2><span>SARK</span><span>ISIAN</span><span>CLUB</span></h2>
      <p>Получайте больше</p>
      <NuxtLink :to="actionUrl">О клубе <ArrowRight :size="16" /></NuxtLink>
      <NuxtLink :to="actionUrl">Вступить в клуб <ArrowRight :size="16" /></NuxtLink>
    </section>

    <section id="how-it-works" class="sb-referrals-story">
      <div class="sb-referrals-story__copy">
        <p class="sb-referrals-story__intro">Расскажите друзьям о SARKISIAN по персональной ссылке. За подходящие покупки приглашённых клиентов начисляются бонусы для следующих заказов на сайте.</p>
        <p class="sb-referrals-story__lead">ОТ МАСТЕРА — ДРУЗЬЯМ</p>
        <div v-if="paragraphs.length" class="sb-referrals-story__body">
          <p v-for="(text, index) in paragraphs" :key="index">{{ text }}</p>
        </div>
        <p v-else class="sb-referrals-story__body">Отправьте друзьям персональную ссылку. Когда они оформят подходящий заказ, вам начислят бонусы для следующих покупок на сайте.</p>
        <NuxtLink class="sb-referrals-link" :to="actionUrl">{{ actionLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
      </div>
      <div class="sb-referrals-media" aria-label="Любимые материалы SARKISIAN">
        <a href="/catalog" aria-label="Перейти в каталог SARKISIAN"><img src="/storefront/svetlana-creator-youtube.jpg" alt="Мастер рассказывает о любимых материалах SARKISIAN" /></a>
        <a href="/catalog" aria-label="Выбрать материалы SARKISIAN"><img src="/storefront/products/gel-skorostnoy-011-30-ml.jpg" alt="Скоростной гель SARKISIAN" /></a>
      </div>
    </section>

    <section class="sb-referrals-how" aria-labelledby="referrals-how-title">
      <div class="sb-referrals-how__heading">
        <h2 id="referrals-how-title"><span>КЛУБ</span><span>ПОДСТРАИВАЕТСЯ</span><span>ПОД ВАШУ</span><span>РАБОТУ</span></h2>
        <p>Делитесь тем, что сами выбираете для работы. А бонусы используйте для новых покупок.</p>
      </div>
      <div class="sb-referrals-how__gallery">
        <figure><img src="/storefront/products/nozhnitsy-pro-pravsha.jpg" alt="Ножницы SARKISIAN для профессионального маникюра" /><NuxtLink :to="actionUrl">О клубе <ArrowRight :size="16" /></NuxtLink></figure>
        <figure><img src="/storefront/products/gel-skorostnoy-111-30-ml.jpg" alt="Густой скоростной гель SARKISIAN" /><NuxtLink :to="actionUrl">О клубе <ArrowRight :size="16" /></NuxtLink></figure>
        <figure><img src="/storefront/products/gel-skorostnoy-021-shimmer-30-ml.jpg" alt="Скоростной гель с шиммером SARKISIAN" /><NuxtLink :to="actionUrl">О клубе <ArrowRight :size="16" /></NuxtLink></figure>
      </div>
      <NuxtLink class="sb-referrals-link" :to="actionUrl">{{ actionLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
    </section>
  </article>
</template>
