<script setup lang="ts">
const card = ref<HTMLElement | null>(null);
const visible = ref(false);
let observer: IntersectionObserver | undefined;
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting; });
  if (card.value) observer.observe(card.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="card" class="sb-club-banner__card sb-glass-surface" :class="{ 'is-visible': visible }">
    <small>ВАШ БОНУСНЫЙ БАЛАНС</small>
    <b>1250</b>
    <span>баллов для следующей покупки</span>
    <i><span></span></i>
    <div><span>Старт</span><span>Профи</span></div>
  </div>
</template>
