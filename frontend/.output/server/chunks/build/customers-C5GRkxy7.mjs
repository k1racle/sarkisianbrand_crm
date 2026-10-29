globalThis.__timing__.logStart('Load chunks/build/customers-C5GRkxy7');import { u as useHead, c as useRoute, G as useRouter, a as useWorkspaceSession, b as useWorkspaceAccess, W as WorkspaceLoading_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { u as useWorkspaceOperation } from './useWorkspaceOperation-DZ4fBozi.mjs';
import { u as useWorkspaceEntityDraft, C as CrmAccountManagerField_default } from './useWorkspaceEntityDraft-DQuVCmKr.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, withCtx, createTextVNode, toDisplayString, createVNode, resolveDynamicComponent, openBlock, createBlock, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderAttr, ssrInterpolate, ssrRenderList, ssrLooseContain, ssrLooseEqual, ssrRenderClass, ssrRenderVNode, ssrRenderTeleport, ssrRenderDynamicAttr } from 'vue/server-renderer';
import { UserPlus, MessageSquare, ShoppingBag, Headphones, CheckCircle2, Clock3, RefreshCw, Plus, Search, X, SlidersHorizontal, Users, ChevronLeft, ChevronRight, Phone, Mail, UserRound, ArrowUpRight, ArrowLeft, Pencil, MoreHorizontal, Building2 } from '@lucide/vue';
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

// pages/crm/customers.vue?vue&type=script&setup=true&lang.ts
var pageSize = 25;
var customers_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "customers",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Клиенты — SARKISIAN CRM" });
		const config = useRuntimeConfig();
		useRoute();
		useRouter();
		const { token, user } = useWorkspaceSession();
		useContextMenu();
		const dashboard = ref(null);
		const customers = ref([]);
		const loading = ref(false);
		const error = ref("");
		const { actionBusy} = useWorkspaceOperation(error);
		const { selected, draftDirty} = useWorkspaceEntityDraft(actionBusy);
		const access = useWorkspaceAccess();
		const canEdit = computed(() => access.can("customers.write"));
		const search = ref("");
		const status = ref("");
		const segment = ref("");
		const notice = ref("");
		const managers = ref([]);
		const assignment = ref("");
		const sort = ref("updated");
		const filtersExpanded = ref(false);
		const duplicateId = ref("");
		const creating = computed(() => Boolean(selected.value && !selected.value.id));
		const extraFilterCount = computed(() => Number(Boolean(status.value)) + Number(Boolean(assignment.value)) + Number(sort.value !== "updated"));
		const customerTab = ref("profile");
		const customerTabs = [
			{
				value: "profile",
				label: "Профиль"
			},
			{
				value: "orders",
				label: "Заказы"
			},
			{
				value: "support",
				label: "Обращения"
			}
		];
		const segmentFilters = [
			{
				value: "",
				label: "Все клиенты",
				short: "Все"
			},
			{
				value: "B2C",
				label: "Розница · B2C",
				short: "B2C"
			},
			{
				value: "B2B",
				label: "Партнёры · B2B",
				short: "B2B"
			},
			{
				value: "Лид",
				label: "Лиды",
				short: "Лиды"
			}
		];
		const assignmentFilters = [
			{
				value: "",
				label: "Все ответственные"
			},
			{
				value: "mine",
				label: "Мои клиенты"
			},
			{
				value: "unassigned",
				label: "Без менеджера"
			}
		];
		const hasFilters = computed(() => Boolean(search.value || status.value || segment.value || assignment.value));
		const filteredCustomers = computed(() => customers.value.filter((item) => !assignment.value || (assignment.value === "mine" ? Boolean(user.value?.id) && item.accountManagerId === user.value?.id : !item.accountManagerId)).sort((a, b) => {
			if (sort.value === "name") return customerName(a).localeCompare(customerName(b), "ru");
			if (sort.value === "orders") return (b._count?.orders || 0) - (a._count?.orders || 0) || customerName(a).localeCompare(customerName(b), "ru");
			return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
		}));
		const page = ref(1);
		const pageCount = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / pageSize)));
		const visibleCustomers = computed(() => filteredCustomers.value.slice((page.value - 1) * pageSize, page.value * pageSize));
		const customerName = (item) => [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || item.phone || "Без имени";
		const managerName = (item) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(" ") || item.accountManager?.email || "Не назначен";
		const phoneHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;
		const canWriteRecord = (record) => canEdit.value && record?.canWrite === true;
		const canEditSelected = computed(() => creating.value ? canEdit.value : canWriteRecord(selected.value));
		let searchTimer;
		let loadVersion = 0;
		const statusLabels = {
			ACTIVE: "Активен",
			BLOCKED: "Заблокирован",
			ARCHIVED: "В архиве"
		};
		const roleLabels = {
			OWNER: "Владелец",
			BUYER: "Закупщик",
			ACCOUNTANT: "Бухгалтер",
			EMPLOYEE: "Сотрудник"
		};
		const orderLabels = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAYMENT_WAITING: "Ожидает оплату",
			PAID: "Оплачен",
			ASSEMBLING: "Собирается",
			SHIPPED: "Отправлен",
			DELIVERED: "Доставлен",
			CANCELLED: "Отменён",
			REFUNDED: "Возврат"
		};
		const ticketLabels = {
			NEW: "Новая",
			OPEN: "В работе",
			WAITING_REQUESTER: "Ждём клиента",
			WAITING_INTERNAL: "Ждём коллег",
			RESOLVED: "Решена",
			CLOSED: "Закрыта"
		};
		const sourceLabels = {
			WEB: "Интернет-магазин",
			B2B: "B2B",
			WILDBERRIES: "Wildberries",
			OZON: "Ozon",
			YANDEX_MARKET: "Яндекс Маркет",
			MEGAMARKET: "Мегамаркет",
			MANUAL: "Ручной заказ",
			ONE_C: "1С"
		};
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		async function load() {
			const version = ++loadVersion;
			const identity = token.value;
			loading.value = true;
			error.value = "";
			try {
				const [nextDashboard, nextCustomers] = await Promise.all([$fetch$1("/customer-360/dashboard", {
					baseURL: config.public.apiBase,
					headers: headers.value
				}), $fetch$1("/customer-360/customers", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					query: {
						search: search.value || void 0,
						status: status.value || void 0,
						segment: segment.value || void 0
					}
				})]);
				if (version !== loadVersion || token.value !== identity) return;
				dashboard.value = nextDashboard;
				customers.value = nextCustomers;
				if (preview.value && !recordOpen.value && !nextCustomers.some((row) => row.id === preview.value.id)) preview.value = null;
				page.value = Math.min(page.value, pageCount.value);
			} catch (reason) {
				if (version === loadVersion) error.value = typeof reason?.data?.message === "string" ? reason.data.message : "Не удалось загрузить клиентов. Повторите попытку.";
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		watch([
			search,
			status,
			segment
		], (next, previous) => {
			clearTimeout(searchTimer);
			++loadVersion;
			page.value = 1;
			if (next[0] !== previous[0]) searchTimer = setTimeout(load, 300);
			else load();
		});
		watch([assignment, sort], () => {
			page.value = 1;
		});
		watch(() => [
			selected.value?.firstName,
			selected.value?.phone,
			selected.value?.email
		], () => {
			if (creating.value && !actionBusy.value) {
				duplicateId.value = "";
				error.value = "";
			}
		});
		const preview = ref(null), previewLoading = ref(false), previewError = ref(""), recordOpen = ref(false);
		const recordTab = ref("overview");
		const compactScreen = ref(false);
		const allTasks = ref([]), tasksLoading = ref(false), tasksError = ref("");
		const canReadTasks = computed(() => access.can("crm.read"));
		const canCreateTask = computed(() => access.can("crm.write"));
		const recordTabs = computed(() => [
			{
				value: "overview",
				label: "Обзор"
			},
			{
				value: "history",
				label: "История"
			},
			{
				value: "orders",
				label: "Заказы",
				count: preview.value?._count?.orders || 0
			},
			{
				value: "tasks",
				label: "Задачи",
				count: preview.value?._count?.tasks || 0
			},
			{
				value: "support",
				label: "Обращения",
				count: preview.value?._count?.helpdeskTickets || 0
			}
		]);
		const initials = (item) => [item?.firstName, item?.lastName].filter(Boolean).map((v) => v[0]).join("").slice(0, 2).toUpperCase() || customerName(item || {}).slice(0, 1).toUpperCase();
		const segmentName = (value) => ({
			B2C: "Розница",
			B2B: "Бизнес",
			"Лид": "Лид"
		})[value] || value || "Не указан";
		const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.email || "Не назначен";
		const money = (value) => Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
		const dateLabel = (value, withTime = false) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString("ru-RU", withTime ? {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		} : {
			day: "numeric",
			month: "short",
			year: "numeric"
		}) : "Не указано";
		const relatedTasks = computed(() => allTasks.value.filter((task) => task.customerId === preview.value?.id || task.customer?.id === preview.value?.id));
		const nextTask = computed(() => relatedTasks.value.filter((task) => !["DONE", "CANCELLED"].includes(task.status)).sort((a, b) => new Date(a.dueDate || "9999-01-01").getTime() - new Date(b.dueDate || "9999-01-01").getTime())[0]);
		const latestOrder = computed(() => preview.value?.orders?.[0]);
		const canAddNote = computed(() => canCreateTask.value && Boolean(preview.value?.leads?.length));
		const timeline = computed(() => {
			if (!preview.value) return [];
			const row = preview.value;
			return [
				...(row.interactions || []).map((entry) => ({
					id: "interaction-" + entry.id,
					kind: "interaction",
					icon: MessageSquare,
					title: entry.type === "NOTE" ? "Заметка" : entry.type === "CALL" ? "Звонок" : "Взаимодействие",
					body: entry.content,
					createdAt: entry.createdAt
				})),
				...(row.orders || []).map((order) => ({
					id: "order-" + order.id,
					kind: "order",
					icon: ShoppingBag,
					title: "Заказ " + (order.externalOrderId || order.orderNumber),
					body: sourceLabels[order.source] || order.source,
					amount: order.finalAmount,
					status: orderLabels[order.status] || order.status,
					createdAt: order.createdAt,
					to: access.can("oms.read") ? {
						path: "/crm/b2b-orders",
						query: { order: order.id }
					} : null
				})),
				...(row.helpdeskTickets || []).map((ticket) => ({
					id: "ticket-" + ticket.id,
					kind: "ticket",
					icon: Headphones,
					title: ticket.subject,
					body: ticket.number,
					status: ticketLabels[ticket.status] || ticket.status,
					createdAt: ticket.createdAt,
					to: access.can("helpdesk.read") ? {
						path: "/crm/support/tickets",
						query: { ticket: ticket.id }
					} : null
				})),
				...relatedTasks.value.map((task) => ({
					id: "task-" + task.id,
					kind: "task",
					icon: task.status === "DONE" ? CheckCircle2 : Clock3,
					title: task.title,
					body: task.description,
					actor: personName(task.assignedTo),
					status: task.status === "DONE" ? "Выполнено" : task.status === "CANCELLED" ? "Отменено" : "В работе",
					createdAt: task.createdAt,
					to: {
						path: "/crm/tasks",
						query: { task: task.id }
					}
				})),
				...row.createdAt ? [{
					id: "created",
					kind: "created",
					icon: UserPlus,
					title: "Клиент добавлен",
					body: sourceLabels[row.source] || row.source || "Клиентская база",
					createdAt: row.createdAt
				}] : []
			].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
		});
		const historyFilter = ref("all");
		const visibleTimeline = computed(() => timeline.value.filter((entry) => historyFilter.value === "all" || entry.kind === historyFilter.value));
		const composer = ref(null), composerText = ref(""), composerDate = ref(""), composerLead = ref(""), composerError = ref("");
		function closeComposer() {
			if (actionBusy.value) return false;
			if (composerText.value.trim() && !(void 0).confirm("Отменить несохранённый текст?")) return false;
			composer.value = null;
			return true;
		}
		useCatalogDialog(computed(() => Boolean(composer.value)), closeComposer);
		watch(() => user.value?.id, () => {
			preview.value = null;
			recordOpen.value = false;
			allTasks.value = [];
			selected.value = null;
			composer.value = null;
			composerText.value = "";
		});
		onBeforeRouteLeave(() => !composer.value || !actionBusy.value && (!composerText.value.trim() || (void 0).confirm("Покинуть страницу без сохранения текста?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_NuxtLink = NuxtLink;
			const _component_CrmAccountManagerField = CrmAccountManagerField_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "customer-page crm-standard crm-directory crm-customers-page" }, _attrs))}>`);
			if (!unref(recordOpen)) {
				_push(`<!--[--><header class="crm-page-header"><div><h1>Клиенты</h1><p>Контакты, история и следующий шаг в одном месте</p></div><div class="crm-customer-header-actions"><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} aria-label="Обновить">`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					size: 18,
					class: { spin: unref(loading) }
				}, null, _parent));
				_push(`</button>`);
				if (unref(canEdit)) {
					_push(`<button class="crm-button crm-button--primary crm-customer-add"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
					_push(`Добавить клиента</button>`);
				} else _push(`<!---->`);
				_push(`</div></header><nav class="crm-customer-views crm-tabs crm-tabs--segmented" aria-label="Представления клиентов"><button class="crm-tab"${ssrRenderAttr("aria-pressed", !unref(assignment))}>Все клиенты <span>${ssrInterpolate(unref(customers).length)}</span></button><button class="crm-tab"${ssrRenderAttr("aria-pressed", unref(assignment) === "mine")}>Мои клиенты</button><button class="crm-tab"${ssrRenderAttr("aria-pressed", unref(assignment) === "unassigned")}>Без ответственного</button></nav>`);
				if (unref(error) && !unref(selected)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))} <button class="crm-button">Повторить</button></p>`);
				else _push(`<!---->`);
				if (!unref(dashboard) && unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем клиентов" }, null, _parent));
				else if (unref(dashboard)) {
					_push(`<div class="crm-customer-workspace"><section class="crm-customer-register" aria-label="Список клиентов"${ssrRenderAttr("aria-busy", unref(loading))}><div class="crm-customer-tools"><label class="crm-customer-search crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
					_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" aria-label="Поиск клиентов" placeholder="Имя, телефон, email или компания">`);
					if (unref(search)) {
						_push(`<button class="crm-customer-plain crm-button crm-button--text" aria-label="Очистить поиск">`);
						_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</label><button class="crm-button crm-customer-filter-button" aria-label="Фильтры и сортировка"${ssrRenderAttr("aria-expanded", unref(filtersExpanded))} aria-controls="customer-filters">`);
					_push(ssrRenderComponent(unref(SlidersHorizontal), { size: 18 }, null, _parent));
					_push(`<span>Фильтры</span>`);
					if (unref(extraFilterCount)) _push(`<span class="crm-customer-chip">${ssrInterpolate(unref(extraFilterCount))}</span>`);
					else _push(`<!---->`);
					_push(`</button></div>`);
					if (unref(filtersExpanded)) {
						_push(`<div id="customer-filters" class="crm-customer-filter-bar"><label>Сегмент<select class="crm-input"><!--[-->`);
						ssrRenderList(segmentFilters, (filter) => {
							_push(`<option${ssrRenderAttr("value", filter.value)}${ssrIncludeBooleanAttr(Array.isArray(unref(segment)) ? ssrLooseContain(unref(segment), filter.value) : ssrLooseEqual(unref(segment), filter.value)) ? " selected" : ""}>${ssrInterpolate(filter.label)}</option>`);
						});
						_push(`<!--]--></select></label><label>Статус<select class="crm-input" aria-label="Статус клиента"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "") : ssrLooseEqual(unref(status), "")) ? " selected" : ""}>Все статусы</option><option value="ACTIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ACTIVE") : ssrLooseEqual(unref(status), "ACTIVE")) ? " selected" : ""}>Активные</option><option value="BLOCKED"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "BLOCKED") : ssrLooseEqual(unref(status), "BLOCKED")) ? " selected" : ""}>Заблокированные</option><option value="ARCHIVED"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ARCHIVED") : ssrLooseEqual(unref(status), "ARCHIVED")) ? " selected" : ""}>В архиве</option></select></label><label>Ответственный<select class="crm-input" aria-label="Ответственный менеджер"><!--[-->`);
						ssrRenderList(assignmentFilters, (filter) => {
							_push(`<option${ssrRenderAttr("value", filter.value)}${ssrIncludeBooleanAttr(Array.isArray(unref(assignment)) ? ssrLooseContain(unref(assignment), filter.value) : ssrLooseEqual(unref(assignment), filter.value)) ? " selected" : ""}>${ssrInterpolate(filter.label)}</option>`);
						});
						_push(`<!--]--></select></label><label>Сортировка<select class="crm-input" aria-label="Сортировка клиентов"><option value="updated"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "updated") : ssrLooseEqual(unref(sort), "updated")) ? " selected" : ""}>Последние изменения</option><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По имени: А–Я</option><option value="orders"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "orders") : ssrLooseEqual(unref(sort), "orders")) ? " selected" : ""}>Больше заказов</option></select></label></div>`);
					} else _push(`<!---->`);
					if (unref(hasFilters)) {
						_push(`<div class="crm-customer-filter-summary"><span>Найдено: ${ssrInterpolate(unref(filteredCustomers).length)}</span><button class="crm-customer-plain crm-button crm-button--text">Сбросить фильтры `);
						_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
						_push(`</button></div>`);
					} else _push(`<!---->`);
					if (unref(filteredCustomers).length) {
						_push(`<div class="crm-customer-table"><div class="crm-customer-columns" aria-hidden="true"><span>Клиент</span><span>Сегмент</span><span>Ответственный</span><span>Активность</span><span>Заказы</span></div><!--[-->`);
						ssrRenderList(unref(visibleCustomers), (customer) => {
							_push(`<article class="${ssrRenderClass([{ "is-selected": unref(preview)?.id === customer.id }, "customer-row crm-customer-row"])}"${ssrRenderAttr("aria-label", customerName(customer))} tabindex="0"><div class="crm-customer-person"><span class="crm-customer-avatar" aria-hidden="true">${ssrInterpolate(initials(customer))}</span><div><button class="crm-customer-name crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Открыть клиента: ${customerName(customer)}`)}>${ssrInterpolate(customerName(customer))}</button>`);
							if (customer.email) _push(`<a class="crm-customer-subline"${ssrRenderAttr("href", `mailto:${customer.email}`)}>${ssrInterpolate(customer.email)}</a>`);
							else if (customer.phone) _push(`<a class="crm-customer-subline"${ssrRenderAttr("href", phoneHref(customer.phone))}>${ssrInterpolate(customer.phone)}</a>`);
							else _push(`<span class="crm-customer-subline">Контакты не указаны</span>`);
							_push(`</div></div><span class="crm-customer-segment"><span class="crm-customer-badge">${ssrInterpolate(segmentName(customer.segment))}</span>`);
							if (customer.status !== "ACTIVE") _push(`<span class="crm-customer-subline">${ssrInterpolate(statusLabels[customer.status])}</span>`);
							else _push(`<!---->`);
							_push(`</span><span class="crm-customer-owner">${ssrInterpolate(managerName(customer))}</span><span class="crm-customer-date">${ssrInterpolate(dateLabel(customer.updatedAt || customer.createdAt))}</span><button class="crm-customer-order-count crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Заказы клиента ${customerName(customer)}: ${customer._count?.orders || 0}`)}>`);
							_push(ssrRenderComponent(unref(ShoppingBag), { size: 15 }, null, _parent));
							_push(`${ssrInterpolate(customer._count?.orders || 0)}</button></article>`);
						});
						_push(`<!--]--></div>`);
					} else if (!unref(loading)) {
						_push(`<div class="crm-directory-empty">`);
						if (unref(hasFilters)) _push(ssrRenderComponent(unref(Search), { size: 28 }, null, _parent));
						else _push(ssrRenderComponent(unref(Users), { size: 28 }, null, _parent));
						_push(`<strong>${ssrInterpolate(unref(hasFilters) ? "Клиенты не найдены" : "Добавьте первого клиента")}</strong><p>${ssrInterpolate(unref(hasFilters) ? "Измените запрос или сбросьте фильтры." : "Сохраните контакт и назначьте ответственного, чтобы начать работу.")}</p>`);
						if (unref(hasFilters)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
						else if (unref(canEdit)) _push(`<button class="crm-button crm-button--primary">Добавить клиента</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					if (unref(filteredCustomers).length) {
						_push(`<footer class="crm-customer-footer"><span>Показано ${ssrInterpolate((unref(page) - 1) * pageSize + 1)}–${ssrInterpolate(Math.min(unref(page) * pageSize, unref(filteredCustomers).length))} из ${ssrInterpolate(unref(filteredCustomers).length)}</span>`);
						if (unref(pageCount) > 1) {
							_push(`<nav class="crm-customer-pagination" aria-label="Страницы клиентов"><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(page) === 1 || unref(loading)) ? " disabled" : ""} aria-label="Предыдущая страница">`);
							_push(ssrRenderComponent(unref(ChevronLeft), { size: 16 }, null, _parent));
							_push(`</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pageCount))}</span><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(page) === unref(pageCount) || unref(loading)) ? " disabled" : ""} aria-label="Следующая страница">`);
							_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
							_push(`</button></nav>`);
						} else _push(`<span>${ssrInterpolate(unref(dashboard).newCustomers || 0)} новых за 30 дней</span>`);
						_push(`</footer>`);
					} else _push(`<!---->`);
					_push(`</section><aside class="crm-customer-preview" aria-label="Предпросмотр клиента"><div class="crm-customer-preview-top"><span>Предпросмотр клиента</span>`);
					if (unref(preview)) {
						_push(`<button class="crm-button crm-button--icon" aria-label="Закрыть предпросмотр">`);
						_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
					if (unref(preview)) {
						_push(`<!--[--><div class="crm-customer-preview-identity"><span class="crm-customer-avatar crm-customer-avatar--large">${ssrInterpolate(initials(unref(preview)))}</span><div><h2>${ssrInterpolate(customerName(unref(preview)))}</h2><div class="crm-customer-badges"><span class="crm-customer-badge">${ssrInterpolate(segmentName(unref(preview).segment))}</span><span class="crm-customer-badge"${ssrRenderAttr("data-status", unref(preview).status)}>${ssrInterpolate(statusLabels[unref(preview).status])}</span></div></div></div>`);
						if (unref(previewLoading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем карточку" }, null, _parent));
						else if (unref(previewError)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(previewError))}<button class="crm-button">Повторить</button></p>`);
						else {
							_push(`<!--[--><div class="crm-customer-preview-contacts">`);
							if (unref(preview).phone) {
								_push(`<a${ssrRenderAttr("href", phoneHref(unref(preview).phone))}>`);
								_push(ssrRenderComponent(unref(Phone), { size: 18 }, null, _parent));
								_push(`${ssrInterpolate(unref(preview).phone)}</a>`);
							} else _push(`<!---->`);
							if (unref(preview).email) {
								_push(`<a${ssrRenderAttr("href", `mailto:${unref(preview).email}`)}>`);
								_push(ssrRenderComponent(unref(Mail), { size: 18 }, null, _parent));
								_push(`${ssrInterpolate(unref(preview).email)}</a>`);
							} else _push(`<!---->`);
							if (!unref(preview).phone && !unref(preview).email) _push(`<span class="crm-muted">Контакты не указаны</span>`);
							else _push(`<!---->`);
							_push(`</div><div class="crm-customer-preview-owner"><span class="crm-customer-avatar crm-customer-avatar--small">`);
							_push(ssrRenderComponent(unref(UserRound), { size: 15 }, null, _parent));
							_push(`</span><div><small>Ответственный</small><strong>${ssrInterpolate(managerName(unref(preview)))}</strong></div></div>`);
							if (unref(nextTask)) {
								_push(`<section class="crm-customer-next"><span class="crm-customer-next-label">`);
								_push(ssrRenderComponent(unref(Clock3), { size: 16 }, null, _parent));
								_push(`${ssrInterpolate(unref(nextTask).dueDate ? dateLabel(unref(nextTask).dueDate, true) : "Следующий шаг")}</span><h3>${ssrInterpolate(unref(nextTask).title)}</h3><p>${ssrInterpolate(personName(unref(nextTask).assignedTo))}</p>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									class: "crm-button",
									to: {
										path: "/crm/tasks",
										query: { task: unref(nextTask).id }
									}
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`Открыть задачу`);
										else return [createTextVNode("Открыть задачу")];
									}),
									_: 1
								}, _parent));
								_push(`</section>`);
							} else if (unref(canReadTasks)) {
								_push(`<section class="crm-customer-next"><h3>Следующий шаг</h3><p>${ssrInterpolate(unref(tasksLoading) ? "Загружаем задачи…" : unref(tasksError) || "Открытых задач пока нет")}</p>`);
								if (unref(tasksError)) _push(`<button class="crm-button">Повторить</button>`);
								else if (unref(canCreateTask) && !unref(tasksLoading)) {
									_push(`<button class="crm-button">`);
									_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
									_push(`Создать задачу</button>`);
								} else _push(`<!---->`);
								_push(`</section>`);
							} else _push(`<!---->`);
							_push(`<section class="crm-customer-preview-order"><h3>Последний заказ</h3>`);
							if (unref(latestOrder)) _push(`<!--[--><div class="crm-customer-between"><strong>${ssrInterpolate(unref(latestOrder).externalOrderId || unref(latestOrder).orderNumber)}</strong><strong class="crm-customer-money">${ssrInterpolate(money(unref(latestOrder).finalAmount))}</strong></div><span class="crm-customer-badge">${ssrInterpolate(orderLabels[unref(latestOrder).status] || unref(latestOrder).status)}</span><p class="crm-muted">${ssrInterpolate(dateLabel(unref(latestOrder).createdAt))} · ${ssrInterpolate(sourceLabels[unref(latestOrder).source] || unref(latestOrder).source)}</p><!--]-->`);
							else _push(`<p class="crm-muted">${ssrInterpolate(unref(preview).relatedAccess?.orders === false ? "Нет доступа к истории заказов" : "Нет доступных заказов")}</p>`);
							_push(`</section><button class="crm-button crm-button--primary crm-customer-open">Открыть карточку клиента`);
							_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
							_push(`</button><!--]-->`);
						}
						_push(`<!--]-->`);
					} else {
						_push(`<div class="crm-customer-preview-empty">`);
						_push(ssrRenderComponent(unref(Users), { size: 28 }, null, _parent));
						_push(`<p>Выберите клиента, чтобы увидеть контакты и следующий шаг.</p></div>`);
					}
					_push(`</aside></div>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else if (unref(preview)) {
				_push(`<!--[--><header class="crm-page-header crm-customer-profile-header"><div class="crm-customer-profile-identity"><button class="crm-button crm-button--icon" aria-label="Вернуться к клиентам">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 20 }, null, _parent));
				_push(`</button><span class="crm-customer-avatar crm-customer-avatar--large">${ssrInterpolate(initials(unref(preview)))}</span><div><h1>${ssrInterpolate(customerName(unref(preview)))}</h1><div class="crm-customer-badges"><span class="crm-customer-badge">${ssrInterpolate(segmentName(unref(preview).segment))}</span><span class="crm-customer-badge"${ssrRenderAttr("data-status", unref(preview).status)}>${ssrInterpolate(statusLabels[unref(preview).status])}</span><span class="crm-muted">Клиент с ${ssrInterpolate(dateLabel(unref(preview).createdAt))}</span></div></div></div><div class="crm-customer-header-actions">`);
				if (unref(compactScreen) && unref(preview).phone) {
					_push(`<a class="crm-button crm-button--icon"${ssrRenderAttr("href", phoneHref(unref(preview).phone))} aria-label="Позвонить клиенту">`);
					_push(ssrRenderComponent(unref(Phone), { size: 19 }, null, _parent));
					_push(`</a>`);
				} else _push(`<!---->`);
				if (unref(canAddNote)) {
					_push(`<button class="crm-button">`);
					_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
					_push(`Заметка</button>`);
				} else _push(`<!---->`);
				if (unref(canCreateTask) && !unref(compactScreen)) _push(`<button class="crm-button crm-button--primary">Создать задачу</button>`);
				else _push(`<!---->`);
				_push(`<button class="crm-button crm-button--icon"${ssrRenderAttr("aria-label", canWriteRecord(unref(preview)) ? "Редактировать клиента" : "Посмотреть реквизиты клиента")}>`);
				_push(ssrRenderComponent(unref(Pencil), { size: 18 }, null, _parent));
				_push(`</button><button class="crm-button crm-button--icon" aria-label="Действия с клиентом">`);
				_push(ssrRenderComponent(unref(MoreHorizontal), { size: 18 }, null, _parent));
				_push(`</button></div></header><nav class="crm-customer-record-tabs crm-tabs crm-tabs--segmented" role="tablist" aria-label="Разделы карточки клиента"><!--[-->`);
				ssrRenderList(unref(recordTabs), (tab) => {
					_push(`<button class="crm-tab"${ssrRenderAttr("id", `customer-record-tab-${tab.value}`)} role="tab"${ssrRenderAttr("aria-selected", unref(recordTab) === tab.value)}${ssrRenderAttr("aria-controls", `customer-record-${tab.value}`)}${ssrRenderAttr("tabindex", unref(recordTab) === tab.value ? 0 : -1)}>${ssrInterpolate(tab.label)}`);
					if (tab.count !== void 0) _push(`<span>${ssrInterpolate(tab.count)}</span>`);
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></nav>`);
				if (unref(previewLoading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем карточку клиента" }, null, _parent));
				else if (unref(previewError)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(previewError))}<button class="crm-button">Повторить</button></p>`);
				else {
					_push(`<div class="crm-customer-record-layout"><aside class="crm-customer-facts"><details${ssrIncludeBooleanAttr(!unref(compactScreen)) ? " open" : ""}><summary><h2>О клиенте</h2>`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
					_push(`</summary><dl><div><dt>Телефон</dt><dd>`);
					if (unref(preview).phone) _push(`<a${ssrRenderAttr("href", phoneHref(unref(preview).phone))}>${ssrInterpolate(unref(preview).phone)}</a>`);
					else _push(`<span>Не указан</span>`);
					_push(`</dd></div><div><dt>Email</dt><dd>`);
					if (unref(preview).email) _push(`<a${ssrRenderAttr("href", `mailto:${unref(preview).email}`)}>${ssrInterpolate(unref(preview).email)}</a>`);
					else _push(`<span>Не указан</span>`);
					_push(`</dd></div><div><dt>Ответственный</dt><dd>${ssrInterpolate(managerName(unref(preview)))}</dd></div><div><dt>Источник</dt><dd>${ssrInterpolate(sourceLabels[unref(preview).source] || unref(preview).source || "Не указан")}</dd></div>`);
					if (unref(preview).organizationMemberships?.length) {
						_push(`<div><dt>Организации</dt><!--[-->`);
						ssrRenderList(unref(preview).organizationMemberships, (member) => {
							_push(`<dd>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: {
								path: "/crm/organizations",
								query: { organization: member.organization.id }
							} }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(member.organization.name)}`);
									else return [createTextVNode(toDisplayString(member.organization.name), 1)];
								}),
								_: 2
							}, _parent));
							_push(`<small>${ssrInterpolate(roleLabels[member.role] || member.role)}</small></dd>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					_push(`</dl></details><div class="crm-customer-record-stats"><div><strong>${ssrInterpolate(unref(preview)._count?.orders || 0)}</strong><span>Заказов</span></div><div><strong>${ssrInterpolate(unref(preview)._count?.helpdeskTickets || 0)}</strong><span>Обращений</span></div></div></aside><div class="crm-customer-record-main">`);
					if (unref(recordTab) === "overview" || unref(recordTab) === "history") {
						_push(`<section${ssrRenderAttr("id", `customer-record-${unref(recordTab)}`)} role="tabpanel"${ssrRenderAttr("aria-labelledby", `customer-record-tab-${unref(recordTab)}`)}>`);
						if (unref(recordTab) === "overview" && unref(canReadTasks)) {
							_push(`<section class="crm-customer-next"><div class="crm-customer-between"><span class="crm-customer-next-label">`);
							_push(ssrRenderComponent(unref(Clock3), { size: 17 }, null, _parent));
							_push(`Следующий шаг</span>`);
							if (unref(nextTask)?.dueDate) _push(`<span class="crm-customer-badge">${ssrInterpolate(dateLabel(unref(nextTask).dueDate, true))}</span>`);
							else _push(`<!---->`);
							_push(`</div>`);
							if (unref(nextTask)) {
								_push(`<!--[--><h2>${ssrInterpolate(unref(nextTask).title)}</h2><div class="crm-customer-between"><span>${ssrInterpolate(personName(unref(nextTask).assignedTo))}</span>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									class: "crm-button",
									to: {
										path: "/crm/tasks",
										query: { task: unref(nextTask).id }
									}
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`Открыть задачу`);
										else return [createTextVNode("Открыть задачу")];
									}),
									_: 1
								}, _parent));
								_push(`</div><!--]-->`);
							} else {
								_push(`<!--[--><h2>${ssrInterpolate(unref(tasksLoading) ? "Загружаем задачи…" : unref(tasksError) || "Запланируйте следующий шаг")}</h2>`);
								if (!unref(tasksLoading) && !unref(tasksError)) _push(`<p>Создайте задачу, чтобы вовремя вернуться к клиенту.</p>`);
								else _push(`<!---->`);
								if (unref(tasksError)) _push(`<button class="crm-button">Повторить</button>`);
								else if (unref(canCreateTask) && !unref(tasksLoading)) {
									_push(`<button class="crm-button">`);
									_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
									_push(`Создать задачу</button>`);
								} else _push(`<!---->`);
								_push(`<!--]-->`);
							}
							_push(`</section>`);
						} else _push(`<!---->`);
						_push(`<header class="crm-customer-history-heading"><h2>История работы</h2><select class="crm-input" aria-label="Тип событий"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(unref(historyFilter)) ? ssrLooseContain(unref(historyFilter), "all") : ssrLooseEqual(unref(historyFilter), "all")) ? " selected" : ""}>Все события</option><option value="interaction"${ssrIncludeBooleanAttr(Array.isArray(unref(historyFilter)) ? ssrLooseContain(unref(historyFilter), "interaction") : ssrLooseEqual(unref(historyFilter), "interaction")) ? " selected" : ""}>Взаимодействия</option><option value="order"${ssrIncludeBooleanAttr(Array.isArray(unref(historyFilter)) ? ssrLooseContain(unref(historyFilter), "order") : ssrLooseEqual(unref(historyFilter), "order")) ? " selected" : ""}>Заказы</option><option value="task"${ssrIncludeBooleanAttr(Array.isArray(unref(historyFilter)) ? ssrLooseContain(unref(historyFilter), "task") : ssrLooseEqual(unref(historyFilter), "task")) ? " selected" : ""}>Задачи</option><option value="ticket"${ssrIncludeBooleanAttr(Array.isArray(unref(historyFilter)) ? ssrLooseContain(unref(historyFilter), "ticket") : ssrLooseEqual(unref(historyFilter), "ticket")) ? " selected" : ""}>Обращения</option></select></header>`);
						if (!unref(visibleTimeline).length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(MessageSquare), { size: 28 }, null, _parent));
							_push(`<p>Событий этого типа пока нет</p></div>`);
						} else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(visibleTimeline), (entry) => {
							_push(`<article class="crm-customer-event"><span class="crm-customer-event-icon">`);
							ssrRenderVNode(_push, createVNode(resolveDynamicComponent(entry.icon), { size: 18 }, null), _parent);
							_push(`</span><div><div class="crm-customer-event-meta"><span>${ssrInterpolate(entry.actor || dateLabel(entry.createdAt))}</span><time>${ssrInterpolate(dateLabel(entry.createdAt, true))}</time></div><h3>`);
							if (entry.to) _push(ssrRenderComponent(_component_NuxtLink, { to: entry.to }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`${ssrInterpolate(entry.title)}`);
										_push(ssrRenderComponent(unref(ArrowUpRight), { size: 14 }, null, _parent, _scopeId));
									} else return [createTextVNode(toDisplayString(entry.title), 1), createVNode(unref(ArrowUpRight), { size: 14 })];
								}),
								_: 2
							}, _parent));
							else _push(`<span>${ssrInterpolate(entry.title)}</span>`);
							_push(`</h3>`);
							if (entry.body) _push(`<p>${ssrInterpolate(entry.body)}</p>`);
							else _push(`<!---->`);
							if (entry.amount !== void 0) _push(`<strong class="crm-customer-money">${ssrInterpolate(money(entry.amount))}</strong>`);
							else _push(`<!---->`);
							if (entry.status) _push(`<span class="crm-customer-badge">${ssrInterpolate(entry.status)}</span>`);
							else _push(`<!---->`);
							_push(`</div></article>`);
						});
						_push(`<!--]--></section>`);
					} else if (unref(recordTab) === "orders") {
						_push(`<section id="customer-record-orders" role="tabpanel" aria-labelledby="customer-record-tab-orders"><h2>Заказы клиента</h2><!--[-->`);
						ssrRenderList(unref(preview).orders, (order) => {
							_push(`<article class="crm-customer-history-row"><div>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: {
								path: "/crm/b2b-orders",
								query: { order: order.id }
							} }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<strong${_scopeId}>${ssrInterpolate(order.externalOrderId || order.orderNumber)}</strong>`);
										_push(ssrRenderComponent(unref(ArrowUpRight), { size: 15 }, null, _parent, _scopeId));
									} else return [createVNode("strong", null, toDisplayString(order.externalOrderId || order.orderNumber), 1), createVNode(unref(ArrowUpRight), { size: 15 })];
								}),
								_: 2
							}, _parent));
							_push(`<small>${ssrInterpolate(sourceLabels[order.source] || order.source)} · ${ssrInterpolate(dateLabel(order.createdAt))}</small></div><div><strong class="crm-customer-money">${ssrInterpolate(money(order.finalAmount))}</strong><span class="crm-customer-badge">${ssrInterpolate(orderLabels[order.status] || order.status)}</span></div></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(preview).orders?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(ShoppingBag), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(preview).relatedAccess?.orders === false ? "Нет доступа к истории заказов" : "Нет доступных заказов")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else if (unref(recordTab) === "tasks") {
						_push(`<section id="customer-record-tasks" role="tabpanel" aria-labelledby="customer-record-tab-tasks"><header class="crm-customer-history-heading"><h2>Задачи по клиенту</h2>`);
						if (unref(canCreateTask)) {
							_push(`<button class="crm-button">`);
							_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							_push(`Добавить</button>`);
						} else _push(`<!---->`);
						_push(`</header>`);
						if (unref(tasksLoading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем задачи" }, null, _parent));
						else if (unref(tasksError)) _push(`<p class="operation-error">${ssrInterpolate(unref(tasksError))}<button class="crm-button">Повторить</button></p>`);
						else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(relatedTasks), (task) => {
							_push(`<article class="crm-customer-history-row"><div>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: {
								path: "/crm/tasks",
								query: { task: task.id }
							} }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<strong${_scopeId}>${ssrInterpolate(task.title)}</strong>`);
										_push(ssrRenderComponent(unref(ArrowUpRight), { size: 15 }, null, _parent, _scopeId));
									} else return [createVNode("strong", null, toDisplayString(task.title), 1), createVNode(unref(ArrowUpRight), { size: 15 })];
								}),
								_: 2
							}, _parent));
							_push(`<small>${ssrInterpolate(personName(task.assignedTo))} · ${ssrInterpolate(task.dueDate ? dateLabel(task.dueDate, true) : "Срок не указан")}</small></div><span class="crm-customer-badge">${ssrInterpolate(task.status === "DONE" ? "Выполнено" : task.status === "CANCELLED" ? "Отменено" : "В работе")}</span></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(tasksLoading) && !unref(relatedTasks).length && !unref(tasksError)) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(Clock3), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(canReadTasks) ? "Связанных задач пока нет" : "Нет доступа к задачам")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else {
						_push(`<section id="customer-record-support" role="tabpanel" aria-labelledby="customer-record-tab-support"><h2>Обращения клиента</h2><!--[-->`);
						ssrRenderList(unref(preview).helpdeskTickets, (ticket) => {
							_push(`<article class="crm-customer-history-row"><div>`);
							_push(ssrRenderComponent(_component_NuxtLink, { to: {
								path: "/crm/support/tickets",
								query: { ticket: ticket.id }
							} }, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<strong${_scopeId}>${ssrInterpolate(ticket.subject)}</strong>`);
										_push(ssrRenderComponent(unref(ArrowUpRight), { size: 15 }, null, _parent, _scopeId));
									} else return [createVNode("strong", null, toDisplayString(ticket.subject), 1), createVNode(unref(ArrowUpRight), { size: 15 })];
								}),
								_: 2
							}, _parent));
							_push(`<small>${ssrInterpolate(ticket.number)} · ${ssrInterpolate(dateLabel(ticket.createdAt))}</small></div><span class="crm-customer-badge">${ssrInterpolate(ticketLabels[ticket.status] || ticket.status)}</span></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(preview).helpdeskTickets?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(Headphones), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(preview).relatedAccess?.helpdesk === false ? "Нет доступа к истории обращений" : "Нет доступных обращений")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					}
					_push(`</div><aside class="crm-customer-related"><section><header><h2>Заказы</h2><button class="crm-customer-plain crm-button crm-button--text">Все`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent));
					_push(`</button></header>`);
					if (unref(latestOrder)) _push(`<!--[--><strong>${ssrInterpolate(unref(latestOrder).externalOrderId || unref(latestOrder).orderNumber)}</strong><b class="crm-customer-related-amount">${ssrInterpolate(money(unref(latestOrder).finalAmount))}</b><span class="crm-customer-badge">${ssrInterpolate(orderLabels[unref(latestOrder).status] || unref(latestOrder).status)}</span><p>${ssrInterpolate(dateLabel(unref(latestOrder).createdAt))}</p><!--]-->`);
					else _push(`<p>${ssrInterpolate(unref(preview).relatedAccess?.orders === false ? "История заказов недоступна" : "Заказов пока нет")}</p>`);
					_push(`</section>`);
					if (unref(canReadTasks)) {
						_push(`<section><header><h2>Задачи</h2><button class="crm-customer-plain crm-button crm-button--text">Все`);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent));
						_push(`</button></header><!--[-->`);
						ssrRenderList(unref(relatedTasks).slice(0, 3), (task) => {
							_push(ssrRenderComponent(_component_NuxtLink, {
								key: task.id,
								to: {
									path: "/crm/tasks",
									query: { task: task.id }
								},
								class: "crm-customer-related-task"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (task.status === "DONE") _push(ssrRenderComponent(unref(CheckCircle2), { size: 16 }, null, _parent, _scopeId));
										else _push(ssrRenderComponent(unref(Clock3), { size: 16 }, null, _parent, _scopeId));
										_push(`<span${_scopeId}>${ssrInterpolate(task.title)}<small${_scopeId}>${ssrInterpolate(dateLabel(task.dueDate, true))}</small></span>`);
									} else return [task.status === "DONE" ? (openBlock(), createBlock(unref(CheckCircle2), {
										key: 0,
										size: 16
									})) : (openBlock(), createBlock(unref(Clock3), {
										key: 1,
										size: 16
									})), createVNode("span", null, [createTextVNode(toDisplayString(task.title), 1), createVNode("small", null, toDisplayString(dateLabel(task.dueDate, true)), 1)])];
								}),
								_: 2
							}, _parent));
						});
						_push(`<!--]-->`);
						if (!unref(relatedTasks).length) _push(`<p>${ssrInterpolate(unref(tasksLoading) ? "Загрузка…" : unref(tasksError) || "Нет открытых задач")}</p>`);
						else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`<section><h2>Ответственный</h2><p>${ssrInterpolate(managerName(unref(preview)))}</p>`);
					if (canWriteRecord(unref(preview))) _push(`<button class="crm-button">Изменить</button>`);
					else _push(`<!---->`);
					_push(`</section></aside></div>`);
				}
				_push(`<div class="crm-customer-mobile-actions">`);
				if (unref(preview).phone) {
					_push(`<a class="crm-button crm-button--icon"${ssrRenderAttr("href", phoneHref(unref(preview).phone))} aria-label="Позвонить клиенту">`);
					_push(ssrRenderComponent(unref(Phone), { size: 19 }, null, _parent));
					_push(`</a>`);
				} else _push(`<!---->`);
				if (unref(canCreateTask)) _push(`<button class="crm-button crm-button--primary">Создать задачу</button>`);
				else _push(`<!---->`);
				_push(`</div><!--]-->`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<div class="crm-detail-backdrop admin-dialog-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card crm-customer-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-card-title" tabindex="-1"><header><div><p class="eyebrow">${ssrInterpolate(unref(creating) ? "Клиентская база" : "Карточка клиента")}</p><h2 id="customer-card-title">${ssrInterpolate(unref(creating) ? "Новый клиент" : customerName(unref(selected)))}</h2>`);
					if (!unref(creating)) {
						_push(`<div class="crm-directory-badges"><span class="crm-directory-status"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statusLabels[unref(selected).status])}</span>`);
						if (unref(selected).segment) _push(`<span class="crm-directory-segment">${ssrInterpolate(unref(selected).segment)}</span>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`</div><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} aria-label="Закрыть карточку">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header>`);
					if (!unref(creating)) {
						_push(`<nav class="crm-customer-card-tabs crm-tabs crm-tabs--segmented" role="tablist" aria-label="Разделы карточки клиента"><!--[-->`);
						ssrRenderList(customerTabs, (tab) => {
							_push(`<button class="crm-tab"${ssrRenderAttr("id", `customer-tab-${tab.value}`)} role="tab"${ssrRenderAttr("aria-selected", unref(customerTab) === tab.value)}${ssrRenderAttr("tabindex", unref(customerTab) === tab.value ? 0 : -1)}${ssrRenderAttr("aria-controls", `customer-panel-${tab.value}`)}>${ssrInterpolate(tab.label)}`);
							if (tab.value === "orders") _push(`<span>${ssrInterpolate(unref(selected)._count?.orders || 0)}</span>`);
							else _push(`<!---->`);
							if (tab.value === "support") _push(`<span>${ssrInterpolate(unref(selected)._count?.helpdeskTickets || 0)}</span>`);
							else _push(`<!---->`);
							_push(`</button>`);
						});
						_push(`<!--]--></nav>`);
					} else _push(`<!---->`);
					_push(`<form id="customer-editor-form" class="crm-detail-body">`);
					if (unref(error)) {
						_push(`<div class="crm-customer-form-error" role="alert"><p>${ssrInterpolate(unref(error))}</p>`);
						if (unref(duplicateId)) _push(`<button type="button" class="crm-button">Открыть существующего клиента</button>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`<section id="customer-panel-profile" class="crm-order-tab-panel"${ssrRenderAttr("role", unref(creating) ? void 0 : "tabpanel")}${ssrRenderAttr("aria-labelledby", unref(creating) ? void 0 : "customer-tab-profile")}${ssrRenderDynamicAttr("hidden", unref(customerTab) !== "profile")}>`);
					if (!unref(creating) && (unref(selected).email || unref(selected).phone)) {
						_push(`<div class="crm-customer-card-contacts">`);
						if (unref(selected).phone) {
							_push(`<a${ssrRenderAttr("href", phoneHref(unref(selected).phone))}>`);
							_push(ssrRenderComponent(unref(Phone), { size: 17 }, null, _parent));
							_push(`${ssrInterpolate(unref(selected).phone)}</a>`);
						} else _push(`<!---->`);
						if (unref(selected).email) {
							_push(`<a${ssrRenderAttr("href", `mailto:${unref(selected).email}`)}>`);
							_push(ssrRenderComponent(unref(Mail), { size: 17 }, null, _parent));
							_push(`${ssrInterpolate(unref(selected).email)}</a>`);
						} else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					if (unref(creating)) _push(`<div class="crm-customer-form-intro"><h3>Контактные данные</h3><p>Укажите имя и хотя бы один способ связи: телефон или email.</p></div>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-customer-fields"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected)) ? " disabled" : ""}><label>Имя<input class="crm-input" name="firstName"${ssrRenderAttr("value", unref(selected).firstName)}${ssrIncludeBooleanAttr(unref(creating)) ? " required" : ""} maxlength="100" autocomplete="given-name" placeholder="Например, Анна"></label><label>Фамилия<input class="crm-input"${ssrRenderAttr("value", unref(selected).lastName)} maxlength="100" autocomplete="family-name" placeholder="Необязательно"></label><label>Телефон<input class="crm-input"${ssrRenderAttr("value", unref(selected).phone)} type="tel" maxlength="40" autocomplete="tel" placeholder="+7 (___) ___-__-__"></label>`);
					if (unref(creating)) _push(`<label>Email<input class="crm-input"${ssrRenderAttr("value", unref(selected).email)} type="email" maxlength="254" autocomplete="email" placeholder="name@company.ru"></label>`);
					else _push(`<!---->`);
					_push(`<label>Тип клиента<select class="crm-input"><option value="B2C"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).segment) ? ssrLooseContain(unref(selected).segment, "B2C") : ssrLooseEqual(unref(selected).segment, "B2C")) ? " selected" : ""}>Розничный · B2C</option><option value="B2B"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).segment) ? ssrLooseContain(unref(selected).segment, "B2B") : ssrLooseEqual(unref(selected).segment, "B2B")) ? " selected" : ""}>Партнёр · B2B</option><option value="Лид"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).segment) ? ssrLooseContain(unref(selected).segment, "Лид") : ssrLooseEqual(unref(selected).segment, "Лид")) ? " selected" : ""}>Лид</option>`);
					if (unref(selected).segment && ![
						"B2C",
						"B2B",
						"Лид"
					].includes(unref(selected).segment)) _push(`<option${ssrRenderAttr("value", unref(selected).segment)}${ssrIncludeBooleanAttr(Array.isArray(unref(selected).segment) ? ssrLooseContain(unref(selected).segment, unref(selected).segment) : ssrLooseEqual(unref(selected).segment, unref(selected).segment)) ? " selected" : ""}>${ssrInterpolate(unref(selected).segment)}</option>`);
					else _push(`<!---->`);
					if (!unref(selected).segment) _push(`<option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(selected).segment) ? ssrLooseContain(unref(selected).segment, "") : ssrLooseEqual(unref(selected).segment, "")) ? " selected" : ""}>Не указан</option>`);
					else _push(`<!---->`);
					_push(`</select></label>`);
					if (!unref(creating)) _push(`<label>Статус<select class="crm-input"><option value="ACTIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "ACTIVE") : ssrLooseEqual(unref(selected).status, "ACTIVE")) ? " selected" : ""}>Активен</option><option value="BLOCKED"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "BLOCKED") : ssrLooseEqual(unref(selected).status, "BLOCKED")) ? " selected" : ""}>Заблокирован</option><option value="ARCHIVED"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "ARCHIVED") : ssrLooseEqual(unref(selected).status, "ARCHIVED")) ? " selected" : ""}>В архиве</option></select></label>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_CrmAccountManagerField, {
						modelValue: unref(selected).accountManagerId,
						"onUpdate:modelValue": ($event) => unref(selected).accountManagerId = $event,
						people: unref(managers),
						current: unref(selected).accountManager
					}, null, _parent));
					_push(`</fieldset>`);
					if (unref(creating)) _push(`<p class="crm-customer-form-note">Клиент появится в общей базе. Доступ в личный кабинет оформляется отдельно.</p>`);
					else _push(`<!---->`);
					if (unref(selected).organizationMemberships?.length) {
						_push(`<section class="crm-customer-card-section"><h3>`);
						_push(ssrRenderComponent(unref(Building2), { size: 18 }, null, _parent));
						_push(` Организации</h3><!--[-->`);
						ssrRenderList(unref(selected).organizationMemberships, (member) => {
							_push(`<article><strong>${ssrInterpolate(member.organization.name)}</strong><span>${ssrInterpolate(roleLabels[member.role] || member.role)}</span><small>${ssrInterpolate(member.organization.inn ? `ИНН ${member.organization.inn}` : "ИНН не указан")}</small></article>`);
						});
						_push(`<!--]--></section>`);
					} else _push(`<!---->`);
					_push(`</section>`);
					if (!unref(creating)) {
						_push(`<section id="customer-panel-orders" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="customer-tab-orders"${ssrRenderDynamicAttr("hidden", unref(customerTab) !== "orders")}><p class="crm-muted">Последние доступные заказы клиента</p><!--[-->`);
						ssrRenderList(unref(selected).orders, (order) => {
							_push(`<article class="crm-customer-history-row"><div><strong>${ssrInterpolate(order.externalOrderId || order.orderNumber)}</strong><small>${ssrInterpolate(sourceLabels[order.source] || order.source)} · ${ssrInterpolate(new Date(order.createdAt).toLocaleDateString("ru-RU"))}</small></div><div><b>${ssrInterpolate(Number(order.finalAmount).toLocaleString("ru-RU"))} ₽</b><span>${ssrInterpolate(orderLabels[order.status] || order.status)}</span></div></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected).orders?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(ShoppingBag), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(selected).relatedAccess?.orders === false ? "Нет доступа к истории заказов" : "Нет доступных заказов")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					if (!unref(creating)) {
						_push(`<section id="customer-panel-support" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="customer-tab-support"${ssrRenderDynamicAttr("hidden", unref(customerTab) !== "support")}><p class="crm-muted">Последние обращения клиента в поддержку</p><!--[-->`);
						ssrRenderList(unref(selected).helpdeskTickets, (ticket) => {
							_push(`<article class="crm-customer-history-row"><div><strong>${ssrInterpolate(ticket.number)}</strong><span>${ssrInterpolate(ticket.subject)}</span></div><span>${ssrInterpolate(ticketLabels[ticket.status] || ticket.status)}</span></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected).helpdeskTickets?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(Headphones), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(selected).relatedAccess?.helpdesk === false ? "Нет доступа к истории обращений" : "Нет доступных обращений")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`</form><footer class="crm-detail-footer">`);
					if (unref(creating)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Отмена</button>`);
					else _push(`<span>${ssrInterpolate(!unref(canEditSelected) ? "Доступен только просмотр" : unref(draftDirty) ? "Есть несохранённые изменения" : "Изменения сохранены")}</span>`);
					_push(`<button class="crm-button crm-button--primary" type="submit" form="customer-editor-form"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected) || !unref(creating) && !unref(draftDirty)) ? " disabled" : ""}>${ssrInterpolate(unref(actionBusy) ? "Сохраняем…" : unref(creating) ? "Создать клиента" : "Сохранить карточку")}</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(composer)) {
					_push(`<div class="crm-detail-backdrop admin-dialog-backdrop"><section class="admin-dialog crm-customer-composer" role="dialog" aria-modal="true" aria-labelledby="customer-compose-title" tabindex="-1"><header><div><h2 id="customer-compose-title">${ssrInterpolate(unref(composer) === "task" ? "Создать задачу" : "Добавить заметку")}</h2><p>${ssrInterpolate(customerName(unref(preview)))}</p></div><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><form>`);
					if (unref(composerError)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(composerError))}</p>`);
					else _push(`<!---->`);
					if (unref(composer) === "note") {
						_push(`<label>Сделка<select class="crm-input" required${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}><!--[-->`);
						ssrRenderList(unref(preview)?.leads, (lead) => {
							_push(`<option${ssrRenderAttr("value", lead.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(composerLead)) ? ssrLooseContain(unref(composerLead), lead.id) : ssrLooseEqual(unref(composerLead), lead.id)) ? " selected" : ""}>${ssrInterpolate(lead.title || lead.contactName || "Сделка")}</option>`);
						});
						_push(`<!--]--></select><small>Заметка сохранится в сделке и в истории клиента.</small></label>`);
					} else _push(`<!---->`);
					_push(`<label>${ssrInterpolate(unref(composer) === "task" ? "Название задачи" : "Текст заметки")}`);
					if (unref(composer) === "note") _push(`<textarea class="crm-input" required${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} maxlength="10000" rows="5" placeholder="Что важно знать о клиенте?">${ssrInterpolate(unref(composerText))}</textarea>`);
					else _push(`<input${ssrRenderAttr("value", unref(composerText))} class="crm-input" required${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} maxlength="200" placeholder="Что нужно сделать?">`);
					_push(`</label>`);
					if (unref(composer) === "task") _push(`<label>Срок<input${ssrRenderAttr("value", unref(composerDate))} class="crm-input" type="datetime-local"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}><small>Задача будет назначена вам. Ответственного можно изменить в её карточке.</small></label>`);
					else _push(`<!---->`);
					_push(`<footer><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Отмена</button><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(composerText).trim()) ? " disabled" : ""}>${ssrInterpolate(unref(actionBusy) ? "Сохраняем…" : unref(composer) === "task" ? "Создать задачу" : "Добавить заметку")}</button></footer></form></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			if (unref(notice)) _push(`<div class="toast" role="status">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/customers.vue
var _sfc_setup = customers_vue_vue_type_script_setup_true_lang_default.setup;
customers_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/customers.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var customers_default = customers_vue_vue_type_script_setup_true_lang_default;

export { customers_default as default };;globalThis.__timing__.logEnd('Load chunks/build/customers-C5GRkxy7');
//# sourceMappingURL=customers-C5GRkxy7.mjs.map
