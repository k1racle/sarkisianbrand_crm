globalThis.__timing__.logStart('Load chunks/build/gifts-D15hoNch');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, N as NuxtLink } from '../virtual/entry.mjs';
import { defineComponent, ref, reactive, computed, mergeProps, unref, withCtx, createTextVNode, createVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderComponent, ssrRenderAttrs, ssrIncludeBooleanAttr, ssrInterpolate, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrRenderAttr, ssrRenderClass } from 'vue/server-renderer';
import { RefreshCw, Plus, ArrowLeft, Trash2, Gift, Package, Search, ArrowUpRight } from '@lucide/vue';
import { o as orderTransfer, w as warehouseExecution, a as warehouseStatusLabel, b as warehouseFactAt, c as warehouseNeedsReview } from '../_/warehouse-execution.mjs';
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

// components/workspace/PartnerGiftsPage.vue?vue&type=script&setup=true&lang.ts
var PartnerGiftsPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "PartnerGiftsPage",
	__ssrInlineRender: true,
	setup(__props) {
		const { user } = useWorkspaceSession();
		const access = useWorkspaceAccess();
		const workspace = ref(null), loading = ref(false), saving = ref(false), error = ref(""), notice = ref("");
		const creating = ref(false), search = ref("");
		ref(null);
		const form = reactive({
			participantId: "",
			recipientName: "",
			recipientPhone: "",
			recipientEmail: "",
			deliveryAddress: "",
			deliveryService: "",
			note: ""
		});
		ref(null);
		const dirty = computed(() => Object.values(form).some(Boolean) || lines.value.some((line) => line.variantId || line.quantity !== 1));
		onBeforeRouteLeave(() => !saving.value && (!creating.value || !dirty.value || (void 0).confirm("Уйти без создания подарочной отправки?")));
		const lines = ref([{
			variantId: "",
			quantity: 1
		}]);
		const canCreate = computed(() => access.can("partners.write") && ["ADMIN", "SUPERVISOR"].includes(user.value?.role || ""));
		const products = computed(() => workspace.value?.products || []);
		function productAvailability(product) {
			if (product?.availabilityStatus !== "CURRENT" || typeof product.available !== "number") return "Остатки 1С не подтверждены";
			return product.available > 0 ? `Подтверждено 1С: ${product.available} шт.` : "Нет в наличии";
		}
		const availabilityIssue = computed(() => {
			const totals = /* @__PURE__ */ new Map();
			for (const line of lines.value) if (line.variantId) totals.set(line.variantId, (totals.get(line.variantId) || 0) + Number(line.quantity || 0));
			for (const [id, quantity] of totals) {
				const product = products.value.find((item) => item.id === id);
				if (product?.availabilityStatus !== "CURRENT" || typeof product.available !== "number") return product?.availabilityMessage || "Остатки 1С не подтверждены. Обновите данные или выберите другую позицию.";
				if (product.available <= 0) return `${product.productName}: нет в наличии.`;
				if (quantity > product.available) return `${product.productName}: подтверждено 1С ${product.available} шт. Уменьшите общее количество этой позиции.`;
			}
			return "";
		});
		const gifts = computed(() => workspace.value?.shipments || []);
		const filteredGifts = computed(() => {
			const query = search.value.trim().toLocaleLowerCase("ru-RU");
			return gifts.value.filter((gift) => !query || [
				gift.order.orderNumber,
				gift.participant.displayName,
				gift.order.buyerName,
				...gift.order.items.map((item) => item.productName)
			].join(" ").toLocaleLowerCase("ru-RU").includes(query));
		});
		const activeGifts = computed(() => gifts.value.filter((gift) => !["DELIVERED", "CANCELLED"].includes(gift.order.status)).length);
		const statusLabels = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			ASSEMBLING: "В сборке",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён"
		};
		const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("ru-RU", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "Europe/Moscow"
		}) : "Время не передано";
		const orderTotal = (items) => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "partner-gifts crm-standard crm-management-workspace" }, _attrs))}><header class="crm-page-header"><div><h1>Подарки авторам</h1><p>Отправки для авторов и блогеров. Резерв, сборку и расход подтверждает склад 1С.</p></div><div class="partner-actions"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				size: 16,
				class: { spin: unref(loading) }
			}, null, _parent));
			_push(` Обновить</button>`);
			if (unref(canCreate) && !unref(creating)) {
				_push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || !unref(workspace)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
				_push(` Новая отправка</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(error) && unref(workspace)) _push(`<p class="gift-feedback gift-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="gift-feedback gift-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(creating) && unref(canCreate)) {
				_push(`<section class="gift-create crm-surface" aria-labelledby="gift-create-title"><header class="gift-create-header"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(` К отправкам</button><div><h2 id="gift-create-title">Новая подарочная отправка</h2><p>Подготовьте заказ на 0 ₽ для передачи в 1С. Резерв и задание на склад появятся после подтверждения 1С.</p></div></header><form class="gift-form"><fieldset${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} class="gift-form-section gift-wide"><legend>Получатель</legend><div class="gift-form-grid"><label class="gift-wide">Партнёр<select aria-label="Партнёр" class="crm-input" required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(form).participantId) ? ssrLooseContain(unref(form).participantId, "") : ssrLooseEqual(unref(form).participantId, "")) ? " selected" : ""}>Выберите партнёра</option><!--[-->`);
				ssrRenderList(unref(workspace)?.participants, (person) => {
					_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).participantId) ? ssrLooseContain(unref(form).participantId, person.id) : ssrLooseEqual(unref(form).participantId, person.id)) ? " selected" : ""}>${ssrInterpolate(person.displayName)} · ${ssrInterpolate(person.code)}</option>`);
				});
				_push(`<!--]--></select></label><label>Имя получателя<input${ssrRenderAttr("value", unref(form).recipientName)} class="crm-input" autocomplete="name" maxlength="180" required placeholder="Кому отправляем"></label><label>Телефон<input${ssrRenderAttr("value", unref(form).recipientPhone)} class="crm-input" type="tel" autocomplete="tel" maxlength="40" required placeholder="+7 …"></label><label class="gift-wide">Email получателя<input${ssrRenderAttr("value", unref(form).recipientEmail)} class="crm-input" type="email" autocomplete="email" maxlength="180" placeholder="Необязательно"></label></div></fieldset><fieldset${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""} class="gift-form-section gift-wide"><legend>Доставка</legend><div class="gift-form-grid"><label class="gift-wide">Адрес доставки<textarea class="crm-input" rows="3" minlength="10" maxlength="500" required placeholder="Город, улица, дом, квартира или адрес пункта выдачи">${ssrInterpolate(unref(form).deliveryAddress)}</textarea></label><label>Служба доставки<input${ssrRenderAttr("value", unref(form).deliveryService)} class="crm-input" maxlength="100" placeholder="Например, СДЭК"></label><label>Комментарий<input${ssrRenderAttr("value", unref(form).note)} class="crm-input" maxlength="1000" placeholder="Повод или пожелания к отправке"></label></div></fieldset><div class="gift-lines gift-wide"><div class="gift-lines-heading"><div><h3>Состав подарка</h3><p>Укажите товары и количество. Возможность резерва подтвердит 1С.</p></div><button class="crm-button" type="button">`);
				_push(ssrRenderComponent(unref(Plus), { size: 15 }, null, _parent));
				_push(` Добавить товар</button></div><!--[-->`);
				ssrRenderList(unref(lines), (line, index) => {
					_push(`<div class="gift-line"><label>Товар и вариант<select aria-label="Товар и вариант" class="crm-input" required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(line.variantId) ? ssrLooseContain(line.variantId, "") : ssrLooseEqual(line.variantId, "")) ? " selected" : ""}>Выберите товар</option><!--[-->`);
					ssrRenderList(unref(products), (item) => {
						_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(line.variantId) ? ssrLooseContain(line.variantId, item.id) : ssrLooseEqual(line.variantId, item.id)) ? " selected" : ""}>${ssrInterpolate(item.productName)} · ${ssrInterpolate(item.variantName)} · ${ssrInterpolate(item.sku)} · ${ssrInterpolate(productAvailability(item))}</option>`);
					});
					_push(`<!--]--></select></label><label>Количество<input${ssrRenderAttr("value", line.quantity)} class="crm-input" type="number" min="1" max="100" required></label><div class="gift-line-availability">${ssrInterpolate(line.variantId ? productAvailability(unref(products).find((item) => item.id === line.variantId)) : "Выберите позицию")}</div><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(lines).length === 1) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Удалить позицию " + (index + 1))}>`);
					_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
					_push(`</button></div>`);
				});
				_push(`<!--]--></div>`);
				if (unref(availabilityIssue)) _push(`<p class="gift-empty-note gift-wide" role="status">${ssrInterpolate(unref(availabilityIssue))}</p>`);
				else _push(`<!---->`);
				_push(`<div class="gift-submit gift-wide"><div><strong>Итого для получателя: 0 ₽ · оплата не требуется</strong><span>Расход оформляется в 1С. Документ и результат обработки появятся после подтверждения.</span></div><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || !unref(workspace)?.participants?.length || !unref(products).length || !!unref(availabilityIssue)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Gift), { size: 16 }, null, _parent));
				_push(` ${ssrInterpolate(unref(saving) ? "Подготавливаем…" : "Подготовить отправку")}</button></div></form>`);
				if (!unref(workspace)?.participants?.length && !unref(loading)) _push(`<p class="gift-empty-note">Нет активных партнёров, которым можно оформить отправку.</p>`);
				else _push(`<!---->`);
				if (!unref(products).length && !unref(loading)) _push(`<p class="gift-empty-note">В каталоге нет доступных физических товаров.</p>`);
				else _push(`<!---->`);
				_push(`</section>`);
			} else {
				_push(`<!--[-->`);
				if (unref(workspace)) {
					_push(`<section class="gift-overview" aria-label="Сводка подарочных отправок"><div><span>Всего отправок</span><strong>${ssrInterpolate(unref(gifts).length)}</strong></div><div><span>Не завершены</span><strong>${ssrInterpolate(unref(activeGifts))}</strong></div><p>`);
					_push(ssrRenderComponent(unref(Package), { size: 19 }, null, _parent));
					_push(`<span>Приём заказа, резерв и складские документы показаны по подтверждениям 1С.</span></p></section>`);
				} else _push(`<!---->`);
				_push(`<section class="gift-history crm-surface" aria-labelledby="gift-history-title">`);
				if (unref(workspace)) {
					_push(`<header class="gift-history-head"><div><h2 id="gift-history-title">Подарочные отправки <span class="gift-count">${ssrInterpolate(unref(gifts).length)}</span></h2><p>Найдите подарок по партнёру, номеру заказа или товару.</p></div><label class="gift-search crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), { size: 17 }, null, _parent));
					_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" placeholder="Поиск отправки" aria-label="Поиск подарочных отправок"></label></header>`);
				} else _push(`<!---->`);
				if (unref(loading) && !unref(workspace)) {
					_push(`<div class="gift-empty" role="status">`);
					_push(ssrRenderComponent(unref(RefreshCw), {
						size: 24,
						class: "spin"
					}, null, _parent));
					_push(`<p>Загружаем отправки…</p></div>`);
				} else if (unref(error) && !unref(workspace)) {
					_push(`<div class="gift-empty crm-management-error" role="alert">`);
					_push(ssrRenderComponent(unref(Gift), { size: 32 }, null, _parent));
					_push(`<h3>Отправки недоступны</h3><p>${ssrInterpolate(unref(error))}</p><button type="button" class="crm-button">`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
					_push(` Повторить загрузку</button></div>`);
				} else if (!unref(filteredGifts).length) {
					_push(`<div class="gift-empty">`);
					_push(ssrRenderComponent(unref(Gift), { size: 32 }, null, _parent));
					_push(`<h3>${ssrInterpolate(unref(search) ? "Отправки не найдены" : "Подготовьте первый подарок")}</h3><p>${ssrInterpolate(unref(search) ? "Попробуйте имя партнёра, номер заказа или название товара." : "Выберите партнёра и товары. Статусы склада появятся после подтверждения заказа в 1С.")}</p>`);
					if (unref(search)) _push(`<button type="button" class="crm-button">Сбросить поиск</button>`);
					else if (unref(canCreate)) {
						_push(`<button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(` Новая отправка</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(filteredGifts), (gift) => {
					_push(`<article class="gift-card"><div class="gift-card-main"><div class="gift-card-heading"><strong>${ssrInterpolate(gift.order.orderNumber)}</strong><span class="gift-status"${ssrRenderAttr("data-status", gift.order.status)}>${ssrInterpolate(statusLabels[gift.order.status] || gift.order.status)}</span></div><h3>${ssrInterpolate(gift.participant.displayName)}</h3><p>${ssrInterpolate(gift.order.buyerName)} · ${ssrInterpolate(gift.participant.code)}</p><ul><!--[-->`);
					ssrRenderList(gift.order.items, (item) => {
						_push(`<li>${ssrInterpolate(item.productName)} · ${ssrInterpolate(item.variantName)} <b>${ssrInterpolate(item.quantity)} шт.</b></li>`);
					});
					_push(`<!--]--></ul><small>${ssrInterpolate(date(gift.createdAt))} · ${ssrInterpolate(orderTotal(gift.order.items))} шт. · 0 ₽</small></div><div class="gift-card-side"><span class="${ssrRenderClass(["gift-sync", { "is-synced": gift.order.isSynced1C && !gift.order.oneCSyncError }])}">${ssrInterpolate(unref(orderTransfer)(gift.order).label)}</span><small>Оплата не требуется · подарок партнёру</small>`);
					if (unref(warehouseExecution)(gift.order)) _push(`<small>${ssrInterpolate(unref(warehouseExecution)(gift.order)?.isCurrent === false ? "Исторический статус склада" : "Склад 1С")}: ${ssrInterpolate(unref(warehouseStatusLabel)(unref(warehouseExecution)(gift.order)?.status))}</small>`);
					else _push(`<small>Подтверждённые складские данные ещё не получены.</small>`);
					if (unref(warehouseFactAt)(gift.order)) _push(`<small>Данные на ${ssrInterpolate(date(unref(warehouseFactAt)(gift.order)))}</small>`);
					else _push(`<!---->`);
					if (unref(warehouseNeedsReview)(gift.order)) _push(`<small class="gift-sync-error">${ssrInterpolate(unref(warehouseExecution)(gift.order)?.isCurrent === false ? "Требуется новое подтверждение склада: прежние данные относятся к прошлой версии заказа или устарели." : unref(warehouseExecution)(gift.order)?.error || "Складское исполнение требует проверки.")}</small>`);
					else _push(`<!---->`);
					if (unref(warehouseExecution)(gift.order)?.documentNumber || unref(warehouseExecution)(gift.order)?.documentId || gift.order.warehouseDocumentId) _push(`<small class="gift-warehouse-document">Документ 1С: ${ssrInterpolate(unref(warehouseExecution)(gift.order)?.documentNumber || unref(warehouseExecution)(gift.order)?.documentId || gift.order.warehouseDocumentId)}</small>`);
					else _push(`<!---->`);
					if (gift.order.oneCSyncError) _push(`<small class="gift-sync-error">${ssrInterpolate(gift.order.oneCSyncError)}</small>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						class: "crm-button",
						to: "/crm/fulfillment?order=" + encodeURIComponent(gift.order.id)
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`Монитор склада 1С `);
								_push(ssrRenderComponent(unref(ArrowUpRight), { size: 15 }, null, _parent, _scopeId));
							} else return [createTextVNode("Монитор склада 1С "), createVNode(unref(ArrowUpRight), { size: 15 })];
						}),
						_: 2
					}, _parent));
					_push(`</div></article>`);
				});
				_push(`<!--]--></section><!--]-->`);
			}
			_push(`</main>`);
		};
	}
});
// components/workspace/PartnerGiftsPage.vue
var _sfc_setup$1 = PartnerGiftsPage_vue_vue_type_script_setup_true_lang_default.setup;
PartnerGiftsPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/PartnerGiftsPage.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var PartnerGiftsPage_default = Object.assign(PartnerGiftsPage_vue_vue_type_script_setup_true_lang_default, { __name: "PartnerGiftsPage" });
// pages/crm/bloggers/gifts.vue?vue&type=script&setup=true&lang.ts
var gifts_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "gifts",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Подарки авторам — SARKISIAN CRM" });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(PartnerGiftsPage_default, _attrs, null, _parent));
		};
	}
});
// pages/crm/bloggers/gifts.vue
var _sfc_setup = gifts_vue_vue_type_script_setup_true_lang_default.setup;
gifts_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/bloggers/gifts.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var gifts_default = gifts_vue_vue_type_script_setup_true_lang_default;

export { gifts_default as default };;globalThis.__timing__.logEnd('Load chunks/build/gifts-D15hoNch');
//# sourceMappingURL=gifts-D15hoNch.mjs.map
