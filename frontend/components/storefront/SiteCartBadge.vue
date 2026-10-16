<script setup lang="ts">
const { cartCount } = useStorefront();
</script>

<template>
  <b v-if="cartCount > 0" class="sb-cart-badge" aria-hidden="true">{{ cartCount > 99 ? '99+' : cartCount }}</b>
</template>
