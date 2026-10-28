<script setup lang="ts">
const route = useRoute();
const session = useWorkspaceSession();
const access = useWorkspaceAccess();
const { active, home } = useCrmNavigation();
const hasSession = computed(() => Boolean(session.token.value || session.refreshToken.value));
const loginDestination = computed(() => ({ path: '/crm/login', query: { redirect: route.fullPath } }));
// A token rotation rechecks permissions, but does not switch the employee or
// destroy their draft. A login/logout generation change does switch identity.
const identity = computed(() => JSON.stringify([session.generation.value, session.user.value?.id, route.path]));
const permitted = computed(() => hasSession.value && access.ready.value && Boolean(active.value));
const mountedIdentity = ref('');

// A failed refresh must not mount an unchecked page, or destroy the draft of a
// previously checked page. Hide that page until access has been verified again.
// A confirmed revocation, route change or identity change discards the old view.
watch([identity, access.ready, permitted], ([key, ready, allowed]) => {
  if (mountedIdentity.value !== key || (ready && !allowed)) mountedIdentity.value = '';
  if (allowed) mountedIdentity.value = key;
}, { immediate: true, flush: 'sync' });
</script>

<template>
  <div v-if="!hasSession" class="crm-standard">
    <section class="crm-surface" role="alert" aria-labelledby="crm-session-ended-title">
      <header class="crm-panel-header"><h2 id="crm-session-ended-title">Сессия завершена</h2></header>
      <div class="crm-register crm-stack">
        <p class="crm-inline-note">Войдите снова, чтобы открыть раздел и продолжить работу.</p>
        <div class="crm-action-bar"><NuxtLink class="crm-button" :to="loginDestination">Войти в CRM</NuxtLink></div>
      </div>
    </section>
  </div>
  <WorkspaceLoading v-else-if="!access.ready.value && !access.error.value" label="Проверяем доступ к разделу" />
  <div v-if="hasSession && (access.error.value || (access.ready.value && !permitted))" class="crm-standard">
    <section v-if="access.error.value" class="crm-surface" role="alert" aria-labelledby="crm-access-error-title">
      <header class="crm-panel-header"><h2 id="crm-access-error-title">Не удалось проверить доступ</h2></header>
      <div class="crm-register crm-stack">
        <p class="crm-inline-note">Проверьте соединение и повторите попытку. Раздел откроется после проверки прав.</p>
        <div class="crm-action-bar"><button type="button" class="crm-button" :disabled="access.loading.value" @click="access.refresh">Повторить проверку</button></div>
      </div>
    </section>
    <section v-else class="crm-surface" role="alert" aria-labelledby="crm-access-denied-title">
      <header class="crm-panel-header"><h2 id="crm-access-denied-title">Нет доступа к разделу</h2></header>
      <div class="crm-register crm-stack">
        <p class="crm-inline-note">Ваши права изменились. Выберите доступный раздел или обратитесь к администратору.</p>
        <div class="crm-action-bar"><NuxtLink class="crm-button" :to="home">К доступным разделам</NuxtLink></div>
      </div>
    </section>
  </div>
  <div v-if="hasSession && mountedIdentity === identity" v-show="permitted" :inert="!permitted || undefined">
    <slot />
  </div>
</template>
