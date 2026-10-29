globalThis.__timing__.logStart('Load chunks/build/courses-Bibxvzaf');import { u as useHead, a as useWorkspaceSession, b as useWorkspaceAccess } from '../virtual/entry.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, ref, reactive, computed, watch, mergeProps, unref, isRef, useSSRContext } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderList, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { Plus, BookOpen, RefreshCw, ChevronRight, ArrowLeft, Check, Video, FileText, Layers, Ticket, Save, MessageCircle, UploadCloud } from '@lucide/vue';
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

// components/workspace/CourseLiveManagement.vue?vue&type=script&setup=true&lang.ts
var CourseLiveManagement_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CourseLiveManagement",
	__ssrInlineRender: true,
	props: {
		courseId: {},
		modules: {}
	},
	setup(__props) {
		const props = __props;
		const session = useWorkspaceSession();
		const lives = ref([]), hosts = ref([]), messages = ref([]);
		const loading = ref(false), saving = ref(false), error = ref(""), chatError = ref(""), notice = ref(""), selected = ref(null), formOpen = ref(false);
		const form = reactive({
			lessonId: "",
			hostId: "",
			title: "",
			startsAt: "",
			endsAt: ""
		});
		const liveLessons = computed(() => props.modules.flatMap((module) => module.lessons || []).filter((lesson) => lesson.kind === "LIVE"));
		const currentId = computed(() => session.user.value?.id || "");
		const isHost = computed(() => selected.value?.hostId === currentId.value);
		const states = {
			SCHEDULED: "Запланирован",
			LIVE: "Идёт эфир",
			ENDED: "Завершён",
			CANCELLED: "Отменён"
		};
		const formatDate = (value) => {
			const date = new Date(value);
			return Number.isFinite(date.getTime()) ? date.toLocaleString("ru-RU", {
				dateStyle: "medium",
				timeStyle: "short"
			}) : "Дата уточняется";
		};
		const hostName = (id) => hosts.value.find((host) => host.id === id)?.name || "Ведущий";
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "course-panel course-live" }, _attrs))}><header><div><h3>Прямые эфиры</h3><p>Назначьте ведущего и время эфира для урока. Запуск и чат доступны назначенному ведущему.</p></div><div class="course-actions"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
			_push(` Обновить</button>`);
			if (!unref(error) && !unref(loading)) {
				_push(`<button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(!unref(liveLessons).length) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
				_push(` Запланировать</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(loading)) _push(`<p role="status" class="course-hint">Загружаем эфиры…</p>`);
			else _push(`<!---->`);
			if (unref(error)) _push(`<p role="alert" class="course-error">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status" class="course-success">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (!unref(loading) && !unref(error)) {
				_push(`<!--[-->`);
				if (!unref(liveLessons).length) _push(`<p class="course-hint">Сначала добавьте в программу урок типа «Прямой эфир».</p>`);
				else _push(`<!---->`);
				if (unref(formOpen)) {
					_push(`<form class="course-editor crm-surface"><h3>Запланировать эфир</h3><label>Урок<select class="crm-input" required><!--[-->`);
					ssrRenderList(unref(liveLessons), (lesson) => {
						_push(`<option${ssrRenderAttr("value", lesson.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).lessonId) ? ssrLooseContain(unref(form).lessonId, lesson.id) : ssrLooseEqual(unref(form).lessonId, lesson.id)) ? " selected" : ""}>${ssrInterpolate(lesson.title)}</option>`);
					});
					_push(`<!--]--></select></label><label>Название эфира<input${ssrRenderAttr("value", unref(form).title)} class="crm-input" required maxlength="200"></label><label>Ведущий<select class="crm-input" required><option value="" disabled${ssrIncludeBooleanAttr(Array.isArray(unref(form).hostId) ? ssrLooseContain(unref(form).hostId, "") : ssrLooseEqual(unref(form).hostId, "")) ? " selected" : ""}>Выберите сотрудника</option><!--[-->`);
					ssrRenderList(unref(hosts), (host) => {
						_push(`<option${ssrRenderAttr("value", host.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(form).hostId) ? ssrLooseContain(unref(form).hostId, host.id) : ssrLooseEqual(unref(form).hostId, host.id)) ? " selected" : ""}>${ssrInterpolate(host.name)}</option>`);
					});
					_push(`<!--]--></select></label><div class="course-form-grid"><label>Начало<input${ssrRenderAttr("value", unref(form).startsAt)} class="crm-input" type="datetime-local" required></label><label>Окончание<input${ssrRenderAttr("value", unref(form).endsAt)} class="crm-input" type="datetime-local" required></label></div><p class="course-hint">Время указано в часовом поясе этого устройства.</p><footer><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отмена</button><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Запланировать")}</button></footer></form>`);
				} else _push(`<!---->`);
				if (unref(lives).length) {
					_push(`<div class="course-modules"><!--[-->`);
					ssrRenderList(unref(lives), (item) => {
						_push(`<article class="course-module crm-surface"><header><div><h4>${ssrInterpolate(item.title)}</h4><small>${ssrInterpolate(formatDate(item.startsAt))} — ${ssrInterpolate(formatDate(item.endsAt))} · ${ssrInterpolate(hostName(item.hostId))}</small><small>${ssrInterpolate(states[item.status])}</small></div>`);
						if (item.hostId === unref(currentId)) {
							_push(`<div class="course-actions">`);
							if (item.status === "SCHEDULED") _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Начать</button>`);
							else _push(`<!---->`);
							if (item.status === "LIVE") _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Завершить</button>`);
							else _push(`<!---->`);
							if (item.status === "SCHEDULED") _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Отменить</button>`);
							else _push(`<!---->`);
							_push(`<button type="button" class="crm-button">`);
							_push(ssrRenderComponent(unref(MessageCircle), { size: 16 }, null, _parent));
							_push(` Чат</button></div>`);
						} else _push(`<!---->`);
						_push(`</header></article>`);
					});
					_push(`<!--]--></div>`);
				} else if (!unref(formOpen)) _push(`<div class="course-empty crm-surface"><h3>Эфиров пока нет</h3><p>Добавьте урок прямого эфира и запланируйте встречу.</p></div>`);
				else _push(`<!---->`);
				if (unref(selected) && unref(isHost)) {
					_push(`<section class="course-module crm-surface course-live-chat"><header><div><h3>Чат: ${ssrInterpolate(unref(selected).title)}</h3><p>Сообщения участников</p></div><button type="button" class="crm-button">`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
					_push(` Обновить чат</button></header>`);
					if (unref(chatError)) _push(`<p class="course-error" role="alert">${ssrInterpolate(unref(chatError))}</p>`);
					else if (unref(messages).length) {
						_push(`<div class="course-live-messages"><!--[-->`);
						ssrRenderList(unref(messages), (entry) => {
							_push(`<article><strong>${ssrInterpolate(entry.authorName)}</strong><small>${ssrInterpolate(formatDate(entry.createdAt))}</small><p>${ssrInterpolate(entry.body)}</p></article>`);
						});
						_push(`<!--]--></div>`);
					} else _push(`<p class="course-hint">Сообщений пока нет.</p>`);
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/workspace/CourseLiveManagement.vue
var _sfc_setup$3 = CourseLiveManagement_vue_vue_type_script_setup_true_lang_default.setup;
CourseLiveManagement_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/CourseLiveManagement.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var CourseLiveManagement_default = Object.assign(CourseLiveManagement_vue_vue_type_script_setup_true_lang_default, { __name: "CourseLiveManagement" });
// components/workspace/CourseLessonAssets.vue?vue&type=script&setup=true&lang.ts
var CourseLessonAssets_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CourseLessonAssets",
	__ssrInlineRender: true,
	props: {
		lessonId: {},
		kind: {},
		editable: { type: Boolean }
	},
	emits: ["busyChange"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		useWorkspaceSession();
		const assets = ref([]), selected = ref(null);
		const loading = ref(true), uploading = ref(false), deleting = ref(""), error = ref(""), notice = ref("");
		computed(() => `/lms/admin/lessons/${encodeURIComponent(props.lessonId)}/assets`);
		const accept = computed(() => props.kind === "VIDEO" ? ".mp4,.webm,video/mp4,video/webm" : ".pdf,application/pdf");
		const size = (bytes) => bytes >= 1048576 ? `${(bytes / 1024 / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ` : `${Math.max(1, Math.ceil(bytes / 1024))} КБ`;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "course-asset-editor",
				"aria-label": "Файлы урока"
			}, _attrs))}><div><h3>Файлы урока</h3><p class="course-hint">${ssrInterpolate(__props.kind === "VIDEO" ? "MP4 или WebM" : "PDF")}, до 500 МиБ. Файлы доступны ученикам с доступом к курсу и не показываются в открытом просмотре.</p></div>`);
			if (unref(loading)) _push(`<p class="course-hint" role="status">Загружаем список файлов…</p>`);
			else if (unref(assets).length) {
				_push(`<ul class="course-asset-list"><!--[-->`);
				ssrRenderList(unref(assets), (asset) => {
					_push(`<li>`);
					_push(ssrRenderComponent(unref(FileText), {
						size: 17,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<span>${ssrInterpolate(asset.filename)}</span><small>${ssrInterpolate(size(asset.size))}</small>`);
					if (__props.editable && asset.everPublished === false) _push(`<button type="button" class="crm-button"${ssrRenderAttr("aria-label", `Удалить файл ${asset.filename}`)}${ssrIncludeBooleanAttr(unref(uploading) || !!unref(deleting)) ? " disabled" : ""}>${ssrInterpolate(unref(deleting) === asset.id ? "Удаляем…" : "Удалить")}</button>`);
					else _push(`<!---->`);
					_push(`</li>`);
				});
				_push(`<!--]--></ul>`);
			} else _push(`<p class="course-hint">Файлы ещё не добавлены.</p>`);
			if (unref(error)) {
				_push(`<p class="course-error" role="alert">${ssrInterpolate(unref(error))} `);
				if (!unref(uploading)) _push(`<button class="crm-button" type="button">Обновить список</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="course-success" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (__props.editable) {
				_push(`<!--[--><label class="course-asset-picker"><span class="crm-button">Выбрать файл</span><input type="file" aria-label="Выбрать файл"${ssrRenderAttr("accept", unref(accept))}${ssrIncludeBooleanAttr(unref(uploading) || !!unref(deleting)) ? " disabled" : ""}></label>`);
				if (unref(selected)) _push(`<p class="course-asset-filename">Выбран файл: ${ssrInterpolate(unref(selected).name)} · ${ssrInterpolate(size(unref(selected).size))}</p>`);
				else _push(`<!---->`);
				_push(`<div class="course-actions"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(!unref(selected) || unref(uploading) || !!unref(deleting)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(UploadCloud), { size: 16 }, null, _parent));
				_push(` ${ssrInterpolate(unref(uploading) ? "Загружаем файл…" : "Добавить файл")}</button>`);
				if (unref(selected) && !unref(uploading)) _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(!!unref(deleting)) ? " disabled" : ""}>Отменить выбор</button>`);
				else _push(`<!---->`);
				_push(`</div><!--]-->`);
			} else _push(`<p class="course-hint">Добавление файлов доступно в черновике курса.</p>`);
			if (unref(uploading)) _push(`<p class="course-hint" role="status">Не закрывайте урок до окончания загрузки.</p>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/workspace/CourseLessonAssets.vue
var _sfc_setup$2 = CourseLessonAssets_vue_vue_type_script_setup_true_lang_default.setup;
CourseLessonAssets_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/CourseLessonAssets.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CourseLessonAssets_default = Object.assign(CourseLessonAssets_vue_vue_type_script_setup_true_lang_default, { __name: "CourseLessonAssets" });
// components/workspace/CourseManagementPage.vue?vue&type=script&setup=true&lang.ts
var CourseManagementPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CourseManagementPage",
	__ssrInlineRender: true,
	setup(__props) {
		const session = useWorkspaceSession(), access = useWorkspaceAccess();
		const courses = ref([]), selectedId = ref(""), selected = ref(null);
		const loading = ref(false), saving = ref(false), assetBusy = ref(false), error = ref(""), notice = ref(""), query = ref("");
		const page = ref(1), pages = ref(1), total = ref(0), tab = ref("program"), editor = ref(null), editorId = ref("");
		ref("");
		const editBaseline = ref("");
		const courseForm = reactive({
			titleRu: "",
			titleEn: "",
			description: ""
		});
		const tariffForm = reactive({
			title: "",
			price: "",
			accessDays: "",
			isActive: true
		});
		const moduleForm = reactive({
			title: "",
			sortOrder: 0
		});
		const lessonForm = reactive({
			title: "",
			kind: "TEXT",
			content: "",
			videoUrl: "",
			presentationUrl: "",
			sortOrder: 0,
			isPreview: false
		});
		const existingLesson = computed(() => selected.value?.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === editorId.value));
		const canWrite = computed(() => access.can("lms.write"));
		const tabs = computed(() => canWrite.value ? [
			["program", "Программа"],
			["tariffs", "Тарифы"],
			["details", "Описание"],
			["live", "Эфиры"]
		] : [
			["program", "Программа"],
			["tariffs", "Тарифы"],
			["details", "Описание"]
		]);
		const lessonCount = (course) => (course.modules || []).reduce((total, module) => total + (module.lessons || []).length, 0);
		const statusLabel = (status) => ({
			DRAFT: "Черновик",
			PUBLISHED: "Опубликован",
			ARCHIVED: "Архив"
		})[status] || status;
		const kindLabel = (kind) => ({
			TEXT: "Текст",
			VIDEO: "Видео",
			PRESENTATION: "Презентация",
			LIVE: "Прямой эфир"
		})[kind] || kind;
		const money = (amount) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 2
		}).format(Number(amount));
		const editorForm = computed(() => editor.value === "course" ? courseForm : editor.value === "tariff" ? tariffForm : editor.value === "module" ? moduleForm : lessonForm);
		const dirty = computed(() => !!editor.value && JSON.stringify(editorForm.value) !== editBaseline.value);
		let loadVersion = 0, searchTimer;
		function message(e, fallback) {
			const value = e?.data?.message;
			return Array.isArray(value) ? value.join("; ") : typeof value === "string" ? value : fallback;
		}
		function canLeave() {
			return !saving.value && !assetBusy.value && (!dirty.value || (void 0).confirm("Есть несохранённые изменения. Продолжить без сохранения?"));
		}
		onBeforeRouteLeave(canLeave);
		onBeforeRouteUpdate(canLeave);
		async function load() {
			const version = ++loadVersion;
			loading.value = true;
			error.value = "";
			try {
				const params = new URLSearchParams({
					page: String(page.value),
					limit: "20"
				});
				if (query.value.trim()) params.set("search", query.value.trim());
				const data = await session.request(`/lms/admin/courses?${params}`);
				if (version === loadVersion) {
					if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || !Number.isInteger(data.page) || !Number.isInteger(data.pages)) throw new Error("Некорректный ответ");
					courses.value = data.items;
					total.value = data.total;
					page.value = data.page;
					pages.value = data.pages;
				}
			} catch (e) {
				if (version === loadVersion) error.value = message(e, "Не удалось загрузить курсы. Проверьте соединение и повторите попытку.");
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		watch(query, () => {
			clearTimeout(searchTimer);
			page.value = 1;
			searchTimer = setTimeout(() => void load(), 300);
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CourseLiveManagement = CourseLiveManagement_default;
			const _component_CourseLessonAssets = CourseLessonAssets_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "crm-management-workspace course-workspace" }, _attrs))}><header class="crm-page-header"><div><h1>Курсы</h1><p>Соберите программу, уроки и тарифы в одном месте.</p></div>`);
			if (unref(canWrite) && !unref(selectedId)) {
				_push(`<button class="crm-button crm-button--primary" type="button">`);
				_push(ssrRenderComponent(unref(Plus), { size: 17 }, null, _parent));
				_push(` Создать курс</button>`);
			} else _push(`<!---->`);
			_push(`</header><div class="course-notice" role="note">`);
			_push(ssrRenderComponent(unref(BookOpen), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Здесь можно подготовить курс и его содержание. Продажа курсов и прямые трансляции ещё не подключены.</span></div>`);
			if (unref(error)) _push(`<p class="course-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="course-success" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading) && !unref(selected) && !unref(courses).length) _push(`<p class="course-state" role="status">Загружаем курсы…</p>`);
			else _push(`<!---->`);
			if (!unref(selectedId) && !unref(editor)) {
				_push(`<!--[--><div class="course-toolbar"><label class="course-search"><span>Поиск курса</span><input${ssrRenderAttr("value", unref(query))} class="crm-input" type="search" maxlength="200" placeholder="Название курса"></label><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
				_push(` Обновить</button></div>`);
				if (unref(loading) && unref(courses).length) _push(`<p class="course-state" role="status">Обновляем список…</p>`);
				else _push(`<!---->`);
				if (!unref(loading) && unref(courses).length) _push(`<p class="course-hint">Найдено курсов: ${ssrInterpolate(unref(total))}</p>`);
				else _push(`<!---->`);
				if (unref(courses).length) {
					_push(`<div class="course-list"><!--[-->`);
					ssrRenderList(unref(courses), (course) => {
						_push(`<button class="course-row crm-surface crm-button crm-card-action" type="button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><span class="course-icon">`);
						_push(ssrRenderComponent(unref(BookOpen), { size: 19 }, null, _parent));
						_push(`</span><span class="course-row-title"><strong>${ssrInterpolate(course.titleRu)}</strong><small>${ssrInterpolate(lessonCount(course))} уроков · ${ssrInterpolate((course.tariffs || []).length)} тарифов</small></span><span class="course-status"${ssrRenderAttr("data-status", course.status)}>${ssrInterpolate(statusLabel(course.status))}</span>`);
						_push(ssrRenderComponent(unref(ChevronRight), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent));
						_push(`</button>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (unref(pages) > 1) _push(`<nav class="course-pagination" aria-label="Страницы курсов"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) <= 1) ? " disabled" : ""}>Назад</button><span>${ssrInterpolate(unref(page))} из ${ssrInterpolate(unref(pages))}</span><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(loading) || unref(page) >= unref(pages)) ? " disabled" : ""}>Далее</button></nav>`);
				else _push(`<!---->`);
				if (!unref(courses).length && !unref(loading) && !unref(error)) {
					_push(`<div class="course-empty crm-surface">`);
					_push(ssrRenderComponent(unref(BookOpen), { size: 28 }, null, _parent));
					_push(`<h2>${ssrInterpolate(unref(query) ? "Курсы не найдены" : "Пока нет курсов")}</h2><p>${ssrInterpolate(unref(query) ? "Попробуйте изменить запрос." : "Создайте курс, затем добавьте программу и тарифы.")}</p>`);
					if (!unref(query) && unref(canWrite)) {
						_push(`<button class="crm-button crm-button--primary" type="button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(` Создать курс</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			if (unref(selectedId) && unref(selected) && !unref(editor)) {
				_push(`<!--[--><div class="course-detail-head"><button class="crm-button" type="button">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(` Все курсы</button><div class="course-detail-title"><h2>${ssrInterpolate(unref(selected).titleRu)}</h2><span class="course-status"${ssrRenderAttr("data-status", unref(selected).status)}>${ssrInterpolate(statusLabel(unref(selected).status))}</span></div>`);
				if (unref(canWrite)) {
					_push(`<div class="course-actions">`);
					if (unref(selected).status !== "PUBLISHED") {
						_push(`<button class="crm-button crm-button--primary" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
						_push(` Опубликовать</button>`);
					} else _push(`<!---->`);
					if (unref(selected).status === "PUBLISHED") _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Снять с публикации</button>`);
					else _push(`<!---->`);
					if (unref(selected).status !== "ARCHIVED") _push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>В архив</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`</div>`);
				_push(ssrRenderComponent(_component_CrmCardTabs, {
					modelValue: unref(tab),
					"onUpdate:modelValue": ($event) => isRef(tab) ? tab.value = $event : null,
					prefix: "course",
					tabs: unref(tabs),
					label: "Разделы курса"
				}, null, _parent));
				if (unref(tab) === "program") {
					_push(`<section id="course-program-panel" role="tabpanel" aria-labelledby="course-program-tab" class="course-panel"><header><div><h3>Программа курса</h3><p>Разделите материалы на модули и добавьте уроки.</p></div>`);
					if (unref(canWrite)) {
						_push(`<button class="crm-button" type="button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(` Добавить модуль</button>`);
					} else _push(`<!---->`);
					_push(`</header>`);
					if (unref(selected).modules?.length) {
						_push(`<div class="course-modules"><!--[-->`);
						ssrRenderList(unref(selected).modules, (module) => {
							_push(`<article class="course-module crm-surface"><header><div><h4>${ssrInterpolate(module.title)}</h4><small>${ssrInterpolate(module.lessons?.length || 0)} уроков</small></div>`);
							if (unref(canWrite)) {
								_push(`<div class="course-actions"><button class="crm-button" type="button">Изменить модуль</button><button class="crm-button" type="button">`);
								_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
								_push(` Урок</button></div>`);
							} else _push(`<!---->`);
							_push(`</header>`);
							if (module.lessons?.length) {
								_push(`<div class="course-lessons"><!--[-->`);
								ssrRenderList(module.lessons, (lesson) => {
									_push(`<div class="course-lesson">`);
									if (lesson.kind === "VIDEO") _push(ssrRenderComponent(unref(Video), { size: 18 }, null, _parent));
									else _push(ssrRenderComponent(unref(FileText), { size: 18 }, null, _parent));
									_push(`<span><strong>${ssrInterpolate(lesson.title)}</strong><small>${ssrInterpolate(kindLabel(lesson.kind))}${ssrInterpolate(lesson.isPreview ? " · открытый просмотр" : "")}</small></span>`);
									if (unref(canWrite)) _push(`<button class="crm-button" type="button"${ssrRenderAttr("aria-label", `Изменить урок ${lesson.title}`)}>Изменить</button>`);
									else _push(`<!---->`);
									_push(`</div>`);
								});
								_push(`<!--]--></div>`);
							} else _push(`<p class="course-hint">В этом модуле пока нет уроков.</p>`);
							_push(`</article>`);
						});
						_push(`<!--]--></div>`);
					} else {
						_push(`<div class="course-empty crm-surface">`);
						_push(ssrRenderComponent(unref(Layers), { size: 26 }, null, _parent));
						_push(`<h3>Программа пока пуста</h3><p>Создайте первый модуль и добавьте в него уроки.</p></div>`);
					}
					_push(`</section>`);
				} else if (unref(tab) === "tariffs") {
					_push(`<section id="course-tariffs-panel" role="tabpanel" aria-labelledby="course-tariffs-tab" class="course-panel"><header><div><h3>Тарифы</h3><p>Укажите стоимость и срок доступа для каждого варианта.</p></div>`);
					if (unref(canWrite)) {
						_push(`<button class="crm-button" type="button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
						_push(` Добавить тариф</button>`);
					} else _push(`<!---->`);
					_push(`</header>`);
					if (unref(selected).tariffs?.length) {
						_push(`<div class="course-tariffs"><!--[-->`);
						ssrRenderList(unref(selected).tariffs, (tariff) => {
							_push(`<article class="course-tariff crm-surface">`);
							_push(ssrRenderComponent(unref(Ticket), { size: 19 }, null, _parent));
							_push(`<div><strong>${ssrInterpolate(tariff.title)}</strong><small>${ssrInterpolate(tariff.accessDays ? `${tariff.accessDays} дней доступа` : "Без ограничения срока")} · ${ssrInterpolate(tariff.isActive ? "Активен" : "Выключен")}</small></div><b>${ssrInterpolate(money(tariff.price))}</b>`);
							if (unref(canWrite)) _push(`<button class="crm-button" type="button"${ssrRenderAttr("aria-label", `Изменить тариф ${tariff.title}`)}>Изменить</button>`);
							else _push(`<!---->`);
							_push(`</article>`);
						});
						_push(`<!--]--></div>`);
					} else {
						_push(`<div class="course-empty crm-surface">`);
						_push(ssrRenderComponent(unref(Ticket), { size: 26 }, null, _parent));
						_push(`<h3>Тарифов пока нет</h3><p>Добавьте стоимость и срок доступа к курсу.</p></div>`);
					}
					_push(`</section>`);
				} else if (unref(tab) === "details") {
					_push(`<section id="course-details-panel" role="tabpanel" aria-labelledby="course-details-tab" class="course-panel"><header><div><h3>Описание курса</h3><p>Основные сведения о программе.</p></div>`);
					if (unref(canWrite)) _push(`<button class="crm-button" type="button">Изменить</button>`);
					else _push(`<!---->`);
					_push(`</header><div class="course-description crm-surface"><p>${ssrInterpolate(unref(selected).description || "Описание ещё не добавлено.")}</p>`);
					if (unref(selected).titleEn) _push(`<p><strong>Название на английском:</strong> ${ssrInterpolate(unref(selected).titleEn)}</p>`);
					else _push(`<!---->`);
					_push(`</div></section>`);
				} else if (unref(tab) === "live" && unref(canWrite)) {
					_push(`<div id="course-live-panel" role="tabpanel" aria-labelledby="course-live-tab">`);
					_push(ssrRenderComponent(_component_CourseLiveManagement, {
						"course-id": unref(selected).id,
						modules: unref(selected).modules || []
					}, null, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			if (unref(selectedId) && unref(loading) && !unref(selected) && !unref(editor)) _push(`<p class="course-state" role="status">Открываем курс…</p>`);
			else _push(`<!---->`);
			if (unref(selectedId) && !unref(selected) && !unref(loading) && !unref(editor)) {
				_push(`<button class="crm-button" type="button">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(` Вернуться к курсам</button>`);
			} else _push(`<!---->`);
			if (unref(editor)) {
				_push(`<form class="course-editor crm-surface"><header><div><h2>${ssrInterpolate(unref(editor) === "course" ? unref(editorId) ? "Изменить курс" : "Новый курс" : unref(editor) === "tariff" ? unref(editorId) ? "Изменить тариф" : "Новый тариф" : unref(editor) === "module" ? unref(editorId) ? "Изменить модуль" : "Новый модуль" : unref(editorId) ? "Изменить урок" : "Новый урок")}</h2><p>Поля со звёздочкой обязательны.</p></div><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(assetBusy)) ? " disabled" : ""}>Закрыть</button></header>`);
				if (unref(editor) === "course") _push(`<!--[--><label>Название курса *<input${ssrRenderAttr("value", unref(courseForm).titleRu)} class="crm-input" required maxlength="200"></label><label>Название на английском<input${ssrRenderAttr("value", unref(courseForm).titleEn)} class="crm-input" maxlength="200"></label><label>Описание<textarea class="crm-input" rows="6" maxlength="10000">${ssrInterpolate(unref(courseForm).description)}</textarea></label><!--]-->`);
				else if (unref(editor) === "tariff") _push(`<!--[--><label>Название тарифа *<input${ssrRenderAttr("value", unref(tariffForm).title)} class="crm-input" required maxlength="200" placeholder="Например, Самостоятельно"></label><div class="course-form-grid"><label>Цена, ₽ *<input${ssrRenderAttr("value", unref(tariffForm).price)} class="crm-input" required type="number" min="0" max="100000000" step="0.01"></label><label>Срок доступа, дней<input${ssrRenderAttr("value", unref(tariffForm).accessDays)} class="crm-input" type="number" min="1" max="3650" step="1" placeholder="Без ограничения"></label></div><label class="course-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(tariffForm).isActive) ? ssrLooseContain(unref(tariffForm).isActive, null) : unref(tariffForm).isActive) ? " checked" : ""} class="crm-check" type="checkbox"> Тариф активен</label><!--]-->`);
				else if (unref(editor) === "module") _push(`<!--[--><label>Название модуля *<input${ssrRenderAttr("value", unref(moduleForm).title)} class="crm-input" required maxlength="200"></label><label>Порядок в программе<input${ssrRenderAttr("value", unref(moduleForm).sortOrder)} class="crm-input" type="number" min="0" max="10000" step="1" required></label><!--]-->`);
				else {
					_push(`<!--[--><label>Название урока *<input${ssrRenderAttr("value", unref(lessonForm).title)} class="crm-input" required maxlength="200"></label><div class="course-form-grid"><label>Тип урока<select class="crm-input"><option value="TEXT"${ssrIncludeBooleanAttr(Array.isArray(unref(lessonForm).kind) ? ssrLooseContain(unref(lessonForm).kind, "TEXT") : ssrLooseEqual(unref(lessonForm).kind, "TEXT")) ? " selected" : ""}>Текст</option><option value="VIDEO"${ssrIncludeBooleanAttr(Array.isArray(unref(lessonForm).kind) ? ssrLooseContain(unref(lessonForm).kind, "VIDEO") : ssrLooseEqual(unref(lessonForm).kind, "VIDEO")) ? " selected" : ""}>Видео</option><option value="PRESENTATION"${ssrIncludeBooleanAttr(Array.isArray(unref(lessonForm).kind) ? ssrLooseContain(unref(lessonForm).kind, "PRESENTATION") : ssrLooseEqual(unref(lessonForm).kind, "PRESENTATION")) ? " selected" : ""}>Презентация</option><option value="LIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(lessonForm).kind) ? ssrLooseContain(unref(lessonForm).kind, "LIVE") : ssrLooseEqual(unref(lessonForm).kind, "LIVE")) ? " selected" : ""}>Прямой эфир</option></select></label><label>Порядок в модуле<input${ssrRenderAttr("value", unref(lessonForm).sortOrder)} class="crm-input" type="number" min="0" max="10000" step="1" required></label></div>`);
					if (unref(lessonForm).kind === "TEXT" || unref(lessonForm).kind === "LIVE") _push(`<label>${ssrInterpolate(unref(lessonForm).kind === "LIVE" ? "Описание эфира *" : "Текст урока")}<textarea class="crm-input" rows="10" maxlength="50000"${ssrIncludeBooleanAttr(unref(lessonForm).kind === "LIVE" || unref(selected)?.status === "PUBLISHED") ? " required" : ""}>${ssrInterpolate(unref(lessonForm).content)}</textarea></label>`);
					else _push(`<!---->`);
					if (unref(lessonForm).kind === "VIDEO") _push(`<label>HTTPS-ссылка на видео<input${ssrRenderAttr("value", unref(lessonForm).videoUrl)} class="crm-input" type="url" maxlength="2048" placeholder="https://…"></label>`);
					else _push(`<!---->`);
					if (unref(lessonForm).kind === "PRESENTATION") _push(`<label>HTTPS-ссылка на презентацию<input${ssrRenderAttr("value", unref(lessonForm).presentationUrl)} class="crm-input" type="url" maxlength="2048" placeholder="https://…"></label>`);
					else _push(`<!---->`);
					if (unref(lessonForm).kind === "VIDEO" || unref(lessonForm).kind === "PRESENTATION") _push(`<p class="course-hint">Файл открывается по указанной ссылке; доступ к самому файлу настраивается у его владельца.</p>`);
					else _push(`<!---->`);
					if (unref(lessonForm).kind === "LIVE") _push(`<p class="course-hint">Эфиры ещё не подключены. Здесь можно подготовить описание; расписание и запуск будут доступны после настройки сервиса трансляций.</p>`);
					else _push(`<!---->`);
					if (unref(lessonForm).kind !== "LIVE") _push(`<label class="course-check"><input${ssrIncludeBooleanAttr(Array.isArray(unref(lessonForm).isPreview) ? ssrLooseContain(unref(lessonForm).isPreview, null) : unref(lessonForm).isPreview) ? " checked" : ""} class="crm-check" type="checkbox"> Разрешить открытый просмотр</label>`);
					else _push(`<!---->`);
					_push(`<p class="course-hint">${ssrInterpolate(unref(selected)?.status === "PUBLISHED" ? "В опубликованном курсе сразу добавьте материал урока." : "Материал можно сохранить черновиком. Для публикации добавьте содержание урока.")}</p><!--]-->`);
				}
				if (unref(editor) === "lesson" && unref(editorId) && ["VIDEO", "PRESENTATION"].includes(unref(lessonForm).kind) && unref(existingLesson)?.kind === unref(lessonForm).kind) _push(ssrRenderComponent(_component_CourseLessonAssets, {
					key: unref(editorId),
					"lesson-id": unref(editorId),
					kind: unref(lessonForm).kind,
					editable: unref(selected)?.status === "DRAFT",
					onBusyChange: ($event) => assetBusy.value = $event
				}, null, _parent));
				else if (unref(editor) === "lesson" && ["VIDEO", "PRESENTATION"].includes(unref(lessonForm).kind)) _push(`<p class="course-hint">Чтобы добавить файлы, сохраните урок в черновике курса, затем откройте его для изменения.</p>`);
				else _push(`<!---->`);
				if (unref(dirty)) _push(`<p class="course-hint" role="status">Есть несохранённые изменения.</p>`);
				else _push(`<!---->`);
				_push(`<footer><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving) || unref(assetBusy)) ? " disabled" : ""}>Отмена</button><button class="crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving) || unref(assetBusy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 16 }, null, _parent));
				_push(` ${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить")}</button></footer></form>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/workspace/CourseManagementPage.vue
var _sfc_setup$1 = CourseManagementPage_vue_vue_type_script_setup_true_lang_default.setup;
CourseManagementPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/CourseManagementPage.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CourseManagementPage_default = Object.assign(CourseManagementPage_vue_vue_type_script_setup_true_lang_default, { __name: "CourseManagementPage" });
// pages/crm/courses.vue?vue&type=script&setup=true&lang.ts
var courses_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "courses",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Курсы — SARKISIAN CRM" });
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(CourseManagementPage_default, _attrs, null, _parent));
		};
	}
});
// pages/crm/courses.vue
var _sfc_setup = courses_vue_vue_type_script_setup_true_lang_default.setup;
courses_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/courses.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var courses_default = courses_vue_vue_type_script_setup_true_lang_default;

export { courses_default as default };;globalThis.__timing__.logEnd('Load chunks/build/courses-Bibxvzaf');
//# sourceMappingURL=courses-Bibxvzaf.mjs.map
