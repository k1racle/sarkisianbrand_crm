<script setup lang="ts">
import { downloadCourseCertificate, type CourseCertificate } from '~/shared/course-certificate';
const props = defineProps<{ token: string }>();
const config = useRuntimeConfig();
const items = ref<CourseCertificate[]>([]), loading = ref(true), error = ref(''), downloading = ref('');
let revision = 0;
async function load() {
  const current=++revision; loading.value=true; error.value=''; items.value=[];
  try { const result=await $fetch<CourseCertificate[]>('/lms/certificates/my',{baseURL:config.public.apiBase,headers:{Authorization:`Bearer ${props.token}`}}); if(current===revision) items.value=Array.isArray(result)?result:[]; }
  catch { if(current===revision) error.value='Не удалось загрузить сертификаты.'; }
  finally { if(current===revision) loading.value=false; }
}
async function download(item:CourseCertificate) {
  if(downloading.value) return; downloading.value=item.id; error.value='';
  try { await downloadCourseCertificate(String(config.public.apiBase),props.token,item.id); }
  catch { error.value='Не удалось скачать сертификат. Попробуйте ещё раз.'; }
  finally { downloading.value=''; }
}
watch(() => props.token,load); onMounted(load); onBeforeUnmount(()=>{revision++});
</script>
<template>
  <section class="site-courses-section" aria-labelledby="my-certificates"><h2 id="my-certificates">Мои сертификаты</h2>
    <p v-if="loading" class="site-courses-state" role="status">Загружаем сертификаты…</p>
    <div v-else-if="error && !items.length" class="site-courses-state" role="alert"><p>{{error}}</p><button type="button" class="site-courses-button" @click="load">Повторить</button></div>
    <p v-else-if="!items.length" class="site-courses-state">Сертификаты появятся здесь после прохождения курсов.</p>
    <div v-else class="site-courses-grid"><article v-for="item in items" :key="item.id" class="site-course-card"><div><h3>{{item.courseTitle}}</h3><p>{{item.fullName}}</p></div><button type="button" class="site-courses-button" :disabled="!!downloading" @click="download(item)">{{downloading===item.id ? 'Подготавливаем…' : 'Скачать PDF'}}</button></article></div>
    <p v-if="error && items.length" role="alert">{{error}}</p>
  </section>
</template>
