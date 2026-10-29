globalThis.__timing__.logStart('Load chunks/build/usePaymentProviders-CQ8-qJn6');import { $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { ref, computed, watch, defineComponent, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrInterpolate } from 'vue/server-renderer';

const PAYMENT_PROVIDER_NAMES = { YOOKASSA: "\u042EKassa", TBANK: "\u0422-\u0411\u0430\u043D\u043A", ROBOKASSA: "\u0420\u043E\u0431\u043E\u043A\u0430\u0441\u0441\u0430" };
function paymentProviderList(value) {
  const raw = value && typeof value === "object" ? value.providers : void 0;
  if (!Array.isArray(raw)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043F\u043B\u0430\u0442\u0451\u0436\u043D\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0438\u0441\u0430");
  const seen = /* @__PURE__ */ new Set(), result = [];
  for (const item of raw) {
    if (!item || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, item.provider) || typeof item.available !== "boolean" || seen.has(item.provider)) continue;
    seen.add(item.provider);
    result.push({ provider: item.provider, available: item.available, courseAvailable: item.courseAvailable === true, courseReason: typeof item.courseReason === "string" ? item.courseReason : null, environment: item.environment === "TEST" ? "TEST" : item.environment === "PRODUCTION" ? "PRODUCTION" : null, reason: typeof item.reason === "string" ? item.reason : null });
  }
  return result;
}
function robokassaCourseForm(value, provider, expected) {
  const invalid = () => new Error("\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0444\u043E\u0440\u043C\u0430 \u043E\u043F\u043B\u0430\u0442\u044B. \u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.");
  if (provider !== "ROBOKASSA" || expected !== "ROBOKASSA" || !value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const form = value;
  if (form.action !== "https://auth.robokassa.ru/Merchant/Index.aspx" || form.method !== "POST" || !form.fields || typeof form.fields !== "object" || Array.isArray(form.fields) || Object.keys(form).some((key) => !["action", "method", "fields"].includes(key))) throw invalid();
  const fields = form.fields;
  const limits = { MerchantLogin: 100, OutSum: 16, InvId: 10, Description: 100, Receipt: 8192, Shp_payment: 36, SignatureValue: 128, Email: 64, IsTest: 1 };
  const required = Object.keys(limits).filter((key) => key !== "IsTest");
  if (Object.keys(fields).some((key) => !Object.hasOwn(limits, key)) || required.some((key) => !Object.hasOwn(fields, key)) || Object.entries(fields).some(([key, value2]) => typeof value2 !== "string" || !value2.length || value2.length > limits[key] || /[\u0000-\u001f\u007f]/.test(value2))) throw invalid();
  if (!/^\d+(?:\.\d{2})$/.test(fields.OutSum) || !/^[1-9]\d*$/.test(fields.InvId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.Shp_payment) || !/^(?:[0-9a-f]{32}|[0-9a-f]{64}|[0-9a-f]{128})$/i.test(fields.SignatureValue) || fields.IsTest !== void 0 && fields.IsTest !== "1") throw invalid();
  return { action: form.action, method: "POST", fields };
}
function submitRobokassaCourseForm(value, provider, expected) {
  const validated = robokassaCourseForm(value, provider, expected);
  const element = document.createElement("form");
  element.method = "POST";
  element.action = validated.action;
  element.target = "_self";
  element.hidden = true;
  for (const [name, value2] of Object.entries(validated.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value2;
    element.appendChild(input);
  }
  document.body.appendChild(element);
  try {
    HTMLFormElement.prototype.submit.call(element);
  } finally {
    element.remove();
  }
}
function officialPaymentUrl(value, provider, expected) {
  if (typeof value !== "string" || provider !== expected || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, expected)) throw new Error("\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043E\u043F\u043B\u0430\u0442\u044B. \u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043E\u043F\u043B\u0430\u0442\u044B. \u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.");
  }
  const allowed = expected === "YOOKASSA" ? ["yoomoney.ru", "yookassa.ru"].some((host) => url.hostname === host || url.hostname.endsWith("." + host)) : expected === "TBANK" ? ["securepayments.tinkoff.ru", "securepayments.tbank.ru"].includes(url.hostname) : url.hostname === "auth.robokassa.ru";
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || !allowed) throw new Error("\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043E\u043F\u043B\u0430\u0442\u044B. \u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D, \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.");
  return url.href;
}

