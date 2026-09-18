<script setup lang="ts">
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Coffee, Minus, Package, Plus, ShoppingBag } from '@lucide/vue';
import { defaultBusinessPreview, safeSiteContentUrl, type HomePartnershipBlock } from '~/shared/site-content';
const props = defineProps<{ block: HomePartnershipBlock }>();
const { storefrontMediaUrl } = useStorefrontContent();
const preview = computed(() => props.block.preview || defaultBusinessPreview);
const active = ref<'salon' | 'purchases'>('salon');
const quantity = ref(2);
const tabs = computed(() => [
  { id: 'salon' as const, label: preview.value.salonTitle, icon: CalendarDays },
  { id: 'purchases' as const, label: preview.value.purchasesTitle, icon: ShoppingBag },
]);
const uid = useId();
const number = (value: number) => value.toLocaleString('ru-RU');
function keyTab(event: KeyboardEvent, index: number) {
  let next: number;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = 1;
  else return;
  event.preventDefault();
  active.value = tabs.value[next].id;
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons?.[next].focus();
}
</script>

<template>
  <div class="sb-business-preview" role="region" aria-label="Демонстрация B2B-кабинета">
    <header class="sb-business-preview__head">
      <div><span>{{ block.visualLabel }}</span><h3>{{ block.visualTitle }}</h3></div>
      <span class="sb-business-preview__demo"><i aria-hidden="true"></i>{{ preview.demoLabel }}</span>
    </header>
    <div class="sb-business-preview__tabs" role="tablist" aria-label="Пространства B2B-кабинета">
      <button v-for="(tab, index) in tabs" :id="`${uid}-${tab.id}-tab`" :key="tab.id" type="button" role="tab" :aria-selected="active === tab.id" :aria-controls="`${uid}-${tab.id}-panel`" :tabindex="active === tab.id ? 0 : -1" @click="active = tab.id" @keydown="keyTab($event, index)"><component :is="tab.icon" :size="17" aria-hidden="true" />{{ tab.label }}</button>
    </div>
    <div class="sb-business-preview__panels">
      <section :id="`${uid}-salon-panel`" class="sb-business-preview__panel" role="tabpanel" :aria-labelledby="`${uid}-salon-tab`" :hidden="active !== 'salon'" :aria-hidden="active !== 'salon'" :inert="active !== 'salon'" :tabindex="active === 'salon' ? 0 : -1">
        <div class="sb-business-preview__section-title"><h4>{{ preview.scheduleTitle }}</h4><CalendarDays :size="17" aria-hidden="true" /></div>
        <ol class="sb-business-preview__schedule">
          <li><time>09:00<span>10:30</span></time><div><strong>{{ preview.appointmentTitle }}</strong><span>{{ preview.appointmentDetail }}</span></div><Check :size="16" aria-hidden="true" /></li>
          <li class="is-break"><time>10:30<span>11:00</span></time><div><Coffee :size="16" aria-hidden="true" /><strong>{{ preview.breakTitle }}</strong></div></li>
          <li><time>11:00<span>12:00</span></time><div><strong>{{ preview.secondAppointmentTitle }}</strong><span>{{ preview.secondAppointmentDetail }}</span></div><Check :size="16" aria-hidden="true" /></li>
        </ol>
        <div class="sb-business-preview__widget"><div><strong>{{ preview.widgetTitle }}</strong><span>{{ block.visualLines[2] }}</span></div><span class="sb-business-preview__widget-action">{{ preview.widgetAction }} <ArrowUpRight :size="16" aria-hidden="true" /></span></div>
      </section>
      <section :id="`${uid}-purchases-panel`" class="sb-business-preview__panel" role="tabpanel" :aria-labelledby="`${uid}-purchases-tab`" :hidden="active !== 'purchases'" :aria-hidden="active !== 'purchases'" :inert="active !== 'purchases'" :tabindex="active === 'purchases' ? 0 : -1">
        <div class="sb-business-preview__section-title"><h4>{{ preview.orderTitle }}</h4><Package :size="17" aria-hidden="true" /></div>
        <div class="sb-business-preview__product"><img v-if="safeSiteContentUrl(preview.productImageUrl, true) && preview.productImageUrl" :src="storefrontMediaUrl(preview.productImageUrl)" alt="" loading="lazy" decoding="async" /><ShoppingBag v-else :size="44" aria-hidden="true" /><div><strong>{{ preview.productTitle }}</strong><span>{{ preview.productDetail }}</span><small>{{ preview.productCaption }}</small><b>{{ number(preview.productPrice) }} ₽</b></div></div>
        <div class="sb-business-preview__quantity"><span>Количество</span><div><button type="button" aria-label="Уменьшить количество в примере" :disabled="quantity <= 1" @click="quantity--"><Minus :size="16" aria-hidden="true" /></button><output aria-label="Количество в примере" aria-live="polite">{{ quantity }}</output><button type="button" aria-label="Увеличить количество в примере" :disabled="quantity >= 9" @click="quantity++"><Plus :size="16" aria-hidden="true" /></button></div></div>
        <div class="sb-business-preview__total"><span>Итого в примере</span><strong aria-live="polite">{{ number(preview.productPrice * quantity) }} ₽</strong></div>
        <div class="sb-business-preview__delivery"><Package :size="18" aria-hidden="true" /><span>{{ preview.orderBody }}</span><ArrowRight :size="16" aria-hidden="true" /></div>
      </section>
    </div>
    <footer class="sb-business-preview__footer"><Check :size="14" aria-hidden="true" /><span>{{ block.visualLines[active === 'salon' ? 1 : 0] }}</span></footer>
  </div>
</template>
