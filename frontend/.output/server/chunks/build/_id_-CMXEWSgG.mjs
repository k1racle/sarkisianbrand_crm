globalThis.__timing__.logStart('Load chunks/build/_id_-CMXEWSgG');import { c as useRoute, p as useStorefront, q as useStorefrontPanels, $ as $fetch$1, r as useSeoMeta, S as SiteShell_default, N as NuxtLink, f as useRuntimeConfig, n as navigateTo } from '../virtual/entry.mjs';
import { u as useAsyncData } from './addons-CwJPC5tM.mjs';
import { defineComponent, computed, withAsyncContext, ref, reactive, watch, mergeProps, withCtx, createTextVNode, unref, createVNode, openBlock, createBlock, Fragment, toDisplayString, createCommentVNode, renderList, withDirectives, vModelCheckbox, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain } from 'vue/server-renderer';
import { ArrowRight, PlayCircle } from '@lucide/vue';
import { r as requestKey } from '../_/request-key.mjs';
import { c as courseDescription, s as safeCourseLink, a as coursePrice } from '../_/course-types.mjs';
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

// pages/courses/[id].vue?vue&type=script&setup=true&lang.ts
var _id__vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "[id]",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const route = useRoute(), config = useRuntimeConfig();
		const { accessToken, user, loadMe } = useStorefront();
		const { openAuth } = useStorefrontPanels();
		const id = computed(() => String(route.params.id));
		const { data, status, error, refresh } = ([__temp, __restore] = withAsyncContext(() => useAsyncData(`course-${id.value}`, () => $fetch$1(`/lms/catalog/${encodeURIComponent(id.value)}`, { baseURL: config.public.apiBase }), { watch: [id] })), __temp = await __temp, __restore(), __temp);
		const preview = ref(null), previewError = ref(""), previewLoading = ref(false);
		const accepted = reactive({}), purchaseBusy = ref(false), purchaseError = ref("");
		let previewRevision = 0;
		async function openPreview(lessonId) {
			const current = ++previewRevision;
			previewLoading.value = true;
			previewError.value = "";
			preview.value = null;
			try {
				const result = await $fetch$1(`/lms/catalog/${encodeURIComponent(id.value)}/preview/${encodeURIComponent(lessonId)}`, { baseURL: config.public.apiBase });
				if (current === previewRevision) preview.value = result;
			} catch {
				if (current === previewRevision) previewError.value = "Не удалось открыть урок. Попробуйте ещё раз.";
			} finally {
				if (current === previewRevision) previewLoading.value = false;
			}
		}
		watch(id, () => {
			previewRevision++;
			preview.value = null;
			previewLoading.value = false;
			previewError.value = "";
		});
		async function buy(tariff) {
			if (purchaseBusy.value) return;
			purchaseError.value = "";
			if (!accessToken.value) {
				openAuth("login");
				return;
			}
			if (!accepted[tariff.id]) {
				purchaseError.value = "Подтвердите условия оформления курса.";
				return;
			}
			purchaseBusy.value = true;
			try {
				if (!user.value) await loadMe();
				const token = accessToken.value, owner = user.value?.id, amount = Number(tariff.price);
				if (!token || !owner) throw new Error("Войдите в аккаунт и повторите оформление.");
				if (!Number.isFinite(amount) || amount <= 0) throw new Error("Этот тариф пока нельзя оформить онлайн.");
				const storageKey = `sb-course-purchase:${owner}:${id.value}:${tariff.id}`;
				let intent = null;
				try {
					const raw = sessionStorage.getItem(storageKey);
					if (raw) intent = JSON.parse(raw);
				} catch {
					throw new Error("Не удалось сохранить данные оформления в браузере. Разрешите хранение и повторите попытку.");
				}
				if (intent && (typeof intent.key !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(intent.key) || intent.amount !== amount)) throw new Error("Условия тарифа изменились. Проверьте предыдущий заказ в личном кабинете или обратитесь в поддержку.");
				if (!intent) {
					intent = {
						key: requestKey(),
						amount
					};
					try {
						sessionStorage.setItem(storageKey, JSON.stringify(intent));
					} catch {
						throw new Error("Не удалось сохранить данные оформления в браузере. Разрешите хранение и повторите попытку.");
					}
				}
				const response = await $fetch$1("/lms/my/purchases", {
					baseURL: config.public.apiBase,
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Idempotency-Key": intent.key
					},
					body: {
						courseId: id.value,
						tariffId: tariff.id,
						expectedPrice: amount,
						acceptedTerms: true
					},
					retry: 0
				});
				if (accessToken.value !== token || user.value?.id !== owner) throw new Error("Аккаунт изменился. Войдите в прежний аккаунт, чтобы открыть заказ.");
				if (!response?.orderNumber || !/^SB-C-[a-zA-Z0-9-]+$/.test(response.orderNumber)) throw new Error("Не удалось получить номер заказа. Повторите запрос.");
				try {
					sessionStorage.removeItem(storageKey);
				} catch {}
				await navigateTo(`/orders/${encodeURIComponent(response.orderNumber)}`);
			} catch (e) {
				purchaseError.value = e?.data?.message || e?.message || "Не удалось оформить курс. Попробуйте ещё раз.";
			} finally {
				purchaseBusy.value = false;
			}
		}
		useSeoMeta({ title: () => data.value ? `${data.value.titleRu} — SARKISIAN` : "Курс — SARKISIAN" });
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
						if (unref(status) === "pending") _push(`<p class="site-courses-state" role="status"${_scopeId}>Загружаем курс…</p>`);
						else if (unref(error) || !unref(data)) _push(`<div class="site-courses-state" role="alert"${_scopeId}><h1${_scopeId}>Курс недоступен</h1><p${_scopeId}>Не удалось загрузить программу. Проверьте соединение и повторите попытку.</p><button type="button" class="site-courses-button"${_scopeId}>Повторить</button></div>`);
						else {
							_push(`<!--[--><header class="site-courses-hero"${_scopeId}><h1${_scopeId}>${ssrInterpolate(unref(data).titleRu)}</h1><div${_scopeId}>`);
							if (unref(courseDescription)(unref(data).description)) _push(`<p${_scopeId}>${ssrInterpolate(unref(courseDescription)(unref(data).description))}</p>`);
							else _push(`<!---->`);
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
							_push(`</div></header><section class="site-courses-section" aria-labelledby="program"${_scopeId}><div class="site-courses-section-head"${_scopeId}><h2 id="program"${_scopeId}>Программа курса</h2><p${_scopeId}>Откройте доступные уроки, чтобы познакомиться с форматом.</p></div>`);
							if (unref(data).modules.length) {
								_push(`<div class="site-course-modules"${_scopeId}><!--[-->`);
								ssrRenderList(unref(data).modules, (module) => {
									_push(`<article class="site-course-module"${_scopeId}><h3${_scopeId}>${ssrInterpolate(module.title)}</h3><ul${_scopeId}><!--[-->`);
									ssrRenderList(module.lessons, (lesson) => {
										_push(`<li${_scopeId}><span${_scopeId}>${ssrInterpolate(lesson.title)}</span>`);
										if (lesson.isPreview) {
											_push(`<button type="button"${_scopeId}>`);
											_push(ssrRenderComponent(unref(PlayCircle), { size: 16 }, null, _parent, _scopeId));
											_push(` Посмотреть</button>`);
										} else _push(`<span${_scopeId}>Доступ после покупки</span>`);
										_push(`</li>`);
									});
									_push(`<!--]--></ul></article>`);
								});
								_push(`<!--]--></div>`);
							} else _push(`<p class="site-courses-state"${_scopeId}>Программа готовится.</p>`);
							if (unref(previewLoading)) _push(`<div class="site-courses-state" role="status"${_scopeId}>Открываем урок…</div>`);
							else _push(`<!---->`);
							if (unref(previewError)) _push(`<p role="alert"${_scopeId}>${ssrInterpolate(unref(previewError))}</p>`);
							else _push(`<!---->`);
							if (unref(preview)) {
								_push(`<article class="site-course-material"${_scopeId}><h3${_scopeId}>${ssrInterpolate(unref(preview).title)}</h3>`);
								if (unref(preview).content) _push(`<p class="site-course-text"${_scopeId}>${ssrInterpolate(unref(preview).content)}</p>`);
								else _push(`<!---->`);
								if (unref(safeCourseLink)(unref(preview).videoUrl)) _push(`<a${ssrRenderAttr("href", unref(safeCourseLink)(unref(preview).videoUrl))} target="_blank" rel="noopener noreferrer"${_scopeId}>Открыть видео</a>`);
								else _push(`<!---->`);
								if (unref(safeCourseLink)(unref(preview).presentationUrl)) _push(`<a${ssrRenderAttr("href", unref(safeCourseLink)(unref(preview).presentationUrl))} target="_blank" rel="noopener noreferrer"${_scopeId}>Открыть презентацию</a>`);
								else _push(`<!---->`);
								_push(`</article>`);
							} else _push(`<!---->`);
							_push(`</section><section class="site-courses-section" aria-labelledby="tariffs"${_scopeId}><div class="site-courses-section-head"${_scopeId}><h2 id="tariffs"${_scopeId}>Выберите тариф</h2><p${_scopeId}>Сравните стоимость и срок доступа.</p></div>`);
							if (unref(purchaseError)) _push(`<p role="alert" class="site-courses-state"${_scopeId}>${ssrInterpolate(unref(purchaseError))}</p>`);
							else _push(`<!---->`);
							if (unref(data).tariffs.length) {
								_push(`<div class="site-courses-grid"${_scopeId}><!--[-->`);
								ssrRenderList(unref(data).tariffs, (tariff) => {
									_push(`<article class="site-course-card"${_scopeId}><h3${_scopeId}>${ssrInterpolate(tariff.title)}</h3><p${_scopeId}>${ssrInterpolate(tariff.accessDays ? `Доступ на ${tariff.accessDays} дней` : "Без ограничения срока доступа")}</p><strong${_scopeId}>${ssrInterpolate(unref(coursePrice)(tariff.price))}</strong>`);
									if (unref(data).purchasingAvailable && Number(tariff.price) > 0) {
										_push(`<!--[--><label class="site-course-consent"${_scopeId}><input${ssrIncludeBooleanAttr(Array.isArray(unref(accepted)[tariff.id]) ? ssrLooseContain(unref(accepted)[tariff.id], null) : unref(accepted)[tariff.id]) ? " checked" : ""} type="checkbox"${_scopeId}> <span${_scopeId}>Принимаю `);
										_push(ssrRenderComponent(_component_NuxtLink, {
											to: "/oferta",
											target: "_blank",
											rel: "noopener noreferrer"
										}, {
											default: withCtx((_, _push, _parent, _scopeId) => {
												if (_push) _push(`условия покупки`);
												else return [createTextVNode("условия покупки")];
											}),
											_: 2
										}, _parent, _scopeId));
										_push(` и `);
										_push(ssrRenderComponent(_component_NuxtLink, {
											to: "/privacy",
											target: "_blank",
											rel: "noopener noreferrer"
										}, {
											default: withCtx((_, _push, _parent, _scopeId) => {
												if (_push) _push(`политику конфиденциальности`);
												else return [createTextVNode("политику конфиденциальности")];
											}),
											_: 2
										}, _parent, _scopeId));
										_push(`</span></label><button type="button" class="site-courses-button"${ssrIncludeBooleanAttr(unref(purchaseBusy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(purchaseBusy) ? "Оформляем…" : "Оформить курс")}</button><!--]-->`);
									} else _push(`<p class="site-course-muted"${_scopeId}>Покупка пока недоступна</p>`);
									_push(`</article>`);
								});
								_push(`<!--]--></div>`);
							} else _push(`<p class="site-courses-state"${_scopeId}>Тарифы скоро появятся.</p>`);
							_push(`</section><!--]-->`);
						}
						_push(`</div>`);
					} else return [createVNode("div", { class: "site-courses" }, [createVNode(_component_NuxtLink, {
						class: "site-courses-link site-courses-back",
						to: "/courses"
					}, {
						default: withCtx(() => [createTextVNode("← Все курсы")]),
						_: 1
					}), unref(status) === "pending" ? (openBlock(), createBlock("p", {
						key: 0,
						class: "site-courses-state",
						role: "status"
					}, "Загружаем курс…")) : unref(error) || !unref(data) ? (openBlock(), createBlock("div", {
						key: 1,
						class: "site-courses-state",
						role: "alert"
					}, [
						createVNode("h1", null, "Курс недоступен"),
						createVNode("p", null, "Не удалось загрузить программу. Проверьте соединение и повторите попытку."),
						createVNode("button", {
							type: "button",
							class: "site-courses-button",
							onClick: ($event) => unref(refresh)()
						}, "Повторить", 8, ["onClick"])
					])) : (openBlock(), createBlock(Fragment, { key: 2 }, [
						createVNode("header", { class: "site-courses-hero" }, [createVNode("h1", null, toDisplayString(unref(data).titleRu), 1), createVNode("div", null, [unref(courseDescription)(unref(data).description) ? (openBlock(), createBlock("p", { key: 0 }, toDisplayString(unref(courseDescription)(unref(data).description)), 1)) : createCommentVNode("", true), createVNode(_component_NuxtLink, {
							class: "site-courses-link",
							to: "/courses/my"
						}, {
							default: withCtx(() => [createTextVNode("Моё обучение "), createVNode(unref(ArrowRight), { size: 18 })]),
							_: 1
						})])]),
						createVNode("section", {
							class: "site-courses-section",
							"aria-labelledby": "program"
						}, [
							createVNode("div", { class: "site-courses-section-head" }, [createVNode("h2", { id: "program" }, "Программа курса"), createVNode("p", null, "Откройте доступные уроки, чтобы познакомиться с форматом.")]),
							unref(data).modules.length ? (openBlock(), createBlock("div", {
								key: 0,
								class: "site-course-modules"
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(data).modules, (module) => {
								return openBlock(), createBlock("article", {
									key: module.id,
									class: "site-course-module"
								}, [createVNode("h3", null, toDisplayString(module.title), 1), createVNode("ul", null, [(openBlock(true), createBlock(Fragment, null, renderList(module.lessons, (lesson) => {
									return openBlock(), createBlock("li", { key: lesson.id }, [createVNode("span", null, toDisplayString(lesson.title), 1), lesson.isPreview ? (openBlock(), createBlock("button", {
										key: 0,
										type: "button",
										onClick: ($event) => openPreview(lesson.id)
									}, [createVNode(unref(PlayCircle), { size: 16 }), createTextVNode(" Посмотреть")], 8, ["onClick"])) : (openBlock(), createBlock("span", { key: 1 }, "Доступ после покупки"))]);
								}), 128))])]);
							}), 128))])) : (openBlock(), createBlock("p", {
								key: 1,
								class: "site-courses-state"
							}, "Программа готовится.")),
							unref(previewLoading) ? (openBlock(), createBlock("div", {
								key: 2,
								class: "site-courses-state",
								role: "status"
							}, "Открываем урок…")) : createCommentVNode("", true),
							unref(previewError) ? (openBlock(), createBlock("p", {
								key: 3,
								role: "alert"
							}, toDisplayString(unref(previewError)), 1)) : createCommentVNode("", true),
							unref(preview) ? (openBlock(), createBlock("article", {
								key: 4,
								class: "site-course-material"
							}, [
								createVNode("h3", null, toDisplayString(unref(preview).title), 1),
								unref(preview).content ? (openBlock(), createBlock("p", {
									key: 0,
									class: "site-course-text"
								}, toDisplayString(unref(preview).content), 1)) : createCommentVNode("", true),
								unref(safeCourseLink)(unref(preview).videoUrl) ? (openBlock(), createBlock("a", {
									key: 1,
									href: unref(safeCourseLink)(unref(preview).videoUrl),
									target: "_blank",
									rel: "noopener noreferrer"
								}, "Открыть видео", 8, ["href"])) : createCommentVNode("", true),
								unref(safeCourseLink)(unref(preview).presentationUrl) ? (openBlock(), createBlock("a", {
									key: 2,
									href: unref(safeCourseLink)(unref(preview).presentationUrl),
									target: "_blank",
									rel: "noopener noreferrer"
								}, "Открыть презентацию", 8, ["href"])) : createCommentVNode("", true)
							])) : createCommentVNode("", true)
						]),
						createVNode("section", {
							class: "site-courses-section",
							"aria-labelledby": "tariffs"
						}, [
							createVNode("div", { class: "site-courses-section-head" }, [createVNode("h2", { id: "tariffs" }, "Выберите тариф"), createVNode("p", null, "Сравните стоимость и срок доступа.")]),
							unref(purchaseError) ? (openBlock(), createBlock("p", {
								key: 0,
								role: "alert",
								class: "site-courses-state"
							}, toDisplayString(unref(purchaseError)), 1)) : createCommentVNode("", true),
							unref(data).tariffs.length ? (openBlock(), createBlock("div", {
								key: 1,
								class: "site-courses-grid"
							}, [(openBlock(true), createBlock(Fragment, null, renderList(unref(data).tariffs, (tariff) => {
								return openBlock(), createBlock("article", {
									key: tariff.id,
									class: "site-course-card"
								}, [
									createVNode("h3", null, toDisplayString(tariff.title), 1),
									createVNode("p", null, toDisplayString(tariff.accessDays ? `Доступ на ${tariff.accessDays} дней` : "Без ограничения срока доступа"), 1),
									createVNode("strong", null, toDisplayString(unref(coursePrice)(tariff.price)), 1),
									unref(data).purchasingAvailable && Number(tariff.price) > 0 ? (openBlock(), createBlock(Fragment, { key: 0 }, [createVNode("label", { class: "site-course-consent" }, [
										withDirectives(createVNode("input", {
											"onUpdate:modelValue": ($event) => unref(accepted)[tariff.id] = $event,
											type: "checkbox"
										}, null, 8, ["onUpdate:modelValue"]), [[vModelCheckbox, unref(accepted)[tariff.id]]]),
										createTextVNode(),
										createVNode("span", null, [
											createTextVNode("Принимаю "),
											createVNode(_component_NuxtLink, {
												to: "/oferta",
												target: "_blank",
												rel: "noopener noreferrer"
											}, {
												default: withCtx(() => [createTextVNode("условия покупки")]),
												_: 1
											}),
											createTextVNode(" и "),
											createVNode(_component_NuxtLink, {
												to: "/privacy",
												target: "_blank",
												rel: "noopener noreferrer"
											}, {
												default: withCtx(() => [createTextVNode("политику конфиденциальности")]),
												_: 1
											})
										])
									]), createVNode("button", {
										type: "button",
										class: "site-courses-button",
										disabled: unref(purchaseBusy),
										onClick: ($event) => buy(tariff)
									}, toDisplayString(unref(purchaseBusy) ? "Оформляем…" : "Оформить курс"), 9, ["disabled", "onClick"])], 64)) : (openBlock(), createBlock("p", {
										key: 1,
										class: "site-course-muted"
									}, "Покупка пока недоступна"))
								]);
							}), 128))])) : (openBlock(), createBlock("p", {
								key: 2,
								class: "site-courses-state"
							}, "Тарифы скоро появятся."))
						])
					], 64))])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/courses/[id].vue
var _sfc_setup = _id__vue_vue_type_script_setup_true_lang_default.setup;
_id__vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/courses/[id].vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var _id__default = _id__vue_vue_type_script_setup_true_lang_default;

export { _id__default as default };;globalThis.__timing__.logEnd('Load chunks/build/_id_-CMXEWSgG');
//# sourceMappingURL=_id_-CMXEWSgG.mjs.map
