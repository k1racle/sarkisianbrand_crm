<script setup lang="ts">
const props = defineProps<{ modelValue?: string | null; people: any[]; current?: any }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();
const name = (person: any) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || 'Сотрудник';
const options = computed(() => props.current && !props.people.some(person => person.id === props.current.id) ? [props.current, ...props.people] : props.people);
</script>
<template>
  <label class="crm-field">Ответственный за клиента
    <select class="crm-input" :value="modelValue || ''" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)">
      <option value="">Не назначен</option>
      <option v-for="person in options" :key="person.id" :value="person.id">{{ name(person) }}</option>
    </select>
  </label>
</template>
