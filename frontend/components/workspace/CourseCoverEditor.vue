<script setup lang="ts">
import { ImagePlus } from '@lucide/vue';
const props=defineProps<{courseId:string; url?:string|null; editable:boolean}>();
const emit=defineEmits<{changed:[]; busyChange:[boolean]}>();
const session=useWorkspaceSession();
const selected=ref<File|null>(null), busy=ref(false), error=ref(''), notice=ref('');
const safeUrl=computed(()=> /^\/api\/v1\/media\/files\/[0-9a-f-]{36}\.(?:jpg|png|webp|avif)$/i.test(props.url || '') ? props.url : null);
function pick(event:Event) { const input=event.target as HTMLInputElement; selected.value=input.files?.[0] || null; input.value=''; error.value=''; notice.value=''; }
async function upload() {
  const file=selected.value; if (!file || busy.value || !props.editable) return;
  if (!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type) || file.size<1 || file.size>8*1024*1024) {error.value='Выберите изображение JPEG, PNG, WebP или AVIF размером до 8 МиБ.';return;}
  const form=new FormData();form.append('file',file);busy.value=true;emit('busyChange',true);error.value='';notice.value='';
  try {await session.request(`/lms/admin/courses/${encodeURIComponent(props.courseId)}/cover`,{method:'POST',body:form,timeout:60000});selected.value=null;notice.value='Обложка обновлена.';emit('changed');}
  catch(e:any){error.value=typeof e?.data?.message==='string'?e.data.message:'Не удалось загрузить обложку. Попробуйте ещё раз.';}
  finally {busy.value=false;emit('busyChange',false);}
}
async function remove(){if(!props.editable||busy.value||!safeUrl.value||!window.confirm('Убрать обложку курса?'))return;busy.value=true;emit('busyChange',true);error.value='';notice.value='';try{await session.request(`/lms/admin/courses/${encodeURIComponent(props.courseId)}/cover`,{method:'DELETE'});notice.value='Обложка убрана.';emit('changed');}catch{error.value='Не удалось убрать обложку. Попробуйте ещё раз.';}finally{busy.value=false;emit('busyChange',false);}}
</script>
<template>
  <section class="course-cover-editor" aria-label="Обложка курса">
    <div><h3>Обложка курса</h3><p class="course-hint">Изображение видно на сайте в карточке курса. JPEG, PNG, WebP или AVIF до 8 МиБ.</p></div>
    <img v-if="safeUrl" class="course-cover-preview" :src="safeUrl" alt="Обложка курса"/>
    <p v-else class="course-hint">Обложка ещё не добавлена.</p>
    <p v-if="error" class="course-error" role="alert">{{error}}</p><p v-if="notice" class="course-success" role="status">{{notice}}</p>
    <template v-if="editable"><label class="course-asset-picker"><span class="crm-button"><ImagePlus :size="16"/> Выбрать обложку</span><input type="file" aria-label="Выбрать обложку" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="busy" @change="pick"/></label><span v-if="selected" class="course-hint">{{selected.name}}</span><div class="course-actions"><button class="crm-button crm-button--primary" type="button" :disabled="!selected||busy" @click="upload">{{busy?'Загружаем…':'Загрузить обложку'}}</button><button v-if="safeUrl" class="crm-button" type="button" :disabled="busy" @click="remove">Убрать обложку</button></div></template>
  </section>
</template>
