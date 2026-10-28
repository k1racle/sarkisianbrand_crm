<script setup lang="ts">
import { ArrowRight, CalendarCheck } from '@lucide/vue';
const route = useRoute(), config = useRuntimeConfig();
useHead({ title: 'Управление записью', meta: [{ name: 'referrer', content: 'no-referrer' }, { name: 'robots', content: 'noindex,nofollow' }] });
const organizationId = String(route.params.organizationId || '');
const token = ref(''), booking = ref<any>(null), date = ref(''), slots = ref<string[]>([]), selected = ref('');
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref('');
const endpoint = `/salon-booking/${encodeURIComponent(organizationId)}/manage/`;
const dateTime = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: booking.value?.timeZone || 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const time = (value: string) => new Date(value).toLocaleTimeString('ru-RU', { timeZone: booking.value?.timeZone || 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
const message = (e: any) => typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
const request = (path: string, body: Record<string, unknown>) => $fetch<any>(endpoint + path, { baseURL: config.public.apiBase, method: 'POST', retry: 0, timeout: 20000, body: { token: token.value, ...body } });
async function refresh() { loading.value = true; error.value = ''; try { booking.value = await request('view', {}); } catch (e: any) { booking.value = null; error.value = message(e); } finally { loading.value = false; } }
async function findSlots() { if (busy.value || !date.value) return; busy.value = true; error.value = ''; notice.value = ''; selected.value = ''; slots.value = []; try { slots.value = (await request('slots', { date: date.value })).slots; } catch (e: any) { error.value = message(e); } finally { busy.value = false; } }
async function move() { if (busy.value || !selected.value || !booking.value) return; busy.value = true; error.value = ''; notice.value = ''; try { booking.value = await request('move', { version: booking.value.version, date: date.value, startTime: selected.value }); selected.value = ''; slots.value = []; notice.value = 'Запись перенесена. Новое время сохранено.'; } catch (e: any) { error.value = message(e); } finally { busy.value = false; } }
async function cancel() { if (busy.value || !booking.value || !window.confirm('Отменить запись?')) return; busy.value = true; error.value = ''; notice.value = ''; try { booking.value = await request('cancel', { version: booking.value.version }); notice.value = 'Запись отменена.'; slots.value = []; } catch (e: any) { error.value = message(e); } finally { busy.value = false; } }
onMounted(() => { token.value = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''; if (!token.value) { loading.value = false; error.value = 'Ссылка на запись неполная. Свяжитесь с салоном.'; return; } void refresh(); });
</script>
<template>
 <main class="public-salon-booking">
  <section class="public-booking-card">
   <header><img src="/sarkisian-logo.png" alt="SARKISIAN" /><small>Онлайн-запись</small><h1>Управление записью</h1></header>
   <p v-if="loading" role="status">Загружаем запись…</p>
   <p v-if="error" class="public-booking-error" role="alert">{{ error }}</p>
   <p v-if="notice" role="status">{{ notice }}</p>
   <template v-if="booking && !loading">
    <div class="public-booking-success"><CalendarCheck :size="40" /><h2>{{ booking.serviceName }}</h2><p>{{ dateTime(booking.startTime) }}</p><small>Время салона: {{ booking.timeZone }}</small><strong v-if="booking.status === 'CANCELLED'">Запись отменена</strong></div>
    <div v-if="booking.canChange" class="public-booking-stage">
     <h2>Перенести запись</h2><label>Новая дата<input v-model="date" type="date" :disabled="busy" /></label>
     <button type="button" :disabled="!date || busy" @click="findSlots">Показать свободное время</button>
     <div v-if="slots.length" class="public-booking-slots" role="group" aria-label="Свободное время"><button v-for="slot in slots" :key="slot" type="button" :aria-pressed="selected === slot" :class="{selected:selected === slot}" :disabled="busy" @click="selected=slot">{{ time(slot) }}</button></div>
     <button v-if="selected" type="button" class="public-booking-primary" :disabled="busy" @click="move">Перенести на {{ time(selected) }} <ArrowRight :size="16" /></button>
     <button type="button" :disabled="busy" @click="cancel">Отменить запись</button>
    </div>
    <p v-else-if="booking.status !== 'CANCELLED'">Для изменения визита свяжитесь с салоном.</p>
    <button v-if="error && booking" type="button" :disabled="busy" @click="refresh">Обновить запись</button>
    <small>Ссылка даёт доступ к изменению записи. Не передавайте её другим людям.</small>
   </template>
  </section>
 </main>
</template>
