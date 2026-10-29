globalThis.__timing__.logStart('Load chunks/build/CrmOrdersRegister-L-ybON7k');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, c as useRoute, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, ref, computed, watch, reactive, nextTick, mergeProps, unref, isRef, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderStyle, ssrRenderAttr, ssrRenderList, ssrLooseContain, ssrLooseEqual, ssrRenderClass, ssrRenderDynamicAttr } from 'vue/server-renderer';
import { RefreshCw, Search, X, UserRound, ArrowRight, PackageCheck, ArrowLeft, Check, FileText, Info, Database, Clock3, AlertTriangle } from '@lucide/vue';
import { w as warehouseExecution, o as orderTransfer, b as warehouseFactAt, d as warehouseTotal, e as warehouseNumber, c as warehouseNeedsReview, a as warehouseStatusLabel, f as orderSourceLabel, g as warehouseQuantity, h as warehouseDocumentName } from '../_/warehouse-execution.mjs';

// components/crm/CrmReceivables.vue?vue&type=script&setup=true&lang.ts
var CrmReceivables_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmReceivables",
	__ssrInlineRender: true,
	props: { refreshKey: {} },
	emits: ["open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const config = useRuntimeConfig(), session = useWorkspaceSession();
		const data = ref(null), page = ref(1), search = ref(""), busy = ref(false), error = ref("");
		let generation = 0, timer;
		const money = (value, currency) => value == null ? "—" : new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency
		}).format(Number(value));
		const stateNames = {
			MISSING: "Нет данных 1С",
			CURRENT: "Актуальные данные",
			STALE: "Данные устарели",
			CHANGED: "Нужна повторная сверка"
		};
		const date = (value) => new Date(value).toLocaleString("ru-RU");
		const pages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / (data.value?.limit || 30))));
		async function load() {
			const n = ++generation;
			busy.value = true;
			error.value = "";
			try {
				const value = await $fetch$1("/oms/receivables", {
					baseURL: config.public.apiBase,
					headers: { Authorization: "Bearer " + session.token.value },
					query: {
						page: page.value,
						search: search.value.trim()
					},
					retry: 0
				});
				if (n === generation) data.value = value;
			} catch (e) {
				if (n === generation) {
					data.value = null;
					error.value = e?.data?.message || "Не удалось загрузить расчёты из 1С";
				}
			} finally {
				if (n === generation) busy.value = false;
			}
		}
		function refresh() {
			clearTimeout(timer);
			load();
		}
		watch(search, () => {
			clearTimeout(timer);
			++generation;
			page.value = 1;
			timer = setTimeout(load, 300);
		});
		watch(() => props.refreshKey, refresh);
		watch(() => session.token.value, () => {
			data.value = null;
			refresh();
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-surface crm-directory-register",
				"aria-label": "Расчёты B2B из 1С",
				"aria-busy": unref(busy)
			}, _attrs))}><div class="crm-directory-register-heading"><h2>Расчёты из 1С `);
			if (unref(data)) _push(`<span>${ssrInterpolate(unref(data).total)}</span>`);
			else _push(`<!---->`);
			_push(`</h2><small>1С:Комплексная автоматизация</small></div><div class="crm-orders-finance-note">`);
			_push(ssrRenderComponent(unref(Info), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<p>Долг, возвраты и разрешение отгрузки приходят из 1С. Если данных нет, задолженность неизвестна. Для сверки откройте заказ.</p></div><div class="crm-directory-toolbar"><div class="crm-input-group crm-directory-search">`);
			_push(ssrRenderComponent(unref(Search), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" aria-label="Номер заказа для расчётов" placeholder="Найти расчёты по номеру заказа" maxlength="150">`);
			if (unref(search)) {
				_push(`<button class="crm-directory-clear crm-button crm-button--icon" aria-label="Очистить поиск расчётов">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div><button type="button" class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
			_push(`Обновить данные</button></div>`);
			if (unref(error)) _push(`<p class="crm-orders-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(data)?.items.length) _push(`<div class="crm-directory-columns crm-finance-columns" aria-hidden="true"><span>Заказ</span><span>Состояние расчётов</span><span>Задолженность</span><span>К возврату</span><span></span></div>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<div class="crm-directory-rows"><!--[-->`);
				ssrRenderList(unref(data).items, (row) => {
					_push(`<button type="button" class="crm-button crm-card-action crm-directory-row crm-finance-row"><span class="crm-directory-stack"><strong>${ssrInterpolate(row.orderNumber)}</strong><small>${ssrInterpolate(row.snapshot ? "Ответ от " + date(row.snapshot.asOf) : "Ответ из 1С ещё не получен")}</small></span><span class="crm-directory-stack"><span class="crm-directory-status"${ssrRenderAttr("data-status", row.state === "CURRENT" ? "ACTIVE" : "ON_HOLD")}>${ssrInterpolate(stateNames[row.state] || "Состояние не определено")}</span><small>${ssrInterpolate(row.reason)}</small></span><span class="crm-directory-stack"><small class="crm-finance-mobile-label">Задолженность</small><b>${ssrInterpolate(row.snapshot ? money(row.snapshot.debt, row.currency) : "—")}</b>`);
					if (row.overdue) _push(`<small class="crm-orders-attention">Просрочена</small>`);
					else if (!row.snapshot) _push(`<small>Нет данных</small>`);
					else if (row.state !== "CURRENT") _push(`<small>Последний ответ 1С</small>`);
					else _push(`<!---->`);
					_push(`</span><span class="crm-directory-stack"><small class="crm-finance-mobile-label">К возврату</small><b>${ssrInterpolate(row.snapshot ? money(row.snapshot.refundDue, row.currency) : "—")}</b>`);
					if (!row.snapshot) _push(`<small>Нет данных</small>`);
					else if (row.state !== "CURRENT") _push(`<small>Последний ответ 1С</small>`);
					else _push(`<!---->`);
					_push(`</span>`);
					_push(ssrRenderComponent(unref(ArrowRight), {
						class: "crm-directory-open",
						size: 18,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`</button>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			if (!unref(busy) && unref(data) && !unref(data).items.length) {
				_push(`<div class="crm-directory-empty">`);
				_push(ssrRenderComponent(unref(Database), { size: 28 }, null, _parent));
				_push(`<strong>${ssrInterpolate(unref(search) ? "Заказ не найден" : "Нет заказов для сверки")}</strong><p>${ssrInterpolate(unref(search) ? "Проверьте номер или очистите поиск." : "Расчёты появятся после оформления B2B-заказов и ответа из 1С.")}</p>`);
				if (unref(search)) _push(`<button class="crm-button">Очистить поиск</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`<footer class="crm-directory-footer"><small role="status">${ssrInterpolate(unref(busy) ? "Загружаем данные…" : unref(error) ? "Данные недоступны" : "Найдено: " + (unref(data)?.total || 0))}</small>`);
			if (unref(data) && unref(pages) > 1) {
				_push(`<nav class="crm-directory-pagination" aria-label="Страницы расчётов"><button type="button" class="crm-button crm-button--icon" aria-label="Предыдущая страница расчётов"${ssrIncludeBooleanAttr(unref(busy) || unref(page) <= 1) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(`</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pages))}</span><button type="button" class="crm-button crm-button--icon" aria-label="Следующая страница расчётов"${ssrIncludeBooleanAttr(unref(busy) || unref(page) >= unref(pages)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
				_push(`</button></nav>`);
			} else _push(`<small class="crm-directory-hint">Нажмите на заказ, чтобы посмотреть документы и запросить сверку</small>`);
			_push(`</footer></section>`);
		};
	}
});
// components/crm/CrmReceivables.vue
var _sfc_setup$4 = CrmReceivables_vue_vue_type_script_setup_true_lang_default.setup;
CrmReceivables_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmReceivables.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var CrmReceivables_default = Object.assign(CrmReceivables_vue_vue_type_script_setup_true_lang_default, { __name: "CrmReceivables" });
// components/crm/CrmMarketplaceMapping.vue?vue&type=script&setup=true&lang.ts
var CrmMarketplaceMapping_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmMarketplaceMapping",
	__ssrInlineRender: true,
	props: {
		order: {},
		disabled: { type: Boolean },
		reload: { type: Function }
	},
	emits: ["busy"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		useWorkspaceSession();
		const sku = reactive({}), busy = ref(false), error = ref("");
		const reason = ref("");
		const editable = computed(() => !props.order.fulfillmentManaged && props.order.reservationState === "LEGACY" && [
			"NEW",
			"CONFIRMED",
			"PAYMENT_WAITING"
		].includes(props.order.status));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-stack",
				"aria-label": "Сопоставление товаров площадки"
			}, _attrs))}><h4>Товары площадки и наш каталог</h4>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (__props.order.marketplaceImportIssue && __props.order.marketplaceIncoming) {
				_push(`<div class="crm-item-card crm-stack crm-execution-card"><h4>Данные площадки для сверки</h4><p>Статус площадки: ${ssrInterpolate(__props.order.marketplaceIncoming.status)} · Сумма: ${ssrInterpolate(__props.order.marketplaceIncoming.totalAmount)} ${ssrInterpolate(__props.order.currency)}</p><p>${ssrInterpolate(__props.order.marketplaceIncoming.buyerName)} ${ssrInterpolate(__props.order.marketplaceIncoming.buyerEmail)} ${ssrInterpolate(__props.order.marketplaceIncoming.buyerPhone)}</p>`);
				if (__props.order.marketplaceIncoming.deliveryDate) _push(`<p>Дата доставки: ${ssrInterpolate(new Date(__props.order.marketplaceIncoming.deliveryDate).toLocaleString("ru-RU"))}</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(__props.order.marketplaceIncoming.items, (item, index) => {
					_push(`<p>${ssrInterpolate(item.externalSku)} · ${ssrInterpolate(item.productName)} × ${ssrInterpolate(item.quantity)} · ${ssrInterpolate(item.total)} ${ssrInterpolate(__props.order.currency)}</p>`);
				});
				_push(`<!--]--><p>Сначала оформите необходимые отмены или возвраты. Решение ниже оставит текущий состав CRM и запишет основание; данные площадки не изменятся.</p><label class="crm-field">Основание решения<textarea class="crm-input" rows="2" maxlength="1000"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(reason))}</textarea></label><button type="button" class="crm-button"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>Сохранить локальную версию</button></div>`);
			} else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(__props.order.items, (item) => {
				_push(`<div class="crm-item-card crm-stack crm-execution-card"><strong>${ssrInterpolate(item.productName)}</strong><p>Артикул площадки: ${ssrInterpolate(item.externalSku || "не указан")} · SKU каталога: ${ssrInterpolate(item.variant?.sku || "не сопоставлен")}</p>`);
				if (unref(editable)) _push(`<!--[--><input${ssrRenderAttr("value", unref(sku)[item.id])} class="crm-input"${ssrRenderAttr("aria-label", "SKU каталога: " + item.productName)} placeholder="Точный SKU варианта из каталога" maxlength="200"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}><button type="button" class="crm-button"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>Сопоставить</button><!--]-->`);
				else _push(`<!---->`);
				_push(`</div>`);
			});
			_push(`<!--]--></section>`);
		};
	}
});
// components/crm/CrmMarketplaceMapping.vue
var _sfc_setup$3 = CrmMarketplaceMapping_vue_vue_type_script_setup_true_lang_default.setup;
CrmMarketplaceMapping_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmMarketplaceMapping.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var CrmMarketplaceMapping_default = Object.assign(CrmMarketplaceMapping_vue_vue_type_script_setup_true_lang_default, { __name: "CrmMarketplaceMapping" });
// components/crm/CrmOrderExecution.vue?vue&type=script&setup=true&lang.ts
var CrmOrderExecution_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmOrderExecution",
	__ssrInlineRender: true,
	props: {
		order: {},
		disabled: { type: Boolean },
		readonly: { type: Boolean },
		reload: { type: Function }
	},
	emits: ["busy"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const busy = ref(false), error = ref("");
		useWorkspaceSession();
		const compositionChecked = ref(false), pricesChecked = ref(false), localWarehouseConfirmed = ref(false), paymentTerms = ref(""), deliveryTerms = ref("");
		ref(null);
		const marketplace = computed(() => [
			"OZON",
			"WILDBERRIES",
			"YANDEX_MARKET",
			"MEGAMARKET"
		].includes(props.order.source));
		const physicalOrder = computed(() => props.order.sourceChannel !== "COURSE" && props.order.items?.some((item) => !["GIFT_CARD", "COURSE"].includes(item.productType)));
		const confirmable = computed(() => physicalOrder.value && !props.order.execution && ![
			"CANCELLED",
			"REFUNDED",
			"SHIPPED",
			"DELIVERED"
		].includes(props.order.status) && (["WEB", "B2B"].includes(props.order.source) || marketplace.value));
		const snapshot = computed(() => warehouseExecution(props.order));
		const transfer = computed(() => orderTransfer(props.order));
		const factAt = computed(() => warehouseFactAt(props.order));
		const needsReview = computed(() => warehouseNeedsReview(props.order));
		const status = computed(() => snapshot.value?.status || props.order.oneCStatus);
		const performer = computed(() => snapshot.value?.executorName || (typeof snapshot.value?.performer === "string" ? snapshot.value.performer : snapshot.value?.performer?.displayName || snapshot.value?.performer?.name));
		const documents = computed(() => snapshot.value?.documents?.length ? snapshot.value.documents : snapshot.value?.documentId || snapshot.value?.documentNumber ? [{
			id: snapshot.value.documentId,
			number: snapshot.value.documentNumber
		}] : props.order.warehouseDocumentId ? [{ id: props.order.warehouseDocumentId }] : []);
		const metrics = [
			["reserved", "В резерве"],
			["picked", "Собрано"],
			["checked", "Проверено"],
			["shipped", "Отгружено"]
		];
		const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "Время не передано";
		const adjustedItems = computed(() => props.order.items?.filter((item) => [
			"cancelled",
			"returned",
			"damaged"
		].some((metric) => (warehouseQuantity(props.order, item.id, metric) || 0) > 0)) || []);
		const operationNames = {
			CONFIRM: "Согласование",
			PICK: "Сборка в CRM",
			SHIP: "Отгрузка в CRM",
			CANCEL_REMAINDER: "Отмена остатка в CRM",
			RETURN: "Возврат в CRM"
		};
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmMarketplaceMapping = CrmMarketplaceMapping_default;
			if (unref(physicalOrder)) {
				_push(`<section${ssrRenderAttrs(mergeProps({
					class: "crm-stack crm-order-execution crm-warehouse-monitor",
					"aria-label": "Монитор склада 1С"
				}, _attrs))}><div class="crm-warehouse-heading"><div><h2>Склад 1С</h2><p>Отбор, проверка и отгрузка выполняются на складе. Здесь — подтверждённые результаты из 1С.</p></div><button class="crm-button crm-button--icon" type="button" aria-label="Обновить данные склада"${ssrIncludeBooleanAttr(__props.disabled || unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`</button></div>`);
				if (unref(error)) _push(`<p class="crm-order-notice crm-order-notice--danger" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(confirmable)) {
					_push(`<section class="crm-warehouse-confirm"><h3>Перед передачей на склад</h3><p>Проверьте состав и согласуйте коммерческие условия. Резерв и складское задание затем подтверждает 1С.</p>`);
					if (unref(marketplace)) _push(ssrRenderComponent(_component_CrmMarketplaceMapping, {
						order: __props.order,
						disabled: __props.disabled || __props.readonly || unref(busy),
						reload: __props.reload,
						onBusy: ($event) => emit("busy", $event)
					}, null, _parent));
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(__props.disabled || __props.readonly || unref(busy)) ? " disabled" : ""}>`);
					if (unref(marketplace)) _push(`<label class="crm-field"><span><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(localWarehouseConfirmed)) ? ssrLooseContain(unref(localWarehouseConfirmed), null) : unref(localWarehouseConfirmed)) ? " checked" : ""} type="checkbox"> Отгружаем с нашего склада, а не со склада площадки</span></label>`);
					else _push(`<!---->`);
					_push(`<label class="crm-field"><span><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(compositionChecked)) ? ssrLooseContain(unref(compositionChecked), null) : unref(compositionChecked)) ? " checked" : ""} type="checkbox"> Состав и количество проверены</span></label><label class="crm-field"><span><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(pricesChecked)) ? ssrLooseContain(unref(pricesChecked), null) : unref(pricesChecked)) ? " checked" : ""} type="checkbox"> Цены и сумма согласованы</span></label><label class="crm-field">Условия оплаты<textarea class="crm-input" rows="2" maxlength="1000">${ssrInterpolate(unref(paymentTerms))}</textarea></label><label class="crm-field">Условия доставки<textarea class="crm-input" rows="2" maxlength="1000">${ssrInterpolate(unref(deliveryTerms))}</textarea></label><button class="crm-button crm-button--primary" type="button">Подтвердить и передать в 1С</button></fieldset></section>`);
				} else _push(`<!---->`);
				_push(`<section class="crm-warehouse-transfer" aria-label="Передача заказа в 1С"><div><span>Передача заказа</span><strong${ssrRenderAttr("data-tone", unref(transfer).tone)}>${ssrInterpolate(unref(transfer).label)}</strong></div>`);
				if (!unref(snapshot) || __props.order.oneCSyncError) _push(`<p${ssrRenderAttr("role", __props.order.oneCSyncError ? "alert" : void 0)}>${ssrInterpolate(unref(transfer).detail)}</p>`);
				else _push(`<!---->`);
				if (__props.order.oneCSyncAt && !unref(snapshot)) _push(`<small>Последнее подтверждение: ${ssrInterpolate(date(__props.order.oneCSyncAt))}</small>`);
				else _push(`<!---->`);
				if (__props.order.externalId) _push(`<small>Заказ в 1С: ${ssrInterpolate(__props.order.externalId)}</small>`);
				else _push(`<!---->`);
				_push(`</section>`);
				if (!unref(snapshot)) {
					_push(`<div class="crm-warehouse-awaiting" role="status">`);
					_push(ssrRenderComponent(unref(Clock3), { size: 24 }, null, _parent));
					_push(`<div><h3>Подтверждённые складские данные ещё не получены</h3><p>Собранные количества и резерв появятся после ответа склада. Прочерк означает отсутствие данных, а не нулевой остаток.</p>`);
					if (__props.order.oneCStatus) _push(`<small>Последний общий статус из 1С: ${ssrInterpolate(unref(warehouseStatusLabel)(__props.order.oneCStatus))}. Построчные количества ещё не переданы.</small>`);
					else _push(`<!---->`);
					_push(`</div></div>`);
				} else {
					_push(`<!--[-->`);
					if (unref(needsReview)) {
						_push(`<div class="crm-warehouse-review" role="alert">`);
						_push(ssrRenderComponent(unref(AlertTriangle), { size: 20 }, null, _parent));
						_push(`<div><strong>${ssrInterpolate(unref(snapshot).isCurrent === false ? "Исторические данные склада — требуется обновление" : unref(warehouseStatusLabel)(unref(snapshot).status))}</strong><p>${ssrInterpolate(unref(snapshot).error || (unref(snapshot).staleReason === "ORDER_CHANGED" ? "Заказ изменился после подтверждения склада. Эти количества относятся к предыдущей версии; ожидаем новое подтверждение 1С." : "Показаны последние полученные сведения. Перед изменением заказа уточните состояние документов у ответственного в 1С."))}</p></div></div>`);
					} else _push(`<!---->`);
					_push(`<dl class="crm-warehouse-facts"><div><dt>Состояние склада</dt><dd>${ssrInterpolate(unref(warehouseStatusLabel)(unref(status)))}</dd></div><div><dt>Данные на</dt><dd>${ssrInterpolate(date(unref(factAt)))}</dd></div><div><dt>Склад</dt><dd>${ssrInterpolate(unref(snapshot).warehouseName || unref(snapshot).warehouseId || "Не передан")}</dd></div><div><dt>Исполнитель</dt><dd>${ssrInterpolate(unref(performer) || "Не передан")}</dd></div>`);
					if (unref(snapshot).revision != null) _push(`<div><dt>Версия данных 1С</dt><dd>${ssrInterpolate(unref(snapshot).revision)}</dd></div>`);
					else _push(`<!---->`);
					_push(`</dl><div class="crm-warehouse-totals"${ssrRenderAttr("aria-label", unref(snapshot).isCurrent === false ? "Исторические итоги склада" : "Подтверждённые итоги склада")}><!--[-->`);
					ssrRenderList(metrics, ([key, label]) => {
						_push(`<div><span>${ssrInterpolate(label)}</span><strong>${ssrInterpolate(unref(warehouseNumber)(unref(warehouseTotal)(__props.order, key)))}</strong></div>`);
					});
					_push(`<!--]--></div><!--]-->`);
				}
				_push(`<section class="crm-warehouse-lines" aria-labelledby="warehouse-lines-title"><div class="crm-order-section-heading"><h3 id="warehouse-lines-title">Позиции заказа</h3><small>Количества — по данным 1С</small></div><div class="crm-warehouse-table-scroll"><table class="crm-warehouse-table"><thead><tr><th scope="col">Товар</th><th scope="col">Заказано</th><!--[-->`);
				ssrRenderList(metrics, ([key, label]) => {
					_push(`<th scope="col">${ssrInterpolate(label)}</th>`);
				});
				_push(`<!--]--></tr></thead><tbody><!--[-->`);
				ssrRenderList(__props.order.items, (item) => {
					_push(`<tr><th scope="row"><strong>${ssrInterpolate(item.productName)}</strong><small>${ssrInterpolate([item.variantName, item.variant?.sku || item.externalSku].filter(Boolean).join(" · "))}</small></th><td data-label="Заказано">${ssrInterpolate(item.quantity)}</td><!--[-->`);
					ssrRenderList(metrics, ([key, label]) => {
						_push(`<td${ssrRenderAttr("data-label", label)}${ssrRenderAttr("aria-label", unref(warehouseQuantity)(__props.order, item.id, key) == null ? label + ": данные 1С не получены" : void 0)}>${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(__props.order, item.id, key)))}</td>`);
					});
					_push(`<!--]--></tr>`);
				});
				_push(`<!--]--></tbody></table></div>`);
				if (!__props.order.items?.length) _push(`<p class="crm-order-empty">Состав заказа не передан.</p>`);
				else _push(`<!---->`);
				_push(`<p class="crm-warehouse-caption">«Заказано» — количество из заказа. Остальные значения подтверждает склад 1С; неполные данные отмечены прочерком.</p></section>`);
				if (unref(adjustedItems).length) {
					_push(`<section class="crm-warehouse-adjustments"><h3>Отмены и возвраты из 1С</h3><!--[-->`);
					ssrRenderList(unref(adjustedItems), (item) => {
						_push(`<div><strong>${ssrInterpolate(item.productName)}</strong><p>Отменено: ${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(__props.order, item.id, "cancelled")))} · Возвращено: ${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(__props.order, item.id, "returned")))} · Повреждено: ${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(__props.order, item.id, "damaged")))}</p></div>`);
					});
					_push(`<!--]--></section>`);
				} else _push(`<!---->`);
				_push(`<section class="crm-warehouse-documents"><h3>Документы склада</h3><!--[-->`);
				ssrRenderList(unref(documents), (document, index) => {
					_push(`<div class="crm-warehouse-document">`);
					_push(ssrRenderComponent(unref(FileText), { size: 18 }, null, _parent));
					_push(`<div><strong>${ssrInterpolate(unref(warehouseDocumentName)(document))}${ssrInterpolate(document.number ? " № " + document.number : "")}</strong>`);
					if (document.id) _push(`<small>ID: ${ssrInterpolate(document.id)}</small>`);
					else _push(`<!---->`);
					_push(`<small>${ssrInterpolate(document.status ? unref(warehouseStatusLabel)(document.status) : "Состояние документа ещё не передано")}</small></div></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(documents).length) _push(`<p class="crm-warehouse-caption">Документы ещё не получены из 1С.</p>`);
				else _push(`<!---->`);
				_push(`</section><p class="crm-warehouse-caption">Для отмены, возврата или исправления складского документа обратитесь к ответственному в 1С. Подтверждённый результат появится в этой карточке.</p>`);
				if (__props.order.execution) {
					_push(`<details class="crm-order-execution-terms crm-ops-help"><summary>Согласованные условия заказа</summary>`);
					if (__props.order.execution.paymentTerms) _push(`<p>Оплата: ${ssrInterpolate(__props.order.execution.paymentTerms)}</p>`);
					else _push(`<!---->`);
					if (__props.order.execution.deliveryTerms) _push(`<p>Доставка: ${ssrInterpolate(__props.order.execution.deliveryTerms)}</p>`);
					else _push(`<!---->`);
					_push(`</details>`);
				} else _push(`<!---->`);
				if (__props.order.executionOperations?.length) {
					_push(`<details class="crm-warehouse-legacy crm-ops-help"><summary>Предыдущие операции CRM · ${ssrInterpolate(__props.order.executionOperations.length)}</summary><p>Сохранены для сверки истории. Эти операции не заменяют новое подтверждение склада 1С.</p><!--[-->`);
					ssrRenderList(__props.order.executionOperations, (operation) => {
						_push(`<div><strong>${ssrInterpolate(operationNames[operation.kind] || operation.kind)} · ${ssrInterpolate(date(operation.createdAt))}</strong><small>${ssrInterpolate(operation.actorName)} · ${ssrInterpolate(operation.id)}</small></div>`);
					});
					_push(`<!--]--></details>`);
				} else _push(`<!---->`);
				_push(`</section>`);
			} else _push(`<p${ssrRenderAttrs(mergeProps({ class: "crm-order-muted" }, _attrs))}>Электронный заказ не требует отбора и отгрузки на складе. Получение подарочных карт отображается в заказе покупателя.</p>`);
		};
	}
});
// components/crm/CrmOrderExecution.vue
var _sfc_setup$2 = CrmOrderExecution_vue_vue_type_script_setup_true_lang_default.setup;
CrmOrderExecution_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmOrderExecution.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmOrderExecution_default = Object.assign(CrmOrderExecution_vue_vue_type_script_setup_true_lang_default, { __name: "CrmOrderExecution" });
// components/crm/CrmOrderFinance.vue?vue&type=script&setup=true&lang.ts
var CrmOrderFinance_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmOrderFinance",
	__ssrInlineRender: true,
	props: {
		order: {},
		disabled: { type: Boolean },
		hasUnsavedChanges: { type: Boolean },
		reload: { type: Function }
	},
	emits: ["busy", "snapshot"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const config = useRuntimeConfig(), session = useWorkspaceSession(), access = useWorkspaceAccess();
		const data = ref(null), loading = ref(false), busy = ref(false), error = ref(""), notice = ref("");
		const kind = ref("RECONCILE"), comment = ref(""), operationId = ref("");
		const names = {
			INVOICE: "Запросить счёт",
			RECONCILE: "Запросить сверку расчётов",
			RETURN_REVIEW: "Передать отмену / возврат на рассмотрение",
			TERMS_REVIEW: "Запросить изменение условий оплаты"
		};
		const statuses = {
			PENDING: "Ожидает передачи в 1С",
			RECEIVED: "Получен 1С, ожидает обработки",
			COMPLETED: "Выполнен в 1С",
			REJECTED: "Отклонён в 1С"
		};
		const docs = {
			INVOICE: "Счёт",
			PAYMENT: "Оплата",
			REFUND: "Возврат",
			CORRECTION: "Корректировка",
			SHIPMENT: "Отгрузка"
		};
		const reviewStatuses = {
			REVIEW_REQUIRED: "Ожидает сверки в 1С",
			PENDING: "На рассмотрении в 1С",
			RECONCILED: "Сверено в 1С",
			REJECTED: "Отклонено в 1С"
		};
		const dispositions = {
			REFUNDED: "Возврат денег подтверждён",
			NOT_REQUIRED: "Возврат денег не требуется",
			OFFSET: "Зачёт подтверждён"
		};
		const reviews = computed(() => (data.value?.operations || []).map((op) => ({
			...op,
			result: data.value?.snapshot?.adjustments?.find((item) => item.operationId === op.id)
		})));
		const documentLabel = (id) => {
			const doc = data.value?.snapshot?.documents?.find((item) => item.id === id);
			return doc ? `${docs[doc.kind]} № ${doc.number}` : id;
		};
		const money = (value) => value == null ? "Нет данных" : new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: data.value?.currency || "RUB"
		}).format(Number(value));
		const date = (value) => new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
		const request = (path, options = {}) => $fetch$1(`/oms/orders/${props.order.id}/${path}`, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			retry: 0,
			...options
		});
		ref(null);
		let generation = 0;
		async function load() {
			const n = ++generation;
			loading.value = true;
			error.value = "";
			try {
				const result = await request("finance");
				if (n === generation) {
					data.value = result;
					emit("snapshot", result);
				}
			} catch (e) {
				if (n === generation) {
					data.value = null;
					emit("snapshot", null);
					error.value = e?.data?.message || "Не удалось загрузить данные 1С";
				}
			} finally {
				if (n === generation) loading.value = false;
			}
		}
		watch(() => [
			props.order.id,
			props.order.updatedAt,
			session.token.value
		], load, { immediate: true });
		watch(kind, () => {
			operationId.value = "";
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-stack crm-detail-section",
				"aria-label": "Расчёты из 1С"
			}, _attrs))}><h3>Расчёты и документы из 1С</h3><p>Оплаты, возвраты, задолженность и условия ведутся в 1С:Комплексная автоматизация. Здесь доступны полученные данные и запросы на обработку.</p>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p>Загружаем данные…</p>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[--><p role="status"><strong>${ssrInterpolate(unref(data).reason)}</strong></p>`);
				if (unref(data).legacyEntries) _push(`<p>Ранее созданные ручные записи сохранены в архиве и не используются в расчётах.</p>`);
				else _push(`<!---->`);
				if (unref(data).closure?.required) _push(`<p role="status"><strong>${ssrInterpolate(unref(data).closure.reason)}</strong></p>`);
				else _push(`<!---->`);
				if (unref(data).snapshot) {
					_push(`<!--[--><p>Данные на ${ssrInterpolate(date(unref(data).snapshot.asOf))} · получены ${ssrInterpolate(date(unref(data).snapshot.receivedAt))}.</p>`);
					if (unref(data).state !== "CURRENT") _push(`<p>Показан последний полученный ответ. Актуальное состояние нужно запросить в 1С.</p>`);
					else _push(`<!---->`);
					_push(`<div class="crm-record-list"><!--[-->`);
					ssrRenderList([
						["total", "Сумма в 1С"],
						["paid", "Оплаты по данным 1С"],
						["refunded", "Возвращено по данным 1С"],
						["debt", "Задолженность"],
						["refundDue", "К возврату"]
					], ([key, label]) => {
						_push(`<div class="crm-item-card crm-record"><span>${ssrInterpolate(label)}</span><strong>${ssrInterpolate(money(unref(data).snapshot[key]))}</strong></div>`);
					});
					_push(`<!--]--></div><p>Срок оплаты: ${ssrInterpolate(unref(data).snapshot.paymentDueAt ? date(unref(data).snapshot.paymentDueAt) : "не передан из 1С")}${ssrInterpolate(unref(data).overdue ? " · Просрочено" : "")}</p><h4>Документы 1С</h4>`);
					if (!unref(data).snapshot.documents.length) _push(`<p>Документы не переданы.</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(data).snapshot.documents, (doc) => {
						_push(`<article class="crm-item-card crm-stack crm-execution-card"><strong>${ssrInterpolate(docs[doc.kind])} № ${ssrInterpolate(doc.number)} · ${ssrInterpolate(money(doc.amount))}</strong><span>${ssrInterpolate(date(doc.date))} · ${ssrInterpolate(doc.status === "POSTED" ? "Проведён в 1С" : "Отменён в 1С")}</span></article>`);
					});
					_push(`<!--]--><!--]-->`);
				} else _push(`<!---->`);
				if (unref(reviews).length) {
					_push(`<!--[--><h4>Сверка отмен и возвратов</h4>`);
					if (unref(data).snapshot?.closeReason) _push(`<p>Решение 1С по закрытию расчётов: ${ssrInterpolate(unref(data).snapshot.closeReason)}</p>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(reviews), (op) => {
						_push(`<article class="crm-item-card crm-stack crm-execution-card"><strong>${ssrInterpolate(op.kind === "RETURN" ? "Возврат" : "Отмена остатка")} · ${ssrInterpolate(date(op.createdAt))}</strong><small>№ ${ssrInterpolate(op.id)}</small><p>${ssrInterpolate(op.reason)}</p><strong>${ssrInterpolate(reviewStatuses[op.result?.status || op.settlementStatus] || "Ожидает сверки в 1С")}</strong>`);
						if (op.result) {
							_push(`<!--[--><p>${ssrInterpolate(op.result.message)}</p>`);
							if (op.result.refundDisposition) _push(`<p>${ssrInterpolate(dispositions[op.result.refundDisposition])}</p>`);
							else _push(`<!---->`);
							_push(`<!--[-->`);
							ssrRenderList(op.result.documentIds, (id) => {
								_push(`<p>${ssrInterpolate(documentLabel(id))}</p>`);
							});
							_push(`<!--]--><!--]-->`);
						} else _push(`<!---->`);
						_push(`</article>`);
					});
					_push(`<!--]--><!--]-->`);
				} else _push(`<!---->`);
				if (unref(access).can("order_finance.write")) {
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(__props.disabled || unref(busy) || unref(loading)) ? " disabled" : ""}><h4>Запрос в 1С</h4><label class="crm-field">Что нужно сделать<select class="crm-input"><!--[-->`);
					ssrRenderList(names, (label, value) => {
						_push(`<option${ssrRenderAttr("value", value)}${ssrIncludeBooleanAttr(Array.isArray(unref(kind)) ? ssrLooseContain(unref(kind), value) : ssrLooseEqual(unref(kind), value)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
					});
					_push(`<!--]--></select></label>`);
					if (unref(kind) === "RETURN_REVIEW") {
						_push(`<label class="crm-field">Документ CRM<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(operationId)) ? ssrLooseContain(unref(operationId), "") : ssrLooseEqual(unref(operationId), "")) ? " selected" : ""}>По заказу в целом</option><!--[-->`);
						ssrRenderList(unref(data).operations, (op) => {
							_push(`<option${ssrRenderAttr("value", op.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(operationId)) ? ssrLooseContain(unref(operationId), op.id) : ssrLooseEqual(unref(operationId), op.id)) ? " selected" : ""}>${ssrInterpolate(op.kind === "RETURN" ? "Возврат" : "Отмена")} · ${ssrInterpolate(date(op.createdAt))} · ${ssrInterpolate(op.reason)}</option>`);
						});
						_push(`<!--]--></select></label>`);
					} else _push(`<!---->`);
					_push(`<label class="crm-field">Основание запроса<textarea class="crm-input" rows="3" maxlength="1000">${ssrInterpolate(unref(comment))}</textarea></label><button type="button" class="crm-button crm-button--primary">Создать запрос в 1С</button></fieldset>`);
				} else _push(`<!---->`);
				_push(`<h4>Запросы и ответы</h4>`);
				if (!unref(data).requests.length) _push(`<p>Запросов ещё нет.</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(data).requests, (item) => {
					_push(`<article class="crm-item-card crm-stack crm-execution-card"><strong>${ssrInterpolate(names[item.kind])}</strong><span>${ssrInterpolate(statuses[item.status])}</span><p>${ssrInterpolate(item.comment)}</p>`);
					if (item.responseMessage) _push(`<p>Ответ 1С: ${ssrInterpolate(item.responseMessage)}</p>`);
					else _push(`<!---->`);
					_push(`<small>${ssrInterpolate(item.actorName)} · ${ssrInterpolate(date(item.createdAt))}</small></article>`);
				});
				_push(`<!--]--><!--]-->`);
			} else _push(`<!---->`);
			_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(loading)) ? " disabled" : ""}>Обновить данные 1С</button></section>`);
		};
	}
});
// components/crm/CrmOrderFinance.vue
var _sfc_setup$1 = CrmOrderFinance_vue_vue_type_script_setup_true_lang_default.setup;
CrmOrderFinance_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmOrderFinance.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmOrderFinance_default = Object.assign(CrmOrderFinance_vue_vue_type_script_setup_true_lang_default, { __name: "CrmOrderFinance" });
// components/crm/CrmOrdersRegister.vue?vue&type=script&setup=true&lang.ts
var CrmOrdersRegister_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmOrdersRegister",
	__ssrInlineRender: true,
	props: { fulfillment: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		const props = __props;
		const source = ref(props.fulfillment ? "" : "B2B"), needsReview = ref(false);
		useHead({ title: (props.fulfillment ? "Сборка и отгрузка" : "Заказы B2B") + " — SARKISIAN CRM" });
		const config = useRuntimeConfig(), session = useWorkspaceSession(), access = useWorkspaceAccess();
		const route = useRoute();
		const rows = ref([]), total = ref(0), pages = ref(1), page = ref(1), search = ref(""), status = ref("");
		const loading = ref(false), saving = ref(false), error = ref(""), detailError = ref(""), selected = ref(null);
		const registerTab = ref("orders"), financeVisited = ref(false);
		const registerTabs = computed(() => [["orders", "Заказы"], ...!props.fulfillment && access.can("order_finance.read") ? [["finance", "Расчёты из 1С"]] : []]);
		watch(registerTab, (value) => {
			if (value === "finance") financeVisited.value = true;
		});
		watch(registerTabs, (tabs) => {
			if (!tabs.some(([key]) => key === registerTab.value)) registerTab.value = "orders";
		});
		const quickStatuses = [
			["", "Все заказы"],
			["NEW", "Новые"],
			["CONFIRMED", "Подтверждённые"],
			["ASSEMBLING", "В сборке"],
			["SHIPPED", "Отправленные"]
		];
		const hasFilters = computed(() => Boolean(search.value || status.value || needsReview.value || props.fulfillment && source.value));
		const draft = reactive({
			internalNotes: "",
			comment: ""
		});
		const baseline = ref(""), dirty = computed(() => !!selected.value && JSON.stringify(draft) !== baseline.value);
		const detailLoaded = ref(false);
		const detailTab = ref("general"), detailBody = ref(null);
		const financeSummary = ref(null), managerEditor = ref(false);
		const detailTabs = computed(() => [
			["general", "Обзор"],
			["execution", "Склад 1С"],
			...access.can("order_finance.read") ? [["finance", "Расчёты 1С"]] : [],
			["history", "История"],
			["settings", "Условия и заметки"]
		]);
		watch(detailTab, async () => {
			await nextTick();
			detailBody.value?.scrollTo({ top: 0 });
		});
		watch(detailTabs, (tabs) => {
			if (!tabs.some(([key]) => key === detailTab.value)) detailTab.value = "general";
		});
		const canWrite = computed(() => access.can("oms.write") && selected.value?.canWrite === true && detailLoaded.value);
		const managerOptions = ref([]), managerId = ref(""), managerSearch = ref(""), managerError = ref(""), managerLoading = ref(false), canUnassign = ref(false), moreManagers = ref(false);
		const personName = (person) => person ? [person.firstName, person.lastName].filter(Boolean).join(" ") || "Сотрудник" : "Не назначен";
		async function loadManagers() {
			if (!selected.value || !canWrite.value) return;
			const id = selected.value.id;
			managerLoading.value = true;
			managerError.value = "";
			try {
				const result = await request(`/oms/orders/${encodeURIComponent(id)}/managers`, { query: { search: managerSearch.value || void 0 } });
				if (selected.value?.id !== id) return;
				managerOptions.value = result.items;
				canUnassign.value = result.canUnassign;
				moreManagers.value = result.hasMore;
			} catch (e) {
				if (selected.value?.id === id) managerError.value = message(e);
			} finally {
				if (selected.value?.id === id) managerLoading.value = false;
			}
		}
		const names = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			ASSEMBLING: "В сборке",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат"
		};
		const amount = (value) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: selected.value?.currency || "RUB",
			maximumFractionDigits: 2
		}).format(Number(value || 0));
		const company = (order) => order.organization?.name || order.buyerName || [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ") || "Компания не указана";
		const date = (value) => new Date(value).toLocaleString("ru-RU");
		const operationNames = {
			CONFIRM: "Коммерческие условия подтверждены",
			PICK: "Товары собраны",
			SHIP: "Оформлена отгрузка",
			CANCEL_REMAINDER: "Отменён остаток",
			RETURN: "Принят возврат"
		};
		const warehouse = computed(() => warehouseExecution(selected.value));
		const transfer = computed(() => orderTransfer(selected.value));
		const warehouseAt = computed(() => warehouseFactAt(selected.value));
		const warehouseDateLabel = computed(() => warehouseAt.value ? (warehouse.value?.isCurrent === false ? "Исторические данные на " : "По данным 1С на ") + date(warehouseAt.value) : "Подтверждённые данные 1С не получены");
		const quantities = computed(() => (selected.value?.items || []).reduce((sum, item) => ({
			ordered: sum.ordered + Number(item.quantity || 0),
			picked: sum.picked + Number(item.pickedQuantity || 0),
			shipped: sum.shipped + Number(item.shippedQuantity || 0),
			cancelled: sum.cancelled + Number(item.cancelledQuantity || 0)
		}), {
			ordered: 0,
			picked: 0,
			shipped: 0,
			cancelled: 0
		}));
		const payment = computed(() => {
			const order = selected.value;
			if (!order) return {
				label: "Нет данных",
				detail: "",
				tone: "neutral"
			};
			if (order.paymentStatus === "NOT_REQUIRED") return {
				label: "Оплата не требуется",
				detail: order.sourceChannel === "PARTNER_GIFT" ? "Подарочная отправка на 0 ₽" : "По условиям заказа",
				tone: "neutral"
			};
			if (order.source === "B2B") {
				const finance = financeSummary.value;
				if (!access.can("order_finance.read")) return {
					label: "Расчёты в 1С",
					detail: "Нет доступа к финансовым данным",
					tone: "neutral"
				};
				if (!finance?.snapshot) return {
					label: "Нет подтверждения",
					detail: finance?.reason || "Ожидаем финансовые данные 1С",
					tone: "neutral"
				};
				if (finance.state !== "CURRENT") return {
					label: "Нужна сверка",
					detail: "Последний ответ 1С требует обновления",
					tone: "warning"
				};
				const snapshot = finance.snapshot;
				const paid = Number(snapshot.paid || 0) - Number(snapshot.refunded || 0);
				const paidInFull = Number(snapshot.total) > 0 && paid >= Number(snapshot.total) && Number(snapshot.debt) <= 0;
				return {
					label: paidInFull ? "Оплачен" : Number(snapshot.debt) <= 0 ? "Долга нет" : paid > 0 ? "Частично оплачен" : "Ожидает оплаты",
					detail: "По данным 1С на " + date(snapshot.asOf),
					tone: paidInFull || Number(snapshot.debt) <= 0 ? "success" : "warning"
				};
			}
			return {
				label: {
					SUCCEEDED: "Оплачен",
					PAID: "Оплачен",
					PENDING: "Ожидает оплаты",
					UNPAID: "Не оплачен",
					CANCELED: "Платёж отменён",
					CANCELLED: "Платёж отменён",
					REFUNDED: "Возвращена",
					PARTIALLY_REFUNDED: "Частичный возврат",
					FAILED: "Ошибка оплаты",
					MARKETPLACE: "Расчёты площадки"
				}[order.paymentStatus] || "Нет подтверждения",
				detail: order.source === "WEB" ? "Статус платёжной системы" : "По данным канала продаж",
				tone: ["SUCCEEDED", "PAID"].includes(order.paymentStatus) ? "success" : "neutral"
			};
		});
		const reserve = computed(() => {
			const value = warehouseTotal(selected.value, "reserved");
			return {
				label: value == null ? "Нет данных 1С" : warehouseNumber(value) + " ед.",
				detail: warehouseDateLabel.value,
				tone: warehouse.value?.isCurrent === false ? "warning" : "neutral"
			};
		});
		const picking = computed(() => {
			const value = warehouseTotal(selected.value, "picked");
			return value == null ? "Нет данных 1С" : warehouseNumber(value) + " из " + quantities.value.ordered + " единиц";
		});
		const shipping = computed(() => {
			const value = warehouseTotal(selected.value, "shipped");
			return value == null ? "Нет данных 1С" : warehouseNumber(value) + " из " + quantities.value.ordered + " единиц";
		});
		const nextAction = computed(() => {
			const order = selected.value;
			if (!detailLoaded.value) return {
				title: "Загружаем данные заказа",
				text: "Действия станут доступны после загрузки карточки.",
				label: "",
				tab: "general"
			};
			if (order.sourceChannel === "COURSE" || order.items?.length && order.items.every((item) => item.productType === "COURSE")) return {
				title: "Заказ курса",
				text: "Обучение не требует отбора и отгрузки на складе.",
				label: "",
				tab: "general"
			};
			if (order.items?.length && order.items.every((item) => item.productType === "GIFT_CARD")) return {
				title: "Электронный заказ",
				text: "Подарочные карты не требуют отбора и отгрузки на складе.",
				label: "",
				tab: "general"
			};
			if (order.marketplaceImportIssue) return {
				title: "Проверьте расхождение с площадкой",
				text: "Перед исполнением нужно проверить входящий состав и сопоставление товаров.",
				label: "Проверить состав",
				tab: "execution"
			};
			if (!order.managerId && canWrite.value) return {
				title: "Назначьте ответственного менеджера",
				text: "Он проверит состав и условия заказа перед передачей в 1С.",
				label: "Назначить менеджера",
				tab: "manager"
			};
			if ([
				"CANCELLED",
				"REFUNDED",
				"DELIVERED"
			].includes(order.status)) return {
				title: names[order.status] || order.status,
				text: "История исполнения и расчётов сохранена в карточке заказа.",
				label: "История заказа",
				tab: "history"
			};
			if (!order.execution && canWrite.value) return {
				title: "Проверьте состав и условия",
				text: "Подтвердите заказ для передачи в 1С. Резерв и складское задание затем подтверждает 1С.",
				label: "Проверить и передать в 1С",
				tab: "execution"
			};
			if (order.oneCSyncError) return {
				title: "Передача в 1С требует проверки",
				text: transfer.value.detail,
				label: "Проверить передачу",
				tab: "execution"
			};
			if (warehouseNeedsReview(order)) return {
				title: "Складские данные требуют проверки",
				text: warehouse.value?.isCurrent === false ? "Показаны исторические данные. Ожидаем актуальное подтверждение 1С." : warehouse.value?.error || "Уточните состояние заказа у ответственного на складе.",
				label: "Открыть склад 1С",
				tab: "execution"
			};
			if (!warehouse.value) return {
				title: "Ожидаем данные склада 1С",
				text: "Приём заказа, резерв, отбор и отгрузка подтверждаются отдельно. Ручная сборка в CRM не выполняется.",
				label: "Открыть склад 1С",
				tab: "execution"
			};
			return {
				title: warehouseStatusLabel(warehouse.value.status),
				text: warehouseDateLabel.value + ". Исполнение ведётся на складе в 1С.",
				label: "Открыть склад 1С",
				tab: "execution"
			};
		});
		const contactName = computed(() => selected.value?.buyerName || personName(selected.value?.customer || selected.value?.user));
		const contactEmail = computed(() => selected.value?.buyerEmail || selected.value?.customer?.email || selected.value?.user?.email || "");
		const contactPhone = computed(() => selected.value?.buyerPhone || selected.value?.customer?.phone || selected.value?.user?.phone || "");
		const deliveryAddress = computed(() => {
			const value = selected.value?.shippingAddress;
			if (typeof value === "string") return value || "Адрес не указан";
			if (!value) return "Адрес не указан";
			return value.fullAddress || value.address || [
				value.city,
				value.street,
				value.house,
				value.building,
				value.apartment
			].filter(Boolean).join(", ") || Object.values(value).filter((item) => typeof item === "string").join(", ") || "Адрес не указан";
		});
		const itemSku = (item) => item.variant?.sku || item.externalSku || item.offerId || "";
		const orderTimeline = computed(() => [
			...warehouseAt.value ? [{
				id: "warehouse-" + (warehouse.value?.revision || "latest"),
				title: (warehouse.value?.isCurrent === false ? "1С, история: " : "1С: ") + warehouseStatusLabel(warehouse.value?.status),
				detail: "Складские данные" + (warehouse.value?.revision != null ? " · версия " + warehouse.value.revision : ""),
				createdAt: warehouseAt.value
			}] : [],
			...(selected.value?.history || []).map((event) => ({
				id: "status-" + event.id,
				title: names[event.toStatus] || event.toStatus,
				detail: event.comment,
				createdAt: event.createdAt
			})),
			...(selected.value?.executionOperations || []).map((event) => ({
				id: "operation-" + event.id,
				title: "CRM: " + (operationNames[event.kind] || event.kind),
				detail: event.actorName,
				createdAt: event.createdAt
			}))
		].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
		const message = (e) => e?.data?.message || "Не удалось выполнить действие. Повторите попытку.";
		const request = (path, options = {}) => $fetch$1(path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			...options
		});
		let version = 0, controller, timer;
		async function load() {
			const current = ++version;
			controller?.abort();
			controller = new AbortController();
			loading.value = true;
			error.value = "";
			try {
				const result = await request("/oms/orders/list", {
					signal: controller.signal,
					query: {
						needsReview: needsReview.value ? "true" : void 0,
						source: source.value || void 0,
						page: page.value,
						limit: 30,
						status: status.value || void 0,
						search: search.value.trim() || void 0
					}
				});
				if (current !== version) return;
				rows.value = result.items;
				total.value = result.total;
				pages.value = result.pages;
			} catch (e) {
				if (current === version) error.value = message(e);
			} finally {
				if (current === version) loading.value = false;
			}
		}
		function setOrder(order) {
			if (selected.value?.id !== order.id || selected.value?.updatedAt !== order.updatedAt) financeSummary.value = null;
			if (selected.value?.id !== order.id) managerEditor.value = false;
			selected.value = order;
			managerId.value = order.managerId || "";
			Object.assign(draft, {
				internalNotes: order.internalNotes || "",
				comment: ""
			});
			baseline.value = JSON.stringify(draft);
		}
		async function open(order) {
			if (saving.value || !leave()) return;
			detailTab.value = "general";
			detailError.value = "";
			detailLoaded.value = false;
			managerOptions.value = [];
			managerSearch.value = "";
			managerError.value = "";
			canUnassign.value = false;
			setOrder(order);
			saving.value = true;
			try {
				setOrder(await request(`/oms/orders/${encodeURIComponent(order.id)}`));
				detailLoaded.value = true;
				await loadManagers();
			} catch (e) {
				detailError.value = message(e);
			} finally {
				saving.value = false;
			}
		}
		async function openFinance(order) {
			await open(order);
			if (selected.value?.id === order.id && detailLoaded.value) detailTab.value = "finance";
		}
		async function reloadSelected() {
			if (!selected.value) return;
			setOrder(await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`));
			await load();
		}
		function leave() {
			return !saving.value && (!dirty.value || (void 0).confirm("Изменения заказа не сохранены. Выйти без сохранения?"));
		}
		const panel = ref(null);
		watch(() => selected.value?.id, async (id, previous) => {
			if (id && !previous) {
				(void 0).activeElement instanceof HTMLElement && (void 0).activeElement;
				await nextTick();
				panel.value?.focus({ preventScroll: true });
				(void 0).scrollTo({
					top: 0,
					behavior: "instant"
				});
			}
		});
		watch([
			search,
			needsReview,
			source,
			status
		], (next, previous) => {
			clearTimeout(timer);
			++version;
			controller?.abort();
			page.value = 1;
			if (next[0] !== previous[0]) timer = setTimeout(load, 300);
			else load();
		});
		watch(() => route.query.order, () => {});
		onBeforeRouteLeave(leave);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmReceivables = CrmReceivables_default;
			const _component_CrmOrderExecution = CrmOrderExecution_default;
			const _component_CrmOrderFinance = CrmOrderFinance_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-directory crm-orders-page" }, _attrs))}>`);
			if (!unref(selected)) {
				_push(`<header class="crm-page-header"><div><h1>${ssrInterpolate(props.fulfillment ? "Сборка и отгрузка" : "Заказы B2B")}</h1><p>${ssrInterpolate(props.fulfillment ? "Монитор склада 1С: передача заказов, отбор, проверка и отгрузка" : "Заказы партнёров: от согласования до подтверждённой отгрузки из 1С")}</p></div>`);
				if (unref(registerTab) === "orders") {
					_push(`<button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
					_push(`Обновить</button>`);
				} else _push(`<!---->`);
				_push(`</header>`);
			} else _push(`<!---->`);
			_push(`<div class="crm-directory-content" style="${ssrRenderStyle(!unref(selected) ? null : { display: "none" })}">`);
			if (unref(registerTabs).length > 1) _push(ssrRenderComponent(_component_CrmCardTabs, {
				modelValue: unref(registerTab),
				"onUpdate:modelValue": ($event) => isRef(registerTab) ? registerTab.value = $event : null,
				prefix: "orders-register",
				tabs: unref(registerTabs),
				label: "Разделы заказов B2B"
			}, null, _parent));
			else _push(`<!---->`);
			_push(`<section id="orders-register-orders-panel" class="crm-surface crm-directory-register" role="tabpanel"${ssrRenderAttr("aria-labelledby", unref(registerTabs).length > 1 ? "orders-register-orders-tab" : void 0)} aria-label="Реестр заказов" style="${ssrRenderStyle(unref(registerTab) === "orders" ? null : { display: "none" })}"><div class="crm-directory-register-heading"><h2>Реестр заказов <span>${ssrInterpolate(unref(total))}</span></h2><small>Новые заказы сверху</small></div><nav class="crm-directory-tabs" aria-label="Быстрые фильтры заказов"><!--[-->`);
			ssrRenderList(quickStatuses, ([value, label]) => {
				_push(`<button class="crm-button"${ssrRenderAttr("aria-pressed", unref(status) === value)}>${ssrInterpolate(label)}</button>`);
			});
			_push(`<!--]--></nav><div class="crm-directory-toolbar">`);
			if (props.fulfillment) _push(`<select class="crm-input" aria-label="Источник заказа"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "") : ssrLooseEqual(unref(source), "")) ? " selected" : ""}>Все каналы</option><option value="B2B"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "B2B") : ssrLooseEqual(unref(source), "B2B")) ? " selected" : ""}>B2B</option><option value="WEB"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "WEB") : ssrLooseEqual(unref(source), "WEB")) ? " selected" : ""}>Сайт</option><option value="MANUAL"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "MANUAL") : ssrLooseEqual(unref(source), "MANUAL")) ? " selected" : ""}>Ручные и подарочные</option><option value="ONE_C"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "ONE_C") : ssrLooseEqual(unref(source), "ONE_C")) ? " selected" : ""}>1С</option><option value="OZON"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "OZON") : ssrLooseEqual(unref(source), "OZON")) ? " selected" : ""}>Ozon</option><option value="WILDBERRIES"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "WILDBERRIES") : ssrLooseEqual(unref(source), "WILDBERRIES")) ? " selected" : ""}>Wildberries</option><option value="YANDEX_MARKET"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "YANDEX_MARKET") : ssrLooseEqual(unref(source), "YANDEX_MARKET")) ? " selected" : ""}>Яндекс Маркет</option><option value="MEGAMARKET"${ssrIncludeBooleanAttr(Array.isArray(unref(source)) ? ssrLooseContain(unref(source), "MEGAMARKET") : ssrLooseEqual(unref(source), "MEGAMARKET")) ? " selected" : ""}>Мегамаркет</option></select>`);
			else _push(`<!---->`);
			_push(`<div class="crm-input-group crm-directory-search">`);
			_push(ssrRenderComponent(unref(Search), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search"${ssrRenderAttr("aria-label", props.fulfillment ? "Поиск заказов" : "Поиск B2B-заказов")} placeholder="Номер заказа, компания, ИНН или email" maxlength="200">`);
			if (unref(search)) {
				_push(`<button class="crm-directory-clear crm-button" aria-label="Очистить поиск">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</div><select class="crm-input" aria-label="Статус заказа"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все статусы</option><!--[-->`);
			ssrRenderList(names, (label, key) => {
				_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), key) : ssrLooseEqual(unref(status), key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
			});
			_push(`<!--]--></select>`);
			if (unref(hasFilters)) {
				_push(`<button class="crm-button crm-button--text">`);
				_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
				_push(` Сбросить</button>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (props.fulfillment) _push(`<label class="crm-orders-review-filter"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(needsReview)) ? ssrLooseContain(unref(needsReview), null) : unref(needsReview)) ? " checked" : ""} type="checkbox"> Только расхождения с площадкой</label>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p class="crm-orders-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(rows).length) _push(`<div class="crm-directory-columns crm-orders-columns" aria-hidden="true"><span>Заказ</span><span>Компания и менеджер</span><span>Статус и передача в 1С</span><span>Сумма заказа</span><span></span></div>`);
			else _push(`<!---->`);
			_push(`<div class="crm-directory-rows"${ssrRenderAttr("aria-busy", unref(loading))}><!--[-->`);
			ssrRenderList(unref(rows), (order) => {
				_push(`<button class="crm-button crm-card-action crm-directory-row crm-orders-row"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><span class="crm-directory-stack"><strong>${ssrInterpolate(order.orderNumber)}</strong><small>${ssrInterpolate(date(order.createdAt))}</small><small>${ssrInterpolate(unref(orderSourceLabel)(order))} · позиций: ${ssrInterpolate(order.items?.length || 0)}</small></span><span class="crm-directory-stack"><strong>${ssrInterpolate(company(order))}</strong><small>${ssrInterpolate(order.organization?.inn ? "ИНН " + order.organization.inn : order.buyerEmail || order.user?.email)}</small><span class="${ssrRenderClass([{ "crm-directory-unassigned": !order.manager }, "crm-directory-icon-line"])}">`);
				_push(ssrRenderComponent(unref(UserRound), {
					size: 15,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<small>${ssrInterpolate(personName(order.manager))}</small></span></span><span class="crm-directory-stack"><span class="crm-badge"${ssrRenderAttr("data-status", order.status)}>${ssrInterpolate(names[order.status] || order.status)}</span><small>${ssrInterpolate(unref(orderTransfer)(order).label)}</small>`);
				if (order.oneCSyncError || unref(warehouseNeedsReview)(order)) _push(`<small class="crm-orders-attention">Требует проверки</small>`);
				else _push(`<!---->`);
				if (order.marketplaceImportIssue) _push(`<small class="crm-orders-attention">Есть расхождение с площадкой</small>`);
				else _push(`<!---->`);
				_push(`</span><span class="crm-directory-stack"><strong>${ssrInterpolate(amount(order.finalAmount))}</strong>`);
				if (order.trackingNumber) _push(`<small>Трек: ${ssrInterpolate(order.trackingNumber)}</small>`);
				else _push(`<!---->`);
				_push(`</span>`);
				_push(ssrRenderComponent(unref(ArrowRight), {
					class: "crm-directory-open",
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`</button>`);
			});
			_push(`<!--]--></div>`);
			if (!unref(loading) && !unref(rows).length && !unref(error)) {
				_push(`<div class="crm-directory-empty">`);
				if (unref(hasFilters)) _push(ssrRenderComponent(unref(Search), { size: 28 }, null, _parent));
				else _push(ssrRenderComponent(unref(PackageCheck), { size: 28 }, null, _parent));
				_push(`<strong>${ssrInterpolate(unref(hasFilters) ? "Заказы не найдены" : "Заказов пока нет")}</strong><p>${ssrInterpolate(unref(hasFilters) ? "Попробуйте другой номер или измените фильтры." : props.fulfillment ? "Здесь появятся заказы выбранного канала." : "Здесь появятся закупки из кабинетов B2B-клиентов.")}</p>`);
				if (unref(hasFilters)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`<footer class="crm-directory-footer"><small role="status">${ssrInterpolate(unref(loading) ? "Загружаем заказы…" : "Найдено: " + unref(total))}</small>`);
			if (unref(pages) > 1) {
				_push(`<nav class="crm-directory-pagination" aria-label="Страницы заказов"><button class="crm-button crm-button--icon" aria-label="Предыдущая страница"${ssrIncludeBooleanAttr(unref(page) <= 1 || unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
				_push(`</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pages))}</span><button class="crm-button crm-button--icon" aria-label="Следующая страница"${ssrIncludeBooleanAttr(unref(page) >= unref(pages) || unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
				_push(`</button></nav>`);
			} else _push(`<small class="crm-directory-hint">Нажмите на заказ, чтобы открыть состав и действия</small>`);
			_push(`</footer></section>`);
			if (unref(financeVisited) && !props.fulfillment && unref(access).can("order_finance.read")) {
				_push(`<section id="orders-register-finance-panel" role="tabpanel" aria-labelledby="orders-register-finance-tab" style="${ssrRenderStyle(unref(registerTab) === "finance" ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_CrmReceivables, {
					"refresh-key": unref(selected)?.updatedAt || "",
					onOpen: openFinance
				}, null, _parent));
				_push(`</section>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(selected)) {
				_push(`<form class="crm-approved-order" aria-labelledby="b2b-order-title" tabindex="-1"><div class="crm-order-backline"><button class="crm-button crm-button--text" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 17 }, null, _parent));
				_push(`К списку заказов</button><button class="crm-button crm-button--icon" type="button" aria-label="Обновить заказ"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`</button></div><header class="crm-order-identity"><div><div class="crm-order-title-line"><h1 id="b2b-order-title">Заказ ${ssrInterpolate(unref(selected).orderNumber)}</h1><span class="crm-badge"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(names[unref(selected).status] || unref(selected).status)}</span></div><strong class="crm-order-company">${ssrInterpolate(company(unref(selected)))}</strong><p class="crm-order-meta">${ssrInterpolate(unref(contactName))} <span>·</span> ${ssrInterpolate(unref(orderSourceLabel)(unref(selected)))} <span>·</span> ${ssrInterpolate(date(unref(selected).createdAt))}</p></div><div class="crm-order-total"><span>Сумма заказа</span><strong>${ssrInterpolate(amount(unref(selected).finalAmount))}</strong>`);
				if (Number(unref(selected).discountAmount) > 0) _push(`<span>Скидка ${ssrInterpolate(amount(unref(selected).discountAmount))}</span>`);
				else _push(`<!---->`);
				_push(`</div></header>`);
				if (unref(detailError)) _push(`<p class="crm-order-notice crm-order-notice--danger" role="alert">${ssrInterpolate(unref(detailError))}</p>`);
				else _push(`<!---->`);
				if (unref(selected).marketplaceImportIssue) _push(`<p class="crm-order-notice crm-order-notice--warning" role="alert">${ssrInterpolate(unref(selected).marketplaceImportIssue)}</p>`);
				else _push(`<!---->`);
				_push(`<div class="crm-order-stages" aria-label="Состояния исполнения заказа"${ssrRenderAttr("aria-busy", !unref(detailLoaded))}><div><span>Оплата</span><strong${ssrRenderAttr("data-tone", unref(payment).tone)}>`);
				if (unref(payment).tone === "success") _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				else _push(`<!---->`);
				_push(`${ssrInterpolate(unref(payment).label)}</strong><small>${ssrInterpolate(unref(payment).detail)}</small></div><div><span>Резерв</span><strong${ssrRenderAttr("data-tone", unref(reserve).tone)}>${ssrInterpolate(unref(reserve).label)}</strong><small>${ssrInterpolate(unref(reserve).detail)}</small></div><div><span>Сборка в 1С</span><strong>${ssrInterpolate(unref(picking))}</strong><small>${ssrInterpolate(unref(warehouseDateLabel))}</small></div><div><span>Отгрузка из 1С</span><strong>${ssrInterpolate(unref(shipping))}</strong><small>${ssrInterpolate(unref(warehouseDateLabel))}${ssrInterpolate(unref(selected).trackingNumber ? " · Трек: " + unref(selected).trackingNumber : "")}</small></div></div><div class="crm-order-workspace"><div class="crm-order-primary">`);
				if (unref(detailTab) === "general") {
					_push(`<div class="crm-order-next-action"><div><h2>${ssrInterpolate(unref(nextAction).title)}</h2><p>${ssrInterpolate(unref(nextAction).text)}</p></div>`);
					if (unref(nextAction).label) {
						_push(`<button class="crm-button crm-button--primary" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(dirty)) ? " disabled" : ""}>${ssrInterpolate(unref(nextAction).label)}`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(ssrRenderComponent(_component_CrmCardTabs, {
					modelValue: unref(detailTab),
					"onUpdate:modelValue": ($event) => isRef(detailTab) ? detailTab.value = $event : null,
					class: "crm-order-tabs",
					prefix: "order-detail",
					tabs: unref(detailTabs),
					label: "Разделы заказа"
				}, null, _parent));
				_push(`<div class="crm-order-content"><section id="order-detail-general-panel" role="tabpanel" aria-labelledby="order-detail-general-tab"${ssrRenderDynamicAttr("hidden", unref(detailTab) !== "general")}${ssrIncludeBooleanAttr(unref(detailTab) !== "general") ? " inert" : ""}><div class="crm-order-table-panel"><div class="crm-order-section-heading"><h2>Состав заказа</h2><span>${ssrInterpolate(unref(selected).items?.length || 0)} позиций · ${ssrInterpolate(unref(quantities).ordered)} единиц</span></div><div class="crm-order-table-scroll"><table class="crm-order-items-table"><thead><tr><th scope="col">Товар</th><th scope="col">Шт.</th><th scope="col">Собрано</th><th scope="col">Отгружено</th><th scope="col">Цена за шт.</th><th scope="col">Сумма</th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(selected).items, (item) => {
					_push(`<tr><td><strong>${ssrInterpolate(item.productName)}</strong><small>${ssrInterpolate([item.variantName, itemSku(item)].filter(Boolean).join(" · "))}</small>`);
					if ((unref(warehouseQuantity)(unref(selected), item.id, "cancelled") || 0) > 0 || (unref(warehouseQuantity)(unref(selected), item.id, "returned") || 0) > 0) _push(`<small>По данным 1С: отменено ${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(unref(selected), item.id, "cancelled")))} · возвращено ${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(unref(selected), item.id, "returned")))}</small>`);
					else _push(`<!---->`);
					_push(`</td><td data-label="Количество">${ssrInterpolate(item.quantity)}</td><td data-label="Собрано">${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(unref(selected), item.id, "picked")))}</td><td data-label="Отгружено">${ssrInterpolate(unref(warehouseNumber)(unref(warehouseQuantity)(unref(selected), item.id, "shipped")))}</td><td data-label="Цена за шт.">${ssrInterpolate(amount(item.price))}</td><td data-label="Сумма"><strong>${ssrInterpolate(amount(item.total))}</strong></td></tr>`);
				});
				_push(`<!--]--></tbody></table></div>`);
				if (!unref(selected).items?.length) _push(`<p class="crm-order-empty">Состав заказа не передан.</p>`);
				else _push(`<!---->`);
				_push(`<p class="crm-warehouse-caption crm-order-item-source">Собрано и отгружено — по данным 1С. Прочерк означает, что подтверждение ещё не получено.`);
				if (unref(warehouse)?.isCurrent === false) _push(`<span> Показаны исторические количества; ожидаем обновление склада.</span>`);
				else _push(`<!---->`);
				_push(`</p><div class="crm-order-calculation"><p>Цены и суммы позиций — из заказа.`);
				if (Number(unref(selected).discountAmount) > 0) _push(`<span> Скидка учитывается в итоговой сумме заказа.</span>`);
				else _push(`<!---->`);
				_push(`</p><dl><div><dt>Сумма товаров</dt><dd>${ssrInterpolate(amount(unref(selected).totalAmount))}</dd></div>`);
				if (Number(unref(selected).discountAmount) > 0) _push(`<div><dt>Скидка</dt><dd>−${ssrInterpolate(amount(unref(selected).discountAmount))}</dd></div>`);
				else _push(`<!---->`);
				if (unref(selected).shippingCost != null) _push(`<div><dt>Доставка</dt><dd>${ssrInterpolate(amount(unref(selected).shippingCost))}</dd></div>`);
				else _push(`<!---->`);
				_push(`<div class="crm-order-calculation-total"><dt>Итого по заказу</dt><dd>${ssrInterpolate(amount(unref(selected).finalAmount))}</dd></div></dl></div></div><section class="crm-order-delivery" aria-label="Получатель и доставка"><div><h2>Получатель</h2><strong>${ssrInterpolate(unref(contactName))}</strong>`);
				if (unref(contactEmail)) _push(`<span>${ssrInterpolate(unref(contactEmail))}</span>`);
				else _push(`<!---->`);
				if (unref(contactPhone)) _push(`<span>${ssrInterpolate(unref(contactPhone))}</span>`);
				else _push(`<!---->`);
				_push(`</div><div><h2>Доставка</h2><strong>${ssrInterpolate(unref(selected).shippingProvider || "Способ не указан")}</strong><span>${ssrInterpolate(unref(deliveryAddress))}</span>`);
				if (unref(selected).trackingNumber) _push(`<span>Трек: ${ssrInterpolate(unref(selected).trackingNumber)}</span>`);
				else _push(`<!---->`);
				if (unref(selected).execution?.deliveryTerms) _push(`<span>${ssrInterpolate(unref(selected).execution.deliveryTerms)}</span>`);
				else _push(`<!---->`);
				_push(`</div></section></section><section id="order-detail-execution-panel" role="tabpanel" aria-labelledby="order-detail-execution-tab"${ssrRenderDynamicAttr("hidden", unref(detailTab) !== "execution")}${ssrIncludeBooleanAttr(unref(detailTab) !== "execution") ? " inert" : ""} class="crm-order-operation-panel">`);
				_push(ssrRenderComponent(_component_CrmOrderExecution, {
					key: unref(selected).id,
					order: unref(selected),
					disabled: unref(saving) || unref(dirty),
					readonly: !unref(canWrite),
					reload: reloadSelected,
					onBusy: ($event) => saving.value = $event
				}, null, _parent));
				_push(`</section>`);
				if (unref(access).can("order_finance.read")) {
					_push(`<section id="order-detail-finance-panel" role="tabpanel" aria-labelledby="order-detail-finance-tab"${ssrRenderDynamicAttr("hidden", unref(detailTab) !== "finance")}${ssrIncludeBooleanAttr(unref(detailTab) !== "finance") ? " inert" : ""} class="crm-order-operation-panel">`);
					_push(ssrRenderComponent(_component_CrmOrderFinance, {
						key: unref(selected).id,
						order: unref(selected),
						disabled: unref(saving) || !unref(canWrite) || unref(dirty),
						"has-unsaved-changes": unref(dirty),
						reload: reloadSelected,
						onBusy: ($event) => saving.value = $event,
						onSnapshot: ($event) => financeSummary.value = $event
					}, null, _parent));
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`<section id="order-detail-history-panel" role="tabpanel" aria-labelledby="order-detail-history-tab"${ssrRenderDynamicAttr("hidden", unref(detailTab) !== "history")}${ssrIncludeBooleanAttr(unref(detailTab) !== "history") ? " inert" : ""} class="crm-order-operation-panel"><h2>История заказа</h2>`);
				if (!unref(orderTimeline).length) _push(`<p class="crm-order-empty">Изменений пока нет.</p>`);
				else _push(`<!---->`);
				_push(`<ol class="crm-order-timeline crm-order-timeline--full"><!--[-->`);
				ssrRenderList(unref(orderTimeline), (event) => {
					_push(`<li><time>${ssrInterpolate(date(event.createdAt))}</time><div><strong>${ssrInterpolate(event.title)}</strong>`);
					if (event.detail) _push(`<p>${ssrInterpolate(event.detail)}</p>`);
					else _push(`<!---->`);
					_push(`</div></li>`);
				});
				_push(`<!--]--></ol>`);
				if (unref(selected).history?.length === 100 || unref(selected).executionOperations?.length === 100) _push(`<p class="crm-order-muted">Показаны последние 100 событий каждого типа.</p>`);
				else _push(`<!---->`);
				_push(`</section><section id="order-detail-settings-panel" role="tabpanel" aria-labelledby="order-detail-settings-tab"${ssrRenderDynamicAttr("hidden", unref(detailTab) !== "settings")}${ssrIncludeBooleanAttr(unref(detailTab) !== "settings") ? " inert" : ""} class="crm-order-operation-panel"><h2>Условия и заметки</h2><p class="crm-order-muted">Статусы, трек-номер и складские количества поступают из 1С. Для отмены или возврата обратитесь к ответственному в 1С.</p><dl class="crm-warehouse-facts"><div><dt>Статус заказа</dt><dd>${ssrInterpolate(names[unref(selected).status] || unref(selected).status)}</dd></div><div><dt>Трек-номер</dt><dd>${ssrInterpolate(unref(selected).trackingNumber || "Не передан")}</dd></div></dl><fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(saving) || !unref(canWrite)) ? " disabled" : ""}><label class="crm-field">Внутренняя заметка<textarea class="crm-input" rows="3" maxlength="5000">${ssrInterpolate(unref(draft).internalNotes)}</textarea></label><label class="crm-field">Комментарий к изменению<input${ssrRenderAttr("value", unref(draft).comment)} class="crm-input" maxlength="1000"></label>`);
				if (unref(canWrite)) _push(`<button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving) || !unref(dirty)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить заметки")}</button>`);
				else _push(`<!---->`);
				_push(`</fieldset></section></div>`);
				if (unref(dirty)) _push(`<div class="crm-order-unsaved" role="status"><span>Есть несохранённые изменения заказа</span><button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving) || !unref(canWrite)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить")}</button></div>`);
				else _push(`<!---->`);
				_push(`</div><aside class="crm-order-context" aria-label="Информация об исполнении"><section class="crm-order-sync"${ssrRenderAttr("data-confirmed", unref(selected).isSynced1C)}><div><h2>Передача в 1С</h2><span class="crm-order-state"${ssrRenderAttr("data-tone", unref(transfer).tone)}>${ssrInterpolate(unref(selected).oneCSyncError ? "Ошибка" : unref(selected).isSynced1C ? "Приём подтверждён" : "Ожидаем ответ")}</span></div><p>${ssrInterpolate(unref(transfer).detail)}</p>`);
				if (unref(selected).oneCSyncAt) _push(`<p>Последнее подтверждение: ${ssrInterpolate(date(unref(selected).oneCSyncAt))}</p>`);
				else _push(`<!---->`);
				if (unref(selected).oneCStatus) _push(`<p>Общий статус: ${ssrInterpolate(unref(warehouseStatusLabel)(unref(selected).oneCStatus))}</p>`);
				else _push(`<!---->`);
				_push(`<button class="crm-button crm-button--text" type="button">Данные склада 1С`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 15 }, null, _parent));
				_push(`</button></section><section class="crm-order-team"><div class="crm-order-section-heading"><h2>Ответственный</h2>`);
				if (unref(canWrite)) _push(`<button class="crm-button crm-button--text" type="button"${ssrRenderAttr("aria-expanded", unref(managerEditor))}>${ssrInterpolate(unref(managerEditor) ? "Свернуть" : "Изменить")}</button>`);
				else _push(`<!---->`);
				_push(`</div><p class="crm-order-manager">`);
				_push(ssrRenderComponent(unref(UserRound), { size: 17 }, null, _parent));
				_push(`${ssrInterpolate(personName(unref(selected).manager))}</p>`);
				if (unref(managerEditor) && unref(canWrite)) {
					_push(`<!--[-->`);
					if (unref(managerError)) _push(`<p class="crm-order-notice crm-order-notice--danger" role="alert">${ssrInterpolate(unref(managerError))}</p>`);
					else _push(`<!---->`);
					_push(`<div class="crm-order-manager-search"><input${ssrRenderAttr("value", unref(managerSearch))} class="crm-input" aria-label="Поиск менеджера" placeholder="Имя или фамилия" maxlength="100"${ssrIncludeBooleanAttr(unref(saving) || unref(managerLoading)) ? " disabled" : ""}><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(managerLoading)) ? " disabled" : ""}>Найти</button></div>`);
					if (unref(moreManagers)) _push(`<p class="crm-order-muted">Первые 100 сотрудников. Уточните поиск.</p>`);
					else _push(`<!---->`);
					_push(`<label class="crm-field">Менеджер<select id="order-manager-select" class="crm-input" aria-label="Назначить менеджера"${ssrIncludeBooleanAttr(unref(saving) || unref(managerLoading) || unref(dirty)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(!unref(canUnassign)) ? " disabled" : ""}${ssrIncludeBooleanAttr(Array.isArray(unref(managerId)) ? ssrLooseContain(unref(managerId), "") : ssrLooseEqual(unref(managerId), "")) ? " selected" : ""}>Не назначен</option>`);
					if (unref(selected).managerId && !unref(managerOptions).some((person) => person.id === unref(selected).managerId)) _push(`<option${ssrRenderAttr("value", unref(selected).managerId)}${ssrIncludeBooleanAttr(Array.isArray(unref(managerId)) ? ssrLooseContain(unref(managerId), unref(selected).managerId) : ssrLooseEqual(unref(managerId), unref(selected).managerId)) ? " selected" : ""}>${ssrInterpolate(personName(unref(selected).manager))} (текущий)</option>`);
					else _push(`<!---->`);
					_push(`<!--[-->`);
					ssrRenderList(unref(managerOptions), (person) => {
						_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(managerId)) ? ssrLooseContain(unref(managerId), person.id) : ssrLooseEqual(unref(managerId), person.id)) ? " selected" : ""}>${ssrInterpolate(personName(person))}</option>`);
					});
					_push(`<!--]--></select></label>`);
					if (unref(dirty)) _push(`<p class="crm-order-muted">Сначала сохраните изменения заказа.</p>`);
					else _push(`<!---->`);
					_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(managerLoading) || unref(dirty) || (unref(managerId) || null) === unref(selected).managerId) ? " disabled" : ""}>Сохранить ответственного</button><!--]-->`);
				} else _push(`<!---->`);
				if (unref(selected).execution) {
					_push(`<div class="crm-order-task-facts"><span>Согласовано в CRM</span><strong>${ssrInterpolate(date(unref(selected).execution.confirmedAt))}</strong>`);
					if (unref(selected).execution.paymentTerms) _push(`<span>Оплата: ${ssrInterpolate(unref(selected).execution.paymentTerms)}</span>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`</section><section class="crm-order-recent"><div class="crm-order-section-heading"><h2>Последние события</h2><button class="crm-button crm-button--text" type="button">Все</button></div>`);
				if (!unref(orderTimeline).length) _push(`<p class="crm-order-muted">История пока пуста</p>`);
				else _push(`<!---->`);
				_push(`<ol class="crm-order-timeline"><!--[-->`);
				ssrRenderList(unref(orderTimeline).slice(0, 3), (event) => {
					_push(`<li><time>${ssrInterpolate(date(event.createdAt))}</time><div><strong>${ssrInterpolate(event.title)}</strong>`);
					if (event.detail) _push(`<p>${ssrInterpolate(event.detail)}</p>`);
					else _push(`<!---->`);
					_push(`</div></li>`);
				});
				_push(`<!--]--></ol></section><section class="crm-order-documents"><h2>Документы</h2><button class="crm-button" type="button">`);
				_push(ssrRenderComponent(unref(FileText), { size: 18 }, null, _parent));
				_push(`<span>Данные и документы склада 1С</span>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
				_push(`</button>`);
				if (unref(access).can("order_finance.read")) {
					_push(`<button class="crm-button" type="button">`);
					_push(ssrRenderComponent(unref(FileText), { size: 18 }, null, _parent));
					_push(`<span>Расчёты из 1С `);
					if (unref(financeSummary)?.snapshot?.documents?.length) _push(`<small>${ssrInterpolate(unref(financeSummary).snapshot.documents.length)} получено</small>`);
					else _push(`<!---->`);
					_push(`</span>`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				if (!unref(warehouse)) _push(`<p class="crm-order-muted">Складские документы ещё не получены из 1С.</p>`);
				else _push(`<!---->`);
				_push(`</section></aside></div></form>`);
			} else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// components/crm/CrmOrdersRegister.vue
var _sfc_setup = CrmOrdersRegister_vue_vue_type_script_setup_true_lang_default.setup;
CrmOrdersRegister_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmOrdersRegister.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmOrdersRegister_default = Object.assign(CrmOrdersRegister_vue_vue_type_script_setup_true_lang_default, { __name: "CrmOrdersRegister" });

export { CrmOrdersRegister_default as C };;globalThis.__timing__.logEnd('Load chunks/build/CrmOrdersRegister-L-ybON7k');
//# sourceMappingURL=CrmOrdersRegister-L-ybON7k.mjs.map
