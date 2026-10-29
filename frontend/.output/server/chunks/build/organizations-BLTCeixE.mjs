globalThis.__timing__.logStart('Load chunks/build/organizations-BLTCeixE');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess, W as WorkspaceLoading_default, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { u as useWorkspaceOperation } from './useWorkspaceOperation-DZ4fBozi.mjs';
import { u as useWorkspaceEntityDraft, C as CrmAccountManagerField_default } from './useWorkspaceEntityDraft-DQuVCmKr.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderClass, ssrRenderAttr, ssrRenderList, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport, ssrRenderDynamicAttr } from 'vue/server-renderer';
import { RefreshCw, Plus, Search, X, SlidersHorizontal, Building2, UserRound, UserPlus, ShoppingBag, Users, ChevronLeft, ChevronRight } from '@lucide/vue';
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
import './useCatalogDialog-2pnsnnsL.mjs';

// pages/crm/organizations.vue?vue&type=script&setup=true&lang.ts
var pageSize = 25;
var organizations_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "organizations",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Организации — SARKISIAN CRM" });
		const config = useRuntimeConfig();
		const { token, user } = useWorkspaceSession();
		useContextMenu();
		const organizations = ref([]);
		const loading = ref(false);
		const error = ref("");
		const { actionBusy} = useWorkspaceOperation(error);
		const { selected, draftDirty} = useWorkspaceEntityDraft(actionBusy);
		const access = useWorkspaceAccess();
		const canEdit = computed(() => access.can("customers.write"));
		const pageLoaded = ref(false);
		const search = ref("");
		const status = ref("");
		const notice = ref("");
		const managers = ref([]);
		const statusFilters = [
			{
				value: "",
				label: "Все организации"
			},
			{
				value: "ACTIVE",
				label: "Активные"
			},
			{
				value: "PROSPECT",
				label: "Потенциальные"
			},
			{
				value: "ON_HOLD",
				label: "Приостановленные"
			},
			{
				value: "ARCHIVED",
				label: "Архив"
			}
		];
		const assignment = ref("");
		const sort = ref("updated");
		const filtersExpanded = ref(false);
		const creating = computed(() => Boolean(selected.value && !selected.value.id));
		const organizationTab = ref("profile");
		const organizationTabs = computed(() => [
			{
				value: "profile",
				label: "Основное"
			},
			{
				value: "details",
				label: "Реквизиты"
			},
			...!creating.value ? [{
				value: "members",
				label: "Представители"
			}, {
				value: "orders",
				label: "Заказы"
			}] : []
		]);
		const hasFilters = computed(() => Boolean(search.value || status.value || assignment.value));
		const extraFilterCount = computed(() => Number(Boolean(status.value)) + Number(Boolean(assignment.value)) + Number(sort.value !== "updated"));
		const filteredOrganizations = computed(() => organizations.value.filter((item) => !assignment.value || (assignment.value === "mine" ? Boolean(user.value?.id) && item.accountManagerId === user.value.id : !item.accountManagerId)).sort((a, b) => {
			if (sort.value === "name") return a.name.localeCompare(b.name, "ru");
			if (sort.value === "orders") return (b._count?.orders || 0) - (a._count?.orders || 0) || a.name.localeCompare(b.name, "ru");
			return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
		}));
		const page = ref(1);
		const pageCount = computed(() => Math.max(1, Math.ceil(filteredOrganizations.value.length / pageSize)));
		const visibleOrganizations = computed(() => filteredOrganizations.value.slice((page.value - 1) * pageSize, page.value * pageSize));
		const managerName = (item) => [item.accountManager?.firstName, item.accountManager?.lastName].filter(Boolean).join(" ") || item.accountManager?.email || "Не назначен";
		const canWriteRecord = (record) => canEdit.value && record?.canWrite === true;
		const canEditSelected = computed(() => creating.value ? canEdit.value : canWriteRecord(selected.value));
		let searchTimer;
		let loadVersion = 0;
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const statusLabels = {
			PROSPECT: "Потенциальный клиент",
			ACTIVE: "Активна",
			ON_HOLD: "Приостановлена",
			ARCHIVED: "В архиве"
		};
		const memberLabels = {
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
		async function load() {
			const version = ++loadVersion;
			const identity = token.value;
			loading.value = true;
			error.value = "";
			try {
				const rows = await $fetch$1("/customer-360/organizations", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					query: {
						search: search.value || void 0,
						status: status.value || void 0
					}
				});
				if (version !== loadVersion || token.value !== identity) return;
				organizations.value = rows;
				pageLoaded.value = true;
				page.value = Math.min(page.value, pageCount.value);
			} catch (reason) {
				if (version === loadVersion) error.value = typeof reason?.data?.message === "string" ? reason.data.message : "Не удалось загрузить организации. Повторите попытку.";
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		watch([search, status], (next, previous) => {
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
			selected.value?.name,
			selected.value?.inn,
			selected.value?.kpp,
			selected.value?.discountTier,
			selected.value?.creditLimit,
			selected.value?.accountManagerId
		], () => {
			if (!actionBusy.value) error.value = "";
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_CrmAccountManagerField = CrmAccountManagerField_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "org-page crm-standard crm-directory crm-organizations-page crm-operational-page crm-ops-organizations" }, _attrs))}><header class="crm-page-header"><div><h1>Организации `);
			if (unref(pageLoaded)) _push(`<span class="crm-org-count">${ssrInterpolate(unref(filteredOrganizations).length)}</span>`);
			else _push(`<!---->`);
			_push(`</h1><span>Компании, представители и история работы</span></div><div class="crm-org-header-actions"><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} aria-label="Обновить" title="Обновить список">`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				size: 18,
				class: { spin: unref(loading) }
			}, null, _parent));
			_push(`</button>`);
			if (unref(canEdit)) {
				_push(`<button class="crm-button crm-button--primary crm-org-add"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(` Добавить организацию</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(error) && !unref(selected)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))} <button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(loading) && !unref(pageLoaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем организации" }, null, _parent));
			else if (unref(pageLoaded)) {
				_push(`<div class="crm-page-content crm-directory-content"><section class="${ssrRenderClass([{ "is-filters-open": unref(filtersExpanded) }, "crm-surface crm-org-register"])}" aria-label="Список организаций"${ssrRenderAttr("aria-busy", unref(loading))}><nav class="crm-org-statuses" aria-label="Представления организаций"><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", !unref(assignment))}>Все организации</button><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(assignment) === "mine")}>Мои организации</button><button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(assignment) === "unassigned")}>Без ответственного</button></nav><div class="crm-org-tools"><div class="crm-input-group crm-org-search">`);
				_push(ssrRenderComponent(unref(Search), {
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" aria-label="Поиск организаций" placeholder="Название или ИНН…" title="Поиск по названию, юридическому лицу или ИНН">`);
				if (unref(search)) {
					_push(`<button class="crm-directory-clear crm-button crm-button--icon" aria-label="Очистить поиск">`);
					_push(ssrRenderComponent(unref(X), { size: 16 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</div><button class="crm-button crm-button--icon crm-org-filter-toggle"${ssrRenderAttr("aria-expanded", unref(filtersExpanded))}${ssrRenderAttr("aria-label", "Фильтры и сортировка" + (unref(extraFilterCount) ? ": " + unref(extraFilterCount) : ""))} aria-controls="organization-status organization-owner organization-sort">`);
				_push(ssrRenderComponent(unref(SlidersHorizontal), { size: 18 }, null, _parent));
				if (unref(extraFilterCount)) _push(`<span>${ssrInterpolate(unref(extraFilterCount))}</span>`);
				else _push(`<!---->`);
				_push(`</button><select id="organization-status" class="crm-input crm-org-status-select crm-org-extra-filter" aria-label="Статус организации"><!--[-->`);
				ssrRenderList(statusFilters, (filter) => {
					_push(`<option${ssrRenderAttr("value", filter.value)}${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), filter.value) : ssrLooseEqual(unref(status), filter.value)) ? " selected" : ""}>${ssrInterpolate(filter.label)}</option>`);
				});
				_push(`<!--]--></select><select id="organization-owner" class="crm-input crm-org-extra-filter" aria-label="Ответственный менеджер"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(assignment)) ? ssrLooseContain(unref(assignment), "") : ssrLooseEqual(unref(assignment), "")) ? " selected" : ""}>Все ответственные</option><option value="mine"${ssrIncludeBooleanAttr(Array.isArray(unref(assignment)) ? ssrLooseContain(unref(assignment), "mine") : ssrLooseEqual(unref(assignment), "mine")) ? " selected" : ""}>Мои организации</option><option value="unassigned"${ssrIncludeBooleanAttr(Array.isArray(unref(assignment)) ? ssrLooseContain(unref(assignment), "unassigned") : ssrLooseEqual(unref(assignment), "unassigned")) ? " selected" : ""}>Без менеджера</option></select><select id="organization-sort" class="crm-input crm-org-extra-filter" aria-label="Сортировка организаций"><option value="updated"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "updated") : ssrLooseEqual(unref(sort), "updated")) ? " selected" : ""}>Последние изменения</option><option value="name"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "name") : ssrLooseEqual(unref(sort), "name")) ? " selected" : ""}>По названию: А–Я</option><option value="orders"${ssrIncludeBooleanAttr(Array.isArray(unref(sort)) ? ssrLooseContain(unref(sort), "orders") : ssrLooseEqual(unref(sort), "orders")) ? " selected" : ""}>Больше заказов</option></select></div>`);
				if (unref(hasFilters)) {
					_push(`<div class="crm-org-filter-summary"><span role="status">Найдено: ${ssrInterpolate(unref(filteredOrganizations).length)}`);
					if (unref(status)) _push(`<!--[--> · ${ssrInterpolate(statusFilters.find((filter) => filter.value === unref(status))?.label)}<!--]-->`);
					else _push(`<!---->`);
					_push(`</span><button class="crm-button crm-button--text">`);
					_push(ssrRenderComponent(unref(X), { size: 14 }, null, _parent));
					_push(` Сбросить фильтры</button></div>`);
				} else _push(`<!---->`);
				if (unref(filteredOrganizations).length) _push(`<div class="crm-org-columns" aria-hidden="true"><span>Организация</span><span>Реквизиты</span><span>Ответственный</span><span>История</span></div>`);
				else _push(`<!---->`);
				_push(`<div class="crm-org-rows"><!--[-->`);
				ssrRenderList(unref(visibleOrganizations), (item) => {
					_push(`<article class="org-row crm-org-row crm-card-action"${ssrRenderAttr("aria-label", item.name)} role="button" tabindex="0"><div class="crm-org-person"><span class="crm-directory-avatar crm-directory-avatar--organization" aria-hidden="true">`);
					_push(ssrRenderComponent(unref(Building2), { size: 21 }, null, _parent));
					_push(`</span><div class="crm-org-stack"><button class="crm-org-name crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", "Открыть организацию: " + item.name)}><strong>${ssrInterpolate(item.name)}</strong></button>`);
					if (item.legalName) _push(`<small>${ssrInterpolate(item.legalName)}</small>`);
					else _push(`<!---->`);
					_push(`<span class="crm-directory-status"${ssrRenderAttr("data-status", item.status)}>${ssrInterpolate(statusLabels[item.status] || item.status)}</span></div></div><div class="crm-org-stack crm-org-requisites"><span><span class="crm-org-label">ИНН</span> ${ssrInterpolate(item.inn || "не указан")}</span>`);
					if (item.kpp) _push(`<small>КПП ${ssrInterpolate(item.kpp)}</small>`);
					else _push(`<!---->`);
					_push(`</div><div class="crm-org-owner">`);
					if (canWriteRecord(item)) {
						_push(`<button class="crm-org-assign crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
						if (item.accountManager) _push(ssrRenderComponent(unref(UserRound), { size: 16 }, null, _parent));
						else _push(ssrRenderComponent(unref(UserPlus), { size: 16 }, null, _parent));
						_push(`<span>${ssrInterpolate(item.accountManager ? managerName(item) : "Назначить менеджера")}</span></button>`);
					} else {
						_push(`<span class="crm-directory-icon-line">`);
						_push(ssrRenderComponent(unref(UserRound), { size: 16 }, null, _parent));
						_push(`<span>${ssrInterpolate(managerName(item))}</span></span>`);
					}
					_push(`</div><div class="crm-org-history"><button class="crm-org-stat crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ShoppingBag), { size: 15 }, null, _parent));
					_push(`<span>Заказы</span><strong>${ssrInterpolate(item._count?.orders || 0)}</strong></button><button class="crm-org-stat crm-card-action"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Users), { size: 15 }, null, _parent));
					_push(`<span>Представители</span><strong>${ssrInterpolate(item._count?.members || 0)}</strong></button></div></article>`);
				});
				_push(`<!--]--></div>`);
				if (!unref(filteredOrganizations).length && !unref(loading) && !unref(error)) {
					_push(`<div class="crm-directory-empty">`);
					if (unref(hasFilters)) _push(ssrRenderComponent(unref(Search), { size: 28 }, null, _parent));
					else _push(ssrRenderComponent(unref(Building2), { size: 28 }, null, _parent));
					_push(`<strong>${ssrInterpolate(unref(hasFilters) ? "Организации не найдены" : "Добавьте первую организацию")}</strong><p>${ssrInterpolate(unref(hasFilters) ? "Измените поисковый запрос или сбросьте фильтры." : "Реквизиты, представители и заказы компании будут собраны в одной карточке.")}</p>`);
					if (unref(hasFilters)) _push(`<button class="crm-button">Сбросить фильтры</button>`);
					else if (unref(canEdit)) {
						_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(` Добавить организацию</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<footer class="crm-org-footer"><span role="status">`);
				if (unref(loading)) _push(`<!--[-->Обновляем список…<!--]-->`);
				else if (unref(pageCount) > 1) _push(`<!--[-->Показано ${ssrInterpolate((unref(page) - 1) * pageSize + 1)}–${ssrInterpolate(Math.min(unref(page) * pageSize, unref(filteredOrganizations).length))} из ${ssrInterpolate(unref(filteredOrganizations).length)}<!--]-->`);
				else _push(`<!--[-->Показано: ${ssrInterpolate(unref(filteredOrganizations).length)}<!--]-->`);
				_push(`</span>`);
				if (unref(pageCount) > 1) {
					_push(`<nav class="crm-directory-pagination" aria-label="Страницы организаций"><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(page) === 1 || unref(loading)) ? " disabled" : ""} aria-label="Предыдущая страница">`);
					_push(ssrRenderComponent(unref(ChevronLeft), { size: 16 }, null, _parent));
					_push(`</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pageCount))}</span><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(page) === unref(pageCount) || unref(loading)) ? " disabled" : ""} aria-label="Следующая страница">`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent));
					_push(`</button></nav>`);
				} else _push(`<span class="crm-org-list-hint">Нажмите на строку, чтобы открыть карточку</span>`);
				_push(`</footer></section></div>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<div class="crm-detail-backdrop admin-dialog-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card crm-org-dialog" role="dialog" aria-modal="true" aria-labelledby="organization-card-title" tabindex="-1"><header><div><p class="eyebrow">${ssrInterpolate(unref(creating) ? "Клиентская база" : "Карточка организации")}</p><h2 id="organization-card-title">${ssrInterpolate(unref(creating) ? "Новая организация" : unref(selected).name)}</h2>`);
					if (!unref(creating)) _push(`<span class="crm-directory-status"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statusLabels[unref(selected).status])}</span>`);
					else _push(`<!---->`);
					_push(`</div><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} aria-label="Закрыть карточку">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><nav class="crm-org-card-tabs" role="tablist" aria-label="Разделы организации"><!--[-->`);
					ssrRenderList(unref(organizationTabs), (tab) => {
						_push(`<button class="crm-button"${ssrRenderAttr("id", "organization-tab-" + tab.value)} role="tab"${ssrRenderAttr("aria-selected", unref(organizationTab) === tab.value)}${ssrRenderAttr("tabindex", unref(organizationTab) === tab.value ? 0 : -1)}${ssrRenderAttr("aria-controls", "organization-panel-" + tab.value)}>${ssrInterpolate(tab.label)}</button>`);
					});
					_push(`<!--]--></nav><form id="organization-editor-form" class="crm-detail-body">`);
					if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(`<section id="organization-panel-profile" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-profile"${ssrRenderDynamicAttr("hidden", unref(organizationTab) !== "profile")}>`);
					if (unref(creating)) _push(`<p class="crm-org-form-note">Для начала достаточно названия. Реквизиты можно заполнить позже.</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-org-fields"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected)) ? " disabled" : ""}><label class="crm-org-wide crm-field">Название компании<input class="crm-input" name="organizationName"${ssrRenderAttr("value", unref(selected).name)} placeholder="Например, Студия красоты «Форма»" autocomplete="organization"${ssrIncludeBooleanAttr(unref(organizationTab) === "profile") ? " required" : ""} maxlength="180"></label><label class="crm-field">Статус<select class="crm-input"><option value="PROSPECT"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "PROSPECT") : ssrLooseEqual(unref(selected).status, "PROSPECT")) ? " selected" : ""}>Потенциальный клиент</option><option value="ACTIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "ACTIVE") : ssrLooseEqual(unref(selected).status, "ACTIVE")) ? " selected" : ""}>Активна</option><option value="ON_HOLD"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "ON_HOLD") : ssrLooseEqual(unref(selected).status, "ON_HOLD")) ? " selected" : ""}>Приостановлена</option><option value="ARCHIVED"${ssrIncludeBooleanAttr(Array.isArray(unref(selected).status) ? ssrLooseContain(unref(selected).status, "ARCHIVED") : ssrLooseEqual(unref(selected).status, "ARCHIVED")) ? " selected" : ""}>В архиве</option></select></label>`);
					_push(ssrRenderComponent(_component_CrmAccountManagerField, {
						modelValue: unref(selected).accountManagerId,
						"onUpdate:modelValue": ($event) => unref(selected).accountManagerId = $event,
						people: unref(managers),
						current: unref(selected).accountManager
					}, null, _parent));
					_push(`</fieldset><details class="crm-org-conditions"><summary>Коммерческие условия</summary><fieldset class="ui-fieldset-reset crm-org-fields"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected)) ? " disabled" : ""}><label class="crm-field">Скидка, %<input class="crm-input"${ssrRenderAttr("value", unref(selected).discountTier)} type="number" min="0" max="100"></label><label class="crm-field">Кредитный лимит, ₽<input class="crm-input"${ssrRenderAttr("value", unref(selected).creditLimit)} type="number" min="0"></label></fieldset></details></section><section id="organization-panel-details" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-details"${ssrRenderDynamicAttr("hidden", unref(organizationTab) !== "details")}><fieldset class="ui-fieldset-reset crm-org-fields"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected)) ? " disabled" : ""}><label class="crm-org-wide crm-field">Юридическое название<input class="crm-input"${ssrRenderAttr("value", unref(selected).legalName)} placeholder="ООО «Название компании»"></label><label class="crm-field">ИНН<input class="crm-input"${ssrRenderAttr("value", unref(selected).inn)} inputmode="numeric" placeholder="Не указан"></label><label class="crm-field">КПП<input class="crm-input"${ssrRenderAttr("value", unref(selected).kpp)} inputmode="numeric" placeholder="Не указан"></label><label class="crm-org-wide crm-field">Юридический адрес<textarea class="crm-input" rows="3" placeholder="Индекс, город, улица, дом">${ssrInterpolate(unref(selected).legalAddress)}</textarea></label></fieldset></section>`);
					if (!unref(creating)) {
						_push(`<section id="organization-panel-members" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-members"${ssrRenderDynamicAttr("hidden", unref(organizationTab) !== "members")}><p class="crm-muted">Представители компании и их роли</p><!--[-->`);
						ssrRenderList(unref(selected).members, (member) => {
							_push(`<article class="crm-org-detail-row"><div><strong>${ssrInterpolate([member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email)}</strong>`);
							if (member.user.email) _push(`<a${ssrRenderAttr("href", "mailto:" + member.user.email)}>${ssrInterpolate(member.user.email)}</a>`);
							else _push(`<!---->`);
							_push(`</div><div><span>${ssrInterpolate(memberLabels[member.role] || member.role)}</span><small>${ssrInterpolate(member.jobTitle || (member.canSeeFinance ? "Видит финансы" : "Рабочий доступ"))}</small></div></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected).members?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(Users), { size: 28 }, null, _parent));
							_push(`<p>Представители ещё не добавлены</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					if (!unref(creating)) {
						_push(`<section id="organization-panel-orders" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="organization-tab-orders"${ssrRenderDynamicAttr("hidden", unref(organizationTab) !== "orders")}><p class="crm-muted">Последние доступные заказы компании</p><!--[-->`);
						ssrRenderList(unref(selected).orders, (order) => {
							_push(`<article class="crm-org-detail-row"><div><strong>${ssrInterpolate(order.orderNumber)}</strong><small>${ssrInterpolate(new Date(order.createdAt).toLocaleDateString("ru-RU"))}</small></div><div><b>${ssrInterpolate(Number(order.finalAmount).toLocaleString("ru-RU"))} ₽</b><span>${ssrInterpolate(orderLabels[order.status] || order.status)}</span></div></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected).orders?.length) {
							_push(`<div class="crm-directory-empty">`);
							_push(ssrRenderComponent(unref(ShoppingBag), { size: 28 }, null, _parent));
							_push(`<p>${ssrInterpolate(unref(selected).relatedAccess?.orders === false ? "Нет доступа к истории заказов" : "Нет доступных заказов")}</p></div>`);
						} else _push(`<!---->`);
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`</form><footer class="crm-detail-footer">`);
					if (unref(creating)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Отмена</button>`);
					else _push(`<span>${ssrInterpolate(!unref(canEditSelected) ? "Доступен только просмотр" : unref(draftDirty) ? "Есть несохранённые изменения" : "Изменения сохранены")}</span>`);
					_push(`<button class="crm-button crm-button--primary" type="submit" form="organization-editor-form"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(canEditSelected) || !unref(creating) && !unref(draftDirty)) ? " disabled" : ""}>${ssrInterpolate(unref(actionBusy) ? "Сохраняем…" : unref(creating) ? "Создать организацию" : "Сохранить изменения")}</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			if (unref(notice)) _push(`<div class="toast" role="status">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/organizations.vue
var _sfc_setup = organizations_vue_vue_type_script_setup_true_lang_default.setup;
organizations_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/organizations.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var organizations_default = organizations_vue_vue_type_script_setup_true_lang_default;

export { organizations_default as default };;globalThis.__timing__.logEnd('Load chunks/build/organizations-BLTCeixE');
//# sourceMappingURL=organizations-BLTCeixE.mjs.map
