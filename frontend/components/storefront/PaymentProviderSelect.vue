<script setup lang="ts">
import { PAYMENT_PROVIDER_NAMES, type PaymentProviderCapability, type StorefrontPaymentProvider } from '~/shared/payment-providers';
defineProps<{ modelValue: StorefrontPaymentProvider | ''; providers: PaymentProviderCapability[]; disabled?: boolean; name: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: StorefrontPaymentProvider] }>();
</script>
<template>
  <fieldset v-if="providers.length" class="sb-payment-providers" :disabled="disabled">
    <legend>Способ онлайн-оплаты</legend>
    <label v-for="item in providers" :key="item.provider" class="sb-payment-provider">
      <input :name="name" type="radio" :value="item.provider" :checked="modelValue===item.provider" @change="emit('update:modelValue', item.provider)"/>
      <span>{{ PAYMENT_PROVIDER_NAMES[item.provider] }}<small v-if="item.environment==='TEST'">Тестовый режим</small></span>
    </label>
  </fieldset>
</template>
