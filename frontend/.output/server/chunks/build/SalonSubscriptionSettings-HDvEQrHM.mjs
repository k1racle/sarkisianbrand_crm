globalThis.__timing__.logStart('Load chunks/build/SalonSubscriptionSettings-HDvEQrHM');import { u as useHead, a as useWorkspaceSession } from '../virtual/entry.mjs';
import { defineComponent, reactive, ref, computed, mergeProps, unref, useSSRContext } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrInterpolate, ssrRenderAttr, ssrLooseContain } from 'vue/server-renderer';
import { RefreshCw, Save } from '@lucide/vue';

// components/workspace/SalonSubscriptionSettings.vue?vue&type=script&setup=true&lang.ts
var SalonSubscriptionSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SalonSubscriptionSettings",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ meta: [{
			name: "robots",
			content: "noindex, nofollow"
		}] });
		useWorkspaceSession();
		const draft = reactive({
			name: "Кабинет салона",
			monthlyPrice: 0,
			annualPrice: 0,
			freeAccess: true
		});
		const loading = ref(true), busy = ref(false), error = ref(""), notice = ref(""), baseline = ref("");
		const dirty = computed(() => !!baseline.value && baseline.value !== JSON.stringify(draft));
		function leave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Настройки подписки не сохранены. Покинуть страницу?"));
		}
		onBeforeRouteLeave(leave);
		onBeforeRouteUpdate(leave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "salon-subscription-page crm-standard crm-management-workspace" }, _attrs))}><header class="crm-page-header"><h1>Подписка для салонов</h1><button class="crm-button crm-button--refresh" type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button></header>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем настройки…</p>`);
			else if (unref(baseline)) {
				_push(`<form class="salon-settings-panel crm-surface"><h2>Тариф кабинета и онлайн-записи</h2><p>Сейчас функции доступны всем салонам бесплатно. Цены и режим ниже — подготовка будущей подписки: платежи, списания и блокировка доступа не активированы.</p><fieldset class="ui-fieldset-reset"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><div class="salon-settings-fields"><label class="salon-settings-wide">Название тарифа<input class="crm-input"${ssrRenderAttr("value", unref(draft).name)} maxlength="100" required></label><label>Цена за месяц, ₽<input class="crm-input"${ssrRenderAttr("value", unref(draft).monthlyPrice)} type="number" min="0" max="1000000" step="0.01" required></label><label>Цена за год, ₽<input class="crm-input"${ssrRenderAttr("value", unref(draft).annualPrice)} type="number" min="0" max="10000000" step="0.01" required></label></div><label class="salon-subscription-switch crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).freeAccess) ? ssrLooseContain(unref(draft).freeAccess, null) : unref(draft).freeAccess) ? " checked" : ""} type="checkbox">Бесплатный режим тарифа</label></fieldset><footer class="salon-settings-save"><span role="status">${ssrInterpolate(unref(notice) || (unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены"))}</span><button class="crm-button" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(`Сохранить тариф</button></footer></form>`);
			} else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// components/workspace/SalonSubscriptionSettings.vue
var _sfc_setup = SalonSubscriptionSettings_vue_vue_type_script_setup_true_lang_default.setup;
SalonSubscriptionSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/SalonSubscriptionSettings.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SalonSubscriptionSettings_default = Object.assign(SalonSubscriptionSettings_vue_vue_type_script_setup_true_lang_default, { __name: "SalonSubscriptionSettings" });

export { SalonSubscriptionSettings_default as S };;globalThis.__timing__.logEnd('Load chunks/build/SalonSubscriptionSettings-HDvEQrHM');
//# sourceMappingURL=SalonSubscriptionSettings-HDvEQrHM.mjs.map
