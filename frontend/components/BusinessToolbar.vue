<script setup lang="ts">
import { ExternalLink, LogOut } from '@lucide/vue';
const { area, switchArea, canUseSalon } = useBusinessWorkspace();
const { logout } = useB2BSession();
const router = useRouter();
const signingOut = ref(false);
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    // Keep the session and draft when the user declines the unsaved-changes guard.
    const failure = await router.push('/b2b-login');
    if (!failure) logout();
  } finally { signingOut.value = false; }
}
</script>
<template>
  <header class="business-toolbar">
    <select :value="area" aria-label="Рабочее пространство бизнеса" @change="switchArea">
      <option v-if="canUseSalon" value="salon">Мой салон</option><option value="purchases">Закупки SARKISIAN</option>
    </select>
    <div class="business-toolbar-actions wn-toolbar-actions">
      <NuxtLink to="/" target="_blank" rel="noopener noreferrer" class="wn-icon-control" aria-label="Открыть сайт" title="Открыть сайт"><ExternalLink :size="18" /></NuxtLink>
      <button type="button" class="wn-icon-control wn-signout" aria-label="Выйти" title="Выйти" :disabled="signingOut" @click="signOut"><LogOut :size="18" /></button>
    </div>
  </header>
</template>
