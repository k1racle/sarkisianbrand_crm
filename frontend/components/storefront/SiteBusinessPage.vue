<script setup lang="ts">
import { ArrowRight, CalendarDays, Check, Link2, ShoppingBag, Users } from '@lucide/vue';

defineProps<{ page: any }>();
const route = useRoute();
const { openBusinessRegistration } = useStorefrontPanels();
watch(() => route.query.registration, value => {
  if (import.meta.client && value === 'open') openBusinessRegistration();
}, { immediate: true });
</script>

<template>
  <article class="sh-container sb-business-page sb-business-page--crm">
    <header class="sb-business-hero sb-business-crm-hero">
      <h1>Салон работает.<em>Запись под контролем.</em></h1>
      <div class="sb-business-hero__bottom">
        <div class="sb-business-hero__copy">
          <p class="sb-business-hero__lead">CRM собирает расписание, клиентов и онлайн-запись в одном кабинете. А профессиональные материалы SARKISIAN вы заказываете там же — по персональной цене своей компании.</p>
          <div class="sb-business-hero__actions">
            <button type="button" class="sb-design-button" @click="openBusinessRegistration">Подключить кабинет <ArrowRight :size="18" aria-hidden="true" /></button>
            <NuxtLink to="/b2b-login" class="sb-business-hero__login">Уже с нами? Войти <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
          </div>
        </div>
        <div class="sb-business-hero__preview" aria-label="Записи клиентов появляются в расписании салона">
          <div class="sb-business-crm-demo">
            <div class="sb-business-crm-demo-top"><span>РАСПИСАНИЕ</span><CalendarDays :size="18" aria-hidden="true" /><span>ПОНЕДЕЛЬНИК</span></div>
            <div class="sb-business-crm-demo-rows">
              <div><time>09:00</time><span><strong>Маникюр с покрытием</strong><small>Анна · запись подтверждена</small></span><Check :size="16" /></div>
              <div><time>10:30</time><span><strong>Укрепление и коррекция</strong><small>Мария · новая запись</small></span><Check :size="16" /></div>
              <div class="is-free"><time>12:00</time><span><strong>Свободное время</strong><small>Клиент может записаться онлайн</small></span><ArrowRight :size="16" /></div>
            </div>
            <span class="sb-business-crm-demo-word" aria-hidden="true">ПЛАН</span>
          </div>
        </div>
      </div>
    </header>

    <section class="sb-business-crm-promise" aria-label="Возможности кабинета">
      <p>Один кабинет —<br />три задачи салона</p>
      <span><CalendarDays :size="18" aria-hidden="true" />Записи и клиенты</span>
      <span><Link2 :size="18" aria-hidden="true" />Онлайн-запись</span>
      <span><ShoppingBag :size="18" aria-hidden="true" />Заказы SARKISIAN</span>
    </section>

    <section id="salon" class="sb-business-crm-section sb-business-crm-salon">
      <div class="sb-business-crm-heading">
        <h2>Вы занимаетесь салоном.<em>CRM держит всё в порядке.</em></h2>
        <p>Рабочий день, команда и клиенты — перед глазами. Записи не теряются в переписках, а история визитов остаётся рядом с карточкой клиента.</p>
      </div>
      <div class="sb-business-crm-flow" aria-label="Рабочий процесс салона">
        <div><CalendarDays :size="20" aria-hidden="true" /><strong>Расписание</strong><small>Кто и когда работает</small></div>
        <ArrowRight :size="18" aria-hidden="true" />
        <div><Users :size="20" aria-hidden="true" /><strong>Клиенты</strong><small>Контакты и история визитов</small></div>
        <ArrowRight :size="18" aria-hidden="true" />
        <div><Check :size="20" aria-hidden="true" /><strong>Повторные визиты</strong><small>Вся история в одном кабинете</small></div>
      </div>
    </section>

    <section id="booking" class="sb-business-crm-booking">
      <div class="sb-business-crm-booking-title"><h2>Клиент выбирает время.<br /><em>Вы получаете запись.</em></h2></div>
      <div class="sb-business-crm-booking-info">
        <p>Покажите свободные окна на своей странице записи или добавьте форму на сайт. Клиент сам выберет услугу и удобное время — запись появится в расписании салона.</p>
        <div class="sb-business-crm-booking-steps" aria-label="Как клиент записывается">
          <span>Ваша ссылка</span><ArrowRight :size="18" aria-hidden="true" /><span>Услуга</span><ArrowRight :size="18" aria-hidden="true" /><span>Время</span>
        </div>
        <button type="button" class="sb-business-crm-text-link" @click="openBusinessRegistration">Настроить онлайн-запись <ArrowRight :size="16" /></button>
      </div>
      <div class="sb-business-crm-booking-word" aria-hidden="true">ЗАПИСЬ</div>
    </section>

    <section id="purchases" class="sb-business-crm-purchases">
      <div class="sb-business-crm-purchases-art" aria-hidden="true"><span>S</span><i></i><i></i><i></i></div>
      <div class="sb-business-crm-purchases-copy">
        <h2>Материалы SARKISIAN.<em>По цене вашей компании.</em></h2>
        <p>Откройте каталог для бизнеса, выберите нужное и оформите заказ в кабинете. Персональная скидка уже учтена в цене товаров.</p>
        <div class="sb-business-crm-purchase-detail"><ShoppingBag :size="19" aria-hidden="true" /><span>Каталог, ваши цены и статусы заказов — в одном месте</span></div>
      </div>
    </section>

    <footer class="sb-business-crm-end">
      <h2>Пора навести порядок<br />в записи салона?</h2>
      <div><button type="button" class="sb-design-button" @click="openBusinessRegistration">Подключить кабинет <ArrowRight :size="18" /></button><NuxtLink to="/b2b-login" class="sb-business-crm-text-link">Войти в кабинет <ArrowRight :size="16" /></NuxtLink></div>
    </footer>
  </article>
</template>
