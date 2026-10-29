globalThis.__timing__.logStart('Load chunks/build/ChannelsWorkspacePage-CDC5-5ht');import { c as useRoute, a as useWorkspaceSession, b as useWorkspaceAccess, e as crmDestination, n as navigateTo, W as WorkspaceLoading_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { defineComponent, ref, computed, reactive, watch, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderList, ssrRenderStyle, ssrRenderAttr, ssrRenderClass, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Search, X, Wifi } from '@lucide/vue';

function marketplaceWorkspaceSection(section) {
  if (section === "orders") return "orders";
  if (section === "integrations" || section === "settings") return "integrations";
  return "dashboard";
}

// components/workspace/MarketplaceExchangePanel.vue?vue&type=script&setup=true&lang.ts
var MarketplaceExchangePanel_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "MarketplaceExchangePanel",
	__ssrInlineRender: true,
	setup(__props) {
		const access = useWorkspaceAccess(), session = useWorkspaceSession(), config = useRuntimeConfig(), route = useRoute();
		const status = reactive({});
		const statusErrors = reactive({});
		const busy = ref(null), loading = ref(false), message = ref(""), error = ref("");
		const unresolved = reactive({
			wildberries: [],
			ozon: []
		});
		const mappings = reactive({
			wildberries: [],
			ozon: []
		});
		const truncated = reactive({
			wildberries: false,
			ozon: false
		});
		const mappingError = reactive({
			wildberries: "",
			ozon: ""
		});
		const selected = ref(null);
		const search = ref(""), variants = ref([]), selectedVariant = ref(""), searching = ref(false), mappingBusy = ref(false);
		let generation = 0;
		const canSync = computed(() => [
			"marketplace.read",
			"marketplace.write",
			"customers.read",
			"customers.write"
		].every((key) => access.can(key)));
		const canReadMappings = computed(() => access.can("marketplace.read") && access.can("catalog.read"));
		const canMap = computed(() => canReadMappings.value && access.can("marketplace.configure"));
		const settingsPath = computed(() => route.path.startsWith("/crm/") ? "/crm/settings/integrations" : "/system-settings/integrations");
		const request = (path, options = {}) => $fetch$1(path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 12e4,
			retry: 0,
			...options
		});
		const reason = (value) => Array.isArray(value?.data?.message) ? value.data.message.join(", ") : typeof value?.data?.message === "string" ? value.data.message : "Не удалось получить данные. Обновите страницу или проверьте права доступа.";
		const date = (value) => value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "ещё не загружались";
		const rows = [
			{
				key: "WB_FBS",
				title: "Wildberries · FBS",
				description: "Заказы для сборки на нашем складе"
			},
			{
				key: "OZON_FBS",
				title: "Ozon · FBS",
				description: "Заказы для сборки на нашем складе"
			},
			{
				key: "OZON_FBO",
				title: "Ozon · FBO",
				description: "Заказы со склада Ozon"
			}
		];
		async function refresh() {
			if (!session.token.value || !access.can("marketplace.read")) return;
			const version = ++generation, identity = session.token.value;
			loading.value = true;
			const [wb, ozon, wbMissing, ozonMissing, wbMappings, ozonMappings] = await Promise.allSettled([
				request("/marketplaces/wildberries/fbs/status"),
				request("/marketplaces/ozon/status"),
				canReadMappings.value ? request("/marketplaces/wildberries/fbs/unresolved") : Promise.resolve(null),
				canReadMappings.value ? request("/marketplaces/ozon/unresolved") : Promise.resolve(null),
				canReadMappings.value ? request("/marketplaces/wildberries/fbs/mappings") : Promise.resolve([]),
				canReadMappings.value ? request("/marketplaces/ozon/mappings") : Promise.resolve([])
			]);
			if (version !== generation || identity !== session.token.value) return;
			if (wb.status === "fulfilled") {
				status.WB_FBS = wb.value;
				statusErrors.WB_FBS = "";
			} else {
				delete status.WB_FBS;
				statusErrors.WB_FBS = reason(wb.reason);
			}
			if (ozon.status === "fulfilled") {
				status.OZON_FBS = ozon.value.FBS;
				status.OZON_FBO = ozon.value.FBO;
				statusErrors.OZON_FBS = "";
				statusErrors.OZON_FBO = "";
			} else {
				delete status.OZON_FBS;
				delete status.OZON_FBO;
				statusErrors.OZON_FBS = reason(ozon.reason);
				statusErrors.OZON_FBO = reason(ozon.reason);
			}
			for (const [market, result] of [["wildberries", wbMissing], ["ozon", ozonMissing]]) if (result.status === "fulfilled") {
				unresolved[market] = result.value?.items || [];
				truncated[market] = Boolean(result.value?.truncated);
				mappingError[market] = "";
			} else {
				unresolved[market] = [];
				mappingError[market] = reason(result.reason);
			}
			for (const [market, result] of [["wildberries", wbMappings], ["ozon", ozonMappings]]) if (result.status === "fulfilled") mappings[market] = result.value;
			else {
				mappings[market] = [];
				mappingError[market] = reason(result.reason);
			}
			loading.value = false;
		}
		function statusText(value) {
			if (!value) return "Состояние неизвестно";
			if (value.supported === false) return "Загрузка пока не подключена";
			if (!value.enabled) return "Подключение выключено";
			if (!value.configured) return "Нужны настройки API";
			if (value.running || value.isRunning) return "Обмен выполняется";
			if (value.lastError) return "Последний обмен не завершён";
			if (value.coverageGap) return "Требуется сверить пропущенный период";
			if (value.hasMore || value.hasNext) return "Есть необработанные страницы";
			if (value.lastSuccessAt) return "Последняя страница получена";
			return "Ожидает первой загрузки";
		}
		watch([() => access.ready.value, () => session.token.value], ([ready, token]) => {
			generation++;
			loading.value = false;
			selected.value = null;
			variants.value = [];
			message.value = "";
			error.value = "";
			for (const key of [
				"WB_FBS",
				"OZON_FBS",
				"OZON_FBO"
			]) {
				delete status[key];
				delete statusErrors[key];
			}
			unresolved.wildberries = [];
			unresolved.ozon = [];
			mappings.wildberries = [];
			mappings.ozon = [];
			mappingError.wildberries = "";
			mappingError.ozon = "";
			if (ready && token && access.can("marketplace.read")) refresh();
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			if (unref(access).can("marketplace.read")) {
				_push(`<section${ssrRenderAttrs(mergeProps({
					class: "marketplace-exchange crm-surface",
					"aria-labelledby": "marketplace-exchange-title"
				}, _attrs))}><div class="marketplace-exchange-heading"><div><h2 id="marketplace-exchange-title">Обмен заказами</h2><p>Загружайте заказы площадок в CRM. После сопоставления товаров заказ передаётся в 1С.</p></div><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || !!unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
				_push(` Обновить состояние</button></div><p class="crm-inline-note">Для передачи заказов в 1С необходимо включённое подключение и работающий обмен. FBO не создаёт задание на нашем складе.</p>`);
				if (unref(message)) _push(`<p class="marketplace-exchange-message" role="status">${ssrInterpolate(unref(message))}</p>`);
				else _push(`<!---->`);
				if (unref(error)) _push(`<p class="marketplace-exchange-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<div class="marketplace-exchange-rows"><!--[-->`);
				ssrRenderList(rows, (row) => {
					_push(`<article class="marketplace-exchange-row"><div><h3>${ssrInterpolate(row.title)}</h3><p>${ssrInterpolate(row.description)}</p></div><div class="marketplace-exchange-status"><strong>${ssrInterpolate(statusText(unref(status)[row.key]))}</strong>`);
					if (unref(status)[row.key]?.lastError) _push(`<small>${ssrInterpolate(unref(status)[row.key]?.lastError)}</small>`);
					else if (unref(statusErrors)[row.key]) _push(`<small>${ssrInterpolate(unref(statusErrors)[row.key])}</small>`);
					else if (unref(status)[row.key]?.coverageGap) _push(`<small>Возможно, часть заказов не загружена. Проверьте период в кабинете площадки.</small>`);
					else if (unref(status)[row.key]?.supported !== false) {
						_push(`<small>Последняя страница: ${ssrInterpolate(date(unref(status)[row.key]?.lastSuccessAt))}`);
						if (unref(status)[row.key]?.automatic) _push(`<!--[--> · Автообновление включено<!--]-->`);
						else _push(`<!---->`);
						_push(`</small>`);
					} else _push(`<!---->`);
					_push(`</div>`);
					if (unref(canSync) && unref(status)[row.key]?.supported !== false) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || !!unref(busy) || !unref(status)[row.key]?.enabled || !unref(status)[row.key]?.configured || unref(status)[row.key]?.running || unref(status)[row.key]?.isRunning) ? " disabled" : ""}>${ssrInterpolate(unref(busy) === row.key ? "Загружаем…" : unref(status)[row.key]?.hasMore || unref(status)[row.key]?.hasNext ? "Продолжить загрузку" : "Загрузить заказы")}</button>`);
					else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]--></div>`);
				if (!unref(canSync)) _push(`<p class="crm-muted">Для запуска загрузки нужны права на маркетплейсы и клиентскую базу всей компании.</p>`);
				else _push(`<!---->`);
				_push(`<p class="crm-muted">Возвраты площадок отдельным потоком пока не загружаются. После записи заказа CRM ожидает подтверждение 1С.</p>`);
				if (unref(access).can("system.manage")) _push(ssrRenderComponent(_component_NuxtLink, { to: unref(settingsPath) }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Открыть настройки интеграций`);
						else return [createTextVNode("Открыть настройки интеграций")];
					}),
					_: 1
				}, _parent));
				else _push(`<!---->`);
				if (unref(canReadMappings)) {
					_push(`<section class="marketplace-exchange-mapping" aria-labelledby="marketplace-mapping-title"><div><h3 id="marketplace-mapping-title">Товары без соответствия</h3><p>Выберите товар из каталога для каждого варианта площадки. Пока соответствия нет, заказ не передаётся в 1С.</p></div><!--[-->`);
					ssrRenderList(["wildberries", "ozon"], (market) => {
						_push(`<!--[--><h4>${ssrInterpolate(market === "wildberries" ? "Wildberries" : "Ozon")}</h4>`);
						if (unref(mappingError)[market]) _push(`<p class="marketplace-exchange-error" role="status">${ssrInterpolate(unref(mappingError)[market])}</p>`);
						else if (!unref(unresolved)[market].length) _push(`<p class="crm-muted">Не найдены среди загруженных заказов.</p>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(unresolved)[market], (item) => {
							_push(`<article class="marketplace-exchange-unresolved"><div><strong>${ssrInterpolate(item.article || "Товар площадки")}</strong><small>${ssrInterpolate(market === "wildberries" ? "chrtId" : "ID товара")}: ${ssrInterpolate(item.externalVariantId)} · Заказов: ${ssrInterpolate(item.orders)}</small></div>`);
							if (unref(canMap)) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(mappingBusy) || !!unref(busy)) ? " disabled" : ""}>Выбрать товар</button>`);
							else _push(`<!---->`);
							_push(`</article>`);
						});
						_push(`<!--]-->`);
						if (unref(truncated)[market]) _push(`<p class="crm-muted">Показана часть списка; после обработки обновите данные.</p>`);
						else _push(`<!---->`);
						if (unref(mappings)[market].length) {
							_push(`<details class="marketplace-exchange-saved"><summary>Сохранённые соответствия: ${ssrInterpolate(unref(mappings)[market].length)}</summary><p class="crm-muted">Замена существующей связи требует сверки заказов и пока недоступна.</p><!--[-->`);
							ssrRenderList(unref(mappings)[market].slice(0, 50), (item) => {
								_push(`<div class="marketplace-exchange-unresolved"><span>${ssrInterpolate(item.externalVariantId)}</span><strong>${ssrInterpolate(item.variant.name)} · ${ssrInterpolate(item.variant.sku)}</strong></div>`);
							});
							_push(`<!--]-->`);
							if (unref(mappings)[market].length > 50) _push(`<p class="crm-muted">Показаны первые 50 соответствий.</p>`);
							else _push(`<!---->`);
							_push(`</details>`);
						} else _push(`<!---->`);
						_push(`<!--]-->`);
					});
					_push(`<!--]-->`);
					if (!unref(canMap)) _push(`<p class="crm-muted">Для сохранения соответствий обратитесь к сотруднику с правом настройки маркетплейсов.</p>`);
					else _push(`<!---->`);
					if (unref(selected)) {
						_push(`<div class="marketplace-exchange-editor crm-item-card" aria-labelledby="marketplace-selected-title"><h4 id="marketplace-selected-title">${ssrInterpolate(unref(selected).item.article || "Товар площадки")} · ${ssrInterpolate(unref(selected).item.externalVariantId)}</h4><form class="marketplace-exchange-search"><label class="crm-field">Поиск по названию или SKU<input${ssrRenderAttr("value", unref(search))} class="crm-input" maxlength="80"${ssrIncludeBooleanAttr(unref(searching) || unref(mappingBusy)) ? " disabled" : ""}></label><button class="crm-button" type="submit"${ssrIncludeBooleanAttr(unref(searching) || unref(mappingBusy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Search), { size: 16 }, null, _parent));
						_push(` Найти</button></form>`);
						if (unref(searching)) _push(`<p role="status">Ищем в каталоге…</p>`);
						else if (unref(variants).length) {
							_push(`<label class="crm-field">Товар каталога<select class="crm-input"${ssrIncludeBooleanAttr(unref(mappingBusy)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(selectedVariant)) ? ssrLooseContain(unref(selectedVariant), "") : ssrLooseEqual(unref(selectedVariant), "")) ? " selected" : ""}>Выберите товар</option><!--[-->`);
							ssrRenderList(unref(variants), (variant) => {
								_push(`<option${ssrRenderAttr("value", variant.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selectedVariant)) ? ssrLooseContain(unref(selectedVariant), variant.id) : ssrLooseEqual(unref(selectedVariant), variant.id)) ? " selected" : ""}>${ssrInterpolate(variant.product?.nameRu || variant.name)} · ${ssrInterpolate(variant.name)} · ${ssrInterpolate(variant.sku)}</option>`);
							});
							_push(`<!--]--></select></label>`);
						} else if (unref(search) && !unref(error)) _push(`<p class="crm-muted">Товары пока не найдены. Уточните название или SKU и нажмите «Найти».</p>`);
						else _push(`<!---->`);
						_push(`<div class="marketplace-exchange-actions"><button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(!unref(selectedVariant) || unref(mappingBusy)) ? " disabled" : ""}>Сохранить соответствие</button><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(mappingBusy)) ? " disabled" : ""}>Отмена</button></div></div>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`</section>`);
			} else _push(`<!---->`);
		};
	}
});
// components/workspace/MarketplaceExchangePanel.vue
var _sfc_setup$1 = MarketplaceExchangePanel_vue_vue_type_script_setup_true_lang_default.setup;
MarketplaceExchangePanel_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/MarketplaceExchangePanel.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var MarketplaceExchangePanel_default = Object.assign(MarketplaceExchangePanel_vue_vue_type_script_setup_true_lang_default, { __name: "MarketplaceExchangePanel" });
// components/workspace/ChannelsWorkspacePage.vue?vue&type=script&setup=true&lang.ts
var ChannelsWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "ChannelsWorkspacePage",
	__ssrInlineRender: true,
	props: { pageSection: {} },
	setup(__props) {
		const route = useRoute();
		const props = __props;
		const { user } = useWorkspaceSession();
		const busy = ref(false);
		const notice = ref("");
		const access = useWorkspaceAccess();
		const canWriteOrder = (order) => access.can("marketplace.write") && order?.canWrite === true;
		const canConfigure = computed(() => access.can("marketplace.configure"));
		const saving = ref(false);
		const error = ref("");
		useContextMenu();
		const orders = ref([]);
		const integrations = ref([]);
		const search = ref("");
		const channel = ref("");
		const statusFilter = ref("");
		const selected = ref(null);
		function closeOrder() {
			if (!saving.value) selected.value = null;
		}
		useCatalogDialog(computed(() => Boolean(selected.value)), closeOrder);
		const channels = [
			{
				id: "WILDBERRIES",
				name: "Wildberries",
				color: "#cb11ab"
			},
			{
				id: "OZON",
				name: "Ozon",
				color: "#005bff"
			},
			{
				id: "YANDEX_MARKET",
				name: "Яндекс Маркет",
				color: "#ffcc00"
			},
			{
				id: "MEGAMARKET",
				name: "Мегамаркет",
				color: "#e6332a"
			}
		];
		const integrationDrafts = reactive(Object.fromEntries(channels.map((item) => [item.id, {
			channel: item.id,
			shopName: ""
		}])));
		const integrationBaselines = reactive({});
		const statuses = [
			{
				id: "NEW",
				label: "Новые"
			},
			{
				id: "CONFIRMED",
				label: "Подтверждены"
			},
			{
				id: "ASSEMBLING",
				label: "Сборка"
			},
			{
				id: "SHIPPED",
				label: "Отправлены"
			},
			{
				id: "DELIVERED",
				label: "Доставлены"
			},
			{
				id: "CANCELLED",
				label: "Отменены"
			},
			{
				id: "RETURNED",
				label: "Возвраты"
			}
		];
		const section = computed(() => marketplaceWorkspaceSection(props.pageSection || route.query.section));
		const pageTitle = computed(() => crmDestination(route.path)?.label || (section.value === "orders" ? "Заказы маркетплейсов" : section.value === "integrations" ? "Подключения каналов" : "Обзор маркетплейсов"));
		const pageDescription = computed(() => section.value === "orders" ? "Заказы площадок, покупатели и этапы обработки." : section.value === "integrations" ? "Кабинеты маркетплейсов и состояние настроек подключения." : "Заказы и состояние каналов продаж.");
		const loaded = ref(false);
		watch(() => route.query.section, (value) => {
			if (!props.pageSection && value === "settings") navigateTo({
				path: "/crm-marketplaces",
				query: {
					...route.query,
					section: "integrations"
				}
			}, { replace: true });
		}, { immediate: true });
		const filteredOrders = computed(() => orders.value.filter((order) => (!channel.value || order.channel === channel.value) && (!statusFilter.value || order.status === statusFilter.value) && (!search.value || `${order.externalId} ${order.buyerName || ""} ${order.channel}`.toLowerCase().includes(search.value.toLowerCase()))));
		const stats = computed(() => ({
			total: orders.value.length,
			new: orders.value.filter((o) => o.status === "NEW").length,
			assembling: orders.value.filter((o) => o.status === "ASSEMBLING").length,
			revenue: orders.value.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
		}));
		function integration(id) {
			return integrationDrafts[id];
		}
		function configurationLabel(id) {
			const saved = integrations.value.find((item) => item.channel === id);
			return !saved ? "Не настроен" : saved.isActive ? "Включён · связь не подтверждена" : "Выключен";
		}
		const transitions = {
			NEW: ["CONFIRMED", "CANCELLED"],
			CONFIRMED: ["ASSEMBLING", "CANCELLED"],
			ASSEMBLING: ["SHIPPED", "CANCELLED"],
			SHIPPED: ["DELIVERED", "RETURNED"],
			DELIVERED: ["RETURNED"],
			CANCELLED: [],
			RETURNED: []
		};
		function labelStatus(value) {
			return statuses.find((s) => s.id === value)?.label || value;
		}
		function labelChannel(value) {
			return channels.find((c) => c.id === value)?.name || value;
		}
		const integrationDirty = computed(() => section.value === "integrations" && channels.some((item) => integrationBaselines[item.id] !== void 0 && JSON.stringify(integration(item.id)) !== integrationBaselines[item.id]));
		onBeforeRouteLeave(() => !saving.value && (!integrationDirty.value || (void 0).confirm("Уйти без сохранения названия кабинета?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_MarketplaceExchangePanel = MarketplaceExchangePanel_default;
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-ef7d3601c6cf": "",
				class: "marketplace-page crm-standard crm-management-workspace"
			}, _attrs))}><header data-v-ui-ef7d3601c6cf class="mp-header crm-page-header"><div data-v-ui-ef7d3601c6cf><h1 data-v-ui-ef7d3601c6cf>${ssrInterpolate(unref(pageTitle))}</h1><p data-v-ui-ef7d3601c6cf class="subtitle">${ssrInterpolate(unref(pageDescription))}</p></div><div data-v-ui-ef7d3601c6cf class="header-actions"><button class="crm-button crm-button--refresh" data-v-ui-ef7d3601c6cf${ssrIncludeBooleanAttr(unref(busy) || unref(saving)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				"data-v-ui-ef7d3601c6cf": "",
				size: 16,
				class: { spin: unref(busy) }
			}, null, _parent));
			_push(` Обновить</button></div></header>`);
			if (unref(section) === "integrations") _push(ssrRenderComponent(_component_MarketplaceExchangePanel, null, null, _parent));
			else _push(`<!---->`);
			_push(`<div data-v-ui-ef7d3601c6cf class="mp-body crm-page-content">`);
			if (unref(error)) _push(`<p data-v-ui-ef7d3601c6cf class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(busy) && !unref(loaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем канал продаж" }, null, _parent));
			else _push(`<!---->`);
			if (unref(loaded) && unref(section) === "dashboard") {
				_push(`<section data-v-ui-ef7d3601c6cf class="dashboard-view"><div data-v-ui-ef7d3601c6cf class="kpi-grid"><article class="crm-surface" data-v-ui-ef7d3601c6cf><span data-v-ui-ef7d3601c6cf>Всего заказов</span><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(unref(stats).total)}</strong><small data-v-ui-ef7d3601c6cf>за всё время</small></article><article class="crm-surface" data-v-ui-ef7d3601c6cf><span data-v-ui-ef7d3601c6cf>Новые</span><strong data-v-ui-ef7d3601c6cf class="coral">${ssrInterpolate(unref(stats).new)}</strong><small data-v-ui-ef7d3601c6cf>требуют внимания</small></article><article class="crm-surface" data-v-ui-ef7d3601c6cf><span data-v-ui-ef7d3601c6cf>В сборке</span><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(unref(stats).assembling)}</strong><small data-v-ui-ef7d3601c6cf>на складе</small></article><article class="crm-surface" data-v-ui-ef7d3601c6cf><span data-v-ui-ef7d3601c6cf>Оборот заказов</span><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(unref(stats).revenue.toLocaleString("ru-RU"))} ₽</strong><small data-v-ui-ef7d3601c6cf>по загруженным заказам</small></article></div><div data-v-ui-ef7d3601c6cf class="dashboard-grid"><article data-v-ui-ef7d3601c6cf class="panel channel-overview crm-surface"><div data-v-ui-ef7d3601c6cf class="panel-head"><div data-v-ui-ef7d3601c6cf><p data-v-ui-ef7d3601c6cf class="eyebrow">ПОДКЛЮЧЕНИЯ</p><h2 data-v-ui-ef7d3601c6cf>Каналы продаж</h2></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					"data-v-ui-ef7d3601c6cf": "",
					to: unref(route).path.startsWith("/crm/") ? "/crm/marketplaces/integrations" : "/crm-marketplaces/integrations"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Настроить`);
						else return [createTextVNode("Настроить")];
					}),
					_: 1
				}, _parent));
				_push(`</div><!--[-->`);
				ssrRenderList(channels, (item) => {
					_push(`<div data-v-ui-ef7d3601c6cf class="channel-line"><i data-v-ui-ef7d3601c6cf style="${ssrRenderStyle({ background: item.color })}"></i><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(item.name)}</strong><span data-v-ui-ef7d3601c6cf>${ssrInterpolate(configurationLabel(item.id))}</span></div>`);
				});
				_push(`<!--]--></article><article data-v-ui-ef7d3601c6cf class="panel attention crm-surface"><div data-v-ui-ef7d3601c6cf class="panel-head"><div data-v-ui-ef7d3601c6cf><p data-v-ui-ef7d3601c6cf class="eyebrow">ОПЕРАЦИОННАЯ ЛЕНТА</p><h2 data-v-ui-ef7d3601c6cf>Последние заказы</h2></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					"data-v-ui-ef7d3601c6cf": "",
					to: unref(route).path.startsWith("/crm/") ? "/crm/marketplaces/orders" : "/crm-marketplaces/orders"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Все заказы`);
						else return [createTextVNode("Все заказы")];
					}),
					_: 1
				}, _parent));
				_push(`</div><!--[-->`);
				ssrRenderList(unref(orders).slice(0, 5), (order) => {
					_push(`<div data-v-ui-ef7d3601c6cf class="compact-order crm-data-row"><div data-v-ui-ef7d3601c6cf><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(order.externalId)}</strong><small data-v-ui-ef7d3601c6cf>${ssrInterpolate(labelChannel(order.channel))} · ${ssrInterpolate(order.buyerName || "Покупатель не указан")}</small></div><span data-v-ui-ef7d3601c6cf${ssrRenderAttr("data-status", order.status)} class="${ssrRenderClass([`status status-${order.status.toLowerCase()}`, "crm-badge"])}">${ssrInterpolate(labelStatus(order.status))}</span></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(orders).length) _push(`<p data-v-ui-ef7d3601c6cf class="empty">Заказов пока нет</p>`);
				else _push(`<!---->`);
				_push(`</article></div></section>`);
			} else if (unref(loaded) && unref(section) === "orders") {
				_push(`<section data-v-ui-ef7d3601c6cf class="panel orders-panel crm-surface"><div data-v-ui-ef7d3601c6cf class="filters crm-toolbar"><label data-v-ui-ef7d3601c6cf class="search crm-input-group">`);
				_push(ssrRenderComponent(unref(Search), {
					"data-v-ui-ef7d3601c6cf": "",
					size: 16
				}, null, _parent));
				_push(`<input class="crm-input" data-v-ui-ef7d3601c6cf id="channel-order-query"${ssrRenderAttr("value", unref(search))} aria-label="Поиск заказов маркетплейсов" placeholder="Поиск по номеру или покупателю"></label><select class="crm-input" data-v-ui-ef7d3601c6cf aria-label="Канал продаж"><option data-v-ui-ef7d3601c6cf value=""${ssrIncludeBooleanAttr(Array.isArray(unref(channel)) ? ssrLooseContain(unref(channel), "") : ssrLooseEqual(unref(channel), "")) ? " selected" : ""}>Все каналы</option><!--[-->`);
				ssrRenderList(channels, (item) => {
					_push(`<option data-v-ui-ef7d3601c6cf${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(channel)) ? ssrLooseContain(unref(channel), item.id) : ssrLooseEqual(unref(channel), item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)}</option>`);
				});
				_push(`<!--]--></select><select class="crm-input" data-v-ui-ef7d3601c6cf aria-label="Статус заказа"><option data-v-ui-ef7d3601c6cf value=""${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "") : ssrLooseEqual(unref(statusFilter), "")) ? " selected" : ""}>Все статусы</option><!--[-->`);
				ssrRenderList(statuses, (item) => {
					_push(`<option data-v-ui-ef7d3601c6cf${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), item.id) : ssrLooseEqual(unref(statusFilter), item.id)) ? " selected" : ""}>${ssrInterpolate(item.label)}</option>`);
				});
				_push(`<!--]--></select>`);
				if (unref(search) || unref(channel) || unref(statusFilter)) {
					_push(`<button data-v-ui-ef7d3601c6cf class="clear crm-button" type="button">`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-ef7d3601c6cf": "",
						size: 16
					}, null, _parent));
					_push(` Сбросить</button>`);
				} else _push(`<!---->`);
				_push(`</div><div data-v-ui-ef7d3601c6cf class="table-wrap"><div data-v-ui-ef7d3601c6cf class="order-row table-head crm-table-head"><span data-v-ui-ef7d3601c6cf>Заказ</span><span data-v-ui-ef7d3601c6cf>Канал</span><span data-v-ui-ef7d3601c6cf>Покупатель</span><span data-v-ui-ef7d3601c6cf>Сумма</span><span data-v-ui-ef7d3601c6cf>Статус</span><span data-v-ui-ef7d3601c6cf>Дата</span></div><!--[-->`);
				ssrRenderList(unref(filteredOrders), (order) => {
					_push(`<div data-v-ui-ef7d3601c6cf class="order-row clickable crm-data-row crm-interactive crm-table-row" role="button" tabindex="0"><div data-v-ui-ef7d3601c6cf><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(order.externalId)}</strong><small data-v-ui-ef7d3601c6cf>${ssrInterpolate(order.trackingNumber || "Трек-номер не указан")}</small></div><span data-v-ui-ef7d3601c6cf>${ssrInterpolate(labelChannel(order.channel))}</span><span data-v-ui-ef7d3601c6cf>${ssrInterpolate(order.buyerName || "Не указан")}</span><strong data-v-ui-ef7d3601c6cf>${ssrInterpolate(Number(order.totalAmount || 0).toLocaleString("ru-RU"))} ₽</strong><span data-v-ui-ef7d3601c6cf class="${ssrRenderClass(`status status-${order.status.toLowerCase()}`)}">${ssrInterpolate(labelStatus(order.status))}</span><span data-v-ui-ef7d3601c6cf>${ssrInterpolate(new Date(order.createdAt).toLocaleDateString("ru-RU"))}</span></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(filteredOrders).length) _push(`<p data-v-ui-ef7d3601c6cf class="empty">По выбранным фильтрам заказов не найдено</p>`);
				else _push(`<!---->`);
				_push(`</div></section>`);
			} else if (unref(loaded) && unref(section) === "integrations") {
				_push(`<section data-v-ui-ef7d3601c6cf class="integrations-view"><div data-v-ui-ef7d3601c6cf class="section-intro"><div data-v-ui-ef7d3601c6cf><h2 data-v-ui-ef7d3601c6cf>Кабинеты маркетплейсов</h2><p data-v-ui-ef7d3601c6cf>Здесь сохраняется название кабинета. Проверка использует адаптер разработки, а не реальный API площадки.</p>`);
				if (unref(user)?.role === "ADMIN") _push(ssrRenderComponent(_component_NuxtLink, {
					"data-v-ui-ef7d3601c6cf": "",
					to: unref(route).path.startsWith("/crm/") ? "/crm/settings/integrations" : "/system-settings/integrations"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Ключи API и секретные настройки — в центре интеграций`);
						else return [createTextVNode("Ключи API и секретные настройки — в центре интеграций")];
					}),
					_: 1
				}, _parent));
				else _push(`<p data-v-ui-ef7d3601c6cf class="muted">Для настройки ключей API обратитесь к администратору платформы.</p>`);
				_push(`</div></div><div data-v-ui-ef7d3601c6cf class="integration-grid"><!--[-->`);
				ssrRenderList(channels, (item) => {
					_push(`<article data-v-ui-ef7d3601c6cf class="integration-card crm-surface crm-item-card"><div data-v-ui-ef7d3601c6cf class="integration-top"><i data-v-ui-ef7d3601c6cf style="${ssrRenderStyle({ background: item.color })}"></i><div data-v-ui-ef7d3601c6cf><h3 data-v-ui-ef7d3601c6cf>${ssrInterpolate(item.name)}</h3><span data-v-ui-ef7d3601c6cf>${ssrInterpolate(configurationLabel(item.id))}</span></div></div><label data-v-ui-ef7d3601c6cf>Название кабинета<input class="crm-input" data-v-ui-ef7d3601c6cf${ssrRenderAttr("value", integration(item.id).shopName)}${ssrIncludeBooleanAttr(unref(saving) || unref(busy) || !unref(canConfigure)) ? " disabled" : ""}${ssrRenderAttr("placeholder", `${item.name} магазин`)}></label>`);
					if (unref(canConfigure)) {
						_push(`<div data-v-ui-ef7d3601c6cf class="card-actions"><button data-v-ui-ef7d3601c6cf class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || unref(busy)) ? " disabled" : ""}>Сохранить название</button><button class="crm-button" data-v-ui-ef7d3601c6cf${ssrIncludeBooleanAttr(unref(saving) || unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Wifi), {
							"data-v-ui-ef7d3601c6cf": "",
							size: 15
						}, null, _parent));
						_push(` Проверить тестовый адаптер</button></div>`);
					} else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<aside class="drawer-backdrop admin-dialog-backdrop crm-management-backdrop"><section tabindex="-1" class="drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="marketplace-order-title"><header><div><h2 id="marketplace-order-title">${ssrInterpolate(unref(selected).externalId)}</h2><span class="crm-badge"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(labelStatus(unref(selected).status))}</span></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть заказ маркетплейса"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-stack">`);
					if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					if (canWriteOrder(unref(selected))) {
						_push(`<div class="order-actions"><!--[-->`);
						ssrRenderList(transitions[unref(selected).status] || [], (status) => {
							_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(saving) || unref(busy)) ? " disabled" : ""}>${ssrInterpolate(labelStatus(status))}</button>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					_push(`<p class="crm-muted">Допустимость смены статуса проверяет сервер.</p><dl class="crm-management-order-facts"><div><dt>Номер в системе</dt><dd>${ssrInterpolate(unref(selected).orderNumber)}</dd></div><div><dt>Канал</dt><dd>${ssrInterpolate(labelChannel(unref(selected).channel))}</dd></div><div><dt>Покупатель</dt><dd>${ssrInterpolate(unref(selected).buyerName || "Не указан")}</dd></div><div><dt>Сумма</dt><dd>${ssrInterpolate(Number(unref(selected).totalAmount || 0).toLocaleString("ru-RU"))} ₽</dd></div><div><dt>Создан</dt><dd>${ssrInterpolate(new Date(unref(selected).createdAt).toLocaleString("ru-RU"))}</dd></div></dl></div></section></aside>`);
				} else _push(`<!---->`);
			}, "body", !unref(route).path.startsWith("/crm/"), _parent);
			if (unref(notice)) _push(`<div data-v-ui-ef7d3601c6cf class="toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// components/workspace/ChannelsWorkspacePage.vue
var _sfc_setup = ChannelsWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
ChannelsWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/ChannelsWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ChannelsWorkspacePage_default = Object.assign(ChannelsWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "ChannelsWorkspacePage" });

export { ChannelsWorkspacePage_default as C };;globalThis.__timing__.logEnd('Load chunks/build/ChannelsWorkspacePage-CDC5-5ht');
//# sourceMappingURL=ChannelsWorkspacePage-CDC5-5ht.mjs.map
