<script setup lang="ts">
const props=defineProps<{modelValue:string;prefix:string}>();const emit=defineEmits(['update:modelValue']);
const tabs=[['general','Общее'],['subtasks','Подзадачи'],['files','Вложения'],['comments','Комментарии'],['history','История изменений']];
function keys(event:KeyboardEvent,index:number){let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();emit('update:modelValue',tabs[next][0]);nextTick(()=>document.getElementById(`${props.prefix}-${tabs[next][0]}-tab`)?.focus());}
</script>
<template><nav class="crm-card-tabs" role="tablist" aria-label="Разделы карточки"><button class="crm-button" v-for="(tab,index) in tabs" :id="`${prefix}-${tab[0]}-tab`" :key="tab[0]" type="button" role="tab" :aria-selected="modelValue===tab[0]" :aria-controls="`${prefix}-${tab[0]}-panel`" :tabindex="modelValue===tab[0]?0:-1" @click="emit('update:modelValue',tab[0])" @keydown="keys($event,index)">{{tab[1]}}</button></nav></template>
