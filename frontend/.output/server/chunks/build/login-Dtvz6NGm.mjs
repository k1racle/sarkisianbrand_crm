globalThis.__timing__.logStart('Load chunks/build/login-Dtvz6NGm');import { c as useRoute, a as useWorkspaceSession, u as useHead, N as NuxtLink, j as useState, I as useCrmTheme } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { _ as _virtual_public__2Fcrm_2Fpwa_2Ficon_default } from './_virtual_public-Dz_MkdLu.mjs';
import { defineComponent, ref, mergeProps, unref, createVNode, resolveDynamicComponent, withCtx, createTextVNode, computed, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderDynamicModel, ssrRenderVNode, ssrRenderTeleport } from 'vue/server-renderer';
import { LockKeyhole, EyeOff, Eye, ArrowRight, Sun, Moon, Download, Smartphone, X } from '@lucide/vue';
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

// components/crm/CrmThemeToggle.vue?vue&type=script&setup=true&lang.ts
var CrmThemeToggle_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmThemeToggle",
	__ssrInlineRender: true,
	setup(__props) {
		const { theme} = useCrmTheme();
		const label = computed(() => theme.value === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<button${ssrRenderAttrs(mergeProps({
				type: "button",
				class: "crm-icon-button crm-theme-toggle",
				"aria-label": unref(label),
				title: unref(label)
			}, _attrs))}>`);
			if (unref(theme) === "dark") _push(ssrRenderComponent(unref(Sun), {
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			else _push(ssrRenderComponent(unref(Moon), {
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button>`);
		};
	}
});
// components/crm/CrmThemeToggle.vue
var _sfc_setup$2 = CrmThemeToggle_vue_vue_type_script_setup_true_lang_default.setup;
CrmThemeToggle_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmThemeToggle.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var CrmThemeToggle_default = Object.assign(CrmThemeToggle_vue_vue_type_script_setup_true_lang_default, { __name: "CrmThemeToggle" });
// composables/useCrmPwa.ts
function useCrmPwa() {
	const online = useState("crm-online", () => true);
	const installed = useState("crm-installed", () => false);
	const installPrompt = useState("crm-install-prompt", () => null);
	const installHelp = useState("crm-install-help", () => false);
	const installBusy = useState("crm-install-busy", () => false);
	const ios = useState("crm-ios", () => false);
	async function install() {
		if (installBusy.value || installed.value) return;
		const prompt = installPrompt.value;
		if (!prompt) {
			installHelp.value = true;
			return;
		}
		installBusy.value = true;
		installPrompt.value = null;
		try {
			await prompt.prompt();
			await prompt.userChoice;
		} catch {
			installHelp.value = true;
		} finally {
			installBusy.value = false;
		}
	}
	return {
		online,
		installed,
		installPrompt,
		installHelp,
		installBusy,
		ios,
		install
	};
}
// components/crm/CrmInstallButton.vue?vue&type=script&setup=true&lang.ts
var CrmInstallButton_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmInstallButton",
	__ssrInlineRender: true,
	setup(__props) {
		const { installed, installBusy, installHelp, ios} = useCrmPwa();
		useCatalogDialog(computed(() => installHelp.value), () => {
			installHelp.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<!--[-->`);
			if (!unref(installed)) {
				_push(`<button type="button" class="crm-install-button" aria-label="Установить CRM" title="Установить CRM"${ssrIncludeBooleanAttr(unref(installBusy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Download), {
					size: 20,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`<span>Установить CRM</span></button>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(installHelp)) {
					_push(`<div class="crm-dialog-backdrop"><section class="crm-install-dialog" role="dialog" aria-modal="true" aria-labelledby="crm-install-title" tabindex="-1"><header>`);
					_push(ssrRenderComponent(unref(Smartphone), {
						size: 26,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<button type="button" class="crm-icon-button" aria-label="Закрыть инструкцию">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><h2 id="crm-install-title">CRM на вашем устройстве</h2><p>Открывайте рабочее пространство с отдельной иконки на домашнем экране.</p>`);
					if (unref(ios)) _push(`<ol><li>Откройте CRM в Safari.</li><li>Нажмите «Поделиться» и выберите «На экран Домой».</li><li>Подтвердите добавление.</li></ol>`);
					else _push(`<ol><li>Откройте меню браузера.</li><li>Выберите «Установить приложение» или «Добавить на главный экран», если этот пункт доступен.</li><li>Подтвердите установку.</li></ol>`);
					_push(`<p class="crm-install-note">Если пункта установки нет, продолжайте работу в браузере. Для загрузки клиентов и сохранения изменений требуется интернет.</p><button type="button" class="crm-primary-button crm-button crm-button--primary">Понятно</button></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`<!--]-->`);
		};
	}
});
// components/crm/CrmInstallButton.vue
var _sfc_setup$1 = CrmInstallButton_vue_vue_type_script_setup_true_lang_default.setup;
CrmInstallButton_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmInstallButton.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmInstallButton_default = Object.assign(CrmInstallButton_vue_vue_type_script_setup_true_lang_default, { __name: "CrmInstallButton" });
// pages/crm/login.vue?vue&type=script&setup=true&lang.ts
var login_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "login",
	__ssrInlineRender: true,
	setup(__props) {
		useRoute();
		const { logoutWarning } = useWorkspaceSession();
		const { online } = useCrmPwa();
		const email = ref(""), password = ref(""), error = ref("");
		const loading = ref(false), showPassword = ref(false);
		useHead({ title: "Вход — SARKISIAN CRM" });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmThemeToggle = CrmThemeToggle_default;
			const _component_CrmInstallButton = CrmInstallButton_default;
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-app-login" }, _attrs))}><header class="crm-login-brand"><img class="crm-brand-mark"${ssrRenderAttr("src", _virtual_public__2Fcrm_2Fpwa_2Ficon_default)} width="42" height="42" alt=""><strong>SARKISIAN CRM</strong>`);
			_push(ssrRenderComponent(_component_CrmThemeToggle, null, null, _parent));
			_push(`</header><form class="crm-login-card"${ssrRenderAttr("aria-busy", unref(loading))}>`);
			_push(ssrRenderComponent(unref(LockKeyhole), {
				size: 28,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<h1>Ваша команда.<br>Всё под рукой.</h1><p>Клиенты, сделки и задачи — в одном рабочем пространстве.</p>`);
			if (unref(logoutWarning)) _push(`<p class="crm-login-error" role="alert">${ssrInterpolate(unref(logoutWarning))}</p>`);
			else _push(`<!---->`);
			_push(`<label for="crm-email">Рабочая почта</label><input class="crm-input" id="crm-email"${ssrRenderAttr("value", unref(email))} type="email" autocomplete="username" inputmode="email" autocapitalize="none"${ssrRenderAttr("spellcheck", false)} placeholder="name@company.ru" required${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><label for="crm-password">Пароль</label><div class="crm-password"><input class="crm-input" id="crm-password"${ssrRenderDynamicModel(unref(showPassword) ? "text" : "password", unref(password), null)}${ssrRenderAttr("type", unref(showPassword) ? "text" : "password")} autocomplete="current-password" required${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}><button type="button" class="crm-icon-button"${ssrRenderAttr("aria-label", unref(showPassword) ? "Скрыть пароль" : "Показать пароль")}${ssrRenderAttr("aria-pressed", unref(showPassword))}>`);
			ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(showPassword) ? unref(EyeOff) : unref(Eye)), { size: 20 }, null), _parent);
			_push(`</button></div>`);
			if (unref(error)) _push(`<p class="crm-login-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (!unref(online)) _push(`<p class="crm-login-error" role="status">Для входа подключитесь к интернету.</p>`);
			else _push(`<!---->`);
			_push(`<button type="submit" class="crm-primary-button crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || !unref(online)) ? " disabled" : ""}>${ssrInterpolate(unref(loading) ? "Входим…" : "Войти в CRM")}`);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
			_push(`</button><small>Используйте учётную запись сотрудника SARKISIAN.</small></form><div class="crm-login-install">`);
			_push(ssrRenderComponent(_component_CrmInstallButton, null, null, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`На сайт SARKISIAN `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("На сайт SARKISIAN "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</div></main>`);
		};
	}
});
// pages/crm/login.vue
var _sfc_setup = login_vue_vue_type_script_setup_true_lang_default.setup;
login_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/login.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var login_default = login_vue_vue_type_script_setup_true_lang_default;

export { login_default as default };;globalThis.__timing__.logEnd('Load chunks/build/login-Dtvz6NGm');
//# sourceMappingURL=login-Dtvz6NGm.mjs.map
