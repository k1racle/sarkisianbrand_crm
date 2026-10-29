globalThis.__timing__.logStart('Load chunks/build/admin-BKHB-kjW');import { n as navigateTo, N as NuxtLink } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, withAsyncContext, ref, mergeProps, withCtx, createVNode, createTextVNode, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderList, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { LogIn, RefreshCw, ShoppingCart, BarChart3, Users, Package } from '@lucide/vue';
import 'nostics';
import 'nostics/formatters/ansi';
import '../_/nitro.mjs';
import 'unhead/server';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import 'unhead/utils';
import 'vue-router';

// pages/admin.vue?vue&type=script&setup=true&lang.ts
var admin_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "admin",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		[__temp, __restore] = withAsyncContext(() => navigateTo("/admin-workspace")), await __temp, __restore();
		const email = ref("");
		const password = ref("");
		ref("");
		const loginError = ref("");
		const loading = ref(false);
		const dashboard = ref(null);
		const orders = ref([]);
		const products = ref([]);
		const savingProduct = ref(null);
		const savingOrder = ref(null);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<div${ssrRenderAttrs(mergeProps({
				"data-v-ui-557e9c624b57": "",
				class: "admin-page"
			}, _attrs))}><header data-v-ui-557e9c624b57 class="admin-header">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-557e9c624b57": "",
				to: "/",
				class: "logo"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img data-v-ui-557e9c624b57${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt="SARKISIAN"${_scopeId}>`);
					else return [createVNode("img", {
						"data-v-ui-557e9c624b57": "",
						src: _virtual_public__2Fsarkisian_logo_default,
						alt: "SARKISIAN"
					})];
				}),
				_: 1
			}, _parent));
			_push(`<span data-v-ui-557e9c624b57>Административная панель</span>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-557e9c624b57": "",
				to: "/",
				class: "back-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`В магазин →`);
					else return [createTextVNode("В магазин →")];
				}),
				_: 1
			}, _parent));
			_push(`</header>`);
			if (!unref(dashboard)) {
				_push(`<main data-v-ui-557e9c624b57 class="admin-login"><div data-v-ui-557e9c624b57 class="admin-login-card"><div data-v-ui-557e9c624b57 class="admin-icon">`);
				_push(ssrRenderComponent(unref(LogIn), {
					"data-v-ui-557e9c624b57": "",
					size: 24
				}, null, _parent));
				_push(`</div><p data-v-ui-557e9c624b57 class="kicker">SARKISIAN BRAND</p><h1 data-v-ui-557e9c624b57>Вход в админку</h1><p data-v-ui-557e9c624b57>Доступ только для сотрудников с ролью администратора или менеджера.</p><form data-v-ui-557e9c624b57><label data-v-ui-557e9c624b57>Email<input data-v-ui-557e9c624b57${ssrRenderAttr("value", unref(email))} type="email" required></label><label data-v-ui-557e9c624b57>Пароль<input data-v-ui-557e9c624b57${ssrRenderAttr("value", unref(password))} type="password" required></label>`);
				if (unref(loginError)) _push(`<p data-v-ui-557e9c624b57 class="login-error">${ssrInterpolate(unref(loginError))}</p>`);
				else _push(`<!---->`);
				_push(`<button data-v-ui-557e9c624b57 class="admin-submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>${ssrInterpolate(unref(loading) ? "Проверяем…" : "Войти")} `);
				_push(ssrRenderComponent(unref(LogIn), {
					"data-v-ui-557e9c624b57": "",
					size: 17
				}, null, _parent));
				_push(`</button></form></div></main>`);
			} else {
				_push(`<main data-v-ui-557e9c624b57 class="admin-main"><div data-v-ui-557e9c624b57 class="admin-title"><div data-v-ui-557e9c624b57><p data-v-ui-557e9c624b57 class="kicker">OVERVIEW</p><h1 data-v-ui-557e9c624b57>Добрый день</h1></div><button data-v-ui-557e9c624b57 class="refresh">`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-557e9c624b57": "",
					size: 17
				}, null, _parent));
				_push(` Обновить</button></div><div data-v-ui-557e9c624b57 class="kpi-grid"><div data-v-ui-557e9c624b57 class="kpi">`);
				_push(ssrRenderComponent(unref(ShoppingCart), {
					"data-v-ui-557e9c624b57": "",
					size: 20
				}, null, _parent));
				_push(`<span data-v-ui-557e9c624b57>Заказы</span><strong data-v-ui-557e9c624b57>${ssrInterpolate(unref(dashboard).orders)}</strong></div><div data-v-ui-557e9c624b57 class="kpi">`);
				_push(ssrRenderComponent(unref(BarChart3), {
					"data-v-ui-557e9c624b57": "",
					size: 20
				}, null, _parent));
				_push(`<span data-v-ui-557e9c624b57>Оплачено</span><strong data-v-ui-557e9c624b57>${ssrInterpolate(unref(dashboard).paidOrders)}</strong></div><div data-v-ui-557e9c624b57 class="kpi">`);
				_push(ssrRenderComponent(unref(Users), {
					"data-v-ui-557e9c624b57": "",
					size: 20
				}, null, _parent));
				_push(`<span data-v-ui-557e9c624b57>Клиенты</span><strong data-v-ui-557e9c624b57>${ssrInterpolate(unref(dashboard).customers)}</strong></div><div data-v-ui-557e9c624b57 class="kpi">`);
				_push(ssrRenderComponent(unref(Package), {
					"data-v-ui-557e9c624b57": "",
					size: 20
				}, null, _parent));
				_push(`<span data-v-ui-557e9c624b57>Товары</span><strong data-v-ui-557e9c624b57>${ssrInterpolate(unref(dashboard).products)}</strong></div></div><section data-v-ui-557e9c624b57 class="admin-section"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Последние заказы</h2><span data-v-ui-557e9c624b57>${ssrInterpolate(unref(orders).length)} записей</span></div><div data-v-ui-557e9c624b57 class="order-table"><div data-v-ui-557e9c624b57 class="table-head"><span data-v-ui-557e9c624b57>Номер</span><span data-v-ui-557e9c624b57>Статус</span><span data-v-ui-557e9c624b57>Сумма</span><span data-v-ui-557e9c624b57>Дата</span></div><!--[-->`);
				ssrRenderList(unref(orders), (order) => {
					_push(`<div data-v-ui-557e9c624b57 class="table-row"><b data-v-ui-557e9c624b57>${ssrInterpolate(order.orderNumber)}</b><span data-v-ui-557e9c624b57 class="status">${ssrInterpolate(order.status)}</span><span data-v-ui-557e9c624b57>${ssrInterpolate(Number(order.finalAmount).toLocaleString("ru-RU"))} ₽</span><span data-v-ui-557e9c624b57>${ssrInterpolate(new Date(order.createdAt).toLocaleDateString("ru-RU"))}</span></div>`);
				});
				_push(`<!--]--></div></section></main>`);
			}
			if (unref(dashboard)) {
				_push(`<section data-v-ui-557e9c624b57 class="admin-section admin-orders"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Управление статусами заказов</h2><span data-v-ui-557e9c624b57>${ssrInterpolate(unref(orders).length)} заказов</span></div><div data-v-ui-557e9c624b57 class="admin-order-controls"><!--[-->`);
				ssrRenderList(unref(orders), (order) => {
					_push(`<article data-v-ui-557e9c624b57><div data-v-ui-557e9c624b57><strong data-v-ui-557e9c624b57>${ssrInterpolate(order.orderNumber)}</strong><small data-v-ui-557e9c624b57>${ssrInterpolate(Number(order.finalAmount).toLocaleString("ru-RU"))} ₽</small></div><select data-v-ui-557e9c624b57><option data-v-ui-557e9c624b57 value="NEW"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "NEW") : ssrLooseEqual(order.status, "NEW")) ? " selected" : ""}>Новый</option><option data-v-ui-557e9c624b57 value="CONFIRMED"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "CONFIRMED") : ssrLooseEqual(order.status, "CONFIRMED")) ? " selected" : ""}>Подтверждён</option><option data-v-ui-557e9c624b57 value="PROCESSING"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "PROCESSING") : ssrLooseEqual(order.status, "PROCESSING")) ? " selected" : ""}>В обработке</option><option data-v-ui-557e9c624b57 value="READY_FOR_SHIPMENT"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "READY_FOR_SHIPMENT") : ssrLooseEqual(order.status, "READY_FOR_SHIPMENT")) ? " selected" : ""}>Готов к отправке</option><option data-v-ui-557e9c624b57 value="SHIPPED"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "SHIPPED") : ssrLooseEqual(order.status, "SHIPPED")) ? " selected" : ""}>Отправлен</option><option data-v-ui-557e9c624b57 value="DELIVERED"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "DELIVERED") : ssrLooseEqual(order.status, "DELIVERED")) ? " selected" : ""}>Доставлен</option><option data-v-ui-557e9c624b57 value="CANCELLED"${ssrIncludeBooleanAttr(Array.isArray(order.status) ? ssrLooseContain(order.status, "CANCELLED") : ssrLooseEqual(order.status, "CANCELLED")) ? " selected" : ""}>Отменён</option></select><button data-v-ui-557e9c624b57 class="refresh"${ssrIncludeBooleanAttr(unref(savingOrder) === order.orderNumber) ? " disabled" : ""}>${ssrInterpolate(unref(savingOrder) === order.orderNumber ? "Сохраняем..." : "Обновить")}</button></article>`);
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			if (unref(dashboard)) {
				_push(`<section data-v-ui-557e9c624b57 class="admin-section admin-catalog"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Каталог товаров</h2><span data-v-ui-557e9c624b57>${ssrInterpolate(unref(products).length)} позиций</span></div><div data-v-ui-557e9c624b57 class="admin-products"><!--[-->`);
				ssrRenderList(unref(products), (product) => {
					_push(`<article data-v-ui-557e9c624b57 class="admin-product-row"><div data-v-ui-557e9c624b57 class="admin-product-name"><input data-v-ui-557e9c624b57${ssrRenderAttr("value", product.nameRu)}><small data-v-ui-557e9c624b57>${ssrInterpolate(product.sku)}</small></div><label data-v-ui-557e9c624b57>Цена<input data-v-ui-557e9c624b57${ssrRenderAttr("value", product.variants[0].price)} type="number" min="0"></label><label data-v-ui-557e9c624b57>Остаток<input data-v-ui-557e9c624b57${ssrRenderAttr("value", product.variants[0].stock)} type="number" min="0"></label><button data-v-ui-557e9c624b57 class="refresh"${ssrIncludeBooleanAttr(unref(savingProduct) === product.id) ? " disabled" : ""}>${ssrInterpolate(unref(savingProduct) === product.id ? "Сохраняем..." : "Сохранить")}</button></article>`);
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// pages/admin.vue
var _sfc_setup = admin_vue_vue_type_script_setup_true_lang_default.setup;
admin_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var admin_default = admin_vue_vue_type_script_setup_true_lang_default;

export { admin_default as default };;globalThis.__timing__.logEnd('Load chunks/build/admin-BKHB-kjW');
//# sourceMappingURL=admin-BKHB-kjW.mjs.map
