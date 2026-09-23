<script setup lang="ts">
const props=defineProps<{leadId:string;team:any[];managerId?:string}>(),emit=defineEmits(['busy']);const {user}=useWorkspaceSession(),{can}=useWorkspaceAccess(),{request,message}=useCrmDrive();
const rows=ref<any[]>([]),title=ref(''),assignee=ref(props.managerId||user.value?.id||''),busy=ref(false),error=ref('');
watch(busy,x=>emit('busy',x));
async function load(){try{const lead=await request<any>(`leads/${props.leadId}`);rows.value=(lead.tasks||[]).filter((t:any)=>t.status!=='CANCELLED');}catch(e){error.value=message(e);}}
async function create(){if(busy.value||!title.value.trim())return;busy.value=true;error.value='';try{await request('tasks',{method:'POST',body:{title:title.value.trim(),assignedToId:assignee.value,leadId:props.leadId}});title.value='';await load();}catch(e){error.value=message(e);}finally{busy.value=false;}}
async function toggle(task:any){busy.value=true;error.value='';try{await request(`tasks/${task.id}`,{method:'PATCH',body:{status:task.status==='DONE'?'TODO':'DONE'}});await load();}catch(e){error.value=message(e);}finally{busy.value=false;}}
watch(()=>props.leadId,load,{immediate:true});
</script>
<template>
  <div>
    <p v-if="error" role="alert" class="crm-work-error">{{ error }}</p>
    <CrmSubtasks v-model:title="title" v-model:assignee="assignee" :rows="rows" :team="team" :busy="busy" :writable="can('crm.write')" description="Эти задачи также доступны в общем списке задач команды." @create="create" @toggle="toggle" @open="task => navigateTo('/crm/tasks?task=' + task.id)" />
  </div>
</template>
