globalThis.__timing__.logStart('Load chunks/build/SupportWorkspacePage-1ZlDEmZh');import { c as useRoute, a as useWorkspaceSession, b as useWorkspaceAccess, W as WorkspaceLoading_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { defineComponent, computed, ref, watch, reactive, unref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderClass, ssrRenderList, ssrRenderStyle, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Plus, AlertCircle, Search, Users, Headphones, MessageSquare, CheckCircle2, X, Clock3, Send, BookOpen, FolderOpen, FileText, ChevronRight, ChevronLeft, ArrowLeft, Check, Save, Pencil } from '@lucide/vue';

// components/crm/CrmKnowledgeBase.vue?vue&type=script&setup=true&lang.ts
var CrmKnowledgeBase_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmKnowledgeBase",
	__ssrInlineRender: true,
	setup(__props) {
		const { token } = useWorkspaceSession(), config = useRuntimeConfig();
		const data = ref(null), selected = ref(null), activeId = ref("");
		const search = ref(""), status = ref("PUBLISHED"), category = ref("");
		const loading = ref(false), opening = ref(false), saving = ref(false), editing = ref(false);
		const listError = ref(""), detailError = ref(""), notice = ref("");
		ref(null);
		ref(null);
		const form = reactive({
			title: "",
			category: "",
			body: "",
			status: "DRAFT"
		});
		const original = ref("");
		const labels = {
			DRAFT: "Черновик",
			PUBLISHED: "Опубликована",
			ARCHIVED: "В архиве"
		};
		const dirty = computed(() => editing.value && JSON.stringify(form) !== original.value);
		const reading = computed(() => !!activeId.value || editing.value);
		const categories = computed(() => data.value?.categories || []);
		const categoryTotal = computed(() => categories.value.reduce((sum, item) => sum + item.count, 0));
		const paragraphs = computed(() => selected.value?.body.split(/\n\s*\n/).filter(Boolean) || []);
		const readingMinutes = computed(() => Math.max(1, Math.ceil((selected.value?.body.trim().split(/\s+/).length || 0) / 180)));
		let listVersion = 0, listController;
		let searchTimer;
		const request = (path, options = {}) => $fetch$1("/helpdesk/knowledge" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${token.value}` },
			timeout: 2e4,
			retry: 0,
			...options
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось загрузить данные. Попробуйте ещё раз.";
		const date = (value) => new Date(value).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "short",
			year: "numeric"
		});
		async function load(page = 1) {
			clearTimeout(searchTimer);
			const current = ++listVersion;
			listController?.abort();
			listController = new AbortController();
			loading.value = true;
			listError.value = "";
			try {
				const result = await request("", {
					query: {
						search: search.value,
						status: status.value,
						category: category.value || void 0,
						page
					},
					signal: listController.signal
				});
				if (current === listVersion) data.value = result;
			} catch (e) {
				if (current === listVersion) listError.value = message(e);
			} finally {
				if (current === listVersion) loading.value = false;
			}
		}
		function mayLeave() {
			return !saving.value && (!dirty.value || (void 0).confirm("Уйти без сохранения изменений статьи?"));
		}
		function resetReader() {
			activeId.value = "";
			selected.value = null;
			opening.value = false;
			editing.value = false;
			detailError.value = "";
			notice.value = "";
		}
		function clearFilters() {
			search.value = "";
			status.value = "PUBLISHED";
			category.value = "";
		}
		watch([
			search,
			status,
			category
		], (values, previous) => {
			clearTimeout(searchTimer);
			++listVersion;
			listController?.abort();
			if (!token.value) return;
			loading.value = true;
			searchTimer = setTimeout(() => void load(), values[0] !== previous[0] ? 300 : 0);
		});
		watch(token, () => {
			++listVersion;
			listController?.abort();
			clearTimeout(searchTimer);
			resetReader();
			data.value = null;
			saving.value = false;
			listError.value = "";
			clearFilters();
			if (token.value) load();
		});
		onBeforeRouteLeave(() => mayLeave());
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-knowledge crm-management-workspace" }, _attrs))}><header class="crm-page-header"><div><h1>База знаний</h1><p>Инструкции, рабочие процессы и ответы на частые вопросы</p></div>`);
			if (unref(data)?.canWrite) {
				_push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`Новая статья</button>`);
			} else _push(`<!---->`);
			_push(`</header><div class="crm-knowledge-layout"><aside class="crm-knowledge-sections crm-surface" aria-label="Разделы базы знаний"><div class="crm-knowledge-sections-heading">`);
			_push(ssrRenderComponent(unref(BookOpen), { size: 19 }, null, _parent));
			_push(`<strong>Разделы</strong></div><nav class="crm-knowledge-section-list" aria-label="Выбрать раздел"><button class="crm-button" type="button"${ssrRenderAttr("aria-current", !unref(category) ? "true" : void 0)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(BookOpen), { size: 18 }, null, _parent));
			_push(`<span>Все статьи</span><small>${ssrInterpolate(unref(categoryTotal))}</small></button><!--[-->`);
			ssrRenderList(unref(categories), (item) => {
				_push(`<button class="crm-button" type="button"${ssrRenderAttr("aria-current", unref(category) === item.name ? "true" : void 0)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(FolderOpen), { size: 18 }, null, _parent));
				_push(`<span>${ssrInterpolate(item.name)}</span><small>${ssrInterpolate(item.count)}</small></button>`);
			});
			_push(`<!--]-->`);
			if (unref(category) && !unref(categories).some((item) => item.name === unref(category))) {
				_push(`<button class="crm-button" type="button" aria-current="true"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(FolderOpen), { size: 18 }, null, _parent));
				_push(`<span>${ssrInterpolate(unref(category))}</span><small>0</small></button>`);
			} else _push(`<!---->`);
			_push(`</nav><select class="crm-input crm-knowledge-mobile-sections" aria-label="Раздел базы знаний"${ssrRenderAttr("value", unref(category))}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><option value="">Все разделы · ${ssrInterpolate(unref(categoryTotal))}</option><!--[-->`);
			ssrRenderList(unref(categories), (item) => {
				_push(`<option${ssrRenderAttr("value", item.name)}>${ssrInterpolate(item.name)} · ${ssrInterpolate(item.count)}</option>`);
			});
			_push(`<!--]-->`);
			if (unref(category) && !unref(categories).some((item) => item.name === unref(category))) _push(`<option${ssrRenderAttr("value", unref(category))}>${ssrInterpolate(unref(category))} · 0</option>`);
			else _push(`<!---->`);
			_push(`</select><p class="crm-knowledge-sections-note">${ssrInterpolate(unref(data)?.canWrite ? "Соберите здесь знания команды: от первого входа до сложных рабочих процессов." : "Выберите раздел или найдите инструкцию по ключевым словам.")}</p></aside><div class="crm-knowledge-content">`);
			if (!unref(reading)) {
				_push(`<!--[--><form class="crm-knowledge-toolbar crm-surface" aria-label="Поиск по базе знаний"><label class="crm-input-group crm-knowledge-search">`);
				_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
				_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" type="search" aria-label="Поиск по статьям" maxlength="100" placeholder="Найти инструкцию по названию или тексту">`);
				if (unref(search)) {
					_push(`<button type="button" class="crm-knowledge-clear crm-button" aria-label="Очистить поиск">`);
					_push(ssrRenderComponent(unref(X), { size: 17 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</label>`);
				if (unref(data)?.canWrite || unref(status) !== "PUBLISHED") _push(`<select class="crm-input" aria-label="Состояние статей"><option value="PUBLISHED"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "PUBLISHED") : ssrLooseEqual(unref(status), "PUBLISHED")) ? " selected" : ""}>Опубликованные</option><option value="DRAFT"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "DRAFT") : ssrLooseEqual(unref(status), "DRAFT")) ? " selected" : ""}>Черновики</option><option value="ARCHIVED"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ARCHIVED") : ssrLooseEqual(unref(status), "ARCHIVED")) ? " selected" : ""}>Архив</option><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(status)) ? ssrLooseContain(unref(status), "ALL") : ssrLooseEqual(unref(status), "ALL")) ? " selected" : ""}>Все состояния</option></select>`);
				else _push(`<!---->`);
				_push(`<button type="submit" class="crm-button crm-button--icon" aria-label="Обновить статьи" title="Обновить статьи"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`</button></form><div class="crm-knowledge-list-heading"><h2>${ssrInterpolate(unref(category) || "Все статьи")}</h2><span role="status">${ssrInterpolate(unref(loading) ? "Ищем статьи…" : "Найдено: " + (unref(data)?.total ?? 0))}</span></div>`);
				if (unref(listError)) {
					_push(`<div class="crm-knowledge-empty crm-surface" role="alert">`);
					_push(ssrRenderComponent(unref(BookOpen), { size: 30 }, null, _parent));
					_push(`<p>${ssrInterpolate(unref(listError))}</p><button class="crm-button">Повторить</button></div>`);
				} else {
					_push(`<section class="crm-knowledge-results" aria-label="Статьи базы знаний"${ssrRenderAttr("aria-busy", unref(loading))}>`);
					if (!unref(data)) {
						_push(`<div class="crm-knowledge-empty crm-surface">`);
						_push(ssrRenderComponent(unref(BookOpen), { size: 30 }, null, _parent));
						_push(`<p>Загружаем статьи…</p></div>`);
					} else if (!unref(data).items.length && !unref(loading)) {
						_push(`<div class="crm-knowledge-empty crm-surface">`);
						_push(ssrRenderComponent(unref(Search), { size: 30 }, null, _parent));
						_push(`<h2>Статьи не найдены</h2><p>Попробуйте другое название или выберите другой раздел.</p>`);
						if (unref(search) || unref(category) || unref(status) !== "PUBLISHED") _push(`<button class="crm-button">Сбросить фильтры</button>`);
						else if (unref(data).canWrite) {
							_push(`<button class="crm-button">`);
							_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
							_push(`Создать первую статью</button>`);
						} else _push(`<!---->`);
						_push(`</div>`);
					} else {
						_push(`<div class="crm-knowledge-grid"><!--[-->`);
						ssrRenderList(unref(data).items, (row) => {
							_push(`<button${ssrRenderAttr("id", "knowledge-" + row.id)} type="button" class="crm-knowledge-card crm-surface crm-button crm-card-action"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><span class="crm-knowledge-card-top"><span class="crm-knowledge-card-icon">`);
							_push(ssrRenderComponent(unref(FileText), { size: 20 }, null, _parent));
							_push(`</span><span class="crm-knowledge-category">${ssrInterpolate(row.category)}</span>`);
							if (row.status !== "PUBLISHED") _push(`<span class="crm-badge">${ssrInterpolate(labels[row.status])}</span>`);
							else _push(`<!---->`);
							_push(`</span><strong>${ssrInterpolate(row.title)}</strong><span class="crm-knowledge-excerpt">${ssrInterpolate(row.excerpt)}</span><span class="crm-knowledge-card-bottom"><small>Обновлена ${ssrInterpolate(date(row.updatedAt))}</small>`);
							_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
							_push(`</span></button>`);
						});
						_push(`<!--]--></div>`);
					}
					if (unref(data) && unref(data).pages > 1) {
						_push(`<div class="crm-knowledge-pagination"><span>Страница ${ssrInterpolate(unref(data).page)} из ${ssrInterpolate(unref(data).pages)}</span><div><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(data).page <= 1) ? " disabled" : ""} aria-label="Предыдущая страница">`);
						_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
						_push(`Назад</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(data).page >= unref(data).pages) ? " disabled" : ""}>Далее`);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
						_push(`</button></div></div>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				}
				_push(`<!--]-->`);
			} else {
				_push(`<!--[--><div class="crm-knowledge-back"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
				_push(`К статьям</button><span>${ssrInterpolate(unref(editing) ? unref(selected) ? "Редактирование" : "Новая статья" : unref(selected)?.category)}</span></div>`);
				if (unref(notice)) {
					_push(`<p class="crm-knowledge-notice crm-surface" role="status">`);
					_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
					_push(`${ssrInterpolate(unref(notice))}</p>`);
				} else _push(`<!---->`);
				if (unref(detailError)) {
					_push(`<p class="crm-knowledge-notice crm-surface" role="alert">${ssrInterpolate(unref(detailError))}`);
					if (!unref(editing) && unref(activeId)) _push(`<button class="crm-button">Повторить</button>`);
					else _push(`<!---->`);
					_push(`</p>`);
				} else _push(`<!---->`);
				if (unref(editing)) {
					_push(`<form class="crm-knowledge-editor crm-surface" aria-label="Редактор статьи"><fieldset${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><label class="crm-knowledge-field-wide">Название статьи<input${ssrRenderAttr("value", unref(form).title)} class="crm-input" required minlength="3" maxlength="200" placeholder="Например, как передать заказ на сборку"></label><label>Раздел<input${ssrRenderAttr("value", unref(form).category)} class="crm-input" list="knowledge-categories" required maxlength="80"><datalist id="knowledge-categories"><!--[-->`);
					ssrRenderList(unref(categories), (item) => {
						_push(`<option${ssrRenderAttr("value", item.name)}></option>`);
					});
					_push(`<!--]--></datalist></label>`);
					if (unref(selected)) {
						_push(`<label>Состояние<select class="crm-input" aria-label="Состояние статьи"><!--[-->`);
						ssrRenderList(labels, (label, key) => {
							_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).status) ? ssrLooseContain(unref(form).status, key) : ssrLooseEqual(unref(form).status, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label>`);
					} else {
						_push(`<div class="crm-knowledge-draft-note">`);
						_push(ssrRenderComponent(unref(FileText), { size: 18 }, null, _parent));
						_push(`<span>Новая статья будет сохранена как черновик</span></div>`);
					}
					_push(`<label class="crm-knowledge-field-wide">Текст инструкции<textarea class="crm-input" required minlength="10" maxlength="50000" rows="16" placeholder="Опишите действия по шагам. Разделяйте абзацы пустой строкой.">${ssrInterpolate(unref(form).body)}</textarea></label></fieldset><p class="crm-inline-note">Черновики и архив доступны редакторам. Опубликованные статьи видят сотрудники с доступом к поддержке.</p><div class="crm-knowledge-editor-footer"><span>${ssrInterpolate(unref(dirty) ? "Есть несохранённые изменения" : unref(selected) ? "Все изменения сохранены" : "Заполните название и текст статьи")}</span><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отмена</button><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
					_push(`${ssrInterpolate(unref(saving) ? "Сохраняем…" : unref(selected) ? "Сохранить статью" : "Создать черновик")}</button></div></form>`);
				} else if (unref(opening)) {
					_push(`<div class="crm-knowledge-empty crm-surface" role="status">`);
					_push(ssrRenderComponent(unref(BookOpen), { size: 30 }, null, _parent));
					_push(`<p>Открываем статью…</p></div>`);
				} else if (unref(selected)) {
					_push(`<article class="crm-knowledge-reader crm-surface" aria-label="Текст статьи"><div class="crm-knowledge-reader-tools"><span class="crm-badge">${ssrInterpolate(labels[unref(selected).status])}</span>`);
					if (unref(selected).canWrite) {
						_push(`<button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Pencil), { size: 17 }, null, _parent));
						_push(`Редактировать</button>`);
					} else _push(`<!---->`);
					_push(`</div><div class="crm-knowledge-prose"><h2 tabindex="-1">${ssrInterpolate(unref(selected).title)}</h2><div class="crm-knowledge-reader-meta"><span>`);
					_push(ssrRenderComponent(unref(Clock3), { size: 15 }, null, _parent));
					_push(`${ssrInterpolate(unref(readingMinutes))} мин на чтение</span><span>Обновлена ${ssrInterpolate(date(unref(selected).updatedAt))}</span></div><div class="crm-knowledge-text"><!--[-->`);
					ssrRenderList(unref(paragraphs), (paragraph, index) => {
						_push(`<p>${ssrInterpolate(paragraph)}</p>`);
					});
					_push(`<!--]--></div></div></article>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			}
			_push(`</div></div></main>`);
		};
	}
});
// components/crm/CrmKnowledgeBase.vue
var _sfc_setup$1 = CrmKnowledgeBase_vue_vue_type_script_setup_true_lang_default.setup;
CrmKnowledgeBase_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmKnowledgeBase.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmKnowledgeBase_default = Object.assign(CrmKnowledgeBase_vue_vue_type_script_setup_true_lang_default, { __name: "CrmKnowledgeBase" });
// components/workspace/SupportWorkspacePage.vue?vue&type=script&setup=true&lang.ts
var pageSize = 25;
var SupportWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SupportWorkspacePage",
	__ssrInlineRender: true,
	props: { pageSection: {} },
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const props = __props;
		const { token} = useWorkspaceSession();
		useContextMenu();
		const access = useWorkspaceAccess();
		const canCreate = computed(() => access.can("helpdesk.write"));
		const canWriteTicket = (ticket) => canCreate.value && ticket?.canWrite === true;
		const dashboard = ref(null);
		const tickets = ref([]);
		const agents = ref([]);
		const selected = ref(null);
		const createOpen = ref(false);
		const loading = ref(false);
		const loaded = ref(false), listPage = ref(1);
		const error = ref("");
		const notice = ref("");
		const search = ref("");
		const statusFilter = ref("");
		const sourceFilter = ref("");
		const comment = ref("");
		const internalComment = ref(false);
		const sendEmail = ref(false);
		watch(internalComment, (value) => {
			if (value) sendEmail.value = false;
		});
		const deliveryLabel = (status) => ({
			QUEUED: "Email ожидает отправки",
			PROCESSING: "Email отправляется",
			SENT: "Email отправлен",
			FAILED: "Email не отправлен",
			CANCELLED: "Отправка email отменена"
		})[status] || "Состояние email уточняется";
		const actionBusy = ref(false);
		ref(null);
		ref(null);
		const filtersActive = computed(() => Boolean(search.value || statusFilter.value || sourceFilter.value || queueFilter.value));
		const dialogOpen = computed(() => createOpen.value || Boolean(selected.value));
		watch(dialogOpen, async (open) => {});
		const queueFilter = computed(() => typeof route.query.queue === "string" ? route.query.queue : "");
		const section = computed(() => props.pageSection || String(route.query.section || "overview"));
		const form = reactive({
			subject: "",
			description: "",
			source: "EMPLOYEE",
			priority: "MEDIUM",
			affectedService: "Workspace"
		});
		const createDirty = computed(() => Boolean(form.subject.trim() || form.description.trim()));
		const statusLabels = {
			NEW: "Новая",
			OPEN: "В работе",
			WAITING_REQUESTER: "Ждём заявителя",
			WAITING_INTERNAL: "Внутреннее ожидание",
			RESOLVED: "Решена",
			CLOSED: "Закрыта"
		};
		const priorityLabels = {
			LOW: "Низкий",
			MEDIUM: "Обычный",
			HIGH: "Высокий",
			CRITICAL: "Критический"
		};
		const sourceLabels = {
			EMPLOYEE: "Сотрудник",
			B2C: "Клиент B2C",
			B2B: "Клиент B2B",
			SYSTEM: "Система"
		};
		const filtered = computed(() => tickets.value.filter((ticket) => (!queueFilter.value || (ticket.queue || "Первая линия") === queueFilter.value) && (!statusFilter.value || ticket.status === statusFilter.value) && (!sourceFilter.value || ticket.source === sourceFilter.value) && (!search.value || `${ticket.number} ${ticket.subject} ${ticket.requesterEmail || ""}`.toLowerCase().includes(search.value.toLowerCase()))));
		const listPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
		const visibleTickets = computed(() => filtered.value.slice((listPage.value - 1) * pageSize, listPage.value * pageSize));
		watch([
			search,
			statusFilter,
			sourceFilter,
			queueFilter
		], () => {
			listPage.value = 1;
		});
		watch(listPages, (value) => {
			if (listPage.value > value) listPage.value = value;
		});
		const attentionTickets = computed(() => tickets.value.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).slice(0, 6));
		const queues = computed(() => Array.from(new Set(tickets.value.map((ticket) => ticket.queue || "Первая линия"))).map((queue) => ({
			name: queue,
			total: tickets.value.filter((ticket) => (ticket.queue || "Первая линия") === queue).length,
			open: tickets.value.filter((ticket) => (ticket.queue || "Первая линия") === queue && !["RESOLVED", "CLOSED"].includes(ticket.status)).length
		})));
		const slaState = (ticket) => ticket.resolutionDueAt && new Date(ticket.resolutionDueAt) < /* @__PURE__ */ new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status) ? "Просрочена" : "В срок";
		function requester(ticket) {
			return [ticket.requesterUser?.firstName, ticket.requesterUser?.lastName].filter(Boolean).join(" ") || ticket.requesterName || ticket.requesterEmail || sourceLabels[ticket.source];
		}
		function fail(e) {
			error.value = Array.isArray(e?.data?.message) ? e.data.message.join(", ") : e?.data?.message || "Действие не выполнено. Повторите попытку.";
		}
		function closeTicket() {
			if (actionBusy.value || comment.value.trim() && !(void 0).confirm("Отменить неотправленный комментарий?")) return false;
			selected.value = null;
			comment.value = "";
			internalComment.value = false;
			sendEmail.value = false;
			return true;
		}
		function openTicket(ticket) {
			if (closeTicket()) {
				selected.value = ticket;
				error.value = "";
			}
		}
		const ticketsPath = computed(() => route.path.startsWith("/crm/") ? "/crm/support/tickets" : "/helpdesk/tickets");
		onBeforeRouteLeave(() => !actionBusy.value && (!(comment.value.trim() || createOpen.value && createDirty.value) || (void 0).confirm("Уйти без сохранения заявки или комментария?")));
		let targetVersion = 0;
		async function openRequestedTicket() {
			const id = route.query.ticket, identity = token.value, version = ++targetVersion;
			if (typeof id !== "string" || !id || !identity) return;
			try {
				const ticket = await $fetch$1(`/helpdesk/tickets/${encodeURIComponent(id)}`, {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` }
				});
				if (version === targetVersion && identity === token.value) openTicket(ticket);
			} catch (e) {
				if (version === targetVersion && identity === token.value) {
					if (closeTicket()) fail(e);
				}
			}
		}
		watch(() => route.query.ticket, openRequestedTicket);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmKnowledgeBase = CrmKnowledgeBase_default;
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_NuxtLink = NuxtLink;
			if (unref(section) === "knowledge") _push(ssrRenderComponent(_component_CrmKnowledgeBase, _attrs, null, _parent));
			else {
				_push(`<main${ssrRenderAttrs(mergeProps({
					"data-v-ui-9200e9d7b7db": "",
					class: "helpdesk-page crm-standard crm-management-workspace"
				}, _attrs))}><header data-v-ui-9200e9d7b7db class="hd-header crm-page-header"><div data-v-ui-9200e9d7b7db><h1 data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(section) === "tickets" ? "Все заявки" : unref(section) === "queues" ? "Очереди поддержки" : unref(section) === "knowledge" ? "База знаний" : "Центр поддержки")}</h1><span data-v-ui-9200e9d7b7db>Обращения сотрудников и клиентов, исполнители и сроки решения</span></div><div data-v-ui-9200e9d7b7db><button data-v-ui-9200e9d7b7db class="outline crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(actionBusy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-9200e9d7b7db": "",
					size: 16,
					class: { spin: unref(loading) }
				}, null, _parent));
				_push(` Обновить</button>`);
				if (unref(canCreate)) {
					_push(`<button data-v-ui-9200e9d7b7db class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), {
						"data-v-ui-9200e9d7b7db": "",
						size: 16
					}, null, _parent));
					_push(` Новая заявка</button>`);
				} else _push(`<!---->`);
				_push(`</div></header>`);
				if (unref(error) && unref(loaded)) _push(`<p data-v-ui-9200e9d7b7db class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (!unref(loaded) && unref(loading)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем обращения" }, null, _parent));
				else if (unref(error) && !unref(loaded)) {
					_push(`<div data-v-ui-9200e9d7b7db class="crm-management-error">`);
					_push(ssrRenderComponent(unref(AlertCircle), {
						"data-v-ui-9200e9d7b7db": "",
						size: 22
					}, null, _parent));
					_push(`<span data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(error))}</span><button class="crm-button" data-v-ui-9200e9d7b7db>Повторить</button></div>`);
				} else {
					_push(`<div data-v-ui-9200e9d7b7db class="hd-body crm-page-content">`);
					if (unref(section) === "overview") {
						_push(`<!--[--><section data-v-ui-9200e9d7b7db class="hd-kpis"><article class="crm-surface" data-v-ui-9200e9d7b7db><span data-v-ui-9200e9d7b7db>Новые</span><strong data-v-ui-9200e9d7b7db class="coral">${ssrInterpolate(unref(dashboard)?.new || 0)}</strong><small data-v-ui-9200e9d7b7db>ещё не распределены</small></article><article class="crm-surface" data-v-ui-9200e9d7b7db><span data-v-ui-9200e9d7b7db>В работе</span><strong data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(dashboard)?.inWork || 0)}</strong><small data-v-ui-9200e9d7b7db>есть исполнитель</small></article><article class="crm-surface" data-v-ui-9200e9d7b7db><span data-v-ui-9200e9d7b7db>Ожидают</span><strong data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(dashboard)?.waiting || 0)}</strong><small data-v-ui-9200e9d7b7db>ответа или действия</small></article><article class="crm-surface" data-v-ui-9200e9d7b7db><span data-v-ui-9200e9d7b7db>Просрочены</span><strong data-v-ui-9200e9d7b7db class="${ssrRenderClass({ "red": unref(dashboard)?.overdue })}">${ssrInterpolate(unref(dashboard)?.overdue || 0)}</strong><small data-v-ui-9200e9d7b7db>нарушен SLA</small></article></section><section data-v-ui-9200e9d7b7db class="hd-grid"><article data-v-ui-9200e9d7b7db class="panel crm-surface"><div data-v-ui-9200e9d7b7db class="panel-head"><div data-v-ui-9200e9d7b7db><h2 data-v-ui-9200e9d7b7db>Требуют внимания</h2></div>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							"data-v-ui-9200e9d7b7db": "",
							to: unref(ticketsPath)
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`Все заявки`);
								else return [createTextVNode("Все заявки")];
							}),
							_: 1
						}, _parent));
						_push(`</div><!--[-->`);
						ssrRenderList(unref(attentionTickets), (ticket) => {
							_push(`<div data-v-ui-9200e9d7b7db class="ticket-compact" role="button" tabindex="0"><i data-v-ui-9200e9d7b7db class="${ssrRenderClass(`priority-${ticket.priority.toLowerCase()}`)}"></i><span data-v-ui-9200e9d7b7db><strong data-v-ui-9200e9d7b7db>${ssrInterpolate(ticket.subject)}</strong><small data-v-ui-9200e9d7b7db>${ssrInterpolate(ticket.number)} · ${ssrInterpolate(requester(ticket))}</small></span><b data-v-ui-9200e9d7b7db class="${ssrRenderClass({ "overdue": slaState(ticket) === "Просрочена" })}">${ssrInterpolate(slaState(ticket))}</b></div>`);
						});
						_push(`<!--]-->`);
						if (!unref(attentionTickets).length) _push(`<p data-v-ui-9200e9d7b7db class="empty">Нет открытых обращений</p>`);
						else _push(`<!---->`);
						_push(`</article><article data-v-ui-9200e9d7b7db class="panel crm-surface"><div data-v-ui-9200e9d7b7db class="panel-head"><div data-v-ui-9200e9d7b7db><h2 data-v-ui-9200e9d7b7db>Откуда обращаются</h2></div></div><!--[-->`);
						ssrRenderList([
							"EMPLOYEE",
							"B2C",
							"B2B",
							"SYSTEM"
						], (source) => {
							_push(`<div data-v-ui-9200e9d7b7db class="source-row"><span data-v-ui-9200e9d7b7db>${ssrInterpolate(sourceLabels[source])}</span><b data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(tickets).filter((ticket) => ticket.source === source).length)}</b><i data-v-ui-9200e9d7b7db><em data-v-ui-9200e9d7b7db style="${ssrRenderStyle({ width: `${unref(tickets).length ? unref(tickets).filter((ticket) => ticket.source === source).length / unref(tickets).length * 100 : 0}%` })}"></em></i></div>`);
						});
						_push(`<!--]--></article></section><!--]-->`);
					} else if (unref(section) === "tickets") {
						_push(`<section data-v-ui-9200e9d7b7db class="panel ticket-panel crm-surface">`);
						if (unref(queueFilter)) _push(`<p data-v-ui-9200e9d7b7db class="queue-label">Очередь: ${ssrInterpolate(unref(queueFilter))}</p>`);
						else _push(`<!---->`);
						_push(`<div data-v-ui-9200e9d7b7db class="filters crm-toolbar"><label class="crm-input-group" data-v-ui-9200e9d7b7db>`);
						_push(ssrRenderComponent(unref(Search), {
							"data-v-ui-9200e9d7b7db": "",
							size: 16
						}, null, _parent));
						_push(`<input class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(search))} placeholder="Номер, тема или заявитель" aria-label="Поиск заявок"></label><select class="crm-input" data-v-ui-9200e9d7b7db aria-label="Статус заявки"><option data-v-ui-9200e9d7b7db value=""${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), "") : ssrLooseEqual(unref(statusFilter), "")) ? " selected" : ""}>Все статусы</option><!--[-->`);
						ssrRenderList(statusLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(statusFilter)) ? ssrLooseContain(unref(statusFilter), id) : ssrLooseEqual(unref(statusFilter), id)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select><select class="crm-input" data-v-ui-9200e9d7b7db aria-label="Источник заявки"><option data-v-ui-9200e9d7b7db value=""${ssrIncludeBooleanAttr(Array.isArray(unref(sourceFilter)) ? ssrLooseContain(unref(sourceFilter), "") : ssrLooseEqual(unref(sourceFilter), "")) ? " selected" : ""}>Все источники</option><!--[-->`);
						ssrRenderList(sourceLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(sourceFilter)) ? ssrLooseContain(unref(sourceFilter), id) : ssrLooseEqual(unref(sourceFilter), id)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select>`);
						if (unref(search) || unref(statusFilter) || unref(sourceFilter) || unref(queueFilter)) _push(`<button class="crm-button" data-v-ui-9200e9d7b7db>Сбросить</button>`);
						else _push(`<!---->`);
						_push(`</div><p class="hd-result-summary" role="status">Заявок: ${ssrInterpolate(unref(filtered).length)}`);
						if (unref(filtersActive)) _push(`<!--[--> из ${ssrInterpolate(unref(tickets).length)}<!--]-->`);
						else _push(`<!---->`);
						_push(`</p><div data-v-ui-9200e9d7b7db class="ticket-table"><div data-v-ui-9200e9d7b7db class="ticket-row head crm-table-head"><span data-v-ui-9200e9d7b7db>Заявка</span><span data-v-ui-9200e9d7b7db>Заявитель</span><span data-v-ui-9200e9d7b7db>Источник</span><span data-v-ui-9200e9d7b7db>Приоритет</span><span data-v-ui-9200e9d7b7db>Статус</span><span data-v-ui-9200e9d7b7db>SLA</span></div><!--[-->`);
						ssrRenderList(unref(visibleTickets), (ticket) => {
							_push(`<div data-v-ui-9200e9d7b7db class="ticket-row crm-table-row" role="button" tabindex="0"><div data-v-ui-9200e9d7b7db><strong data-v-ui-9200e9d7b7db>${ssrInterpolate(ticket.subject)}</strong><small data-v-ui-9200e9d7b7db>${ssrInterpolate(ticket.number)} · ${ssrInterpolate(new Date(ticket.createdAt).toLocaleString("ru-RU"))}</small></div><span data-v-ui-9200e9d7b7db class="hd-ticket-cell" data-label="Заявитель">${ssrInterpolate(requester(ticket))}</span><span data-v-ui-9200e9d7b7db class="hd-ticket-cell" data-label="Источник">${ssrInterpolate(sourceLabels[ticket.source])}</span><span data-v-ui-9200e9d7b7db data-label="Приоритет" class="${ssrRenderClass([`text-${ticket.priority.toLowerCase()}`, "hd-ticket-cell"])}">${ssrInterpolate(priorityLabels[ticket.priority])}</span><span data-v-ui-9200e9d7b7db class="hd-ticket-cell" data-label="Статус">${ssrInterpolate(statusLabels[ticket.status])}</span><span data-v-ui-9200e9d7b7db data-label="Срок" class="${ssrRenderClass([{ "red": slaState(ticket) === "Просрочена" }, "hd-ticket-cell"])}">${ssrInterpolate(slaState(ticket))}</span></div>`);
						});
						_push(`<!--]-->`);
						if (!unref(filtered).length) _push(`<p data-v-ui-9200e9d7b7db class="empty" role="status">${ssrInterpolate(unref(filtersActive) ? "По заданным условиям заявок нет. Измените или сбросьте фильтры." : "Заявок пока нет. Новые обращения появятся здесь.")}</p>`);
						else _push(`<!---->`);
						_push(`</div>`);
						if (unref(listPages) > 1) _push(`<nav class="crm-management-pagination" aria-label="Страницы заявок"><span>${ssrInterpolate(unref(listPage))} из ${ssrInterpolate(unref(listPages))} · всего ${ssrInterpolate(unref(filtered).length)}</span><div><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(listPage) <= 1) ? " disabled" : ""}>Назад</button><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(listPage) >= unref(listPages)) ? " disabled" : ""}>Далее</button></div></nav>`);
						else _push(`<!---->`);
						_push(`</section>`);
					} else if (unref(section) === "queues") {
						_push(`<section data-v-ui-9200e9d7b7db class="queue-grid"><!--[-->`);
						ssrRenderList(unref(queues), (queue) => {
							_push(`<article data-v-ui-9200e9d7b7db><div data-v-ui-9200e9d7b7db>`);
							_push(ssrRenderComponent(unref(Users), {
								"data-v-ui-9200e9d7b7db": "",
								size: 19
							}, null, _parent));
							_push(`<span data-v-ui-9200e9d7b7db>${ssrInterpolate(queue.name)}</span></div><strong data-v-ui-9200e9d7b7db>${ssrInterpolate(queue.open)}</strong><small data-v-ui-9200e9d7b7db>в работе · всего ${ssrInterpolate(queue.total)}</small><button class="crm-button" data-v-ui-9200e9d7b7db>Открыть очередь</button></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(queues).length) _push(`<article data-v-ui-9200e9d7b7db class="empty-card">Очереди появятся после первой заявки</article>`);
						else _push(`<!---->`);
						_push(`</section>`);
					} else {
						_push(`<section data-v-ui-9200e9d7b7db class="knowledge"><div class="crm-surface crm-surface--tint" data-v-ui-9200e9d7b7db><p data-v-ui-9200e9d7b7db class="eyebrow">САМООБСЛУЖИВАНИЕ</p><h2 data-v-ui-9200e9d7b7db>База знаний</h2><span data-v-ui-9200e9d7b7db class="knowledge-status">Скоро</span><p data-v-ui-9200e9d7b7db>Раздел пока недоступен: инструкции и готовые ответы ещё готовятся. Если нужна помощь сейчас, создайте заявку кнопкой «Новая заявка».</p></div><div data-v-ui-9200e9d7b7db class="knowledge-grid"><article class="crm-surface" data-v-ui-9200e9d7b7db>`);
						_push(ssrRenderComponent(unref(Headphones), {
							"data-v-ui-9200e9d7b7db": "",
							size: 20
						}, null, _parent));
						_push(`<h3 data-v-ui-9200e9d7b7db>Рабочие системы</h3><p data-v-ui-9200e9d7b7db>Вход, права доступа и работа внутренних кабинетов.</p><span data-v-ui-9200e9d7b7db>Материалы готовятся</span></article><article class="crm-surface" data-v-ui-9200e9d7b7db>`);
						_push(ssrRenderComponent(unref(MessageSquare), {
							"data-v-ui-9200e9d7b7db": "",
							size: 20
						}, null, _parent));
						_push(`<h3 data-v-ui-9200e9d7b7db>Клиентский сервис</h3><p data-v-ui-9200e9d7b7db>Ответы по заказам, оплате, доставке и возвратам.</p><span data-v-ui-9200e9d7b7db>Материалы готовятся</span></article><article class="crm-surface" data-v-ui-9200e9d7b7db>`);
						_push(ssrRenderComponent(unref(CheckCircle2), {
							"data-v-ui-9200e9d7b7db": "",
							size: 20
						}, null, _parent));
						_push(`<h3 data-v-ui-9200e9d7b7db>1С и интеграции</h3><p data-v-ui-9200e9d7b7db>Синхронизация товаров, остатков и каналов продаж.</p><span data-v-ui-9200e9d7b7db>Материалы готовятся</span></article></div></section>`);
					}
					_push(`</div>`);
				}
				ssrRenderTeleport(_push, (_push) => {
					if (unref(createOpen) && unref(canCreate)) {
						_push(`<aside data-v-ui-9200e9d7b7db class="backdrop admin-dialog-backdrop crm-management-backdrop"><form data-v-ui-9200e9d7b7db class="drawer create admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="support-create-title"><header data-v-ui-9200e9d7b7db><div data-v-ui-9200e9d7b7db><h2 id="support-create-title" data-v-ui-9200e9d7b7db>Создать заявку</h2></div><button class="crm-button" data-v-ui-9200e9d7b7db type="button" aria-label="Закрыть создание заявки"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(X), {
							"data-v-ui-9200e9d7b7db": "",
							size: 18
						}, null, _parent));
						_push(`</button></header><div data-v-ui-9200e9d7b7db class="drawer-scroll admin-dialog-body">`);
						if (unref(error)) _push(`<p data-v-ui-9200e9d7b7db class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<fieldset data-v-ui-9200e9d7b7db ui-inline-i-9200e9d7b7db-1${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}><label data-v-ui-9200e9d7b7db>Тема<input class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(form).subject)} required placeholder="Кратко опишите проблему"></label><label data-v-ui-9200e9d7b7db>Подробное описание<textarea class="crm-input" data-v-ui-9200e9d7b7db rows="7" required placeholder="Что произошло и какой результат ожидался">${ssrInterpolate(unref(form).description)}</textarea></label><div data-v-ui-9200e9d7b7db class="two"><label data-v-ui-9200e9d7b7db>Источник<select class="crm-input" data-v-ui-9200e9d7b7db><!--[-->`);
						ssrRenderList(sourceLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).source) ? ssrLooseContain(unref(form).source, id) : ssrLooseEqual(unref(form).source, id)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label><label data-v-ui-9200e9d7b7db>Приоритет<select class="crm-input" data-v-ui-9200e9d7b7db><!--[-->`);
						ssrRenderList(priorityLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).priority) ? ssrLooseContain(unref(form).priority, id) : ssrLooseEqual(unref(form).priority, id)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label></div><label data-v-ui-9200e9d7b7db>Затронутый сервис<input class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(form).affectedService)} placeholder="Например, 1С или личный кабинет"></label><div data-v-ui-9200e9d7b7db class="sla-note">`);
						_push(ssrRenderComponent(unref(Clock3), {
							"data-v-ui-9200e9d7b7db": "",
							size: 17
						}, null, _parent));
						_push(`<span data-v-ui-9200e9d7b7db><strong data-v-ui-9200e9d7b7db>SLA будет рассчитан автоматически</strong><small data-v-ui-9200e9d7b7db>По приоритету в календарных часах. Рабочие дни пока не учитываются.</small></span></div></fieldset></div><footer data-v-ui-9200e9d7b7db><button class="crm-button" data-v-ui-9200e9d7b7db type="button"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Отмена</button><button data-v-ui-9200e9d7b7db class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>${ssrInterpolate(unref(actionBusy) ? "Создаём…" : "Создать заявку")}</button></footer></form></aside>`);
					} else _push(`<!---->`);
				}, "body", !unref(route).path.startsWith("/crm/"), _parent);
				ssrRenderTeleport(_push, (_push) => {
					if (unref(selected)) {
						_push(`<aside data-v-ui-9200e9d7b7db class="backdrop admin-dialog-backdrop crm-management-backdrop"><section data-v-ui-9200e9d7b7db class="drawer ticket-detail admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="support-detail-title"><header data-v-ui-9200e9d7b7db><div data-v-ui-9200e9d7b7db><p data-v-ui-9200e9d7b7db class="eyebrow">${ssrInterpolate(unref(selected).number)}</p><h2 id="support-detail-title" data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(selected).subject)}</h2><span data-v-ui-9200e9d7b7db>${ssrInterpolate(sourceLabels[unref(selected).source])} · ${ssrInterpolate(requester(unref(selected)))}</span></div><button class="crm-button crm-button--icon" data-v-ui-9200e9d7b7db aria-label="Закрыть заявку"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(X), {
							"data-v-ui-9200e9d7b7db": "",
							size: 18
						}, null, _parent));
						_push(`</button></header><div data-v-ui-9200e9d7b7db class="drawer-scroll admin-dialog-body">`);
						if (unref(error)) _push(`<p data-v-ui-9200e9d7b7db class="operation-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<fieldset data-v-ui-9200e9d7b7db ui-inline-i-9200e9d7b7db-2 class="control-grid"${ssrIncludeBooleanAttr(unref(actionBusy) || !canWriteTicket(unref(selected))) ? " disabled" : ""}><label data-v-ui-9200e9d7b7db>Статус<select class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(selected).status)}><!--[-->`);
						ssrRenderList(statusLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label><label data-v-ui-9200e9d7b7db>Приоритет<select class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(selected).priority)}><!--[-->`);
						ssrRenderList(priorityLabels, (label, id) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", id)}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label><label data-v-ui-9200e9d7b7db>Исполнитель<select class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(selected).assignedToId || "")}><option data-v-ui-9200e9d7b7db value="">Не назначен</option><!--[-->`);
						ssrRenderList(unref(agents), (agent) => {
							_push(`<option data-v-ui-9200e9d7b7db${ssrRenderAttr("value", agent.id)}>${ssrInterpolate([agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email)}</option>`);
						});
						_push(`<!--]--></select></label><label data-v-ui-9200e9d7b7db>Очередь<input class="crm-input" data-v-ui-9200e9d7b7db${ssrRenderAttr("value", unref(selected).queue)}></label></fieldset><p data-v-ui-9200e9d7b7db class="muted">Изменения полей сохраняются сразу. Допустимость действия проверяет сервер.</p><div data-v-ui-9200e9d7b7db class="ticket-actions">`);
						if (canWriteTicket(unref(selected)) && ![
							"OPEN",
							"RESOLVED",
							"CLOSED"
						].includes(unref(selected).status)) _push(`<button class="crm-button" data-v-ui-9200e9d7b7db${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Взять в работу</button>`);
						else _push(`<!---->`);
						if (canWriteTicket(unref(selected)) && !["RESOLVED", "CLOSED"].includes(unref(selected).status)) _push(`<button class="crm-button" data-v-ui-9200e9d7b7db${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Решить заявку</button>`);
						else _push(`<!---->`);
						_push(`<button class="crm-button" data-v-ui-9200e9d7b7db${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>Копировать номер</button></div><section data-v-ui-9200e9d7b7db class="request-text"><h3 data-v-ui-9200e9d7b7db>Описание</h3><p data-v-ui-9200e9d7b7db>${ssrInterpolate(unref(selected).description)}</p></section><section data-v-ui-9200e9d7b7db class="comments"><p class="crm-muted">Комментарии сохраняются в CRM. Чтобы отправить ответ клиенту, отметьте «Отправить на email». Для доставки должна быть настроена почта.</p><h3 data-v-ui-9200e9d7b7db>Обсуждение</h3><!--[-->`);
						ssrRenderList(unref(selected).comments, (item) => {
							_push(`<div data-v-ui-9200e9d7b7db class="${ssrRenderClass(["comment", { internal: item.isInternal }])}"><div data-v-ui-9200e9d7b7db><strong data-v-ui-9200e9d7b7db>${ssrInterpolate([item.author?.firstName, item.author?.lastName].filter(Boolean).join(" ") || item.author?.email || "Заявитель")}</strong>`);
							if (item.isInternal) _push(`<span data-v-ui-9200e9d7b7db>Внутренний комментарий</span>`);
							else _push(`<!---->`);
							if (item.emailDelivery) _push(`<span role="status">${ssrInterpolate(deliveryLabel(item.emailDelivery.status))}</span>`);
							else _push(`<!---->`);
							_push(`<small data-v-ui-9200e9d7b7db>${ssrInterpolate(new Date(item.createdAt).toLocaleString("ru-RU"))}</small></div><p data-v-ui-9200e9d7b7db>${ssrInterpolate(item.body)}</p></div>`);
						});
						_push(`<!--]-->`);
						if (!unref(selected).comments?.length) _push(`<p data-v-ui-9200e9d7b7db class="empty">Комментариев пока нет</p>`);
						else _push(`<!---->`);
						_push(`</section></div>`);
						if (canWriteTicket(unref(selected))) {
							_push(`<footer data-v-ui-9200e9d7b7db class="reply"><textarea class="crm-input" data-v-ui-9200e9d7b7db aria-label="Комментарий к заявке"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} rows="2" placeholder="Сохранить комментарий в заявке">${ssrInterpolate(unref(comment))}</textarea><label class="crm-toggle-row" data-v-ui-9200e9d7b7db><input class="crm-check" data-v-ui-9200e9d7b7db${ssrIncludeBooleanAttr(Array.isArray(unref(internalComment)) ? ssrLooseContain(unref(internalComment), null) : unref(internalComment)) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} type="checkbox"> Только для сотрудников</label><label class="crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(sendEmail)) ? ssrLooseContain(unref(sendEmail), null) : unref(sendEmail)) ? " checked" : ""}${ssrIncludeBooleanAttr(unref(actionBusy) || unref(internalComment) || !unref(selected).requesterEmail) ? " disabled" : ""} type="checkbox"> Отправить на email: ${ssrInterpolate(unref(selected).requesterEmail || "не указан")}</label><button data-v-ui-9200e9d7b7db class="send crm-button crm-button--primary" aria-label="Сохранить комментарий"${ssrIncludeBooleanAttr(unref(actionBusy) || !unref(comment).trim()) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Send), {
								"data-v-ui-9200e9d7b7db": "",
								size: 16
							}, null, _parent));
							_push(`${ssrInterpolate(unref(actionBusy) ? "Сохраняем…" : "Сохранить")}</button></footer>`);
						} else _push(`<!---->`);
						_push(`</section></aside>`);
					} else _push(`<!---->`);
				}, "body", !unref(route).path.startsWith("/crm/"), _parent);
				if (unref(notice)) _push(`<div data-v-ui-9200e9d7b7db class="toast">${ssrInterpolate(unref(notice))}</div>`);
				else _push(`<!---->`);
				_push(`</main>`);
			}
		};
	}
});
// components/workspace/SupportWorkspacePage.vue
var _sfc_setup = SupportWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
SupportWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/SupportWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SupportWorkspacePage_default = Object.assign(SupportWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "SupportWorkspacePage" });

export { SupportWorkspacePage_default as S };;globalThis.__timing__.logEnd('Load chunks/build/SupportWorkspacePage-1ZlDEmZh');
//# sourceMappingURL=SupportWorkspacePage-1ZlDEmZh.mjs.map
