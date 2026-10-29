globalThis.__timing__.logStart('Load chunks/build/courses-BKX4U11-');import { $ as $fetch$1, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useAsyncData } from './addons-CwJPC5tM.mjs';
import { defineComponent, ref, withAsyncContext, mergeProps, withCtx, unref, createTextVNode, createVNode, toDisplayString, openBlock, createBlock, Fragment, renderList, createCommentVNode, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { ArrowRight, BookOpen } from '@lucide/vue';
import { c as courseDescription, a as coursePrice } from '../_/course-types.mjs';
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

// pages/courses/index.vue?vue&type=script&setup=true&lang.ts
var index_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "index",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const config = useRuntimeConfig();
		const page = ref(1);
		const { data, status, error, refresh } = ([__temp, __restore] = withAsyncContext(() => useAsyncData("course-catalog", () => $fetch$1("/lms/catalog", {
			baseURL: config.public.apiBase,
			query: {
				page: page.value,
				limit: 20
			}
		}), { watch: [page] })), __temp = await __temp, __restore(), __temp);
		useSeoMeta({
			title: "Курсы — SARKISIAN",
			description: "Обучение для мастеров от SARKISIAN."
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_NuxtLink = NuxtLink;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="site-courses"${_scopeId}><header class="site-courses-hero"${_scopeId}><h1${_scopeId}>Курсы<br${_scopeId}>SARKISIAN</h1><div${_scopeId}><p${_scopeId}>Учитесь в своём темпе: уроки, материалы и практический опыт для мастеров.</p>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							class: "site-courses-link",
							to: "/courses/my"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Моё обучение `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
								} else return [createTextVNode("Моё обучение "), createVNode(unref(ArrowRight), { size: 18 })];
							}),
							_: 1
						}, _parent, _scopeId));
						_push(`</div></header><section class="site-courses-section" aria-labelledby="course-list"${_scopeId}><div class="site-courses-section-head"${_scopeId}><h2 id="course-list"${_scopeId}>Выберите курс</h2><p${_scopeId}>Программы и условия доступа — в карточке курса.</p></div>`);
						if (unref(status) === "pending") _push(`<p class="site-courses-state" role="status"${_scopeId}>Загружаем курсы…</p>`);
						else if (unref(error)) _push(`<div class="site-courses-state" role="alert"${_scopeId}><p${_scopeId}>Не удалось загрузить курсы. Проверьте соединение и попробуйте ещё раз.</p><button type="button" class="site-courses-button"${_scopeId}>Повторить</button></div>`);
						else if (!unref(data)?.items?.length) {
							_push(`<div class="site-courses-state"${_scopeId}>`);
							_push(ssrRenderComponent(unref(BookOpen), {
								size: 26,
								"aria-hidden": "true"
							}, null, _parent, _scopeId));
							_push(`<h3${_scopeId}>Курсы скоро появятся</h3><p${_scopeId}>Здесь будут программы обучения SARKISIAN.</p></div>`);
						} else {
							_push(`<div class="site-courses-grid"${_scopeId}><!--[-->`);
							ssrRenderList(unref(data).items, (course) => {
								_push(`<article class="site-course-card"${_scopeId}><div${_scopeId}><h3${_scopeId}>`);
								_push(ssrRenderComponent(_component_NuxtLink, { to: `/courses/${encodeURIComponent(course.id)}` }, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(`${ssrInterpolate(course.titleRu)}`);
										else return [createTextVNode(toDisplayString(course.titleRu), 1)];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</h3>`);
								if (unref(courseDescription)(course.description)) _push(`<p${_scopeId}>${ssrInterpolate(unref(courseDescription)(course.description))}</p>`);
								else _push(`<!---->`);
								_push(`</div><div class="site-course-card-bottom"${_scopeId}><span${_scopeId}>${ssrInterpolate(course.tariffs.length ? `от ${unref(coursePrice)(Math.min(...course.tariffs.map((t) => Number(t.price))))}` : "Условия уточняются")}</span>`);
								_push(ssrRenderComponent(_component_NuxtLink, {
									to: `/courses/${encodeURIComponent(course.id)}`,
									"aria-label": `Подробнее о курсе ${course.titleRu}`
								}, {
									default: withCtx((_, _push, _parent, _scopeId) => {
										if (_push) _push(ssrRenderComponent(unref(ArrowRight), { size: 20 }, null, _parent, _scopeId));
										else return [createVNode(unref(ArrowRight), { size: 20 })];
									}),
									_: 2
								}, _parent, _scopeId));
								_push(`</div></article>`);
							});
							_push(`<!--]--></div>`);
						}
						if (unref(data) && unref(data).pages > 1) _push(`<nav class="site-courses-pagination" aria-label="Страницы каталога курсов"${_scopeId}><button type="button" class="site-courses-button"${ssrIncludeBooleanAttr(unref(page) <= 1 || unref(status) === "pending") ? " disabled" : ""}${_scopeId}>Назад</button><span aria-live="polite"${_scopeId}>${ssrInterpolate(unref(data).page)} / ${ssrInterpolate(unref(data).pages)}</span><button type="button" class="site-courses-button"${ssrIncludeBooleanAttr(unref(page) >= unref(data).pages || unref(status) === "pending") ? " disabled" : ""}${_scopeId}>Далее</button></nav>`);
						else _push(`<!---->`);
						_push(`</section></div>`);
					} else return [createVNode("div", { class: "site-courses" }, [createVNode("header", { class: "site-courses-hero" }, [createVNode("h1", null, [
						createTextVNode("Курсы"),
						createVNode("br"),
						createTextVNode("SARKISIAN")
					]), createVNode("div", null, [createVNode("p", null, "Учитесь в своём темпе: уроки, материалы и практический опыт для мастеров."), createVNode(_component_NuxtLink, {
						class: "site-courses-link",
						to: "/courses/my"
					}, {
						default: withCtx(() => [createTextVNode("Моё обучение "), createVNode(unref(ArrowRight), { size: 18 })]),
						_: 1
					})])]), createVNode("section", {
						class: "site-courses-section",
						"aria-labelledby": "course-list"
					}, [
						createVNode("div", { class: "site-courses-section-head" }, [createVNode("h2", { id: "course-list" }, "Выберите курс"), createVNode("p", null, "Программы и условия доступа — в карточке курса.")]),
						unref(status) === "pending" ? (openBlock(), createBlock("p", {
							key: 0,
							class: "site-courses-state",
							role: "status"
						}, "Загружаем курсы…")) : unref(error) ? (openBlock(), createBlock("div", {
							key: 1,
							class: "site-courses-state",
							role: "alert"
						}, [createVNode("p", null, "Не удалось загрузить курсы. Проверьте соединение и попробуйте ещё раз."), createVNode("button", {
							type: "button",
							class: "site-courses-button",
							onClick: ($event) => unref(refresh)()
						}, "Повторить", 8, ["onClick"])])) : !unref(data)?.items?.length ? (openBlock(), createBlock("div", {
							key: 2,
							class: "site-courses-state"
						}, [
							createVNode(unref(BookOpen), {
								size: 26,
								"aria-hidden": "true"
							}),
							createVNode("h3", null, "Курсы скоро появятся"),
							createVNode("p", null, "Здесь будут программы обучения SARKISIAN.")
						])) : (openBlock(), createBlock("div", {
							key: 3,
							class: "site-courses-grid"
						}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(data).items, (course) => {
							return openBlock(), createBlock("article", {
								key: course.id,
								class: "site-course-card"
							}, [createVNode("div", null, [createVNode("h3", null, [createVNode(_component_NuxtLink, { to: `/courses/${encodeURIComponent(course.id)}` }, {
								default: withCtx(() => [createTextVNode(toDisplayString(course.titleRu), 1)]),
								_: 2
							}, 1032, ["to"])]), unref(courseDescription)(course.description) ? (openBlock(), createBlock("p", { key: 0 }, toDisplayString(unref(courseDescription)(course.description)), 1)) : createCommentVNode("", true)]), createVNode("div", { class: "site-course-card-bottom" }, [createVNode("span", null, toDisplayString(course.tariffs.length ? `от ${unref(coursePrice)(Math.min(...course.tariffs.map((t) => Number(t.price))))}` : "Условия уточняются"), 1), createVNode(_component_NuxtLink, {
								to: `/courses/${encodeURIComponent(course.id)}`,
								"aria-label": `Подробнее о курсе ${course.titleRu}`
							}, {
								default: withCtx(() => [createVNode(unref(ArrowRight), { size: 20 })]),
								_: 1
							}, 8, ["to", "aria-label"])])]);
						}), 128))])),
						unref(data) && unref(data).pages > 1 ? (openBlock(), createBlock("nav", {
							key: 4,
							class: "site-courses-pagination",
							"aria-label": "Страницы каталога курсов"
						}, [
							createVNode("button", {
								type: "button",
								class: "site-courses-button",
								disabled: unref(page) <= 1 || unref(status) === "pending",
								onClick: ($event) => page.value--
							}, "Назад", 8, ["disabled", "onClick"]),
							createVNode("span", { "aria-live": "polite" }, toDisplayString(unref(data).page) + " / " + toDisplayString(unref(data).pages), 1),
							createVNode("button", {
								type: "button",
								class: "site-courses-button",
								disabled: unref(page) >= unref(data).pages || unref(status) === "pending",
								onClick: ($event) => page.value++
							}, "Далее", 8, ["disabled", "onClick"])
						])) : createCommentVNode("", true)
					])])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/courses/index.vue
var _sfc_setup = index_vue_vue_type_script_setup_true_lang_default.setup;
index_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/courses/index.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var courses_default = index_vue_vue_type_script_setup_true_lang_default;

export { courses_default as default };;globalThis.__timing__.logEnd('Load chunks/build/courses-BKX4U11-');
//# sourceMappingURL=courses-BKX4U11-.mjs.map
