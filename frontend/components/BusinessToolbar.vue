<script setup lang="ts">
import { Building2, ExternalLink, LogOut, Moon, Scissors, ShoppingBag, Sun } from '@lucide/vue';
const {theme,toggleTheme}=useCrmTheme();
const { area, switchArea, canUseSalon } = useBusinessWorkspace();
const session = useB2BSession();
const { endSession, organizations, selectedOrganizationId } = session;
const router = useRouter();
const route = useRoute();
const signingOut = useState<boolean>('b2b-signing-out', () => false);
const organizationName = computed(() => organizations.value.find(item => item.id === selectedOrganizationId.value)?.name || '');
async function changeOrganization(event: Event) {
  const input = event.target as HTMLSelectElement, id = input.value;
  if (!id || id === selectedOrganizationId.value) return;
  // Route guards ask about unsaved forms before the selected company can change.
  await router.push({ path: '/b2b', query: { ...route.query, organization: id } });
  input.value = selectedOrganizationId.value;
}
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    // Keep the session and draft when the user declines the unsaved-changes guard.
    const failure = await router.push('/b2b-login');
    if (!failure) await endSession();
  } finally { signingOut.value = false; }
}
</script>
<template>
  <header class="business-toolbar">
    <div class="business-toolbar-context">
      <div class="business-workspace-switch"><Scissors v-if="area==='salon'" :size="18" aria-hidden="true"/><ShoppingBag v-else :size="18" aria-hidden="true"/><select :value="area" aria-label="Рабочее пространство бизнеса" :title="area==='salon'?'Мой салон':'Закупки SARKISIAN'" @change="switchArea"><option v-if="canUseSalon" value="salon">Мой салон</option><option value="purchases">Закупки</option></select></div>
      <div v-if="organizations.length > 1 || (organizations.length && !selectedOrganizationId)" class="business-organization-switch"><Building2 :size="17" aria-hidden="true"/><select :value="selectedOrganizationId" aria-label="Организация" :disabled="signingOut" @change="changeOrganization"><option value="" disabled>Выберите организацию</option><option v-for="organization in organizations" :key="organization.id" :value="organization.id">{{ organization.name }}</option></select></div>
      <span v-else-if="organizationName" class="business-toolbar-company"><Building2 :size="16" aria-hidden="true"/><span>{{organizationName}}</span></span>
    </div>
    <div class="business-toolbar-actions wn-toolbar-actions">
      <button type="button" class="wn-icon-control" :aria-label="theme==='dark'?'Включить светлую тему':'Включить тёмную тему'" :title="theme==='dark'?'Светлая тема':'Тёмная тема'" @click="toggleTheme"><Sun v-if="theme==='dark'" :size="18"/><Moon v-else :size="18"/></button>
      <NuxtLink to="/" target="_blank" rel="noopener noreferrer" class="wn-icon-control" aria-label="Открыть сайт" title="Открыть сайт"><ExternalLink :size="18" /></NuxtLink>
      <button type="button" class="wn-icon-control wn-signout" aria-label="Выйти" title="Выйти" :disabled="signingOut" @click="signOut"><LogOut :size="18" /></button>
    </div>
  </header>
</template>
