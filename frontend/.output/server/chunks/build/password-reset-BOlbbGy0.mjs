globalThis.__timing__.logStart('Load chunks/build/password-reset-BOlbbGy0');import { c as useRoute, q as useStorefrontPanels, u as useHead, S as SiteShell_default, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useStorefrontSeo } from './useStorefrontSeo-DvgEOsDg.mjs';
import { defineComponent, ref, computed, withCtx, unref, createVNode, openBlock, createBlock, withModifiers, createTextVNode, withDirectives, isRef, vModelDynamic, toDisplayString, createCommentVNode, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderDynamicModel, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { CheckCircle2, KeyRound, EyeOff, Eye } from '@lucide/vue';
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

// pages/password-reset.vue?vue&type=script&setup=true&lang.ts
var password_reset_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "password-reset",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		const config = useRuntimeConfig();
		const password = ref("");
		const repeat = ref("");
		const show = ref(false);
		const busy = ref(false);
		const error = ref("");
		const complete = ref(false);
		const token = computed(() => typeof route.query.token === "string" ? route.query.token : "");
		const { openAuth } = useStorefrontPanels();
		useStorefrontSeo({
			title: "Восстановление пароля — SARKISIAN BRAND",
			noindex: true
		});
		useHead({ meta: [{
			name: "referrer",
			content: "no-referrer"
		}] });
		async function submit() {
			error.value = "";
			if (!token.value) {
				error.value = "В ссылке отсутствует код восстановления";
				return;
			}
			if (password.value !== repeat.value) {
				error.value = "Пароли не совпадают";
				return;
			}
			busy.value = true;
			try {
				await $fetch$1("/auth/password-reset/complete", {
					baseURL: config.public.apiBase,
					method: "POST",
					body: {
						token: token.value,
						newPassword: password.value
					}
				});
				complete.value = true;
			} catch (exception) {
				error.value = exception?.data?.message || exception?.message || "Не удалось изменить пароль";
			} finally {
				busy.value = false;
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SiteShell_default, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sb-reset-page"${_scopeId}>`);
						if (unref(complete)) {
							_push(`<section class="sb-reset-card" role="status"${_scopeId}>`);
							_push(ssrRenderComponent(unref(CheckCircle2), { size: 24 }, null, _parent, _scopeId));
							_push(`<p class="sb-kicker"${_scopeId}>ПАРОЛЬ ИЗМЕНЁН</p><h1${_scopeId}>Доступ восстановлен</h1><p${_scopeId}>Все прежние сессии завершены. Теперь можно войти с новым паролем.</p><button class="sb-primary"${_scopeId}>Войти с новым паролем</button></section>`);
						} else if (!unref(token)) {
							_push(`<section class="sb-reset-card"${_scopeId}>`);
							_push(ssrRenderComponent(unref(KeyRound), { size: 24 }, null, _parent, _scopeId));
							_push(`<h1${_scopeId}>Восстановить пароль</h1><p${_scopeId}>Откройте вход и нажмите «Забыли пароль?». Мы отправим ссылку для восстановления на ваш email.</p><button class="sb-primary"${_scopeId}>Открыть вход</button></section>`);
						} else {
							_push(`<section class="sb-reset-card"${_scopeId}>`);
							_push(ssrRenderComponent(unref(KeyRound), { size: 24 }, null, _parent, _scopeId));
							_push(`<p class="sb-kicker"${_scopeId}>БЕЗОПАСНОСТЬ</p><h1${_scopeId}>Новый пароль</h1><p${_scopeId}>Используйте не менее 10 символов, обязательно добавьте буквы и цифры.</p><form${_scopeId}><label${_scopeId}>Новый пароль <div class="sb-password"${_scopeId}><input${ssrRenderDynamicModel(unref(show) ? "text" : "password", unref(password), null)}${ssrRenderAttr("type", unref(show) ? "text" : "password")} autocomplete="new-password" minlength="10" required${_scopeId}><button type="button"${ssrRenderAttr("aria-label", unref(show) ? "Скрыть пароль" : "Показать пароль")}${ssrRenderAttr("aria-pressed", unref(show))}${_scopeId}>`);
							if (unref(show)) _push(ssrRenderComponent(unref(EyeOff), { size: 18 }, null, _parent, _scopeId));
							else _push(ssrRenderComponent(unref(Eye), { size: 18 }, null, _parent, _scopeId));
							_push(`</button></div></label><label${_scopeId}>Повторите пароль<input${ssrRenderDynamicModel(unref(show) ? "text" : "password", unref(repeat), null)}${ssrRenderAttr("type", unref(show) ? "text" : "password")} autocomplete="new-password" minlength="10" required${_scopeId}></label>`);
							if (unref(error)) _push(`<p class="sb-form-error" role="alert"${_scopeId}>${ssrInterpolate(unref(error))}</p>`);
							else _push(`<!---->`);
							_push(`<button class="sb-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${_scopeId}>${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить новый пароль")}</button></form></section>`);
						}
						_push(`</div>`);
					} else return [createVNode("div", { class: "sb-reset-page" }, [unref(complete) ? (openBlock(), createBlock("section", {
						key: 0,
						class: "sb-reset-card",
						role: "status"
					}, [
						createVNode(unref(CheckCircle2), { size: 24 }),
						createVNode("p", { class: "sb-kicker" }, "ПАРОЛЬ ИЗМЕНЁН"),
						createVNode("h1", null, "Доступ восстановлен"),
						createVNode("p", null, "Все прежние сессии завершены. Теперь можно войти с новым паролем."),
						createVNode("button", {
							class: "sb-primary",
							onClick: ($event) => unref(openAuth)()
						}, "Войти с новым паролем", 8, ["onClick"])
					])) : !unref(token) ? (openBlock(), createBlock("section", {
						key: 1,
						class: "sb-reset-card"
					}, [
						createVNode(unref(KeyRound), { size: 24 }),
						createVNode("h1", null, "Восстановить пароль"),
						createVNode("p", null, "Откройте вход и нажмите «Забыли пароль?». Мы отправим ссылку для восстановления на ваш email."),
						createVNode("button", {
							class: "sb-primary",
							onClick: ($event) => unref(openAuth)()
						}, "Открыть вход", 8, ["onClick"])
					])) : (openBlock(), createBlock("section", {
						key: 2,
						class: "sb-reset-card"
					}, [
						createVNode(unref(KeyRound), { size: 24 }),
						createVNode("p", { class: "sb-kicker" }, "БЕЗОПАСНОСТЬ"),
						createVNode("h1", null, "Новый пароль"),
						createVNode("p", null, "Используйте не менее 10 символов, обязательно добавьте буквы и цифры."),
						createVNode("form", { onSubmit: withModifiers(submit, ["prevent"]) }, [
							createVNode("label", null, [createTextVNode("Новый пароль "), createVNode("div", { class: "sb-password" }, [withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => isRef(password) ? password.value = $event : null,
								type: unref(show) ? "text" : "password",
								autocomplete: "new-password",
								minlength: "10",
								required: ""
							}, null, 8, ["onUpdate:modelValue", "type"]), [[vModelDynamic, unref(password)]]), createVNode("button", {
								type: "button",
								"aria-label": unref(show) ? "Скрыть пароль" : "Показать пароль",
								"aria-pressed": unref(show),
								onClick: ($event) => show.value = !unref(show)
							}, [unref(show) ? (openBlock(), createBlock(unref(EyeOff), {
								key: 0,
								size: 18
							})) : (openBlock(), createBlock(unref(Eye), {
								key: 1,
								size: 18
							}))], 8, [
								"aria-label",
								"aria-pressed",
								"onClick"
							])])]),
							createVNode("label", null, [createTextVNode("Повторите пароль"), withDirectives(createVNode("input", {
								"onUpdate:modelValue": ($event) => isRef(repeat) ? repeat.value = $event : null,
								type: unref(show) ? "text" : "password",
								autocomplete: "new-password",
								minlength: "10",
								required: ""
							}, null, 8, ["onUpdate:modelValue", "type"]), [[vModelDynamic, unref(repeat)]])]),
							unref(error) ? (openBlock(), createBlock("p", {
								key: 0,
								class: "sb-form-error",
								role: "alert"
							}, toDisplayString(unref(error)), 1)) : createCommentVNode("", true),
							createVNode("button", {
								class: "sb-primary",
								disabled: unref(busy)
							}, toDisplayString(unref(busy) ? "Сохраняем…" : "Сохранить новый пароль"), 9, ["disabled"])
						], 32)
					]))])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/password-reset.vue
var _sfc_setup = password_reset_vue_vue_type_script_setup_true_lang_default.setup;
password_reset_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/password-reset.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var password_reset_default = password_reset_vue_vue_type_script_setup_true_lang_default;

export { password_reset_default as default };;globalThis.__timing__.logEnd('Load chunks/build/password-reset-BOlbbGy0');
//# sourceMappingURL=password-reset-BOlbbGy0.mjs.map
