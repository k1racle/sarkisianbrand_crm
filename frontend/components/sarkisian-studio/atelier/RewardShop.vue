<script setup lang="ts">
import {Gift,Coins,ArrowUpRight,Copy,Check,RefreshCw} from '@lucide/vue'
const rewards=useStudioRewards(),{user,wallet,offers,settings,loading,error}=rewards
const {openAuth}=useStorefrontPanels()
const busy=ref(''),message=ref(''),copied=ref('')
const pending=ref<string|null>(null)
const statusName:Record<string,string>={available:'Готов к покупке на сайте',used:'Использован',expired:'Срок истёк',reserved:'Применён к заказу',disabled:'Отключён'}
async function buy(id:string){if(busy.value)return;busy.value=id;message.value='';try{await rewards.buy(id);pending.value=null;message.value='Промокод готов. Он сохранён в ваших наградах.'}catch(e:any){message.value=e?.data?.message||'Покупка не завершена. Повторите запрос — повторного списания не будет.'}finally{busy.value=''}}
async function copy(code:string){try{await navigator.clipboard.writeText(code);copied.value=code}catch{message.value='Выделите промокод и скопируйте его вручную.'}}
onMounted(()=>void rewards.refresh())
</script>
<template>
 <section class="at-reward-shop">
  <div class="at-reward-intro"><Gift :size="32"/><h2>Играйте. Копите.<br/>Покупайте выгоднее.</h2><p>Завершайте приёмы и обменивайте заработанные монеты на скидки в SARKISIAN. У каждой награды — своя цель.</p></div>
  <div v-if="!user" class="at-reward-login"><p>Войдите в аккаунт сайта, чтобы копить монеты для скидок. Гостевой прогресс остаётся для практики; в магазин наград он не переносится.</p><button class="at-btn at-primary" @click="openAuth()">Войти и начать копить <ArrowUpRight :size="17"/></button></div>
  <div v-else class="at-reward-wallet"><span>Ваш баланс наград</span><b><Coins :size="24"/>{{ wallet?.balance.toLocaleString('ru-RU')??'…' }}</b><span>За приёмы: {{ wallet?.earned.toLocaleString('ru-RU')??'—' }} монет</span></div>
  <p class="at-reward-rules">Промокод действует для одного заказа в вашем аккаунте. Срок начинается после обмена. Монеты нельзя вывести деньгами. За день учитывается до {{ settings.dailyRunLimit }} приёмов; один приём длится от {{ settings.minimumRunSeconds }} секунд. Практика, уроки и бонусы смены не начисляют монеты для скидок.</p>
  <p v-if="!settings.enabled" role="status">Магазин наград временно на паузе. Ваш баланс сохранён.</p>
  <p v-if="error" role="alert">{{ error }} <button class="at-text-button" @click="rewards.refresh()"><RefreshCw :size="14"/> Повторить</button></p>
  <p v-if="message" role="status">{{ message }}</p>
  <div class="at-reward-offers" :aria-busy="loading"><article v-for="offer in offers" :key="offer.id"><span class="at-reward-percent">−{{ offer.discountPercent }}%</span><h3>На покупки SARKISIAN</h3><p>{{ offer.validDays }} дней · одно использование</p><p v-if="offer.minimumAmount">Для заказа от {{ offer.minimumAmount.toLocaleString('ru-RU') }} ₽</p><p v-if="offer.maximumDiscount">Скидка до {{ offer.maximumDiscount.toLocaleString('ru-RU') }} ₽</p><b><Coins :size="17"/>{{ offer.coinPrice.toLocaleString('ru-RU') }}</b><progress :value="Math.min(wallet?.balance??0,offer.coinPrice)" :max="offer.coinPrice" :aria-label="`Накоплено на скидку ${offer.discountPercent}%`"/><small v-if="user && (wallet?.balance??0)<offer.coinPrice">Осталось {{ (offer.coinPrice-(wallet?.balance??0)).toLocaleString('ru-RU') }} монет</small><template v-if="pending===offer.id"><p>Обменять {{ offer.coinPrice.toLocaleString('ru-RU') }} монет на скидку {{ offer.discountPercent }}%?</p><button class="at-btn at-primary" :disabled="!!busy" @click="buy(offer.id)">{{ busy?'Создаём код…':'Подтвердить обмен' }}</button><button class="at-text-button" :disabled="!!busy" @click="pending=null">Отмена</button></template><button v-else class="at-btn at-secondary" :disabled="!user||!wallet||wallet.balance<offer.coinPrice||!settings.enabled||!!busy" @click="pending=offer.id">{{ !user?'Войдите для обмена':(wallet?.balance??0)<offer.coinPrice?'Копим на награду':'Получить промокод' }} <ArrowUpRight :size="15"/></button></article></div>
  <div v-if="user" class="at-owned-rewards"><h2>Ваши промокоды</h2><p v-if="!wallet?.purchases.length">Здесь появится первая награда. Продолжайте принимать клиентов — каждая работа приближает к цели.</p><article v-for="p in wallet?.purchases" :key="p.id"><div><b>Скидка {{ p.discountPercent }}%</b><span>{{ statusName[p.status] }} · до {{ new Date(p.expiresAt).toLocaleDateString('ru-RU') }}</span><code>{{ p.code }}</code><small v-if="p.minimumAmount">От {{ p.minimumAmount }} ₽</small><small v-if="p.maximumDiscount">Максимум {{ p.maximumDiscount }} ₽</small></div><button v-if="p.status==='available'" class="at-btn at-secondary" @click="copy(p.code)"><Check v-if="copied===p.code" :size="16"/><Copy v-else :size="16"/>{{ copied===p.code?'Скопирован':'Копировать' }}</button></article></div>
 </section>
</template>
