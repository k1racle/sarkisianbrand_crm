<script setup lang="ts">
import { Bell, BellOff, Check, CheckCheck, ChevronRight, ClipboardList, Headphones, MessageCircle, RefreshCw, ShoppingBag, X } from '@lucide/vue';
const { token } = useWorkspaceSession();
const { lastMessage, lastReminder } = usePlatformChat();
const { open, unreadCount, items, toasts, category, unreadOnly, popupsEnabled, loading, busy, error, nextCursor, load, reset, read, readAll, togglePopups, follow, dismissToast, pauseToast, resumeToast } = useCrmNotifications();
const { panel, keyboard } = useCatalogDialog(computed(() => open.value), () => { open.value = false; });
const filters = [{ id: 'ALL', label: 'Все' }, { id: 'CHAT', label: 'Сообщения' }, { id: 'TASK', label: 'Задачи' }, { id: 'ORDER', label: 'Заказы' }, { id: 'SUPPORT', label: 'Обращения' }];
const icon = (kind: string) => ({ CHAT: MessageCircle, TASK: ClipboardList, ORDER: ShoppingBag, SUPPORT: Headphones }[kind] || Bell);
const time = (value: string) => new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
let poll: ReturnType<typeof setInterval> | undefined, signal: ReturnType<typeof setTimeout> | undefined;
function refresh() { if (!loading.value && !busy.value) void load(); }
function eventRefresh() { if (signal) clearTimeout(signal); signal = setTimeout(refresh, 250); }
function foreground() { if (!document.hidden) refresh(); }
watch(token, () => { reset(); if (token.value) void load(); });
watch([category, unreadOnly], () => { void load(); });
watch(open, value => { if (value) refresh(); });
watch([items, error], async () => {
  await nextTick();
  if (open.value && panel.value && !panel.value.contains(document.activeElement)) panel.value.focus({ preventScroll: true });
});
watch(lastMessage, eventRefresh); watch(lastReminder, eventRefresh);
onMounted(() => { void load(); poll = setInterval(refresh, 10000); window.addEventListener('focus', foreground); document.addEventListener('visibilitychange', foreground); });
onBeforeUnmount(() => { if (poll) clearInterval(poll); if (signal) clearTimeout(signal); window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground); reset(); });
</script>
<template>
  <button type="button" class="crm-icon-button crm-notification-bell" aria-label="Уведомления" :aria-expanded="open" :title="unreadCount ? `Непрочитанных: ${unreadCount}` : 'Уведомления'" @click="open = !open"><Bell :size="20" /><span v-if="unreadCount" class="crm-unread">{{unreadCount > 99 ? '99+' : unreadCount}}</span></button>
  <Teleport to="body">
    <div v-if="open" class="crm-notifications-backdrop" @click.self="open=false">
      <section ref="panel" class="crm-notifications-panel" role="dialog" aria-modal="true" aria-labelledby="crm-notifications-title" tabindex="-1" @keydown="keyboard">
        <header><div><h2 id="crm-notifications-title">Уведомления <span v-if="unreadCount">{{unreadCount}}</span></h2><p>Важное для вашей работы</p></div><button class="crm-icon-button" aria-label="Закрыть уведомления" @click="open=false"><X :size="22" /></button></header>
        <nav class="crm-notification-filters" aria-label="Виды уведомлений"><button v-for="filter in filters" :key="filter.id" type="button" :class="{ active: category===filter.id }" :aria-pressed="category===filter.id" @click="category=filter.id">{{filter.label}}</button></nav>
        <div class="crm-notification-tools"><label><input v-model="unreadOnly" type="checkbox" />Непрочитанные</label><button :disabled="busy || !unreadCount || loading" @click="readAll"><CheckCheck :size="17" />Прочитать всё</button><button aria-label="Обновить уведомления" :disabled="loading" @click="load()"><RefreshCw :size="17" /></button></div>
        <div class="crm-notification-list" :aria-busy="loading">
          <p v-if="error" role="alert" class="crm-notification-empty">{{error}}<button class="crm-button" @click="load()">Повторить</button></p>
          <div v-else-if="loading && !items.length" class="crm-notification-empty" role="status">Загружаем уведомления…</div>
          <div v-else-if="!items.length" class="crm-notification-empty"><Bell :size="36" /><b>{{unreadOnly ? 'Всё прочитано' : 'Уведомлений пока нет'}}</b><p>Здесь появятся сообщения, задачи, заказы и обращения, доступные вам.</p></div>
          <article v-for="item in items" :key="item.id" class="crm-notification-item" :class="{ unread: !item.read }">
            <button class="crm-notification-open" :disabled="busy" @click="follow(item)"><i><component :is="icon(item.category)" :size="21" /></i><span><b>{{item.title}}</b><span>{{item.body}}</span><time :datetime="item.createdAt">{{time(item.createdAt)}}</time></span><ChevronRight :size="16" /></button>
            <button v-if="!item.read" class="crm-notification-read" :disabled="busy" aria-label="Отметить прочитанным" title="Отметить прочитанным" @click="read(item)"><Check :size="16" /></button>
          </article>
          <button v-if="nextCursor" class="crm-button crm-notification-more" :disabled="loading" @click="load(true)">Показать ещё</button>
        </div>
        <footer><button type="button" :aria-pressed="popupsEnabled" :disabled="busy" @click="togglePopups"><Bell v-if="popupsEnabled" :size="18" /><BellOff v-else :size="18" /><span>Всплывающие уведомления <b>{{popupsEnabled ? 'включены' : 'выключены'}}</b></span><span class="crm-notification-switch" :class="{ active: popupsEnabled }" /></button><small>Во время работы в CRM. История сохраняется независимо от этой настройки.</small></footer>
      </section>
    </div>
    <aside v-if="toasts.length && !open" class="crm-notification-toasts" aria-label="Новые уведомления" aria-live="polite" aria-relevant="additions">
      <article v-for="item in toasts" :key="item.id" @mouseenter="pauseToast(item.id)" @mouseleave="resumeToast(item.id)" @focusin="pauseToast(item.id)" @focusout="resumeToast(item.id)">
        <button class="crm-notification-open" @click="follow(item)"><i><component :is="icon(item.category)" :size="22" /></i><span><small>{{filters.find(filter=>filter.id===item.category)?.label}}</small><b>{{item.title}}</b><span>{{item.body}}</span></span></button><button class="crm-notification-dismiss" aria-label="Скрыть уведомление" @click="dismissToast(item.id)"><X :size="17" /></button>
      </article>
    </aside>
  </Teleport>
</template>
