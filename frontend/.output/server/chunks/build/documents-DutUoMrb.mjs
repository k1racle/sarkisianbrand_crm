globalThis.__timing__.logStart('Load chunks/build/documents-DutUoMrb');import { u as useHead, a as useWorkspaceSession, N as NuxtLink } from '../virtual/entry.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { u as useCrmNavigation } from './useCrmNavigation-DNjlvJcr.mjs';
import { defineComponent, ref, computed, reactive, mergeProps, unref, isRef, withCtx, createTextVNode, createVNode, watch, resolveDynamicComponent, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderComponent, ssrRenderAttrs, ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderClass, ssrRenderVNode } from 'vue/server-renderer';
import { RefreshCw, FileText, Plus, Check, ChevronRight, ArrowLeft, Save, Search, FileSignature, Download, ShieldCheck, Building2, Pencil } from '@lucide/vue';
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

// components/workspace/PartnerLegalEntitiesPage.vue?vue&type=script&setup=true&lang.ts
var PartnerLegalEntitiesPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "PartnerLegalEntitiesPage",
	__ssrInlineRender: true,
	props: { embedded: { type: Boolean } },
	emits: ["dirty"],
	setup(__props, { emit: __emit }) {
		useWorkspaceSession();
		const rows = ref([]), loading = ref(false), busy = ref(false), error = ref(""), notice = ref(""), editing = ref(null);
		const emit = __emit;
		const baseline = ref("");
		const dirty = computed(() => Boolean(editing.value) && JSON.stringify(editing.value) !== baseline.value);
		watch(dirty, (value) => emit("dirty", value));
		onBeforeRouteLeave(() => !busy.value && (!dirty.value || (void 0).confirm("Уйти без сохранения реквизитов?")));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: ["partner-workspace partner-legal crm-management-workspace", {
					"partner-legal--embedded": __props.embedded,
					"crm-standard": !__props.embedded
				}],
				"aria-busy": unref(loading) || unref(busy)
			}, _attrs))}>`);
			if (!__props.embedded || !unref(editing)) {
				_push(`<header class="${ssrRenderClass([__props.embedded ? "pds-heading" : "crm-page-header", "partner-page-head"])}"><div>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(__props.embedded ? "h2" : "h1"), null, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Реквизиты стороны договора`);
						else return [createTextVNode("Реквизиты стороны договора")];
					}),
					_: 1
				}), _parent);
				_push(`<p>Ваши ИП и ООО для автоматического заполнения договоров, актов и заявлений.</p></div><div class="partner-actions"><button type="button" class="partner-button crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || unref(dirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 17 }, null, _parent));
				_push(`Обновить</button>`);
				if (!unref(editing)) {
					_push(`<button type="button" class="partner-button partner-primary crm-button crm-button--primary">`);
					_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
					_push(`Добавить реквизиты</button>`);
				} else _push(`<!---->`);
				_push(`</div></header>`);
			} else _push(`<!---->`);
			if (unref(error)) _push(`<p class="partner-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="partner-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading) && !unref(rows).length) _push(`<p class="partner-legal-loading" role="status">Загружаем реквизиты…</p>`);
			else _push(`<!---->`);
			if (!unref(editing)) {
				_push(`<div class="partner-legal-cards"><!--[-->`);
				ssrRenderList(unref(rows), (row) => {
					_push(`<article class="partner-panel crm-surface partner-legal-card"><header><span class="partner-legal-icon">`);
					_push(ssrRenderComponent(unref(Building2), { size: 22 }, null, _parent));
					_push(`</span><div><span class="partner-legal-kind">${ssrInterpolate(row.entityType === "IP" ? "Индивидуальный предприниматель" : "Общество с ограниченной ответственностью")}</span><h3>${ssrInterpolate(row.legalName)}</h3></div><span class="partner-legal-status"${ssrRenderAttr("data-active", row.isActive)}>${ssrInterpolate(row.isActive ? "Действует" : "Отключено")}</span></header><dl><div><dt>ИНН</dt><dd>${ssrInterpolate(row.inn)}</dd></div>`);
					if (row.kpp) _push(`<div><dt>КПП</dt><dd>${ssrInterpolate(row.kpp)}</dd></div>`);
					else _push(`<!---->`);
					_push(`<div><dt>${ssrInterpolate(row.entityType === "IP" ? "ОГРНИП" : "ОГРН")}</dt><dd>${ssrInterpolate(row.entityType === "IP" ? row.ogrnip : row.ogrn)}</dd></div><div><dt>Адрес</dt><dd>${ssrInterpolate(row.address)}</dd></div><div><dt>Подписант</dt><dd>${ssrInterpolate(row.signerName)}<small>${ssrInterpolate(row.signerBasis)}</small></dd></div></dl><footer><span>${ssrInterpolate(row.isActive ? "Доступно при генерации" : "Не используется в новых документах")}</span><button type="button" class="partner-button crm-button">`);
					_push(ssrRenderComponent(unref(Pencil), { size: 15 }, null, _parent));
					_push(`Изменить</button></footer></article>`);
				});
				_push(`<!--]-->`);
				if (!unref(rows).length && !unref(loading) && !unref(error)) {
					_push(`<div class="partner-panel crm-surface partner-legal-empty">`);
					_push(ssrRenderComponent(unref(Building2), { size: 30 }, null, _parent));
					_push(`<h3>Добавьте реквизиты компании</h3><p>Можно сохранить несколько ИП и ООО, чтобы выбирать нужную сторону при генерации документов.</p><button type="button" class="partner-button crm-button">`);
					_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
					_push(`Добавить реквизиты</button></div>`);
				} else if (unref(error) && !unref(rows).length) {
					_push(`<div class="partner-panel crm-surface partner-legal-empty">`);
					_push(ssrRenderComponent(unref(Building2), { size: 30 }, null, _parent));
					_push(`<h3>Реквизиты недоступны</h3><p>Повторите загрузку, чтобы увидеть сохранённые компании.</p><button type="button" class="crm-button">`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
					_push(`Повторить загрузку</button></div>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else {
				_push(`<div class="partner-panel crm-surface partner-legal-editor"><header class="partner-legal-editor-head"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(`К реквизитам</button><div><h2>${ssrInterpolate(unref(editing).id ? "Изменить реквизиты" : "Новые реквизиты")}</h2><p>Изменения применятся к новым документам. Готовые файлы сохранят исходные сведения.</p></div></header><form class="partner-form-grid"><label>Тип стороны<select class="crm-input" aria-label="Тип стороны"><option value="IP"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).entityType) ? ssrLooseContain(unref(editing).entityType, "IP") : ssrLooseEqual(unref(editing).entityType, "IP")) ? " selected" : ""}>Индивидуальный предприниматель</option><option value="LLC"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).entityType) ? ssrLooseContain(unref(editing).entityType, "LLC") : ssrLooseEqual(unref(editing).entityType, "LLC")) ? " selected" : ""}>Общество с ограниченной ответственностью</option></select></label><label class="partner-legal-name">Полное юридическое наименование<input class="crm-input"${ssrRenderAttr("value", unref(editing).legalName)} required maxlength="300" placeholder="Как в регистрационных документах"></label><label>ИНН<input class="crm-input"${ssrRenderAttr("value", unref(editing).inn)} required inputmode="numeric" maxlength="12"></label>`);
				if (unref(editing).entityType === "LLC") _push(`<label>КПП<input class="crm-input"${ssrRenderAttr("value", unref(editing).kpp)} required inputmode="numeric" maxlength="9"></label>`);
				else _push(`<!---->`);
				if (unref(editing).entityType === "LLC") _push(`<label>ОГРН<input class="crm-input"${ssrRenderAttr("value", unref(editing).ogrn)} required inputmode="numeric" maxlength="13"></label>`);
				else _push(`<!---->`);
				if (unref(editing).entityType === "IP") _push(`<label>ОГРНИП<input class="crm-input"${ssrRenderAttr("value", unref(editing).ogrnip)} required inputmode="numeric" maxlength="15"></label>`);
				else _push(`<!---->`);
				_push(`<label class="partner-legal-wide">Адрес регистрации<input class="crm-input"${ssrRenderAttr("value", unref(editing).address)} required maxlength="500" placeholder="Индекс, город, улица, дом"></label><label>ФИО подписанта<input class="crm-input"${ssrRenderAttr("value", unref(editing).signerName)} required maxlength="200"></label><label>Должность подписанта<input class="crm-input"${ssrRenderAttr("value", unref(editing).signerTitle)} maxlength="120" placeholder="Для ООО, например генеральный директор"></label><label>Основание полномочий<input class="crm-input"${ssrRenderAttr("value", unref(editing).signerBasis)} required maxlength="200" placeholder="Устав или регистрация ИП"></label><label>Email<input class="crm-input"${ssrRenderAttr("value", unref(editing).email)} type="email" maxlength="254"></label><label class="partner-option partner-legal-wide"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).isActive) ? ssrLooseContain(unref(editing).isActive, null) : unref(editing).isActive) ? " checked" : ""} type="checkbox">Использовать при генерации новых документов</label><footer class="partner-actions partner-legal-wide"><button type="button" class="partner-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button class="partner-button partner-primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="submit">`);
				_push(ssrRenderComponent(unref(Save), { size: 17 }, null, _parent));
				_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить реквизиты")}</button></footer></form></div>`);
			}
			_push(`</section>`);
		};
	}
});
// components/workspace/PartnerLegalEntitiesPage.vue
var _sfc_setup$2 = PartnerLegalEntitiesPage_vue_vue_type_script_setup_true_lang_default.setup;
PartnerLegalEntitiesPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/PartnerLegalEntitiesPage.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var PartnerLegalEntitiesPage_default = Object.assign(PartnerLegalEntitiesPage_vue_vue_type_script_setup_true_lang_default, { __name: "PartnerLegalEntitiesPage" });
// components/workspace/PartnerDocumentsSettingsPage.vue?vue&type=script&setup=true&lang.ts
var PartnerDocumentsSettingsPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "PartnerDocumentsSettingsPage",
	__ssrInlineRender: true,
	setup(__props) {
		useWorkspaceSession();
		const sectionValue = ref("templates");
		const section = computed({
			get: () => sectionValue.value,
			set: (value) => {
				if (value === sectionValue.value || !canLeaveEditor()) return;
				if (editingDirty.value) editing.value = null;
				if (settingsDirty.value && workspace.value) Object.assign(settings, workspace.value.settings);
				sectionValue.value = value;
			}
		});
		const documentTabs = [
			["templates", "Шаблоны"],
			["generator", "Генератор"],
			["signature", "SMS-подпись"],
			["entities", "Реквизиты"]
		];
		const busy = ref(false), loading = ref(false), error = ref(""), notice = ref("");
		const workspace = ref(null);
		const participants = ref([]), search = ref("");
		const selectedParticipant = ref(""), entityId = ref("");
		const generated = ref([]);
		const legalDirty = ref(false);
		const editing = ref(null);
		const editingBaseline = ref(""), settingsBaseline = ref("");
		const editingDirty = computed(() => Boolean(editing.value) && JSON.stringify(editing.value) !== editingBaseline.value);
		ref(null);
		const participantLoading = ref(false);
		const selectedPerson = computed(() => participants.value.find((person) => person.id === selectedParticipant.value));
		const activeEntities = computed(() => (workspace.value?.entities || []).filter((entity) => entity.isActive));
		const selectedEntity = computed(() => activeEntities.value.find((entity) => entity.id === entityId.value));
		const settings = reactive({
			pepEnabled: false,
			providerKey: "SMS_AERO",
			codeTtlSeconds: 300,
			maxAttempts: 5,
			resendCooldownSeconds: 60,
			consentRequired: true,
			eligibleDocumentTypes: [
				"SERVICE_AGREEMENT",
				"REWARD_SCHEDULE",
				"SERVICE_ACT",
				"PAYOUT_REQUEST"
			]
		});
		const settingsDirty = computed(() => Boolean(settingsBaseline.value) && JSON.stringify(settings) !== settingsBaseline.value);
		function canLeaveEditor() {
			return !busy.value && (!(editingDirty.value || settingsDirty.value || legalDirty.value) || (void 0).confirm("Есть несохранённые изменения документа, реквизитов или SMS-настроек. Продолжить без сохранения?"));
		}
		onBeforeRouteLeave(canLeaveEditor);
		const labels = {
			PEP_CONSENT: "Согласие на ПЭП",
			SERVICE_AGREEMENT: "Договор услуг",
			REWARD_SCHEDULE: "Задание и вознаграждение",
			SERVICE_ACT: "Акт услуг",
			PAYOUT_REQUEST: "Заявление на выплату"
		};
		const tokens = [
			{
				key: "partner_name",
				label: "ФИО партнёра"
			},
			{
				key: "partner_inn",
				label: "ИНН партнёра"
			},
			{
				key: "partner_address",
				label: "Адрес партнёра"
			},
			{
				key: "program_kind",
				label: "Название программы"
			},
			{
				key: "company_name",
				label: "Название нашей компании"
			},
			{
				key: "company_inn",
				label: "ИНН нашей компании"
			},
			{
				key: "company_address",
				label: "Адрес нашей компании"
			},
			{
				key: "reward_terms",
				label: "Условия вознаграждения"
			},
			{
				key: "period_start",
				label: "Начало периода"
			},
			{
				key: "period_end",
				label: "Конец периода"
			},
			{
				key: "document_number",
				label: "Номер документа"
			},
			{
				key: "reward_amount",
				label: "Начислено за период"
			},
			{
				key: "payout_amount",
				label: "Сумма к выплате"
			}
		];
		const tokenLabel = (name) => `{{${name}}}`;
		ref(null);
		function htmlToText(html = "") {
			return html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/(p|h[1-6]|li)>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
		}
		function templateSnippet(html = "") {
			return htmlToText(html).replace(/{{\s*([a-z_]+)\s*}}/gi, (_, key) => `[${tokens.find((item) => item.key === key)?.label || "Данные документа"}]`);
		}
		const previewText = computed(() => (editing.value?.bodyText || "").replace(/{{\s*([a-z_]+)\s*}}/gi, (_, key) => ({
			partner_name: "Анна Иванова",
			partner_inn: "ИНН партнёра",
			partner_address: "Адрес партнёра",
			program_kind: "Реферальная программа",
			company_name: "ООО «Саркисян»",
			company_inn: "ИНН компании",
			company_address: "Адрес компании",
			reward_terms: "7% от подтверждённых покупок",
			period_start: "01.10.2026",
			period_end: "31.10.2026",
			document_number: "P-0001",
			reward_amount: "5 000 ₽",
			payout_amount: "5 000 ₽"
		})[key] || `[${key}]`));
		const documentTypes = Object.keys(labels);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "partner-workspace crm-standard partner-doc-settings crm-management-workspace" }, _attrs))}><header class="crm-page-header"><div><h1>Документы партнёров</h1><p>Договоры, акты и заявления для авторов, блогеров и реферальных партнёров.</p></div><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || unref(editingDirty) || unref(settingsDirty)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				size: 17,
				class: { spin: unref(loading) }
			}, null, _parent));
			_push(` Обновить</button></header>`);
			if (unref(error) && unref(workspace)) _push(`<p class="partner-feedback" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="partner-feedback" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(editingDirty) || unref(settingsDirty)) _push(`<p class="crm-management-dirty" role="status">Есть несохранённые изменения. Сохраните их перед обновлением страницы.</p>`);
			else _push(`<!---->`);
			_push(ssrRenderComponent(_component_CrmCardTabs, {
				modelValue: unref(section),
				"onUpdate:modelValue": ($event) => isRef(section) ? section.value = $event : null,
				prefix: "partner-doc",
				tabs: documentTabs,
				label: "Разделы документов"
			}, null, _parent));
			if (unref(loading) && !unref(workspace)) {
				_push(`<p class="pds-state" role="status">`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					size: 22,
					class: "spin"
				}, null, _parent));
				_push(` Загружаем документы и настройки…</p>`);
			} else if (!unref(workspace) && unref(error)) {
				_push(`<div class="pds-empty crm-surface crm-management-error" role="alert">`);
				_push(ssrRenderComponent(unref(FileText), { size: 28 }, null, _parent));
				_push(`<h3>Документы недоступны</h3><p>${ssrInterpolate(unref(error))}</p><button type="button" class="crm-button">`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
				_push(` Повторить загрузку</button></div>`);
			} else if (unref(section) === "entities") {
				_push(`<div id="partner-doc-entities-panel" role="tabpanel" aria-labelledby="partner-doc-entities-tab">`);
				_push(ssrRenderComponent(PartnerLegalEntitiesPage_default, {
					embedded: "",
					onDirty: ($event) => legalDirty.value = $event
				}, null, _parent));
				_push(`</div>`);
			} else if (unref(section) === "templates") {
				_push(`<section id="partner-doc-templates-panel" role="tabpanel" aria-labelledby="partner-doc-templates-tab" class="pds-section">`);
				if (!unref(editing)) {
					_push(`<!--[--><header class="pds-heading"><div><h2>Шаблоны документов</h2><p>Готовые тексты, которые система заполнит данными партнёра и вашей компании.</p></div><button type="button" class="crm-button crm-button--primary">`);
					_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
					_push(` Добавить шаблон</button></header><details class="pds-start-help"><summary>Как работать с шаблонами</summary><p>Откройте шаблон, чтобы посмотреть текст или подготовить новую версию. Уже сформированные документы сохранят прежний текст и реквизиты.</p></details><div class="pds-table"><!--[-->`);
					ssrRenderList(unref(workspace)?.templates, (item) => {
						_push(`<article class="pds-template crm-surface"><span class="pds-file-icon">`);
						_push(ssrRenderComponent(unref(FileText), { size: 23 }, null, _parent));
						_push(`</span><div class="pds-template-body"><div class="pds-template-top"><span class="pds-kind">${ssrInterpolate(labels[item.documentType] || item.documentType)}</span><span class="pds-version"${ssrRenderAttr("data-active", item.isActive)}>`);
						if (item.isActive) _push(ssrRenderComponent(unref(Check), { size: 12 }, null, _parent));
						else _push(`<!---->`);
						_push(`${ssrInterpolate(item.isActive ? "Действует" : "Архив")} · версия ${ssrInterpolate(item.version)}</span></div><h3>${ssrInterpolate(item.title)}</h3><p>${ssrInterpolate(item.audience === "ALL" ? "Все партнёры" : item.audience === "BLOGGER" ? "Программа авторов и блогеров" : "Реферальная программа")} · ${ssrInterpolate(item.taxStatus === "ALL" ? "Любой налоговый статус" : item.taxStatus === "SELF_EMPLOYED" ? "Самозанятые" : "ИП")} · ${ssrInterpolate(item.entityType === "ALL" ? "От ИП или ООО" : item.entityType === "IP" ? "От ИП" : "От ООО")}</p><p class="pds-excerpt" title="Фрагмент шаблона. Поля в скобках заполнятся автоматически.">${ssrInterpolate(templateSnippet(item.bodyHtml))}</p></div><div class="pds-actions"><button type="button" class="crm-button">Открыть шаблон `);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent));
						_push(`</button>`);
						if (!item.isActive) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Активировать</button>`);
						else _push(`<!---->`);
						_push(`</div></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(workspace)?.templates?.length && !unref(loading)) {
						_push(`<div class="crm-surface pds-empty">`);
						_push(ssrRenderComponent(unref(FileText), { size: 28 }, null, _parent));
						_push(`<h3>Добавьте первый шаблон</h3><p>Начните с договора услуг. Затем добавьте согласие на подпись, акт и заявление на выплату.</p><button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(` Добавить шаблон</button></div>`);
					} else _push(`<!---->`);
					_push(`</div><!--]-->`);
				} else {
					_push(`<div class="pds-editor crm-surface"><header class="pds-editor-intro"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
					_push(` К шаблонам</button><div><h2>${ssrInterpolate(unref(editing).id ? "Новая версия шаблона" : "Новый шаблон")}</h2><p>Пишите обычным текстом. При сохранении система создаст отдельную версию.</p></div></header><form class="pds-form"><label>Название документа<input${ssrRenderAttr("value", unref(editing).title)} class="crm-input" required maxlength="240" placeholder="Например, договор оказания информационных услуг"><small>Название в списке и скачанном файле.</small></label><label>Тип документа<select aria-label="Тип документа" class="crm-input"><!--[-->`);
					ssrRenderList(unref(documentTypes), (type) => {
						_push(`<option${ssrRenderAttr("value", type)}${ssrIncludeBooleanAttr(Array.isArray(unref(editing).documentType) ? ssrLooseContain(unref(editing).documentType, type) : ssrLooseEqual(unref(editing).documentType, type)) ? " selected" : ""}>${ssrInterpolate(labels[type])}</option>`);
					});
					_push(`<!--]--></select></label><fieldset class="pds-wide pds-scope"><legend>Когда использовать эту версию</legend><label>Программа<select aria-label="Программа" class="crm-input"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).audience) ? ssrLooseContain(unref(editing).audience, "ALL") : ssrLooseEqual(unref(editing).audience, "ALL")) ? " selected" : ""}>Обе программы</option><option value="BLOGGER"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).audience) ? ssrLooseContain(unref(editing).audience, "BLOGGER") : ssrLooseEqual(unref(editing).audience, "BLOGGER")) ? " selected" : ""}>Программа авторов и блогеров</option><option value="REFERRAL"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).audience) ? ssrLooseContain(unref(editing).audience, "REFERRAL") : ssrLooseEqual(unref(editing).audience, "REFERRAL")) ? " selected" : ""}>Реферальная программа</option></select></label><label>Налоговый статус<select aria-label="Налоговый статус" class="crm-input"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).taxStatus) ? ssrLooseContain(unref(editing).taxStatus, "ALL") : ssrLooseEqual(unref(editing).taxStatus, "ALL")) ? " selected" : ""}>Любой статус</option><option value="SELF_EMPLOYED"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).taxStatus) ? ssrLooseContain(unref(editing).taxStatus, "SELF_EMPLOYED") : ssrLooseEqual(unref(editing).taxStatus, "SELF_EMPLOYED")) ? " selected" : ""}>Самозанятый</option><option value="INDIVIDUAL_ENTREPRENEUR"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).taxStatus) ? ssrLooseContain(unref(editing).taxStatus, "INDIVIDUAL_ENTREPRENEUR") : ssrLooseEqual(unref(editing).taxStatus, "INDIVIDUAL_ENTREPRENEUR")) ? " selected" : ""}>ИП</option></select></label><label>Наша сторона<select aria-label="Наша сторона" class="crm-input"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).entityType) ? ssrLooseContain(unref(editing).entityType, "ALL") : ssrLooseEqual(unref(editing).entityType, "ALL")) ? " selected" : ""}>ИП или ООО</option><option value="IP"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).entityType) ? ssrLooseContain(unref(editing).entityType, "IP") : ssrLooseEqual(unref(editing).entityType, "IP")) ? " selected" : ""}>Только ИП</option><option value="LLC"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).entityType) ? ssrLooseContain(unref(editing).entityType, "LLC") : ssrLooseEqual(unref(editing).entityType, "LLC")) ? " selected" : ""}>Только ООО</option></select></label></fieldset><div class="pds-wide pds-writing-guide"><strong>Данные, которые заполнятся автоматически</strong><p>Поставьте курсор в текст и нажмите на нужное поле. Система подставит его значение при генерации.</p><details><summary>Выбрать поле для вставки</summary><div class="pds-token-list"><!--[-->`);
					ssrRenderList(tokens, (item) => {
						_push(`<button type="button" class="pds-token crm-button crm-card-action"><span>${ssrInterpolate(item.label)}</span><code>${ssrInterpolate(tokenLabel(item.key))}</code>`);
						_push(ssrRenderComponent(unref(Plus), { size: 14 }, null, _parent));
						_push(`</button>`);
					});
					_push(`<!--]--></div></details></div><div class="pds-wide pds-field"><label for="partner-template-text">Текст документа</label><textarea id="partner-template-text" class="crm-input pds-editor-text" rows="15" required maxlength="50000" aria-describedby="partner-template-text-help" placeholder="Вставьте готовый текст и добавьте поля для автоматического заполнения.">${ssrInterpolate(unref(editing).bodyText)}</textarea><small id="partner-template-text-help">Можно скопировать текст из Word. Разделяйте абзацы пустой строкой.</small></div><details class="pds-preview pds-wide"><summary>`);
					_push(ssrRenderComponent(unref(FileText), { size: 17 }, null, _parent));
					_push(` Пример заполненного документа</summary><p>Демонстрационные данные помогают проверить расположение полей.</p><pre>${ssrInterpolate(unref(previewText))}</pre></details><label class="pds-check pds-wide"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(editing).isActive) ? ssrLooseContain(unref(editing).isActive, null) : unref(editing).isActive) ? " checked" : ""} type="checkbox"> Использовать эту версию при генерации новых документов</label><footer class="pds-wide pds-editor-footer"><span>Прежние версии останутся в истории.</span><div class="pds-actions"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="submit">`);
					_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
					_push(` ${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить новую версию")}</button></div></footer></form></div>`);
				}
				_push(`</section>`);
			} else if (unref(section) === "generator") {
				_push(`<section id="partner-doc-generator-panel" role="tabpanel" aria-labelledby="partner-doc-generator-tab" class="pds-section"><header class="pds-heading"><div><h2>Сформировать документы</h2><p>Выберите партнёра и компанию. Система подберёт действующие шаблоны и заполнит реквизиты.</p></div></header><div class="pds-generator"><section class="pds-participant crm-surface"><h3>Для кого готовим документы</h3><label class="pds-search"><span>Поиск партнёра</span><span class="pds-search-input crm-input-group">`);
				_push(ssrRenderComponent(unref(Search), { size: 17 }, null, _parent));
				_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" placeholder="Имя, код или email"></span></label>`);
				if (unref(participantLoading)) _push(`<p class="pds-list-hint" role="status">Ищем партнёров…</p>`);
				else _push(`<!---->`);
				_push(`<div class="pds-people" aria-label="Выбор партнёра"><!--[-->`);
				ssrRenderList(unref(participants), (person) => {
					_push(`<button class="crm-button crm-card-action" type="button"${ssrRenderAttr("aria-pressed", unref(selectedParticipant) === person.id)}><span class="pds-avatar">${ssrInterpolate(person.displayName?.slice(0, 1) || "П")}</span><span><strong>${ssrInterpolate(person.displayName)}</strong><small>${ssrInterpolate(person.kind === "BLOGGER" ? "Автор или блогер" : "Реферальный клиент")} · ${ssrInterpolate(person.user?.email)}</small></span>`);
					if (unref(selectedParticipant) === person.id) _push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]-->`);
				if (!unref(participants).length && !unref(participantLoading)) _push(`<p class="pds-list-hint">${ssrInterpolate(unref(search) ? "Никого не нашли. Попробуйте имя или email." : "Участников пока нет. Сначала добавьте партнёра в программу.")}</p>`);
				else _push(`<!---->`);
				_push(`</div></section><section class="pds-generation-summary crm-surface"><h3>От чьего имени</h3><p>Укажите вашу сторону договора. Её реквизиты появятся в каждом документе комплекта.</p><label>Реквизиты компании<select aria-label="Реквизиты компании" class="crm-input"><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(entityId)) ? ssrLooseContain(unref(entityId), "") : ssrLooseEqual(unref(entityId), "")) ? " selected" : ""}>Выберите ИП или ООО</option><!--[-->`);
				ssrRenderList(unref(activeEntities), (entity) => {
					_push(`<option${ssrRenderAttr("value", entity.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(entityId)) ? ssrLooseContain(unref(entityId), entity.id) : ssrLooseEqual(unref(entityId), entity.id)) ? " selected" : ""}>${ssrInterpolate(entity.entityType === "IP" ? "ИП" : "ООО")} · ${ssrInterpolate(entity.legalName)}</option>`);
				});
				_push(`<!--]--></select></label>`);
				if (!unref(activeEntities).length) _push(`<p class="pds-list-hint">Нет действующих реквизитов. <button type="button" class="pds-inline-button crm-button">Добавить реквизиты</button></p>`);
				else _push(`<!---->`);
				_push(`<dl class="pds-generation-details"><div><dt>Партнёр</dt><dd>${ssrInterpolate(unref(selectedPerson)?.displayName || "Не выбран")}</dd></div><div><dt>Наша сторона</dt><dd>${ssrInterpolate(unref(selectedEntity)?.legalName || "Не выбрана")}</dd></div><div><dt>Результат</dt><dd>Комплект документов DOC</dd></div></dl><button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(selectedParticipant) || !unref(entityId)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(FileSignature), { size: 17 }, null, _parent));
				_push(` ${ssrInterpolate(unref(busy) ? "Формируем…" : "Сформировать комплект")}</button><small>Перед подписанием проверьте сведения в скачанных файлах.</small></section></div>`);
				if (unref(generated).length) {
					_push(`<section class="pds-generated" aria-live="polite"><header class="pds-heading"><div><h2>Документы готовы</h2><p>Скачайте файлы и проверьте реквизиты и условия.</p></div><span class="pds-version">${ssrInterpolate(unref(generated).length)} шт.</span></header><!--[-->`);
					ssrRenderList(unref(generated), (doc) => {
						_push(`<article class="pds-template crm-surface"><span class="pds-file-icon">`);
						_push(ssrRenderComponent(unref(FileText), { size: 23 }, null, _parent));
						_push(`</span><div class="pds-template-body"><span class="pds-kind">${ssrInterpolate(labels[doc.documentType])}</span><h3>${ssrInterpolate(doc.title)}</h3><p>Версия шаблона ${ssrInterpolate(doc.templateVersion)} · черновик</p></div><button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Download), { size: 16 }, null, _parent));
						_push(` Скачать DOC</button></article>`);
					});
					_push(`<!--]--></section>`);
				} else _push(`<!---->`);
				_push(`</section>`);
			} else {
				_push(`<section id="partner-doc-signature-panel" role="tabpanel" aria-labelledby="partner-doc-signature-tab" class="pds-section"><header class="pds-heading"><div><h2>Подписание по SMS</h2><p>Параметры одноразового кода и перечень документов для простой электронной подписи.</p></div></header><div class="pds-sms-status crm-surface"><span class="pds-file-icon">`);
				_push(ssrRenderComponent(unref(ShieldCheck), { size: 23 }, null, _parent));
				_push(`</span><div><strong>Подписание пока недоступно</strong><p>SMS Aero: ${ssrInterpolate(unref(workspace)?.smsIntegration?.configured ? "реквизиты заполнены" : "интеграция не настроена")} · ${ssrInterpolate(unref(workspace)?.smsIntegration?.isEnabled ? "интеграция включена" : "интеграция выключена")}</p></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "crm-button",
					to: "/crm/settings/integrations"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`Настроить интеграцию `);
							_push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent, _scopeId));
						} else return [createTextVNode("Настроить интеграцию "), createVNode(unref(ChevronRight), { size: 15 })];
					}),
					_: 1
				}, _parent));
				_push(`</div><form class="pds-settings crm-surface"><div class="pds-wide pds-form-title"><h3>Одноразовый код</h3><p>Настройки сохранятся для будущего запуска SMS-подписи.</p></div><label>Провайдер<select aria-label="Провайдер" class="crm-input"><option value="SMS_AERO"${ssrIncludeBooleanAttr(Array.isArray(unref(settings).providerKey) ? ssrLooseContain(unref(settings).providerKey, "SMS_AERO") : ssrLooseEqual(unref(settings).providerKey, "SMS_AERO")) ? " selected" : ""}>SMS Aero</option></select></label><label>Срок действия кода, секунд<input${ssrRenderAttr("value", unref(settings).codeTtlSeconds)} class="crm-input" type="number" min="60" max="900"><small>От 60 до 900 секунд.</small></label><label>Максимум попыток ввода<input${ssrRenderAttr("value", unref(settings).maxAttempts)} class="crm-input" type="number" min="3" max="10"></label><label>Пауза перед повторным кодом, секунд<input${ssrRenderAttr("value", unref(settings).resendCooldownSeconds)} class="crm-input" type="number" min="30" max="600"></label><div class="pds-wide pds-signing-options"><label class="pds-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(settings).consentRequired) ? ssrLooseContain(unref(settings).consentRequired, null) : unref(settings).consentRequired) ? " checked" : ""} type="checkbox"> Требовать предварительное согласие на использование ПЭП</label><fieldset class="pds-doc-checks"><legend>Какие документы можно подписывать кодом</legend><!--[-->`);
				ssrRenderList(unref(documentTypes).filter((x) => x !== "PEP_CONSENT"), (type) => {
					_push(`<label><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(settings).eligibleDocumentTypes) ? ssrLooseContain(unref(settings).eligibleDocumentTypes, type) : unref(settings).eligibleDocumentTypes) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", type)}> ${ssrInterpolate(labels[type])}</label>`);
				});
				_push(`<!--]--></fieldset></div><p class="pds-warning">Сохранение настроек не включает подписание. Для запуска нужны выдача и проверка кода, журнал подписания и подписанный экземпляр документа. Ключи SMS хранятся в защищённых настройках интеграции.</p><footer class="pds-wide"><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
				_push(` Сохранить настройки</button></footer></form></section>`);
			}
			_push(`</section>`);
		};
	}
});
// components/workspace/PartnerDocumentsSettingsPage.vue
var _sfc_setup$1 = PartnerDocumentsSettingsPage_vue_vue_type_script_setup_true_lang_default.setup;
PartnerDocumentsSettingsPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/PartnerDocumentsSettingsPage.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var PartnerDocumentsSettingsPage_default = Object.assign(PartnerDocumentsSettingsPage_vue_vue_type_script_setup_true_lang_default, { __name: "PartnerDocumentsSettingsPage" });
// pages/crm/partners/documents.vue?vue&type=script&setup=true&lang.ts
var documents_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "documents",
	__ssrInlineRender: true,
	setup(__props) {
		const { active } = useCrmNavigation();
		useHead(() => ({ title: `${active.value?.label || "Документы партнёров"} — SARKISIAN CRM` }));
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(PartnerDocumentsSettingsPage_default, _attrs, null, _parent));
		};
	}
});
// pages/crm/partners/documents.vue
var _sfc_setup = documents_vue_vue_type_script_setup_true_lang_default.setup;
documents_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/partners/documents.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var documents_default = documents_vue_vue_type_script_setup_true_lang_default;

export { documents_default as default };;globalThis.__timing__.logEnd('Load chunks/build/documents-DutUoMrb');
//# sourceMappingURL=documents-DutUoMrb.mjs.map
