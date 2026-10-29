globalThis.__timing__.logStart('Load chunks/build/ReportsWorkspacePage-wipxTm-O');import { c as useRoute, a as useWorkspaceSession, e as crmDestination, W as WorkspaceLoading_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderClass, ssrRenderList, ssrRenderStyle } from 'vue/server-renderer';
import { Headphones, RefreshCw, AlertTriangle, Banknote, ArrowUpRight, ArrowDownRight, ClipboardList, Users, Boxes, CircleDollarSign, ReceiptText, Target, Headset } from '@lucide/vue';

var ReportsWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	components: { HeadphonesIcon: Headphones },
	__name: "ReportsWorkspacePage",
	__ssrInlineRender: true,
	props: { pageSection: {} },
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const { token } = useWorkspaceSession();
		const data = ref(null);
		const loading = ref(false);
		const error = ref("");
		const props = __props;
		const section = computed(() => props.pageSection || String(route.query.section || "overview"));
		const titles = {
			overview: {
				eyebrow: "КОМПАНИЯ / 30 ДНЕЙ",
				title: "Пульс бизнеса",
				description: "Результаты и точки внимания в пределах ваших прав доступа"
			},
			sales: {
				eyebrow: "ФИНАНСОВЫЙ СРЕЗ",
				title: "Продажи и каналы",
				description: "Оборот, количество заказов и вклад каждого канала"
			},
			customers: {
				eyebrow: "КЛИЕНТСКАЯ АНАЛИТИКА",
				title: "Клиенты и развитие",
				description: "Рост клиентской базы, CRM-нагрузка и качество сервиса"
			}
		};
		const title = computed(() => {
			const page = titles[section.value] || titles.overview;
			return {
				...page,
				title: crmDestination(route.path)?.label || page.title
			};
		});
		const money = (value) => value == null ? "—" : Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
		const channelLabels = {
			WEB: "Интернет-магазин",
			B2B: "B2B",
			WILDBERRIES: "Wildberries",
			OZON: "Ozon",
			YANDEX_MARKET: "Яндекс Маркет",
			MEGAMARKET: "Мегамаркет",
			MANUAL: "Ручной заказ",
			ONE_C: "1С"
		};
		const salesChannels = computed(() => data.value?.channels || []);
		const maxChannelRevenue = computed(() => Math.max(1, ...salesChannels.value.map((item) => Number(item.revenue || 0))));
		let requestVersion = 0;
		let controller;
		async function load() {
			const version = ++requestVersion, identity = token.value;
			controller?.abort();
			controller = new AbortController();
			loading.value = true;
			error.value = "";
			data.value = null;
			try {
				const result = await $fetch$1("/leadership/overview", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` },
					signal: controller.signal
				});
				if (version === requestVersion && token.value === identity) data.value = result;
			} catch (e) {
				if (version === requestVersion && token.value === identity) error.value = e?.data?.message || "Не удалось загрузить управленческие показатели";
			} finally {
				if (version === requestVersion) loading.value = false;
			}
		}
		watch(token, () => {
			++requestVersion;
			controller?.abort();
			data.value = null;
			if (token.value) load();
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-f25044a38e22": "",
				class: "leader-page crm-standard crm-management-workspace"
			}, _attrs))}><header data-v-ui-f25044a38e22 class="leader-header crm-page-header"><div data-v-ui-f25044a38e22><h1 data-v-ui-f25044a38e22>${ssrInterpolate(unref(title).title)}</h1><span data-v-ui-f25044a38e22>${ssrInterpolate(unref(title).description)}</span></div><button class="crm-button crm-button--refresh" data-v-ui-f25044a38e22${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				"data-v-ui-f25044a38e22": "",
				size: 16,
				class: { spin: unref(loading) }
			}, null, _parent));
			_push(` Обновить данные</button></header>`);
			if (!unref(data) && unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Собираем показатели компании" }, null, _parent));
			else if (unref(error)) {
				_push(`<div data-v-ui-f25044a38e22 class="crm-management-error">`);
				_push(ssrRenderComponent(unref(AlertTriangle), {
					"data-v-ui-f25044a38e22": "",
					size: 22
				}, null, _parent));
				_push(`<span data-v-ui-f25044a38e22>${ssrInterpolate(unref(error))}</span><button class="crm-button" data-v-ui-f25044a38e22>Повторить</button></div>`);
			} else if (unref(data)) {
				_push(`<div data-v-ui-f25044a38e22 class="leader-body crm-page-content">`);
				if (unref(data).access && Object.values(unref(data).access).some((value) => !value)) _push(`<p class="crm-muted" role="status">Часть разделов недоступна. Прочерк означает отсутствие доступа, а не нулевой результат.</p>`);
				else _push(`<!---->`);
				_push(`<div class="report-context"><span>Последние 30 дней</span><p>Заказы с подтверждённой онлайн-оплатой · по дате создания</p><details><summary>Об этих данных</summary><p>Это операционная статистика. Финансовый учёт, взаиморасчёты и отчётность ведутся в 1С.</p></details></div>`);
				if (unref(section) === "overview") {
					_push(`<!--[--><section data-v-ui-f25044a38e22 class="hero-kpis"><article data-v-ui-f25044a38e22 class="revenue crm-surface--tint crm-surface">`);
					_push(ssrRenderComponent(unref(Banknote), {
						"data-v-ui-f25044a38e22": "",
						size: 19,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Онлайн-оплаченные заказы за 30 дней</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(money(unref(data).sales.revenue))}</strong><small data-v-ui-f25044a38e22 class="${ssrRenderClass(unref(data).sales.growth == null ? "" : unref(data).sales.growth >= 0 ? "positive" : "negative")}">`);
					if (unref(data).sales.growth !== null && unref(data).sales.growth >= 0) _push(ssrRenderComponent(unref(ArrowUpRight), {
						"data-v-ui-f25044a38e22": "",
						size: 14
					}, null, _parent));
					else if (unref(data).sales.growth !== null) _push(ssrRenderComponent(unref(ArrowDownRight), {
						"data-v-ui-f25044a38e22": "",
						size: 14
					}, null, _parent));
					else _push(`<!---->`);
					_push(`${ssrInterpolate(unref(data).sales.growth === null ? "Недостаточно данных для сравнения" : Math.abs(unref(data).sales.growth).toFixed(1) + "% к прошлому периоду")}</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(ClipboardList), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Оплаченные заказы</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).sales.orders ?? "—")}</strong><small data-v-ui-f25044a38e22>Средний чек ${ssrInterpolate(money(unref(data).sales.averageOrder))}</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Users), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Клиенты</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).customers.total ?? "—")}</strong><small data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).customers.new == null ? "—" : "+" + unref(data).customers.new)} за 30 дней</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Boxes), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Товарные риски</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.lowStock ?? "—")}</strong><small data-v-ui-f25044a38e22>позиций с малым остатком</small></article></section><section data-v-ui-f25044a38e22 class="overview-grid"><article data-v-ui-f25044a38e22 class="panel crm-surface"><div data-v-ui-f25044a38e22 class="panel-head"><div data-v-ui-f25044a38e22><h2 data-v-ui-f25044a38e22>Суммы заказов по каналам</h2></div>`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						"data-v-ui-f25044a38e22": "",
						to: unref(route).path.startsWith("/crm/") ? "/crm/reports/sales" : "/leadership?section=sales"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`Подробнее`);
							else return [createTextVNode("Подробнее")];
						}),
						_: 1
					}, _parent));
					_push(`</div><!--[-->`);
					ssrRenderList(unref(salesChannels), (item) => {
						_push(`<div data-v-ui-f25044a38e22 class="channel-row"><div data-v-ui-f25044a38e22><strong data-v-ui-f25044a38e22>${ssrInterpolate(channelLabels[item.channel] || item.channel)}</strong><small data-v-ui-f25044a38e22>${ssrInterpolate(item.orders)} заказов</small></div><span data-v-ui-f25044a38e22 data-label="Сумма">${ssrInterpolate(money(item.revenue))}</span><i data-v-ui-f25044a38e22><b data-v-ui-f25044a38e22 style="${ssrRenderStyle({ width: `${Math.max(4, Number(item.revenue || 0) / unref(maxChannelRevenue) * 100)}%` })}"></b></i></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(salesChannels).length) _push(`<p data-v-ui-f25044a38e22 class="empty">${ssrInterpolate(unref(data).access?.sales === false ? "Нет доступа к данным продаж" : "В доступной области пока нет подтверждённых оплат")}</p>`);
					else _push(`<!---->`);
					_push(`</article><article data-v-ui-f25044a38e22 class="panel attention crm-surface"><div data-v-ui-f25044a38e22 class="panel-head"><div data-v-ui-f25044a38e22><h2 data-v-ui-f25044a38e22>Операционные риски</h2></div></div><div data-v-ui-f25044a38e22 class="risk"><i data-v-ui-f25044a38e22 class="danger crm-icon-tile--danger">`);
					_push(ssrRenderComponent(unref(AlertTriangle), {
						"data-v-ui-f25044a38e22": "",
						size: 17
					}, null, _parent));
					_push(`</i><span data-v-ui-f25044a38e22><strong data-v-ui-f25044a38e22>Просроченные обращения</strong><small data-v-ui-f25044a38e22>Нарушен срок решения Helpdesk</small></span><b data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.helpdeskOverdue ?? "—")}</b></div><div data-v-ui-f25044a38e22 class="risk"><i data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Headphones), null, null, _parent));
					_push(`</i><span data-v-ui-f25044a38e22><strong data-v-ui-f25044a38e22>Открытые обращения</strong><small data-v-ui-f25044a38e22>В работе у IT-команды</small></span><b data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.helpdeskOpen ?? "—")}</b></div><div data-v-ui-f25044a38e22 class="risk"><i data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(ClipboardList), {
						"data-v-ui-f25044a38e22": "",
						size: 17
					}, null, _parent));
					_push(`</i><span data-v-ui-f25044a38e22><strong data-v-ui-f25044a38e22>Активные задачи</strong><small data-v-ui-f25044a38e22>Задачи в доступной области</small></span><b data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.activeTasks ?? "—")}</b></div><div data-v-ui-f25044a38e22 class="risk"><i data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Users), {
						"data-v-ui-f25044a38e22": "",
						size: 17
					}, null, _parent));
					_push(`</i><span data-v-ui-f25044a38e22><strong data-v-ui-f25044a38e22>Открытые лиды</strong><small data-v-ui-f25044a38e22>Требуют движения по воронке</small></span><b data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.openLeads ?? "—")}</b></div></article></section><!--]-->`);
				} else if (unref(section) === "sales") {
					_push(`<!--[--><section data-v-ui-f25044a38e22 class="hero-kpis"><article data-v-ui-f25044a38e22 class="revenue crm-surface--tint crm-surface">`);
					_push(ssrRenderComponent(unref(Banknote), {
						"data-v-ui-f25044a38e22": "",
						size: 19,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Сумма онлайн-оплаченных заказов</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(money(unref(data).sales.revenue))}</strong><small data-v-ui-f25044a38e22>За последние 30 дней</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(CircleDollarSign), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Прошлый период</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(money(unref(data).sales.previousRevenue))}</strong><small data-v-ui-f25044a38e22>База для сравнения</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(ClipboardList), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Оплаченные заказы</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).sales.orders ?? "—")}</strong><small data-v-ui-f25044a38e22>По статусу онлайн-платежа</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(ReceiptText), {
						"data-v-ui-f25044a38e22": "",
						size: 19,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Средний чек</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(money(unref(data).sales.averageOrder))}</strong><small data-v-ui-f25044a38e22>По доступным каналам</small></article></section><article data-v-ui-f25044a38e22 class="panel wide crm-surface"><div data-v-ui-f25044a38e22 class="panel-head"><div data-v-ui-f25044a38e22><h2 data-v-ui-f25044a38e22>Продажи по направлениям</h2></div></div><div data-v-ui-f25044a38e22 class="sales-table"><div data-v-ui-f25044a38e22 class="sales-row head crm-table-head"><span data-v-ui-f25044a38e22>Канал</span><span data-v-ui-f25044a38e22>Заказы</span><span data-v-ui-f25044a38e22>Сумма заказов</span><span data-v-ui-f25044a38e22>Доля</span></div><!--[-->`);
					ssrRenderList(unref(salesChannels), (item) => {
						_push(`<div data-v-ui-f25044a38e22 class="sales-row crm-table-row"><strong data-v-ui-f25044a38e22>${ssrInterpolate(channelLabels[item.channel] || item.channel)}</strong><span data-v-ui-f25044a38e22 data-label="Заказы">${ssrInterpolate(item.orders)}</span><span data-v-ui-f25044a38e22 data-label="Сумма">${ssrInterpolate(money(item.revenue))}</span><span data-v-ui-f25044a38e22 data-label="Доля">${ssrInterpolate(unref(data).sales.revenue ? (Number(item.revenue) / unref(data).sales.revenue * 100).toFixed(1) : 0)}%</span></div>`);
					});
					_push(`<!--]--></div></article><!--]-->`);
				} else {
					_push(`<!--[--><section data-v-ui-f25044a38e22 class="hero-kpis customer-kpis"><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Users), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Клиентская база</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).customers.total ?? "—")}</strong><small data-v-ui-f25044a38e22>B2C и B2B</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(ArrowUpRight), {
						"data-v-ui-f25044a38e22": "",
						size: 19
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Новые клиенты</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).customers.new ?? "—")}</strong><small data-v-ui-f25044a38e22>За последние 30 дней</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Target), {
						"data-v-ui-f25044a38e22": "",
						size: 19,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Открытые лиды</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.openLeads ?? "—")}</strong><small data-v-ui-f25044a38e22>В активной воронке</small></article><article class="crm-surface" data-v-ui-f25044a38e22>`);
					_push(ssrRenderComponent(unref(Headset), {
						"data-v-ui-f25044a38e22": "",
						size: 19,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span data-v-ui-f25044a38e22>Обращения в поддержку</span><strong data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.helpdeskOpen ?? "—")}</strong><small data-v-ui-f25044a38e22>${ssrInterpolate(unref(data).operations.helpdeskOverdue ?? "—")} просрочено</small></article></section><article data-v-ui-f25044a38e22 class="panel wide narrative crm-surface"><h2 data-v-ui-f25044a38e22>Единая картина клиента</h2><p data-v-ui-f25044a38e22>Сопоставляйте рост клиентской базы с новыми обращениями и активными лидами. Прочерк означает, что показатель недоступен в вашей области доступа.</p></article><!--]-->`);
				}
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// components/workspace/ReportsWorkspacePage.vue
var _sfc_setup = ReportsWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
ReportsWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/ReportsWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ReportsWorkspacePage_default = Object.assign(ReportsWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "ReportsWorkspacePage" });

export { ReportsWorkspacePage_default as R };;globalThis.__timing__.logEnd('Load chunks/build/ReportsWorkspacePage-wipxTm-O');
//# sourceMappingURL=ReportsWorkspacePage-wipxTm-O.mjs.map
