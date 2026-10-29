globalThis.__timing__.logStart('Load chunks/build/studio-rewards-CD2TDiiv');import { u as useHead, a as useWorkspaceSession } from '../virtual/entry.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, ref, computed, mergeProps, unref, isRef, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrInterpolate, ssrRenderStyle, ssrLooseContain, ssrRenderAttr, ssrRenderList } from 'vue/server-renderer';
import { RefreshCw, Save, Gift } from '@lucide/vue';
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

// pages/crm/studio-rewards.vue?vue&type=script&setup=true&lang.ts
var studio_rewards_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "studio-rewards",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Награды игры — SARKISIAN CRM" });
		const { user } = useWorkspaceSession();
		const data = ref(null), busy = ref(false), error = ref(""), message = ref(""), baseline = ref(""), tab = ref("settings");
		const tabs = [["settings", "Условия наград"], ["history", "История обменов"]];
		const canWrite = computed(() => ["ADMIN", "SUPERVISOR"].includes(user.value?.role || ""));
		const payload = () => data.value ? {
			enabled: data.value.settings.enabled,
			dailyRunLimit: data.value.settings.dailyRunLimit,
			minimumRunSeconds: data.value.settings.minimumRunSeconds,
			offers: data.value.offers.map((o) => ({
				id: o.id,
				discountPercent: o.discountPercent,
				coinPrice: o.coinPrice,
				validDays: o.validDays,
				minimumAmount: o.minimumAmount,
				maximumDiscount: o.maximumDiscount || null,
				isActive: o.isActive
			}))
		} : null;
		const dirty = computed(() => Boolean(data.value) && JSON.stringify(payload()) !== baseline.value);
		onBeforeRouteLeave(() => !busy.value && (!dirty.value || (void 0).confirm("Уйти без сохранения изменений наград?")));
		const number = (value) => new Intl.NumberFormat("ru-RU").format(value);
		const date = (value) => Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat("ru-RU", {
			dateStyle: "short",
			timeStyle: "short"
		}).format(new Date(value)) : "—";
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-page-content studio-crm" }, _attrs))}><header class="crm-page-header"><div><h1>Награды игры</h1><p>Скидки за игровые монеты и история обменов.</p></div><div class="crm-action-bar"><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 16 }, null, _parent));
			_push(`Обновить</button>`);
			if (unref(canWrite) && unref(tab) === "settings") {
				_push(`<button type="submit" form="studio-rewards-settings-panel" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 17 }, null, _parent));
				_push(`${ssrInterpolate(unref(busy) ? "Сохраняем…" : "Сохранить")}</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(error)) {
				_push(`<p role="alert" class="studio-crm-notice">${ssrInterpolate(unref(error))}`);
				if (!unref(data)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Повторить</button>`);
				else _push(`<!---->`);
				_push(`</p>`);
			} else _push(`<!---->`);
			if (unref(message)) _push(`<p role="status" class="studio-crm-notice">${ssrInterpolate(unref(message))}</p>`);
			else _push(`<!---->`);
			if (unref(busy) && !unref(data)) _push(`<p role="status">Загружаем настройки наград…</p>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[--><div class="studio-crm-stats"><span>`);
				_push(ssrRenderComponent(unref(Gift), { size: 17 }, null, _parent));
				_push(`Выдано наград: <strong>${ssrInterpolate(number(unref(data).issued))}</strong></span><span>Игроков: <strong>${ssrInterpolate(number(unref(data).accounts))}</strong></span>`);
				if (unref(dirty)) _push(`<span class="studio-crm-dirty" role="status">Есть несохранённые изменения</span>`);
				else _push(`<!---->`);
				_push(`</div>`);
				_push(ssrRenderComponent(_component_CrmCardTabs, {
					modelValue: unref(tab),
					"onUpdate:modelValue": ($event) => isRef(tab) ? tab.value = $event : null,
					tabs,
					prefix: "studio-rewards",
					label: "Награды игры"
				}, null, _parent));
				_push(`<form id="studio-rewards-settings-panel" role="tabpanel" aria-labelledby="studio-rewards-settings-tab" style="${ssrRenderStyle(unref(tab) === "settings" ? null : { display: "none" })}"><fieldset${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy)) ? " disabled" : ""} class="studio-crm-basics"><legend>Начисление монет</legend><label class="studio-crm-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(data).settings.enabled) ? ssrLooseContain(unref(data).settings.enabled, null) : unref(data).settings.enabled) ? " checked" : ""} type="checkbox">Включить начисление и обмен монет</label><div class="studio-crm-grid studio-crm-grid--basics"><label class="crm-field">Приёмов с наградой за сутки<input${ssrRenderAttr("value", unref(data).settings.dailyRunLimit)} class="crm-input" type="number" min="1" max="100" required><small>Лимит на аккаунт, сутки по UTC.</small></label><label class="crm-field">Минимальная длительность, секунд<input${ssrRenderAttr("value", unref(data).settings.minimumRunSeconds)} class="crm-input" type="number" min="30" max="600" required><small>Минимум 30 секунд; все этапы приёма должны быть пройдены.</small></label></div></fieldset><div class="studio-crm-section-title"><h2>Скидки для обмена</h2>`);
				if (unref(canWrite)) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Добавить награду</button>`);
				else _push(`<!---->`);
				_push(`</div><!--[-->`);
				ssrRenderList(unref(data).offers, (offer) => {
					_push(`<fieldset${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy)) ? " disabled" : ""} class="studio-crm-offer"><legend>Скидка ${ssrInterpolate(offer.discountPercent)}%</legend><div class="studio-crm-grid"><label class="crm-field">Скидка, %<input${ssrRenderAttr("value", offer.discountPercent)} class="crm-input" type="number" min="1" max="50" required></label><label class="crm-field">Цена в монетах<input${ssrRenderAttr("value", offer.coinPrice)} class="crm-input" type="number" min="1000" max="10000000" required></label><label class="crm-field">Срок, дней<input${ssrRenderAttr("value", offer.validDays)} class="crm-input" type="number" min="1" max="365" required></label><label class="crm-field">Мин. заказ, ₽<input${ssrRenderAttr("value", offer.minimumAmount)} class="crm-input" type="number" min="0" max="1000000" required></label><label class="crm-field">Макс. скидка, ₽<input${ssrRenderAttr("value", offer.maximumDiscount)} class="crm-input" type="number" min="1" max="1000000" placeholder="Без ограничения"></label></div><label class="studio-crm-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(offer.isActive) ? ssrLooseContain(offer.isActive, null) : offer.isActive) ? " checked" : ""} type="checkbox">Показывать в магазине наград</label></fieldset>`);
				});
				_push(`<!--]--><details class="studio-crm-help"><summary>Как работают условия наград</summary><p>Промокод выдаётся только аккаунту игрока, действует один раз и имеет собственный срок. Новые условия применяются к следующим обменам. Уже выданные промокоды сохраняют прежние условия. Практика доступна без ограничений, но учебные и локальные бонусы смены не дают скидок.</p></details></form><section id="studio-rewards-history-panel" role="tabpanel" aria-labelledby="studio-rewards-history-tab" style="${ssrRenderStyle(unref(tab) === "history" ? null : { display: "none" })}">`);
				if (!unref(data).recent.length) _push(`<p class="studio-crm-empty">Пока никто не обменял монеты на скидку.</p>`);
				else {
					_push(`<div class="studio-crm-table"><table class="crm-data-table"><thead><tr><th scope="col">Дата</th><th scope="col">Аккаунт</th><th scope="col">Награда</th><th scope="col">Монеты</th><th scope="col">Промокод</th></tr></thead><tbody><!--[-->`);
					ssrRenderList(unref(data).recent, (row) => {
						_push(`<tr><td>${ssrInterpolate(date(row.createdAt))}</td><td>${ssrInterpolate(row.email)}</td><td>${ssrInterpolate(row.discountPercent)}%</td><td>${ssrInterpolate(number(row.coinPrice))}</td><td>${ssrInterpolate(row.code)}</td></tr>`);
					});
					_push(`<!--]--></tbody></table></div>`);
				}
				_push(`</section><!--]-->`);
			} else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// pages/crm/studio-rewards.vue
var _sfc_setup = studio_rewards_vue_vue_type_script_setup_true_lang_default.setup;
studio_rewards_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/studio-rewards.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var studio_rewards_default = studio_rewards_vue_vue_type_script_setup_true_lang_default;

export { studio_rewards_default as default };;globalThis.__timing__.logEnd('Load chunks/build/studio-rewards-CD2TDiiv');
//# sourceMappingURL=studio-rewards-CD2TDiiv.mjs.map
