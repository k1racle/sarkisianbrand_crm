globalThis.__timing__.logStart('Load chunks/build/my-SGeO1cEp');import { p as useStorefront, q as useStorefrontPanels, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, watch, mergeProps, withCtx, createTextVNode, unref, createVNode, openBlock, createBlock, toDisplayString, Fragment, renderList, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr } from 'vue/server-renderer';
import { ArrowRight } from '@lucide/vue';
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

// pages/courses/my/index.vue?vue&type=script&setup=true&lang.ts
var index_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "index",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const { accessToken, loadMe } = useStorefront();
		const { openAuth } = useStorefrontPanels();
		const loading = ref(true), error = ref(""), courses = ref([]);
		let revision = 0;
		async function load() {
			const current = ++revision;
			loading.value = true;
			error.value = "";
			courses.value = [];
			try {
				await loadMe();
				const token = accessToken.value;
				if (!token) return;
				const result = await $fetch$1("/lms/my", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token}` }
				});
				if (current === revision && accessToken.value === token) courses.value = result;
			} catch {
				if (current === revision) error.value = "Не удалось загрузить обучение. Проверьте соединение и попробуйте ещё раз.";
			} finally {
				if (current === revision) loading.value = false;
			}
		}
		watch(accessToken, () => {});
		useSeoMeta({
			title: "Моё обучение — SARKISIAN",
			robots: "noindex,nofollow"
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="site-courses"${_scopeId}>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							class: "site-courses-link site-courses-back",
							to: "/courses"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`← Все курсы`);
								else return [createTextVNode("← Все курсы")];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`<header class="site-courses-hero"${_scopeId}><h1${_scopeId}>Моё<br${_scopeId}>обучение</h1><div${_scopeId}><p${_scopeId}>Ваши курсы и пройденные уроки собраны здесь.</p></div></header><section class="site-courses-section" aria-labelledby="my-courses"${_scopeId}><h2 id="my-courses"${_scopeId}>Мои курсы</h2>`);
						if (unref(loading)) _push(`<p class="site-courses-state" role="status"${_scopeId}>Загружаем обучение…</p>`);
						else if (!unref(accessToken)) _push(`<div class="site-courses-state"${_scopeId}><h3${_scopeId}>Войдите в аккаунт</h3><p${_scopeId}>После входа здесь появятся доступные вам курсы.</p><button type="button" class="site-courses-button"${_scopeId}>Войти</button></div>`);
						else if (unref(error)) _push(`<div class="site-courses-state" role="alert"${_scopeId}><p${_scopeId}>${ssrInterpolate(unref(error))}</p><button type="button" class="site-courses-button"${_scopeId}>Повторить</button></div>`);
						else if (!unref(courses).length) {
							_push(`<div class="site-courses-state"${_scopeId}><h3${_scopeId}>У вас пока нет доступных курсов</h3><p${_scopeId}>Посмотрите программы обучения SARKISIAN.</p>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								class: "site-courses-button",
								to: "/courses"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`Открыть курсы`);
									else return [createTextVNode("Открыть курсы")];
								}),
								_: 1
							}, _parent, _scopeId));
							_push(`</div>`);
						} else {
							_push(`<div class="site-courses-grid"${_scopeId}><!--[-->`);
							ssrRenderList(unref(courses), (item) => {
								_push(`<article class="site-course-card"${_scopeId}><div${_scopeId}><h3${_scopeId}>${ssrInterpolate(item.course.titleRu)}</h3><p${_scopeId}>${ssrInterpolate(item.isCompleted ? "Курс пройден" : `Пройдено ${item.progress}%`)}</p><progress${ssrRenderAttr("value", item.progress)} max="100"${ssrRenderAttr("aria-label", `Пройдено ${item.progress}%`)}${_scopeId}></progress></div>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									class: "site-courses-link",
									to: `/courses/my/${encodeURIComponent(item.courseId)}`
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) {
											_push(`Продолжить `);
											_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
										} else return [createTextVNode("Продолжить "), createVNode(unref(ArrowRight), { size: 18 })];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</article>`);
							});
							_push(`<!--]--></div>`);
						}
						_push(`</section></div>`);
					} else return [createVNode("div", { class: "site-courses" }, [
						createVNode(_component_NuxtLink, {
							class: "site-courses-link site-courses-back",
							to: "/courses"
						}, {
							default: withCtx(() => [createTextVNode("← Все курсы")]),
							_: 1
						}),
						createVNode("header", { class: "site-courses-hero" }, [createVNode("h1", null, [
							createTextVNode("Моё"),
							createVNode("br"),
							createTextVNode("обучение")
						]), createVNode("div", null, [createVNode("p", null, "Ваши курсы и пройденные уроки собраны здесь.")])]),
						createVNode("section", {
							class: "site-courses-section",
							"aria-labelledby": "my-courses"
						}, [createVNode("h2", { id: "my-courses" }, "Мои курсы"), unref(loading) ? (openBlock(), createBlock("p", {
							key: 0,
							class: "site-courses-state",
							role: "status"
						}, "Загружаем обучение…")) : !unref(accessToken) ? (openBlock(), createBlock("div", {
							key: 1,
							class: "site-courses-state"
						}, [
							createVNode("h3", null, "Войдите в аккаунт"),
							createVNode("p", null, "После входа здесь появятся доступные вам курсы."),
							createVNode("button", {
								type: "button",
								class: "site-courses-button",
								onClick: ($event) => unref(openAuth)("login")
							}, "Войти", 8, ["onClick"])
						])) : unref(error) ? (openBlock(), createBlock("div", {
							key: 2,
							class: "site-courses-state",
							role: "alert"
						}, [createVNode("p", null, toDisplayString(unref(error)), 1), createVNode("button", {
							type: "button",
							class: "site-courses-button",
							onClick: ($event) => load()
						}, "Повторить", 8, ["onClick"])])) : !unref(courses).length ? (openBlock(), createBlock("div", {
							key: 3,
							class: "site-courses-state"
						}, [
							createVNode("h3", null, "У вас пока нет доступных курсов"),
							createVNode("p", null, "Посмотрите программы обучения SARKISIAN."),
							createVNode(_component_NuxtLink, {
								class: "site-courses-button",
								to: "/courses"
							}, {
								default: withCtx(() => [createTextVNode("Открыть курсы")]),
								_: 1
							})
						])) : (openBlock(), createBlock("div", {
							key: 4,
							class: "site-courses-grid"
						}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(courses), (item) => {
							return openBlock(), createBlock("article", {
								key: item.id,
								class: "site-course-card"
							}, [createVNode("div", null, [
								createVNode("h3", null, toDisplayString(item.course.titleRu), 1),
								createVNode("p", null, toDisplayString(item.isCompleted ? "Курс пройден" : `Пройдено ${item.progress}%`), 1),
								createVNode("progress", {
									value: item.progress,
									max: "100",
									"aria-label": `Пройдено ${item.progress}%`
								}, null, 8, ["value", "aria-label"])
							]), createVNode(_component_NuxtLink, {
								class: "site-courses-link",
								to: `/courses/my/${encodeURIComponent(item.courseId)}`
							}, {
								default: withCtx(() => [createTextVNode("Продолжить "), createVNode(unref(ArrowRight), { size: 18 })]),
								_: 1
							}, 8, ["to"])]);
						}), 128))]))])
					])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/courses/my/index.vue
var _sfc_setup = index_vue_vue_type_script_setup_true_lang_default.setup;
index_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/courses/my/index.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var my_default = index_vue_vue_type_script_setup_true_lang_default;

export { my_default as default };;globalThis.__timing__.logEnd('Load chunks/build/my-SGeO1cEp');
//# sourceMappingURL=my-SGeO1cEp.mjs.map
