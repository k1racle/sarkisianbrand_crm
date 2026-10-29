globalThis.__timing__.logStart('Load chunks/build/_id_-D4Dc66_5');import { c as useRoute, p as useStorefront, q as useStorefrontPanels, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, computed, watch, mergeProps, withCtx, createTextVNode, unref, createVNode, openBlock, createBlock, toDisplayString, Fragment, renderList, createCommentVNode, resolveDynamicComponent, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrIncludeBooleanAttr, ssrRenderAttrs, ssrRenderVNode } from 'vue/server-renderer';
import { Check, PlayCircle, FileText } from '@lucide/vue';
import { s as safeCourseLink } from '../_/course-types.mjs';
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

// components/storefront/CourseProtectedAssets.vue?vue&type=script&setup=true&lang.ts
var CourseProtectedAssets_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CourseProtectedAssets",
	__ssrInlineRender: true,
	props: {
		courseId: {},
		lessonId: {},
		token: {}
	},
	setup(__props) {
		const props = __props;
		const config = useRuntimeConfig();
		const assets = ref([]), loading = ref(true), opening = ref(""), error = ref("");
		const activeId = ref(""), mediaUrl = ref("");
		let revision = 0, timer;
		const base = computed(() => `/lms/my/${encodeURIComponent(props.courseId)}/lessons/${encodeURIComponent(props.lessonId)}/assets`);
		const size = (bytes) => bytes >= 1048576 ? `${(bytes / 1024 / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ` : `${Math.max(1, Math.ceil(bytes / 1024))} КБ`;
		function stop() {
			clearTimeout(timer);
			activeId.value = "";
			mediaUrl.value = "";
		}
		async function load() {
			const current = ++revision, token = props.token;
			stop();
			opening.value = "";
			loading.value = true;
			error.value = "";
			assets.value = [];
			try {
				const result = await $fetch$1(base.value, {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token}` },
					retry: 0
				});
				if (current === revision && token === props.token && Array.isArray(result)) assets.value = result;
			} catch {
				if (current === revision) error.value = "Не удалось загрузить файлы урока. Проверьте соединение и попробуйте ещё раз.";
			} finally {
				if (current === revision) loading.value = false;
			}
		}
		watch(() => [
			props.courseId,
			props.lessonId,
			props.token
		], () => {
			load();
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "site-course-assets",
				"aria-label": "Файлы урока"
			}, _attrs))}>`);
			if (unref(loading)) _push(`<p role="status">Загружаем файлы…</p>`);
			else if (unref(assets).length) {
				_push(`<!--[--><h3>Материалы урока</h3><ul><!--[-->`);
				ssrRenderList(unref(assets), (asset) => {
					_push(`<li>`);
					ssrRenderVNode(_push, createVNode(resolveDynamicComponent(asset.mimeType.startsWith("video/") ? unref(PlayCircle) : unref(FileText)), {
						size: 18,
						"aria-hidden": "true"
					}, null), _parent);
					_push(`<span>${ssrInterpolate(asset.filename)} <small>${ssrInterpolate(size(asset.size))}</small></span><button type="button" class="site-courses-button"${ssrIncludeBooleanAttr(!!unref(opening)) ? " disabled" : ""}>${ssrInterpolate(unref(opening) === asset.id ? "Открываем…" : unref(activeId) === asset.id ? "Открыт" : "Открыть")}</button></li>`);
				});
				_push(`<!--]--></ul>`);
				if (unref(activeId) && unref(mediaUrl)) {
					_push(`<!--[-->`);
					if (unref(assets).find((item) => item.id === unref(activeId))?.mimeType.startsWith("video/")) _push(`<video${ssrRenderAttr("src", unref(mediaUrl))} controls playsinline preload="metadata"></video>`);
					else _push(`<a${ssrRenderAttr("href", unref(mediaUrl))} target="_blank" rel="noopener noreferrer">Скачать документ</a>`);
					_push(`<!--]-->`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))} <button type="button" class="site-courses-button">Обновить</button></p>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/CourseProtectedAssets.vue
var _sfc_setup$1 = CourseProtectedAssets_vue_vue_type_script_setup_true_lang_default.setup;
CourseProtectedAssets_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/CourseProtectedAssets.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CourseProtectedAssets_default = Object.assign(CourseProtectedAssets_vue_vue_type_script_setup_true_lang_default, { __name: "CourseProtectedAssets" });
// pages/courses/my/[id].vue?vue&type=script&setup=true&lang.ts
var _id__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[id]",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig(), route = useRoute();
		const { accessToken, loadMe } = useStorefront();
		const { openAuth } = useStorefrontPanels();
		const enrollment = ref(null), material = ref(null);
		const loading = ref(true), error = ref(""), materialLoading = ref(false), materialError = ref(""), saving = ref(false);
		const completed = computed(() => new Set(enrollment.value?.lessonsProgress?.map((item) => item.lessonId) || []));
		let revision = 0, lessonRevision = 0;
		async function load() {
			const current = ++revision;
			lessonRevision++;
			loading.value = true;
			error.value = "";
			enrollment.value = null;
			material.value = null;
			try {
				await loadMe();
				const token = accessToken.value;
				if (!token) return;
				const data = await $fetch$1(`/lms/my/${encodeURIComponent(String(route.params.id))}`, {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token}` }
				});
				if (current === revision && accessToken.value === token) enrollment.value = data;
			} catch (e) {
				if (current === revision) error.value = [403, 404].includes(Number(e?.statusCode || e?.status)) ? "Курс недоступен этому аккаунту или срок доступа закончился." : "Не удалось загрузить курс. Проверьте соединение и попробуйте ещё раз.";
			} finally {
				if (current === revision) loading.value = false;
			}
		}
		async function openLesson(id) {
			const current = ++lessonRevision, token = accessToken.value;
			if (!token) return;
			material.value = null;
			materialError.value = "";
			materialLoading.value = true;
			try {
				const result = await $fetch$1(`/lms/my/${encodeURIComponent(String(route.params.id))}/lessons/${encodeURIComponent(id)}`, {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token}` }
				});
				if (current === lessonRevision && token === accessToken.value) material.value = result;
			} catch {
				if (current === lessonRevision) materialError.value = "Не удалось открыть урок. Проверьте доступ и попробуйте снова.";
			} finally {
				if (current === lessonRevision) materialLoading.value = false;
			}
		}
		async function completeLesson() {
			const token = accessToken.value, lessonId = material.value?.id, current = revision;
			if (!token || !lessonId || saving.value) return;
			saving.value = true;
			materialError.value = "";
			try {
				const result = await $fetch$1(`/lms/my/${encodeURIComponent(String(route.params.id))}/lessons/${encodeURIComponent(lessonId)}/complete`, {
					baseURL: config.public.apiBase,
					method: "POST",
					headers: { Authorization: `Bearer ${token}` }
				});
				if (current === revision && token === accessToken.value && enrollment.value) {
					enrollment.value.progress = result.progress;
					enrollment.value.isCompleted = result.isCompleted;
					enrollment.value.lessonsProgress = [...(enrollment.value.lessonsProgress || []).filter((item) => item.lessonId !== lessonId), {
						lessonId,
						completedAt: (/* @__PURE__ */ new Date()).toISOString()
					}];
				}
			} catch {
				if (current === revision) materialError.value = "Не удалось сохранить прогресс. Попробуйте ещё раз.";
			} finally {
				saving.value = false;
			}
		}
		watch([accessToken, () => route.params.id], () => {});
		useSeoMeta({
			title: "Мой курс — SARKISIAN",
			robots: "noindex,nofollow"
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			const _component_CourseProtectedAssets = CourseProtectedAssets_default;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="site-courses"${_scopeId}>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							class: "site-courses-link site-courses-back",
							to: "/courses/my"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`← Моё обучение`);
								else return [createTextVNode("← Моё обучение")];
							}),
							_: 1
						}, _parent, _scopeId));
						if (unref(loading)) _push(`<p class="site-courses-state" role="status"${_scopeId}>Загружаем курс…</p>`);
						else if (!unref(accessToken)) _push(`<div class="site-courses-state"${_scopeId}><h1${_scopeId}>Войдите в аккаунт</h1><p${_scopeId}>Уроки доступны в аккаунте, на котором открыт курс.</p><button type="button" class="site-courses-button"${_scopeId}>Войти</button></div>`);
						else if (unref(error) || !unref(enrollment)) _push(`<div class="site-courses-state" role="alert"${_scopeId}><h1${_scopeId}>Курс недоступен</h1><p${_scopeId}>${ssrInterpolate(unref(error))}</p><button type="button" class="site-courses-button"${_scopeId}>Повторить</button></div>`);
						else {
							_push(`<!--[--><header class="site-courses-hero"${_scopeId}><h1${_scopeId}>${ssrInterpolate(unref(enrollment).course.titleRu)}</h1><div${_scopeId}><p${_scopeId}>Пройдено ${ssrInterpolate(unref(enrollment).progress)}%</p><progress${ssrRenderAttr("value", unref(enrollment).progress)} max="100"${ssrRenderAttr("aria-label", `Пройдено ${unref(enrollment).progress}%`)}${_scopeId}></progress></div></header><div class="site-course-learning"${_scopeId}><section aria-labelledby="learning-program"${_scopeId}><h2 id="learning-program"${_scopeId}>Уроки курса</h2><!--[-->`);
							ssrRenderList(unref(enrollment).course.modules, (module) => {
								_push(`<article class="site-course-module"${_scopeId}><h3${_scopeId}>${ssrInterpolate(module.title)}</h3><ul${_scopeId}><!--[-->`);
								ssrRenderList(module.lessons, (lesson) => {
									_push(`<li${_scopeId}><button type="button"${ssrRenderAttr("aria-current", unref(material)?.id === lesson.id ? "true" : void 0)}${_scopeId}>`);
									if (unref(completed).has(lesson.id)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent, _scopeId));
									else if (lesson.kind === "VIDEO") _push(ssrRenderComponent(unref(PlayCircle), { size: 16 }, null, _parent, _scopeId));
									else _push(ssrRenderComponent(unref(FileText), { size: 16 }, null, _parent, _scopeId));
									_push(` ${ssrInterpolate(lesson.title)}</button></li>`);
								});
								_push(`<!--]--></ul></article>`);
							});
							_push(`<!--]--></section><section class="site-course-material" aria-live="polite"${_scopeId}>`);
							if (unref(materialLoading)) _push(`<p${_scopeId}>Открываем урок…</p>`);
							else if (unref(material)) {
								_push(`<!--[--><h2${_scopeId}>${ssrInterpolate(unref(material).title)}</h2>`);
								if (unref(material).content) _push(`<p class="site-course-text"${_scopeId}>${ssrInterpolate(unref(material).content)}</p>`);
								else _push(`<!---->`);
								if (unref(material).kind === "LIVE") _push(`<p${_scopeId}>Прямые эфиры пока готовятся. Информация о запуске появится здесь.</p>`);
								else _push(`<!---->`);
								if (unref(safeCourseLink)(unref(material).videoUrl)) _push(`<video${ssrRenderAttr("src", unref(safeCourseLink)(unref(material).videoUrl))} controls playsinline preload="metadata"${_scopeId}></video>`);
								else _push(`<!---->`);
								if (unref(safeCourseLink)(unref(material).videoUrl)) _push(`<a${ssrRenderAttr("href", unref(safeCourseLink)(unref(material).videoUrl))} target="_blank" rel="noopener noreferrer"${_scopeId}>Открыть видео в новой вкладке</a>`);
								else _push(`<!---->`);
								if (unref(safeCourseLink)(unref(material).presentationUrl)) _push(`<a${ssrRenderAttr("href", unref(safeCourseLink)(unref(material).presentationUrl))} target="_blank" rel="noopener noreferrer"${_scopeId}>Открыть презентацию</a>`);
								else _push(`<!---->`);
								if (unref(material).kind !== "LIVE" && unref(accessToken)) _push(ssrRenderComponent(_component_CourseProtectedAssets, {
									key: unref(material).id,
									"course-id": String(unref(route).params.id),
									"lesson-id": unref(material).id,
									token: unref(accessToken)
								}, null, _parent, _scopeId));
								else _push(`<!---->`);
								if (unref(material).kind !== "LIVE") _push(`<button type="button" class="site-courses-button"${ssrIncludeBooleanAttr(unref(saving) || unref(completed).has(unref(material).id)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(completed).has(unref(material).id) ? "Урок пройден" : unref(saving) ? "Сохраняем…" : "Отметить пройденным")}</button>`);
								else _push(`<!---->`);
								_push(`<!--]-->`);
							} else _push(`<p${_scopeId}>Выберите урок в программе.</p>`);
							if (unref(materialError)) _push(`<p role="alert"${_scopeId}>${ssrInterpolate(unref(materialError))}</p>`);
							else _push(`<!---->`);
							_push(`</section></div><!--]-->`);
						}
						_push(`</div>`);
					} else return [createVNode("div", { class: "site-courses" }, [createVNode(_component_NuxtLink, {
						class: "site-courses-link site-courses-back",
						to: "/courses/my"
					}, {
						default: withCtx(() => [createTextVNode("← Моё обучение")]),
						_: 1
					}), unref(loading) ? (openBlock(), createBlock("p", {
						key: 0,
						class: "site-courses-state",
						role: "status"
					}, "Загружаем курс…")) : !unref(accessToken) ? (openBlock(), createBlock("div", {
						key: 1,
						class: "site-courses-state"
					}, [
						createVNode("h1", null, "Войдите в аккаунт"),
						createVNode("p", null, "Уроки доступны в аккаунте, на котором открыт курс."),
						createVNode("button", {
							type: "button",
							class: "site-courses-button",
							onClick: ($event) => unref(openAuth)("login")
						}, "Войти", 8, ["onClick"])
					])) : unref(error) || !unref(enrollment) ? (openBlock(), createBlock("div", {
						key: 2,
						class: "site-courses-state",
						role: "alert"
					}, [
						createVNode("h1", null, "Курс недоступен"),
						createVNode("p", null, toDisplayString(unref(error)), 1),
						createVNode("button", {
							type: "button",
							class: "site-courses-button",
							onClick: ($event) => load()
						}, "Повторить", 8, ["onClick"])
					])) : (openBlock(), createBlock(Fragment, { key: 3 }, [createVNode("header", { class: "site-courses-hero" }, [createVNode("h1", null, toDisplayString(unref(enrollment).course.titleRu), 1), createVNode("div", null, [createVNode("p", null, "Пройдено " + toDisplayString(unref(enrollment).progress) + "%", 1), createVNode("progress", {
						value: unref(enrollment).progress,
						max: "100",
						"aria-label": `Пройдено ${unref(enrollment).progress}%`
					}, null, 8, ["value", "aria-label"])])]), createVNode("div", { class: "site-course-learning" }, [createVNode("section", { "aria-labelledby": "learning-program" }, [createVNode("h2", { id: "learning-program" }, "Уроки курса"), (openBlock(true), createBlock(Fragment, null, renderList(unref(enrollment).course.modules, (module) => {
						return openBlock(), createBlock("article", {
							key: module.id,
							class: "site-course-module"
						}, [createVNode("h3", null, toDisplayString(module.title), 1), createVNode("ul", null, [(openBlock(true), createBlock(Fragment, null, renderList(module.lessons, (lesson) => {
							return openBlock(), createBlock("li", { key: lesson.id }, [createVNode("button", {
								type: "button",
								"aria-current": unref(material)?.id === lesson.id ? "true" : void 0,
								onClick: ($event) => openLesson(lesson.id)
							}, [unref(completed).has(lesson.id) ? (openBlock(), createBlock(unref(Check), {
								key: 0,
								size: 16
							})) : lesson.kind === "VIDEO" ? (openBlock(), createBlock(unref(PlayCircle), {
								key: 1,
								size: 16
							})) : (openBlock(), createBlock(unref(FileText), {
								key: 2,
								size: 16
							})), createTextVNode(" " + toDisplayString(lesson.title), 1)], 8, ["aria-current", "onClick"])]);
						}), 128))])]);
					}), 128))]), createVNode("section", {
						class: "site-course-material",
						"aria-live": "polite"
					}, [unref(materialLoading) ? (openBlock(), createBlock("p", { key: 0 }, "Открываем урок…")) : unref(material) ? (openBlock(), createBlock(Fragment, { key: 1 }, [
						createVNode("h2", null, toDisplayString(unref(material).title), 1),
						unref(material).content ? (openBlock(), createBlock("p", {
							key: 0,
							class: "site-course-text"
						}, toDisplayString(unref(material).content), 1)) : createCommentVNode("", true),
						unref(material).kind === "LIVE" ? (openBlock(), createBlock("p", { key: 1 }, "Прямые эфиры пока готовятся. Информация о запуске появится здесь.")) : createCommentVNode("", true),
						unref(safeCourseLink)(unref(material).videoUrl) ? (openBlock(), createBlock("video", {
							key: 2,
							src: unref(safeCourseLink)(unref(material).videoUrl),
							controls: "",
							playsinline: "",
							preload: "metadata"
						}, null, 8, ["src"])) : createCommentVNode("", true),
						unref(safeCourseLink)(unref(material).videoUrl) ? (openBlock(), createBlock("a", {
							key: 3,
							href: unref(safeCourseLink)(unref(material).videoUrl),
							target: "_blank",
							rel: "noopener noreferrer"
						}, "Открыть видео в новой вкладке", 8, ["href"])) : createCommentVNode("", true),
						unref(safeCourseLink)(unref(material).presentationUrl) ? (openBlock(), createBlock("a", {
							key: 4,
							href: unref(safeCourseLink)(unref(material).presentationUrl),
							target: "_blank",
							rel: "noopener noreferrer"
						}, "Открыть презентацию", 8, ["href"])) : createCommentVNode("", true),
						unref(material).kind !== "LIVE" && unref(accessToken) ? (openBlock(), createBlock(_component_CourseProtectedAssets, {
							key: unref(material).id,
							"course-id": String(unref(route).params.id),
							"lesson-id": unref(material).id,
							token: unref(accessToken)
						}, null, 8, [
							"course-id",
							"lesson-id",
							"token"
						])) : createCommentVNode("", true),
						unref(material).kind !== "LIVE" ? (openBlock(), createBlock("button", {
							key: 6,
							type: "button",
							class: "site-courses-button",
							disabled: unref(saving) || unref(completed).has(unref(material).id),
							onClick: ($event) => completeLesson()
						}, toDisplayString(unref(completed).has(unref(material).id) ? "Урок пройден" : unref(saving) ? "Сохраняем…" : "Отметить пройденным"), 9, ["disabled", "onClick"])) : createCommentVNode("", true)
					], 64)) : (openBlock(), createBlock("p", { key: 2 }, "Выберите урок в программе.")), unref(materialError) ? (openBlock(), createBlock("p", {
						key: 3,
						role: "alert"
					}, toDisplayString(unref(materialError)), 1)) : createCommentVNode("", true)])])], 64))])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/courses/my/[id].vue
var _sfc_setup = _id__vue_vue_type_script_setup_true_lang_default.setup;
_id__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/courses/my/[id].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _id__default = _id__vue_vue_type_script_setup_true_lang_default;

export { _id__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_id_-D4Dc66_5');
//# sourceMappingURL=_id_-D4Dc66_5.mjs.map
