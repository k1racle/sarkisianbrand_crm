<script setup lang="ts">
import { ArrowUpRight, Check, Coins, PackagePlus, Infinity as InfinityIcon } from '@lucide/vue'
import SupplyMark from './SupplyMark.vue'
import { SUPPLIES, STOCK_LIMIT, supplyFits, type Supplies, type SupplyId } from './supplies'
import type { Design } from '../model'
defineProps<{ supplies: Supplies; coins: number; design?: Design; selected?: SupplyId | null; canChoose: boolean; busy: boolean; message: string; siteBase: string }>()
defineEmits<{ choose: [id: SupplyId | null]; buy: [id: SupplyId] }>()
</script>
<template>
  <div class="at-shelf-content">
    <div class="at-shelf-heading"><div><span class="at-eyebrow">SARKISIAN · ОТ МАСТЕРА МАСТЕРАМ</span><h2>На вашей полке</h2><p>Подберите материал под работу. Выполните заказ на 4–5 звёзд с аккуратностью от 85% и получите бонус.</p></div><span class="at-shelf-wallet"><Coins :size="16"/>{{ coins.toLocaleString('ru-RU') }}</span></div>
    <div class="at-basic-kit" :class="{ selected: !selected && canChoose }"><InfinityIcon :size="24"/><div><b>Базовый набор</b><span>Безлимитно · обычная оплата за заказ</span></div><button v-if="canChoose" class="at-text-button" :disabled="busy" :aria-pressed="!selected" @click="$emit('choose', null)">{{ !selected ? 'Выбран' : 'Выбрать' }}<Check v-if="!selected" :size="14"/></button><span v-else class="at-basic-free">Всегда бесплатно</span></div>
    <div class="at-supply-grid">
      <article v-for="product in SUPPLIES" :key="product.id" class="at-supply-card" :class="{ selected: selected === product.id && canChoose }" :data-supply="product.id">
        <div class="at-supply-art" :style="{ '--supply-shade': product.shade }"><SupplyMark :id="product.id"/><span v-if="canChoose && design && supplyFits(product.id, design)" class="at-supply-match">Подходит к работе</span></div>
        <div class="at-supply-copy"><div class="at-supply-stock" :class="{ low: supplies.stock[product.id] <= 1 }"><span>{{ supplies.stock[product.id] ? 'В запасе' : 'Закончился' }}</span><b>{{ supplies.stock[product.id] }} <small>приёмов</small></b></div><h3>{{ product.name }}</h3><p>{{ product.use }}</p><span class="at-supply-bonus"><Coins :size="13"/>+{{ product.bonus }} за аккуратную работу</span>
          <button v-if="canChoose" class="at-btn" :class="selected === product.id ? 'at-secondary' : 'at-primary'" :aria-pressed="selected === product.id" :disabled="busy || !supplies.stock[product.id]" @click="$emit('choose', product.id)"><Check v-if="selected === product.id" :size="15"/>{{ selected === product.id ? 'Выбран для приёма' : supplies.stock[product.id] ? 'Взять на приём' : 'Нет в запасе' }}</button>
          <button class="at-restock" :disabled="busy || coins < product.price || supplies.stock[product.id] + product.pack > STOCK_LIMIT" :aria-label="`Пополнить: ${product.name}, ${product.pack} приёмов за ${product.price} монет`" @click="$emit('buy', product.id)"><PackagePlus :size="15"/><span>+{{ product.pack }} приёмов</span><b>{{ product.price }} <Coins :size="12"/></b></button><small v-if="coins < product.price" class="at-supply-limit">Нужно ещё {{ product.price - coins }} монет</small><small v-else-if="supplies.stock[product.id] + product.pack > STOCK_LIMIT" class="at-supply-limit">Полка заполнена · максимум {{ STOCK_LIMIT }}</small>
        </div>
      </article>
    </div>
    <p v-if="message" class="at-shelf-message" role="status">{{ message }}</p>
    <div class="at-shelf-footer"><p>Один приём расходует одну порцию после завершения. Выбор можно менять до финиша. В практике запас не расходуется.</p><a :href="siteBase" target="_blank" rel="noopener noreferrer">Продукция бренда <ArrowUpRight :size="14"/></a></div>
    <p class="at-supply-game-note">Бонусы и назначения на этой полке — правила игры. Реальные свойства и применение материалов смотрите на сайте бренда. Пополнение оплачивается только игровыми монетами.</p>
  </div>
</template>