// components/storefront/PaymentProviderSelect.vue?vue&type=script&setup=true&lang.ts
var PaymentProviderSelect_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "PaymentProviderSelect",
	__ssrInlineRender: true,
	props: {
		modelValue: {},
		providers: {},
		disabled: { type: Boolean },
		name: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		return (_ctx, _push, _parent, _attrs) => {
			if (__props.providers.length) {
				_push(`<fieldset${ssrRenderAttrs(mergeProps({
					class: "sb-payment-providers",
					disabled: __props.disabled
				}, _attrs))}><legend>Способ онлайн-оплаты</legend><!--[-->`);
				ssrRenderList(__props.providers, (item) => {
					_push(`<label class="sb-payment-provider"><input${ssrRenderAttr("name", __props.name)} type="radio"${ssrRenderAttr("value", item.provider)}${ssrIncludeBooleanAttr(__props.modelValue === item.provider) ? " checked" : ""}><span>${ssrInterpolate(unref(PAYMENT_PROVIDER_NAMES)[item.provider])}`);
					if (item.environment === "TEST") _push(`<small>Тестовый режим</small>`);
					else _push(`<!---->`);
					_push(`</span></label>`);
				});
				_push(`<!--]--></fieldset>`);
			} else _push(`<!---->`);
		};
	}
});
// components/storefront/PaymentProviderSelect.vue
var _sfc_setup = PaymentProviderSelect_vue_vue_type_script_setup_true_lang_default.setup;
PaymentProviderSelect_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/PaymentProviderSelect.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PaymentProviderSelect_default = Object.assign(PaymentProviderSelect_vue_vue_type_script_setup_true_lang_default, { __name: "PaymentProviderSelect" });
// composables/usePaymentProviders.ts
function usePaymentProviders(course) {
	const config = useRuntimeConfig();
	const providers = ref([]), selected = ref(""), pending = ref(true), error = ref("");
	const available = computed(() => providers.value.filter((item) => course?.value ? item.courseAvailable : item.available));
	const choice = computed(() => available.value.find((item) => item.provider === selected.value));
	let version = 0;
	async function load(preserveSelection = false) {
		const current = ++version;
		pending.value = true;
		error.value = "";
		try {
			const response = await $fetch$1("/payments/providers", {
				baseURL: config.public.apiBase,
				timeout: 1e4,
				retry: 0
			});
			if (current !== version) return;
			providers.value = paymentProviderList(response);
			if (!preserveSelection && !available.value.some((item) => item.provider === selected.value)) selected.value = available.value[0]?.provider || "";
		} catch {
			if (current !== version) return;
			providers.value = [];
			error.value = "Не удалось проверить доступность онлайн-оплаты. Повторите попытку позже.";
		} finally {
			if (current === version) pending.value = false;
		}
	}
	watch(() => course?.value, () => {
		if (!available.value.some((item) => item.provider === selected.value)) selected.value = available.value[0]?.provider || "";
	});
	return {
		providers,
		available,
		selected,
		choice,
		pending,
		error,
		load
	};
}

export { PaymentProviderSelect_default as P, PAYMENT_PROVIDER_NAMES as a, officialPaymentUrl as o, submitRobokassaCourseForm as s, usePaymentProviders as u };;globalThis.__timing__.logEnd('Load chunks/build/usePaymentProviders-CQ8-qJn6');
//# sourceMappingURL=usePaymentProviders-CQ8-qJn6.mjs.map
