<script setup lang="ts">
import { ArrowDown, ArrowUp, EyeOff, GripVertical } from '@lucide/vue';
import { DAY_WIDGETS, DAY_WIDGET_WIDTH_LABELS, type DayWidgetId, type DayWidgetWidth } from '~/shared/crm-day-widgets';
const props = defineProps<{ id: DayWidgetId; width: DayWidgetWidth; editing: boolean; first: boolean; last: boolean; dragging?: boolean; pending?: boolean }>();
const emit = defineEmits<{ move: [direction: -1 | 1]; width: [value: number]; hide: []; startDrag: [event: DragEvent]; endDrag: []; dropWidget: [event: DragEvent] }>();
const definition = computed(() => DAY_WIDGETS.find(widget => widget.id === props.id)!);
</script>
<template>
  <section class="crm-day-widget" :class="{ 'crm-day-widget--editing': editing, 'crm-day-widget--dragging': dragging }" :data-day-widget="id" :data-width="width" :style="{ '--day-widget-span': width }" @dragover.prevent="editing && $event.dataTransfer && ($event.dataTransfer.dropEffect = 'move')" @drop.prevent="editing && emit('dropWidget', $event)">
    <div v-if="editing" class="crm-day-widget-tools" :aria-label="`Настройка виджета ${definition.title}`">
      <button class="crm-button crm-button--icon crm-widget-handle crm-day-widget-grip" type="button" draggable="true" :aria-label="`Переместить ${definition.title}. Используйте стрелки вверх и вниз`" title="Перетащите или используйте кнопки перемещения" @dragstart="emit('startDrag', $event)" @dragend="emit('endDrag')" @keydown.alt.up.prevent="emit('move', -1)" @keydown.alt.down.prevent="emit('move', 1)"><GripVertical :size="18" /></button>
      <span class="crm-day-widget-label">{{ definition.title }}</span>
      <div class="crm-day-widget-tool-actions">
        <label class="crm-day-widget-size"><span class="sr-only">Ширина: {{ definition.title }}</span><select class="crm-input" :value="width" :aria-label="`Ширина: ${definition.title}`" @change="emit('width', Number(($event.target as HTMLSelectElement).value))"><option v-for="size in definition.widths" :key="size" :value="size">{{ DAY_WIDGET_WIDTH_LABELS[size] }}</option></select></label>
        <button class="crm-button crm-button--icon" type="button" :disabled="first" :aria-label="`Выше: ${definition.title}`" @click="emit('move', -1)"><ArrowUp :size="18" /></button>
        <button class="crm-button crm-button--icon" type="button" :disabled="last" :aria-label="`Ниже: ${definition.title}`" @click="emit('move', 1)"><ArrowDown :size="18" /></button>
        <button class="crm-button crm-button--icon" type="button" :aria-label="`Скрыть: ${definition.title}`" @click="emit('hide')"><EyeOff :size="18" /></button>
      </div>
    </div>
    <p v-if="pending" class="crm-day-widget-pending">Содержимое загрузится после сохранения настройки.</p>
    <div v-else class="crm-day-widget-content" :inert="editing || undefined"><slot /></div>
  </section>
</template>
