<script setup lang="ts">
import { Award, Download } from '@lucide/vue';
import { downloadCourseCertificate, type CourseCertificate } from '~/shared/course-certificate';
const props = defineProps<{ courseId: string; token: string; completed: boolean }>();
const config = useRuntimeConfig();
const certificate = ref<CourseCertificate | null>(null), busy = ref(false), loading = ref(false), error = ref('');
let revision = 0;
async function load() {
  const current = ++revision; certificate.value = null; error.value = ''; loading.value = true;
  try {
    const result = await $fetch<CourseCertificate | null>(`/lms/certificates/course/${encodeURIComponent(props.courseId)}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${props.token}` } });
    if (current === revision) certificate.value = result || null;
  } catch { if (current === revision) error.value = 'Не удалось проверить сертификат. Попробуйте ещё раз.'; }
  finally { if (current === revision) loading.value = false; }
}
async function issue() {
  if (busy.value || !props.completed) return;
  const current = revision; busy.value = true; error.value = '';
  try {
    const result = await $fetch<CourseCertificate>(`/lms/certificates/course/${encodeURIComponent(props.courseId)}`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${props.token}` } });
    if (current === revision) certificate.value = result;
  } catch (e: any) { if (current === revision) error.value = typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось оформить сертификат. Попробуйте ещё раз.'; }
  finally { if (current === revision) busy.value = false; }
}
async function download() {
  if (!certificate.value || busy.value) return;
  const current = revision; busy.value = true; error.value = '';
  try { await downloadCourseCertificate(String(config.public.apiBase), props.token, certificate.value.id); }
  catch { if (current === revision) error.value = 'Не удалось скачать сертификат. Попробуйте ещё раз.'; }
  finally { if (current === revision) busy.value = false; }
}
watch(() => [props.courseId, props.token], () => void load());
onMounted(load); onBeforeUnmount(() => { revision++; });
</script>
<template>
  <section v-if="completed || certificate || error" class="site-course-certificate" aria-label="Сертификат курса">
    <Award :size="24" aria-hidden="true"/><div><h2>Сертификат о прохождении</h2><p v-if="certificate">Сертификат оформлен на {{ certificate.fullName }}. Его можно скачать в формате PDF.</p><p v-else>Вы прошли программу. Оформите именной сертификат.</p><p v-if="error" role="alert">{{ error }}</p><button v-if="error && !certificate && !completed" type="button" class="site-courses-button" @click="load">Повторить</button><button v-else-if="certificate" type="button" class="site-courses-button" :disabled="busy" @click="download"><Download :size="17"/> {{ busy ? 'Подготавливаем…' : 'Скачать сертификат' }}</button><button v-else type="button" class="site-courses-button" :disabled="busy || loading" @click="issue">{{ busy ? 'Оформляем…' : 'Получить сертификат' }}</button></div>
  </section>
</template>
