<script setup lang="ts">
import { ArrowDown, ArrowRight, Building2, Gift, Link2, Wallet } from '@lucide/vue';
import type { HomePartnershipBlock } from '~/shared/site-content';

const props = defineProps<{ page: any }>();
const { siteContent } = useStorefrontContent();
const blocks = computed<any[]>(() => Array.isArray(props.page.blocks) ? props.page.blocks : []);
const block = (id: string) => blocks.value.find(item => item.id === id) || {};
const hero = computed(() => block('cover'));
const author = computed(() => block('bloggers'));
const payout = computed(() => block('rewards'));
const salon = computed(() => block('business-reward'));
const steps = computed(() => block('creator-start'));
const contact = computed(() => block('together'));
const creatorPhoneBlock = computed<HomePartnershipBlock>(() => ({
  ...siteContent.value.home.bloggers,
  eyebrow: '', title: '', accent: '', body: '', buttonLabel: '', url: '',
  visualLabel: '', visualTitle: '', visualLines: [], theme: 'dark',
}));
const faqs = computed(() => blocks.value.filter(item => item.kind === 'faq'));
const lines = (value: unknown) => String(value || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
</script>

<template>
  <article class="sb-cooperation-page">
    <header class="sc-hero sh-container">
      <div class="sc-hero__main">
        <h1>{{ page.title || 'Сотрудничество с SARKISIAN' }}</h1>
        <div class="sc-hero__intro">
          <p>{{ page.lead || 'Выберите формат: делитесь рекомендациями, создавайте контент или подключите инструменты для своего салона.' }}</p>
          <a href="#formats" class="sc-text-link">Выбрать формат <ArrowDown :size="17" aria-hidden="true" /></a>
        </div>
      </div>
      <div class="sc-hero__rail" aria-label="Форматы сотрудничества">
        <a href="#customers">Покупателям <ArrowRight :size="16" aria-hidden="true" /></a>
        <a href="#authors">Авторам и блогерам <ArrowRight :size="16" aria-hidden="true" /></a>
        <a href="#salons">Салонам <ArrowRight :size="16" aria-hidden="true" /></a>
      </div>
    </header>

    <section id="formats" class="sc-formats sh-container" aria-label="Форматы сотрудничества">
      <div id="customers" class="sc-format sc-format--customer">
        <div class="sc-format__copy">
          <h2>{{ block('referral').title || 'Рекомендуйте любимые продукты' }}</h2>
          <p class="sc-format__lead">{{ lines(block('referral').body)[0] || 'Расскажите друзьям о материалах SARKISIAN и приглашайте их за покупками по своей ссылке.' }}</p>
          <p class="sc-format__detail">{{ lines(block('referral').body)[1] || 'За подходящие заказы начисляются бонусы программы. Их можно использовать при следующих покупках на сайте.' }}</p>
          <NuxtLink :to="block('referral').buttonUrl || '/club/referrals'" class="sc-link">{{ block('referral').buttonLabel || 'Как работает программа' }} <ArrowRight :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="sc-format__visual sc-customer-visual" aria-hidden="true">
          <div class="sc-orbit sc-orbit--one"></div><div class="sc-orbit sc-orbit--two"></div>
          <div class="sc-note"><Gift :size="22" /><span>Рекомендация<br />другу</span></div>
          <div class="sc-customer-visual__link"><Link2 :size="19" /><span>Ваша ссылка</span><i></i><i></i><i></i></div>
          <div class="sc-customer-visual__bonus">Бонусы<br /><small>за покупки друзей</small></div>
        </div>
      </div>

      <div id="authors" class="sc-format sc-format--author">
        <div class="sc-format__copy">
          <h2>{{ author.title || 'Создавайте контент — получайте вознаграждение' }}</h2>
          <p class="sc-format__lead">{{ lines(author.body)[0] || 'Рассказывайте о продуктах и своём опыте. После одобрения заявки вы получите персональную ссылку и условия партнёрства.' }}</p>
          <div class="sc-author-payouts">
            <div><span class="sc-payout-icon"><Wallet :size="18" /></span><p><b>Процент с покупок</b><small>{{ lines(payout.body)[0] || 'Вознаграждение за подходящие розничные заказы, оформленные по вашей ссылке.' }}</small></p></div>
            <div><span class="sc-payout-icon"><Building2 :size="18" /></span><p><b>Фиксированная сумма за салон</b><small>{{ lines(salon.body)[0] || 'Отдельное вознаграждение за привлечённый салон после проверки и подключения.' }}</small></p></div>
          </div>
          <p class="sc-format__detail">Денежное вознаграждение оформляется по договору. Для выплат понадобится статус самозанятого или ИП; документы и начисления доступны в кабинете партнёра.</p>
          <NuxtLink to="/account?tab=bloggers" class="sc-link">{{ hero.buttonLabel || 'Подать заявку автору' }} <ArrowRight :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="sc-format__visual sc-author-visual">
          <SitePartnershipBlock :block="creatorPhoneBlock" kind="bloggers" heading-tag="h2" />
        </div>
      </div>

      <div id="salons" class="sc-format sc-format--salon">
        <div class="sc-format__copy">
          <h2>Запись, клиенты и закупки — в одном кабинете</h2>
          <p class="sc-format__lead">Подключите CRM SARKISIAN: ведите расписание и базу клиентов, откройте онлайн-запись через отдельную страницу или виджет на своём сайте.</p>
          <p class="sc-format__detail">В том же кабинете можно заказывать продукцию SARKISIAN по персональным условиям для бизнеса.</p>
          <NuxtLink to="/business" class="sc-link">Посмотреть возможности для бизнеса <ArrowRight :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="sc-format__visual sc-salon-visual" aria-hidden="true">
          <div class="sc-salon-visual__head"><span class="sc-salon-mark">S</span><div><b>Мой салон</b><small>РАСПИСАНИЕ · СЕГОДНЯ</small></div><span class="sc-salon-date">КАЛЕНДАРЬ</span></div>
          <div class="sc-salon-visual__row"><span>09:00</span><div><b>Маникюр с покрытием</b><small>Запись подтверждена</small></div><i></i></div>
          <div class="sc-salon-visual__row"><span>11:00</span><div><b>Укрепление и коррекция</b><small>Следующий клиент</small></div><i></i></div>
          <div class="sc-salon-visual__footer">Клиенты, расписание и заказы — в одном кабинете</div>
        </div>
      </div>
    </section>

    <section v-if="steps" class="sc-steps sh-container">
      <div class="sc-steps__heading"><h2>{{ steps.title || 'Понятный путь от заявки до работы' }}</h2></div>
      <div class="sc-steps__list"><div v-for="(line, index) in lines(steps.body)" :key="index"><span>{{ ['Заявка', 'Согласование', 'Работа и выплаты'][index] || `Шаг ${index + 1}` }}</span><p>{{ line }}</p></div></div>
    </section>

    <section v-if="faqs.length" class="sc-faq sh-container">
      <div><h2>Вопросы и ответы</h2></div>
      <div class="sc-faq__items"><details v-for="item in faqs" :id="item.id" :key="item.id"><summary>{{ item.title }}<span>+</span></summary><p v-for="(line, index) in lines(item.body)" :key="index">{{ line }}</p></details></div>
    </section>

    <footer v-if="contact" class="sc-contact sh-container">
      <div><h2>{{ contact.title || 'Обсудим подходящий формат?' }}</h2><p>{{ lines(contact.body)[0] || 'Оставьте заявку — мы уточним детали и расскажем о следующих шагах.' }}</p></div>
      <NuxtLink :to="contact.buttonUrl || '/account?tab=bloggers'" class="sc-contact__button">{{ contact.buttonLabel || 'Оставить заявку' }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
    </footer>
  </article>
</template>
