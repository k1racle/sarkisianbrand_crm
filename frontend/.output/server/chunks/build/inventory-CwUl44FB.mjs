globalThis.__timing__.logStart('Load chunks/build/inventory-CwUl44FB');import { u as useHead, a as useWorkspaceSession, N as NuxtLink, H as resolveProductImageUrl, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, isRef, withCtx, createVNode, toDisplayString, openBlock, createBlock, createCommentVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderDynamicAttr, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrRenderClass, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Search, Boxes, ArrowRight, ArrowLeft, X, PackageCheck, CheckCircle2, Clock3, Database, AlertTriangle, ShieldCheck, Layers, Plus, Play, Pencil, Trash2 } from '@lucide/vue';
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

// components/CrmStockRules.vue?vue&type=script&setup=true&lang.ts
var CrmStockRules_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmStockRules",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig(), session = useWorkspaceSession();
		const data = ref(null), loading = ref(false), saving = ref(false), error = ref(""), notice = ref(""), filter = ref(""), view = ref("rules");
		const channels = {
			WEB: "Сайт",
			B2B: "B2B-кабинет",
			OZON: "Ozon",
			WILDBERRIES: "Wildberries",
			YANDEX_MARKET: "Яндекс Маркет",
			MEGAMARKET: "Мегамаркет"
		};
		const kinds = {
			VARIANT: "Отдельная позиция (SKU)",
			PRODUCT: "Товар со всеми вариантами",
			CATEGORY: "Категория",
			GROUP: "Товарная группа"
		};
		const dialog = ref(""), draft = ref({}), original = ref(""), formError = ref(""), query = ref(""), options = ref([]), finding = ref(false), targetLabel = ref(""), members = ref([]);
		const request = (path, method = "GET", body, params) => $fetch$1("/inventory-settings" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			method,
			body,
			query: params,
			retry: 0
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Не удалось выполнить действие. Повторите попытку.";
		const target = (r) => r.variant ? `${r.variant.product.nameRu} · ${r.variant.sku}` : r.product?.nameRu || r.category?.nameRu || r.group?.name || "Объект недоступен";
		const scope = (r) => r.variantId ? "VARIANT" : r.productId ? "PRODUCT" : r.categoryId ? "CATEGORY" : "GROUP";
		const rules = computed(() => (data.value?.rules || []).filter((r) => `${r.name} ${target(r)}`.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())));
		const groups = computed(() => (data.value?.groups || []).filter((g) => g.name.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())));
		const snapshot = () => JSON.stringify({
			draft: draft.value,
			members: members.value
		});
		const dirty = computed(() => !!dialog.value && snapshot() !== original.value);
		let findGeneration = 0, timer;
		async function find() {
			const n = ++findGeneration;
			finding.value = true;
			try {
				const result = await request("/targets", "GET", void 0, {
					kind: dialog.value === "group" ? "PRODUCT" : draft.value.targetKind,
					search: query.value.trim() || void 0
				});
				if (n === findGeneration) options.value = result;
			} catch (e) {
				if (n === findGeneration) formError.value = message(e);
			} finally {
				if (n === findGeneration) finding.value = false;
			}
		}
		function close() {
			if (saving.value) return;
			if (dirty.value && !(void 0).confirm("Закрыть без сохранения изменений?")) return;
			dialog.value = "";
			++findGeneration;
			clearTimeout(timer);
		}
		useCatalogDialog(computed(() => !!dialog.value), close);
		watch(query, () => {
			++findGeneration;
			clearTimeout(timer);
			timer = setTimeout(find, 250);
		});
		watch(view, () => {
			filter.value = "";
		});
		onBeforeRouteLeave(() => !dirty.value || (void 0).confirm("Выйти без сохранения сценария?"));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-stock-rules",
				"aria-label": "Сценарии минимального запаса"
			}, _attrs))}><div class="crm-stock-rules-intro">`);
			_push(ssrRenderComponent(unref(ShieldCheck), { size: 24 }, null, _parent));
			_push(`<div><h2>Сохраняйте запас для нужных каналов</h2><p>Когда остаток позиции достигает порога, выбранные каналы получают доступное количество 0. Можно сочетать несколько сценариев: при 20 шт. закрыть маркетплейсы, при 5 — все продажи.</p></div></div><div class="crm-stock-rules-toolbar"><div class="crm-stock-rules-switch"><button type="button" class="crm-button"${ssrRenderAttr("aria-pressed", unref(view) === "rules")}>Сценарии <span>${ssrInterpolate(unref(data)?.rules.length || 0)}</span></button><button type="button" class="crm-button"${ssrRenderAttr("aria-pressed", unref(view) === "groups")}>`);
			_push(ssrRenderComponent(unref(Layers), { size: 16 }, null, _parent));
			_push(`Товарные группы</button></div><div class="crm-stock-rules-actions"><button class="crm-button crm-button--icon" type="button" aria-label="Обновить сценарии"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`</button>`);
			if (unref(data)?.canManage) {
				_push(`<button class="crm-button crm-button--primary" type="button">`);
				_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
				_push(`${ssrInterpolate(unref(view) === "rules" ? "Новый сценарий" : "Новая группа")}</button>`);
			} else _push(`<!---->`);
			_push(`</div></div>`);
			if (unref(error)) _push(`<p role="alert" class="crm-stock-rules-error">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<label class="crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(filter))} class="crm-input"${ssrRenderAttr("aria-label", unref(view) === "rules" ? "Поиск сценария" : "Поиск группы")}${ssrRenderAttr("placeholder", unref(view) === "rules" ? "Название сценария или товара" : "Название группы")}></label>`);
			if (unref(loading)) _push(`<p role="status">Загружаем настройки…</p>`);
			else if (unref(view) === "rules") {
				_push(`<div class="crm-stock-rules-list"><!--[-->`);
				ssrRenderList(unref(rules), (rule) => {
					_push(`<article class="crm-surface crm-stock-rule"${ssrRenderAttr("data-disabled", !rule.isEnabled)}><div class="crm-stock-rule-main"><div class="crm-stock-rule-title">`);
					_push(ssrRenderComponent(unref(ShieldCheck), { size: 19 }, null, _parent));
					_push(`<h3>${ssrInterpolate(rule.name)}</h3><span class="crm-stock-rule-badge"${ssrRenderAttr("data-active", rule._count.states > 0)}>${ssrInterpolate(!rule.isEnabled ? "Выключен" : rule._count.states ? `Сработал: ${rule._count.states} поз.` : "Наблюдает")}</span></div><p>${ssrInterpolate(kinds[scope(rule)])}: <strong>${ssrInterpolate(target(rule))}</strong></p>`);
					if (rule.categoryId && rule.includeChildren) _push(`<small>Включая вложенные категории</small>`);
					else _push(`<!---->`);
					_push(`</div><div class="crm-stock-rule-condition"><small>${ssrInterpolate(rule.basis === "AVAILABLE" ? "Свободный остаток" : "Физический остаток")}</small><strong>≤ ${ssrInterpolate(rule.threshold)} шт.</strong><small>${ssrInterpolate(rule.autoResume ? "Возобновление автоматически" : "Возобновление вручную")}</small></div><div class="crm-stock-rule-channels"><small>Закрыть продажи</small><div><!--[-->`);
					ssrRenderList(rule.channels, (channel) => {
						_push(`<span>${ssrInterpolate(channels[channel])}</span>`);
					});
					_push(`<!--]--></div></div>`);
					if (unref(data).canManage) {
						_push(`<div class="crm-stock-rules-actions">`);
						if (!rule.autoResume && rule._count.states) {
							_push(`<button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Возобновить продажи: ${rule.name}`)} title="Возобновить позиции выше порога">`);
							_push(ssrRenderComponent(unref(Play), { size: 17 }, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`<button class="crm-button crm-button--icon" type="button"${ssrRenderAttr("aria-label", `Изменить сценарий: ${rule.name}`)}>`);
						_push(ssrRenderComponent(unref(Pencil), { size: 17 }, null, _parent));
						_push(`</button><button class="crm-button crm-button--icon" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Удалить сценарий: ${rule.name}`)}>`);
						_push(ssrRenderComponent(unref(Trash2), { size: 17 }, null, _parent));
						_push(`</button></div>`);
					} else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]-->`);
				if (!unref(rules).length && !unref(error)) {
					_push(`<div class="crm-surface crm-empty">`);
					_push(ssrRenderComponent(unref(ShieldCheck), { size: 32 }, null, _parent));
					_push(`<h3>${ssrInterpolate(unref(filter) ? "Сценарии не найдены" : "Первый сценарий защиты запаса")}</h3><p>Выберите товар, категорию или собственную группу. Укажите порог и каналы, в которых нужно остановить продажи.</p>`);
					if (unref(data)?.canManage && !unref(filter)) {
						_push(`<button type="button" class="crm-button crm-button--primary">`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(`Добавить сценарий</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else {
				_push(`<div class="crm-stock-rules-list"><!--[-->`);
				ssrRenderList(unref(groups), (group) => {
					_push(`<article class="crm-surface crm-stock-group">`);
					_push(ssrRenderComponent(unref(Layers), { size: 22 }, null, _parent));
					_push(`<div><h3>${ssrInterpolate(group.name)} `);
					if (!group.isActive) _push(`<small>· Выключена</small>`);
					else _push(`<!---->`);
					_push(`</h3><p>Товаров: ${ssrInterpolate(group.members.length)} · Сценариев: ${ssrInterpolate(group._count.rules)}</p><small>${ssrInterpolate(group.members.slice(0, 3).map((m) => m.product.nameRu).join(", "))}${ssrInterpolate(group.members.length > 3 ? "…" : "")}</small></div>`);
					if (unref(data).canManage) {
						_push(`<button class="crm-button" type="button"${ssrRenderAttr("aria-label", `Изменить группу: ${group.name}`)}>`);
						_push(ssrRenderComponent(unref(Pencil), { size: 17 }, null, _parent));
						_push(`Изменить</button>`);
					} else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]-->`);
				if (!unref(groups).length && !unref(error)) {
					_push(`<div class="crm-surface crm-empty">`);
					_push(ssrRenderComponent(unref(Layers), { size: 32 }, null, _parent));
					_push(`<h3>${ssrInterpolate(unref(filter) ? "Группы не найдены" : "Объедините товары для одного сценария")}</h3><p>Например, «Бестселлеры» или «Запас для салонов». Товар может состоять в нескольких группах.</p>`);
					if (unref(data)?.canManage && !unref(filter)) {
						_push(`<button type="button" class="crm-button">`);
						_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
						_push(`Создать группу</button>`);
					} else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			}
			_push(`<div class="crm-stock-rules-delivery">`);
			_push(ssrRenderComponent(unref(AlertTriangle), { size: 19 }, null, _parent));
			_push(`<p>Сайт и B2B применяют правила сразу. Для маркетплейсов рассчитывается остаток к передаче; отправка на площадки ещё не подключена. Значение 0 в CRM не подтверждает остановку продажи на внешней площадке.</p></div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(dialog)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card crm-stock-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-rule-title" tabindex="-1"><header><div><p>МИНИМАЛЬНЫЙ ЗАПАС</p><h2 id="stock-rule-title">${ssrInterpolate(unref(dialog) === "rule" ? unref(draft).id ? "Настройка сценария" : "Новый сценарий" : unref(draft).id ? "Настройка группы" : "Новая товарная группа")}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть настройки"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><form id="stock-rule-form" class="admin-dialog-body crm-detail-body crm-stock-rule-form">`);
					if (unref(formError)) _push(`<p role="alert" class="crm-stock-rules-error">${ssrInterpolate(unref(formError))}</p>`);
					else _push(`<!---->`);
					_push(`<label class="crm-field">Название<input${ssrRenderAttr("value", unref(draft).name)} class="crm-input" maxlength="120" required placeholder="Например, запас для розницы"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}></label>`);
					if (unref(dialog) === "rule") {
						_push(`<!--[--><h3>1. К каким товарам применять</h3><label class="crm-field">Область действия<select aria-label="Область действия" class="crm-input"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><!--[-->`);
						ssrRenderList(kinds, (label, key) => {
							_push(`<option${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).targetKind) ? ssrLooseContain(unref(draft).targetKind, key) : ssrLooseEqual(unref(draft).targetKind, key)) ? " selected" : ""}>${ssrInterpolate(label)}</option>`);
						});
						_push(`<!--]--></select></label>`);
						if (unref(targetLabel)) {
							_push(`<div class="crm-stock-rule-selected">`);
							_push(ssrRenderComponent(unref(ShieldCheck), { size: 18 }, null, _parent));
							_push(`<strong>${ssrInterpolate(unref(targetLabel))}</strong></div>`);
						} else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<h3>Товары в группе</h3>`);
					_push(`<label class="crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), { size: 17 }, null, _parent));
					_push(`<input${ssrRenderAttr("value", unref(query))} class="crm-input" aria-label="Поиск объекта сценария" placeholder="Найти по названию или артикулу" maxlength="120"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}></label><div class="crm-stock-rule-targets"${ssrRenderAttr("aria-busy", unref(finding))}>`);
					if (unref(finding)) _push(`<p>Поиск…</p>`);
					else {
						_push(`<!--[--><!--[-->`);
						ssrRenderList(unref(options), (item) => {
							_push(`<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-pressed", unref(dialog) === "group" ? unref(members).some((m) => m.id === item.id) : unref(draft).targetId === item.id)}><span>${ssrInterpolate(item.label)}</span>`);
							if (unref(dialog) === "group" && !unref(members).some((m) => m.id === item.id)) _push(ssrRenderComponent(unref(Plus), { size: 16 }, null, _parent));
							else if (unref(draft).targetId === item.id || unref(members).some((m) => m.id === item.id)) _push(ssrRenderComponent(unref(ShieldCheck), { size: 16 }, null, _parent));
							else _push(`<!---->`);
							_push(`</button>`);
						});
						_push(`<!--]-->`);
						if (!unref(options).length) _push(`<p>Ничего не найдено${ssrInterpolate(unref(draft).targetKind === "GROUP" ? ". Сначала создайте товарную группу." : ".")}</p>`);
						else _push(`<!---->`);
						_push(`<!--]-->`);
					}
					_push(`</div><small>Показаны первые 50 результатов. Уточните поиск, чтобы найти нужный товар.</small>`);
					if (unref(dialog) === "group") {
						_push(`<!--[--><div class="crm-stock-rule-members"><!--[-->`);
						ssrRenderList(unref(members), (member) => {
							_push(`<span>${ssrInterpolate(member.label)}<button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Убрать ${member.label}`)}>`);
							_push(ssrRenderComponent(unref(X), { size: 15 }, null, _parent));
							_push(`</button></span>`);
						});
						_push(`<!--]--></div><label class="crm-stock-rule-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isActive) ? ssrLooseContain(unref(draft).isActive, null) : unref(draft).isActive) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Группа активна</label><p>Правила охватывают все варианты выбранных товаров. Выключение группы снимает ограничения её сценариев.</p><!--]-->`);
					} else {
						_push(`<!--[-->`);
						if (unref(draft).targetKind === "CATEGORY") _push(`<label class="crm-stock-rule-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).includeChildren) ? ssrLooseContain(unref(draft).includeChildren, null) : unref(draft).includeChildren) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Включать вложенные категории</label>`);
						else _push(`<!---->`);
						_push(`<h3>2. Когда остановить продажи</h3><div class="crm-stock-rule-fields"><label class="crm-field">Порог, шт.<input${ssrRenderAttr("value", unref(draft).threshold)} class="crm-input" type="number" min="0" max="2147483647" step="1" required${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}></label><label class="crm-field">Как считать остаток<select aria-label="Как считать остаток" class="crm-input"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><option value="AVAILABLE"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).basis) ? ssrLooseContain(unref(draft).basis, "AVAILABLE") : ssrLooseEqual(unref(draft).basis, "AVAILABLE")) ? " selected" : ""}>Свободно (остаток − резерв)</option><option value="PHYSICAL"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).basis) ? ssrLooseContain(unref(draft).basis, "PHYSICAL") : ssrLooseEqual(unref(draft).basis, "PHYSICAL")) ? " selected" : ""}>На складе (включая резерв)</option></select></label></div><p>Срабатывает при ${ssrInterpolate(unref(draft).threshold)} шт. или меньше у каждой позиции отдельно. Заказ, принятый выше порога, может опустить остаток ниже него; уже принятые заказы продолжают исполняться.</p><h3>3. Где закрыть продажи</h3><div class="crm-stock-rules-actions"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Все каналы</button><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Только маркетплейсы</button></div><div class="crm-stock-rule-channel-grid"><!--[-->`);
						ssrRenderList(channels, (label, key) => {
							_push(`<label class="crm-stock-rule-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).channels) ? ssrLooseContain(unref(draft).channels, key) : unref(draft).channels) ? " checked" : ""} type="checkbox"${ssrRenderAttr("value", key)}${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(label)}</label>`);
						});
						_push(`<!--]--></div><h3>4. Возобновление продаж</h3><label class="crm-field">После пополнения<select aria-label="После пополнения" class="crm-input"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}><option${ssrRenderAttr("value", true)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).autoResume) ? ssrLooseContain(unref(draft).autoResume, true) : ssrLooseEqual(unref(draft).autoResume, true)) ? " selected" : ""}>Автоматически, когда остаток выше порога</option><option${ssrRenderAttr("value", false)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).autoResume) ? ssrLooseContain(unref(draft).autoResume, false) : ssrLooseEqual(unref(draft).autoResume, false)) ? " selected" : ""}>Вручную, когда остаток выше порога</option></select></label><label class="crm-stock-rule-check"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isEnabled) ? ssrLooseContain(unref(draft).isEnabled, null) : unref(draft).isEnabled) ? " checked" : ""} type="checkbox"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>Сценарий включён</label><p>Если сработали несколько сценариев, действуют все ограничения. Выключение или удаление сценария снимает его запрет. Фактический остаток на складе не меняется.</p><!--]-->`);
					}
					_push(`</form><footer class="crm-detail-footer"><small>${ssrInterpolate(unref(dirty) ? "Есть несохранённые изменения" : "Настройте условия и сохраните")}</small><button class="crm-button crm-button--primary" type="submit" form="stock-rule-form"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить")}</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/CrmStockRules.vue
var _sfc_setup$1 = CrmStockRules_vue_vue_type_script_setup_true_lang_default.setup;
CrmStockRules_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CrmStockRules.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmStockRules_default = Object.assign(CrmStockRules_vue_vue_type_script_setup_true_lang_default, { __name: "CrmStockRules" });
// pages/crm/inventory.vue?vue&type=script&setup=true&lang.ts
var inventory_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "inventory",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({ title: "Товары и остатки — SARKISIAN CRM" });
		const config = useRuntimeConfig(), session = useWorkspaceSession();
		const data = ref(null), categories = ref([]), loading = ref(false), error = ref("");
		const section = ref("stock");
		const inventoryFiltersOpen = ref(false);
		const sections = [["stock", "Остатки и резервы"], ["rules", "Минимальный запас"]];
		const stockViews = [
			{
				value: "ALL",
				label: "Все позиции"
			},
			{
				value: "SHORTAGE",
				label: "Дефицит под резерв"
			},
			{
				value: "RESERVED",
				label: "В резерве"
			},
			{
				value: "EMPTY",
				label: "Нет на остатке"
			}
		];
		const hasStockFilters = computed(() => Boolean(search.value || categoryId.value || stock.value !== "ALL" || activity.value !== "ALL"));
		const search = ref(""), categoryId = ref(""), stock = ref("ALL"), activity = ref("ALL"), page = ref(1);
		const selectedId = ref(""), detail = ref(null), detailLoading = ref(false), detailError = ref(""), orderPage = ref(1), tab = ref("reserves");
		const tabs = [
			["reserves", "Резервы и отгрузка"],
			["sales", "Продажи"],
			["reconciliation", "Сверка 1С"],
			["product", "О товаре"]
		];
		const reconciliationLabels = {
			MISSING: "Данные 1С ещё не получены",
			RECEIVED: "Получен снимок 1С",
			MATCHED: "Остатки совпадают",
			PENDING: "Документы ожидают отражения в 1С",
			DIFFERENCE: "Обнаружено расхождение",
			STALE: "Данные 1С устарели",
			UNCONFIGURED: "Не настроен склад 1С",
			WAREHOUSE_CHANGED: "Изменился склад обмена",
			MAPPING_CHANGED: "Изменилось соответствие товара",
			HISTORY_INCOMPLETE: "Требуется проверка истории движений"
		};
		const reconciliationHints = {
			MISSING: "После получения остатков из 1С здесь появятся сравнение и состояние обмена. Отсутствие данных не означает нулевой остаток.",
			MATCHED: "Количество в CRM совпадает с полученным остатком 1С. Все складские документы CRM этой позиции включены в снимок.",
			PENDING: "С учётом ещё не отражённых в 1С отгрузок и возвратов количество совпадает. Нужен следующий ответ 1С с подтверждением этих документов.",
			DIFFERENCE: "Количество в CRM отличается от остатка 1С с учётом ожидающих обмена движений. Проверьте складские документы и соответствие товара. Остатки автоматически не исправлялись.",
			STALE: "Срок актуальности снимка истёк. Для сверки нужен новый ответ 1С; ниже показаны последние полученные значения.",
			UNCONFIGURED: "Укажите склад в настройках интеграции 1С. Сравнение возможно только для одного и того же склада.",
			WAREHOUSE_CHANGED: "Снимок относится к прежнему складу. Перед продолжением обмена требуется сверить начальные остатки.",
			MAPPING_CHANGED: "Артикул или связь с товаром 1С изменились после получения снимка. Требуется проверить соответствие.",
			HISTORY_INCOMPLETE: "История документов не позволяет надёжно рассчитать остаток: движения отсутствуют, неполны либо превышен объём одной проверки. Требуется сверка с ответственным за склад."
		};
		const reconciliation = computed(() => detail.value?.reconciliation);
		const signed = (value) => value > 0 ? `+${value}` : String(value);
		const sources = {
			WEB: "Сайт",
			B2B: "B2B",
			OZON: "Ozon",
			WILDBERRIES: "Wildberries",
			YANDEX_MARKET: "Яндекс Маркет",
			MEGAMARKET: "Мегамаркет",
			ONE_C: "1С",
			MANUAL: "Ручной заказ"
		};
		const statuses = {
			NEW: "Новый",
			CONFIRMED: "Подтверждён",
			PAYMENT_WAITING: "Ожидает оплаты",
			PAID: "Оплачен",
			ASSEMBLING: "В сборке"
		};
		const request = (path, query = {}, signal) => $fetch$1(path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			query,
			signal,
			retry: 0
		});
		const message = (e) => typeof e?.data?.message === "string" ? e.data.message : "Не удалось загрузить данные. Повторите попытку.";
		const date = (value) => new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
		const money = (value, currency) => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency
		}).format(Number(value));
		const picture = (item) => resolveProductImageUrl(item.image?.url, config.public.apiBase, config.public.siteUrl);
		function address(value) {
			if (!value || typeof value !== "object") return "Адрес не указан";
			return [
				"postalCode",
				"city",
				"address",
				"street",
				"house",
				"apartment"
			].map((key) => typeof value[key] === "string" ? value[key].trim() : "").filter(Boolean).join(", ") || "Адрес не указан";
		}
		let generation = 0, controller, timer;
		async function load() {
			const n = ++generation;
			controller?.abort();
			controller = new AbortController();
			loading.value = true;
			error.value = "";
			try {
				const result = await request("/oms/inventory", {
					search: search.value.trim() || void 0,
					categoryId: categoryId.value || void 0,
					stock: stock.value,
					activity: activity.value,
					page: page.value,
					limit: 30
				}, controller.signal);
				if (n === generation) {
					data.value = result;
					categories.value = result.categories;
				}
			} catch (e) {
				if (n === generation) {
					error.value = message(e);
					data.value = null;
				}
			} finally {
				if (n === generation) loading.value = false;
			}
		}
		function close() {
			selectedId.value = "";
			detail.value = null;
			detailLoading.value = false;
		}
		useCatalogDialog(computed(() => !!selectedId.value), close);
		watch(search, () => {
			++generation;
			controller?.abort();
			loading.value = true;
			clearTimeout(timer);
			timer = setTimeout(() => {
				page.value = 1;
				load();
			}, 300);
		});
		watch([
			categoryId,
			stock,
			activity
		], () => {
			clearTimeout(timer);
			page.value = 1;
			load();
		});
		watch(() => session.token.value, () => {
			close();
			data.value = null;
			load();
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_CrmStockRules = CrmStockRules_default;
			const _component_NuxtLink = NuxtLink;
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "crm-standard crm-inventory crm-operational-page crm-ops-inventory" }, _attrs))}><header class="crm-page-header"><div><h1>Товары и остатки</h1><p>Наличие, резервы и предстоящие отгрузки по товарным позициям</p></div><button type="button" class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(detailLoading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button></header>`);
			_push(ssrRenderComponent(_component_CrmCardTabs, {
				modelValue: unref(section),
				"onUpdate:modelValue": ($event) => isRef(section) ? section.value = $event : null,
				prefix: "inventory-page",
				tabs: sections,
				label: "Разделы товаров и остатков"
			}, null, _parent));
			_push(`<section id="inventory-page-rules-panel" class="crm-order-tab-panel" role="tabpanel" aria-labelledby="inventory-page-rules-tab"${ssrRenderDynamicAttr("hidden", unref(section) !== "rules")}${ssrIncludeBooleanAttr(unref(section) !== "rules") ? " inert" : ""}>`);
			if (unref(section) === "rules") _push(ssrRenderComponent(_component_CrmStockRules, null, null, _parent));
			else _push(`<!---->`);
			_push(`</section><section id="inventory-page-stock-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-page-stock-tab"${ssrRenderDynamicAttr("hidden", unref(section) !== "stock")}${ssrIncludeBooleanAttr(unref(section) !== "stock") ? " inert" : ""}>`);
			if (unref(error)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(error))}<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></p>`);
			else _push(`<!---->`);
			if (unref(data)) _push(`<div class="crm-summary-grid crm-inventory-kpis"${ssrRenderAttr("aria-busy", unref(loading))}><article class="crm-surface"><span>Товарных позиций</span><strong>${ssrInterpolate(unref(data).summary.positions)}</strong><small>По выбранным фильтрам</small></article><article class="crm-surface"><span>Последний остаток</span><strong>${ssrInterpolate(unref(data).summary.stock)} шт.</strong><small>Годные товары, включая резерв</small></article><article class="crm-surface"><span>Последний резерв</span><strong>${ssrInterpolate(unref(data).summary.reserved)} шт.</strong><small>Данные 1С и временные удержания CRM</small></article><article class="crm-surface"><span>${ssrInterpolate(unref(data).allOrdersVisible ? "К отгрузке" : "К отгрузке по доступным заказам")}</span><strong>${ssrInterpolate(unref(data).summary.toShip)} шт.</strong><small>${ssrInterpolate(unref(data).allOrdersVisible ? "По заказам с резервом" : "По доступным вам заказам с резервом")}</small></article></div>`);
			else _push(`<!---->`);
			_push(`<nav class="crm-ops-views" aria-label="Представления остатков"><!--[-->`);
			ssrRenderList(stockViews, (item) => {
				_push(`<button class="crm-button crm-button--quiet"${ssrRenderAttr("aria-pressed", unref(stock) === item.value)}>${ssrInterpolate(item.label)}</button>`);
			});
			_push(`<!--]--></nav><section class="crm-surface crm-inventory-register" aria-label="Товарные позиции"><div class="${ssrRenderClass([{ "is-expanded": unref(inventoryFiltersOpen) }, "crm-toolbar crm-inventory-filters"])}"><label class="crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" aria-label="Поиск товаров" placeholder="Название, артикул или вариант" maxlength="200"></label><button class="crm-button crm-ops-filter-toggle" type="button"${ssrRenderAttr("aria-expanded", unref(inventoryFiltersOpen))} aria-controls="inventory-category-filter inventory-stock-filter inventory-activity-filter">Фильтры`);
			if (unref(categoryId) || unref(stock) !== "ALL" || unref(activity) !== "ALL") _push(`<span> · ${ssrInterpolate(Number(Boolean(unref(categoryId))) + Number(unref(stock) !== "ALL") + Number(unref(activity) !== "ALL"))}</span>`);
			else _push(`<!---->`);
			_push(`</button><select id="inventory-category-filter" class="crm-input crm-inventory-advanced" aria-label="Категория товаров"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(categoryId)) ? ssrLooseContain(unref(categoryId), "") : ssrLooseEqual(unref(categoryId), "")) ? " selected" : ""}>Все категории</option><!--[-->`);
			ssrRenderList(unref(categories), (category) => {
				_push(`<option${ssrRenderAttr("value", category.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(categoryId)) ? ssrLooseContain(unref(categoryId), category.id) : ssrLooseEqual(unref(categoryId), category.id)) ? " selected" : ""}>${ssrInterpolate(category.nameRu)}</option>`);
			});
			_push(`<!--]--></select><select id="inventory-stock-filter" class="crm-input crm-inventory-advanced" aria-label="Фильтр остатков"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "ALL") : ssrLooseEqual(unref(stock), "ALL")) ? " selected" : ""}>Все остатки</option><option value="RESERVED"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "RESERVED") : ssrLooseEqual(unref(stock), "RESERVED")) ? " selected" : ""}>Есть резерв</option><option value="AVAILABLE"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "AVAILABLE") : ssrLooseEqual(unref(stock), "AVAILABLE")) ? " selected" : ""}>Есть свободный остаток</option><option value="SHORTAGE"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "SHORTAGE") : ssrLooseEqual(unref(stock), "SHORTAGE")) ? " selected" : ""}>Не хватает под резерв</option><option value="EMPTY"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "EMPTY") : ssrLooseEqual(unref(stock), "EMPTY")) ? " selected" : ""}>Нет на остатке</option><option value="DAMAGED"${ssrIncludeBooleanAttr(Array.isArray(unref(stock)) ? ssrLooseContain(unref(stock), "DAMAGED") : ssrLooseEqual(unref(stock), "DAMAGED")) ? " selected" : ""}>Есть повреждённые</option></select><select id="inventory-activity-filter" class="crm-input crm-inventory-advanced" aria-label="Активность товаров"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(activity)) ? ssrLooseContain(unref(activity), "ALL") : ssrLooseEqual(unref(activity), "ALL")) ? " selected" : ""}>Все позиции</option><option value="ACTIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(activity)) ? ssrLooseContain(unref(activity), "ACTIVE") : ssrLooseEqual(unref(activity), "ACTIVE")) ? " selected" : ""}>Активные</option><option value="INACTIVE"${ssrIncludeBooleanAttr(Array.isArray(unref(activity)) ? ssrLooseContain(unref(activity), "INACTIVE") : ssrLooseEqual(unref(activity), "INACTIVE")) ? " selected" : ""}>Неактивные</option></select></div>`);
			if (unref(hasStockFilters)) _push(`<div class="crm-ops-result"><span>Применены фильтры</span><button class="crm-button crm-button--text">Сбросить фильтры</button></div>`);
			else _push(`<!---->`);
			_push(`<p class="crm-inventory-note" role="status">${ssrInterpolate(unref(loading) ? "Загружаем остатки…" : `Найдено: ${unref(data)?.total || 0}`)}`);
			if (unref(data) && !unref(loading)) _push(`<span> · Сводка по последним сохранённым данным на ${ssrInterpolate(date(unref(data).asOf))}. Актуальность 1С показана у каждой позиции.</span>`);
			else _push(`<!---->`);
			_push(`</p>`);
			if (unref(data) && !unref(data).allOrdersVisible) _push(`<p class="crm-inventory-note">Остаток и резерв показаны по компании. Отгрузки и расшифровка заказов — в пределах вашего доступа.</p>`);
			else _push(`<!---->`);
			_push(`<div class="crm-table-head crm-inventory-row crm-inventory-head" aria-hidden="true"><span>Товарная позиция</span><span>На остатке</span><span>Резерв</span><span>Свободно</span><span>Отгрузить</span><span>Собрано</span><span></span></div><div${ssrRenderAttr("aria-busy", unref(loading))}><!--[-->`);
			ssrRenderList(unref(data)?.items || [], (item) => {
				_push(`<button type="button" class="crm-table-row crm-inventory-row crm-card-action"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Резервы: ${item.name}, ${item.sku}`)}><span class="crm-inventory-product">`);
				if (picture(item)) _push(`<img${ssrRenderAttr("src", picture(item))} alt="" loading="lazy">`);
				else {
					_push(`<span class="crm-inventory-placeholder">`);
					_push(ssrRenderComponent(unref(Boxes), { size: 22 }, null, _parent));
					_push(`</span>`);
				}
				_push(`<span><strong>${ssrInterpolate(item.name)}</strong><small>${ssrInterpolate(item.variantName)} · ${ssrInterpolate(item.sku)}</small>`);
				if (!item.active) _push(`<small>Неактивная позиция</small>`);
				else _push(`<!---->`);
				if (item.warehouseStock?.status === "CURRENT" && item.shortage) _push(`<small class="negative">Не хватает ${ssrInterpolate(item.shortage)} шт. под резерв</small>`);
				else _push(`<!---->`);
				_push(`</span></span><span class="crm-inventory-quantity"><small>На остатке</small><strong>${ssrInterpolate(item.warehouseStock?.status === "CURRENT" ? item.stock : "—")}</strong><em class="crm-inventory-sync-hint">${ssrInterpolate(item.warehouseStock?.status === "CURRENT" ? "1С: " + date(item.warehouseStock.asOf) : "1С: нет актуальных данных")}</em></span><span class="crm-inventory-quantity"><small>Резерв</small><strong>${ssrInterpolate(item.warehouseStock?.status === "CURRENT" ? item.reserved : "—")}</strong></span><span class="crm-inventory-quantity"><small>Свободно</small><strong>${ssrInterpolate(item.warehouseStock?.available ?? "—")}</strong></span><span class="crm-inventory-quantity"><small>Отгрузить</small><strong>${ssrInterpolate(item.toShip)}</strong></span><span class="crm-inventory-quantity"><small>Собрано</small><strong>${ssrInterpolate(item.picked)}</strong></span>`);
				_push(ssrRenderComponent(unref(ArrowRight), {
					size: 18,
					class: "crm-inventory-arrow"
				}, null, _parent));
				_push(`</button>`);
			});
			_push(`<!--]--></div>`);
			if (!unref(loading) && !unref(error) && !unref(data)?.items.length) {
				_push(`<div class="crm-empty">`);
				_push(ssrRenderComponent(unref(Boxes), { size: 28 }, null, _parent));
				_push(`<h2>Позиций не найдено</h2><p>Измените поиск или фильтры.</p>`);
				if (unref(hasStockFilters)) _push(`<button class="crm-button">Показать все позиции</button>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			if (unref(data)) {
				_push(`<footer class="crm-pagination"><button class="crm-button crm-button--icon" type="button" aria-label="Предыдущая страница товаров"${ssrIncludeBooleanAttr(unref(loading) || unref(page) <= 1) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
				_push(`</button><span>${ssrInterpolate(unref(data).page)} / ${ssrInterpolate(unref(data).pages)}</span><button class="crm-button crm-button--icon" type="button" aria-label="Следующая страница товаров"${ssrIncludeBooleanAttr(unref(loading) || unref(page) >= unref(data).pages) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
				_push(`</button></footer>`);
			} else _push(`<!---->`);
			_push(`</section>`);
			if (unref(data)) _push(`<details class="crm-ops-help crm-inventory-kpi-help"><summary>Как считаются остатки и отгрузки</summary><ul><li>Товарные позиции показаны с учётом выбранных фильтров.</li><li>На остатке — годные товары, включая зарезервированные. Повреждённые товары учитываются отдельно.</li><li>Резерв уже входит в общий остаток.</li><li>${ssrInterpolate(unref(data).allOrdersVisible ? "К отгрузке — товары по заказам с резервом." : "К отгрузке — только товары по доступным вам заказам с резервом. Общий резерв может включать другие заказы.")}</li></ul></details>`);
			else _push(`<!---->`);
			_push(`<p class="crm-inventory-note">Свободно = остаток − резерв. Повреждённые товары учитываются отдельно. Подтверждение остатков и ожидающие обмена движения — во вкладке «Сверка 1С» карточки товара.</p></section>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selectedId)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="inventory-title" tabindex="-1"><header><div><p>ТОВАРНАЯ ПОЗИЦИЯ</p><h2 id="inventory-title">${ssrInterpolate(unref(detail)?.item.name || "Остатки и резервы")}</h2>`);
					if (unref(detail)) _push(`<small>${ssrInterpolate(unref(detail).item.variantName)} · ${ssrInterpolate(unref(detail).item.sku)}</small>`);
					else _push(`<!---->`);
					_push(`</div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть товар">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header>`);
					_push(ssrRenderComponent(_component_CrmCardTabs, {
						modelValue: unref(tab),
						"onUpdate:modelValue": ($event) => isRef(tab) ? tab.value = $event : null,
						prefix: "inventory",
						tabs,
						label: "Разделы товарной позиции"
					}, null, _parent));
					_push(`<div class="admin-dialog-body crm-detail-body crm-stack"${ssrRenderAttr("aria-busy", unref(detailLoading))}>`);
					if (unref(detailLoading)) _push(`<p role="status">Обновляем данные…</p>`);
					else _push(`<!---->`);
					if (unref(detailError)) _push(`<p role="alert">${ssrInterpolate(unref(detailError))}</p>`);
					else _push(`<!---->`);
					if (unref(detail)) {
						_push(`<!--[--><section id="inventory-reserves-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-reserves-tab"${ssrRenderDynamicAttr("hidden", unref(tab) !== "reserves")}${ssrIncludeBooleanAttr(unref(tab) !== "reserves") ? " inert" : ""}>`);
						if (unref(detail).item.warehouseStock?.status !== "CURRENT") _push(`<p class="crm-inventory-note" role="status">Нет актуального подтверждения остатков 1С. Оформление физических заказов для этой позиции недоступно до обновления.</p>`);
						else _push(`<!---->`);
						_push(`<div class="crm-summary-grid crm-inventory-detail-metrics"><div><small>На остатке</small><strong>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? unref(detail).item.stock + " шт." : "—")}</strong></div><div><small>В резерве</small><strong>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? unref(detail).item.reserved + " шт." : "—")}</strong></div><div><small>Свободно</small><strong>${ssrInterpolate(unref(detail).item.warehouseStock?.available == null ? "—" : unref(detail).item.warehouseStock.available + " шт.")}</strong></div><div><small>Повреждённые</small><strong>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? unref(detail).item.damaged + " шт." : "—")}</strong></div></div>`);
						if (unref(detail).item.warehouseStock?.status === "CURRENT" && unref(detail).item.shortage) _push(`<p class="negative">Не хватает ${ssrInterpolate(unref(detail).item.shortage)} шт., чтобы покрыть весь резерв.</p>`);
						else _push(`<!---->`);
						if (unref(detail).item.warehouseStock?.status === "CURRENT") _push(`<p class="crm-inventory-note">Резерв 1С: ${ssrInterpolate(unref(detail).item.warehouseStock.reserved1C)} шт. · Ожидают подтверждения 1С: ${ssrInterpolate(unref(detail).item.warehouseStock.localPending)} шт.</p>`);
						else _push(`<!---->`);
						if (!unref(detail).allOrdersVisible) _push(`<p>Ниже только доступные вам заказы. Общий резерв может включать другие заказы.</p>`);
						else _push(`<!---->`);
						_push(`<div><h3>Куда и сколько отгрузить</h3><p>Осталось ${ssrInterpolate(unref(detail).item.toShip)} шт. · Собрано к отгрузке ${ssrInterpolate(unref(detail).item.picked)} шт. · Ещё собрать ${ssrInterpolate(unref(detail).item.toPick)} шт.</p></div>`);
						if (!unref(detail).total) {
							_push(`<div class="crm-empty">`);
							_push(ssrRenderComponent(unref(PackageCheck), { size: 28 }, null, _parent));
							_push(`<p>Нет доступных заказов с неотгруженным резервом.</p></div>`);
						} else _push(`<!---->`);
						_push(`<!--[-->`);
						ssrRenderList(unref(detail).orders, (order) => {
							_push(ssrRenderComponent(_component_NuxtLink, {
								key: order.id,
								to: {
									path: "/crm/fulfillment",
									query: { order: order.id }
								},
								class: "crm-item-card crm-stack crm-execution-card crm-inventory-order",
								"aria-label": `Открыть заказ ${order.orderNumber}`
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<div class="crm-inventory-order-heading"${_scopeId}><strong${_scopeId}>${ssrInterpolate(order.orderNumber)}</strong>`);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
										_push(`</div><small${_scopeId}>${ssrInterpolate(sources[order.source] || order.source)} · ${ssrInterpolate(statuses[order.status] || order.status)}</small><strong${_scopeId}>${ssrInterpolate(order.destination)}</strong><span${_scopeId}>${ssrInterpolate(address(order.shippingAddress))}</span><small${_scopeId}>Доставка: ${ssrInterpolate(order.deliveryDate ? date(order.deliveryDate) : "срок не указан")}${ssrInterpolate(order.shippingProvider ? " · " + order.shippingProvider : "")}</small><small${_scopeId}>Менеджер: ${ssrInterpolate(order.manager || "не назначен")}</small><div class="crm-inventory-order-quantities"${_scopeId}><strong${_scopeId}>Отгрузить ${ssrInterpolate(order.remaining)} шт.</strong><span${_scopeId}>Собрано ${ssrInterpolate(order.picked)} шт.</span><span${_scopeId}>Ещё собрать ${ssrInterpolate(order.toPick)} шт.</span></div>`);
										if (order.reservationExpired) _push(`<p class="negative"${_scopeId}>Срок удержания истёк — проверьте заказ.</p>`);
										else if (order.reservationExpiresAt) _push(`<small${_scopeId}>Удержание до ${ssrInterpolate(date(order.reservationExpiresAt))}</small>`);
										else _push(`<!---->`);
										_push(`<small${_scopeId}>${ssrInterpolate(!order.executionConfirmed ? "Ожидает проверки менеджером" : order.isSynced1C ? "Передан в 1С; состояние задания — в заказе" : "Ожидает передачи в 1С")}</small>`);
									} else return [
										createVNode("div", { class: "crm-inventory-order-heading" }, [createVNode("strong", null, toDisplayString(order.orderNumber), 1), createVNode(unref(ArrowRight), { size: 18 })]),
										createVNode("small", null, toDisplayString(sources[order.source] || order.source) + " · " + toDisplayString(statuses[order.status] || order.status), 1),
										createVNode("strong", null, toDisplayString(order.destination), 1),
										createVNode("span", null, toDisplayString(address(order.shippingAddress)), 1),
										createVNode("small", null, "Доставка: " + toDisplayString(order.deliveryDate ? date(order.deliveryDate) : "срок не указан") + toDisplayString(order.shippingProvider ? " · " + order.shippingProvider : ""), 1),
										createVNode("small", null, "Менеджер: " + toDisplayString(order.manager || "не назначен"), 1),
										createVNode("div", { class: "crm-inventory-order-quantities" }, [
											createVNode("strong", null, "Отгрузить " + toDisplayString(order.remaining) + " шт.", 1),
											createVNode("span", null, "Собрано " + toDisplayString(order.picked) + " шт.", 1),
											createVNode("span", null, "Ещё собрать " + toDisplayString(order.toPick) + " шт.", 1)
										]),
										order.reservationExpired ? (openBlock(), createBlock("p", {
											key: 0,
											class: "negative"
										}, "Срок удержания истёк — проверьте заказ.")) : order.reservationExpiresAt ? (openBlock(), createBlock("small", { key: 1 }, "Удержание до " + toDisplayString(date(order.reservationExpiresAt)), 1)) : createCommentVNode("", true),
										createVNode("small", null, toDisplayString(!order.executionConfirmed ? "Ожидает проверки менеджером" : order.isSynced1C ? "Передан в 1С; состояние задания — в заказе" : "Ожидает передачи в 1С"), 1)
									];
								}),
								_: 2
							}, _parent));
						});
						_push(`<!--]-->`);
						if (unref(detail).pages > 1) {
							_push(`<div class="crm-pagination"><button type="button" class="crm-button crm-button--icon" aria-label="Предыдущая страница резервов"${ssrIncludeBooleanAttr(unref(detailLoading) || unref(orderPage) <= 1) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
							_push(`</button><span>${ssrInterpolate(unref(detail).page)} / ${ssrInterpolate(unref(detail).pages)}</span><button type="button" class="crm-button crm-button--icon" aria-label="Следующая страница резервов"${ssrIncludeBooleanAttr(unref(detailLoading) || unref(orderPage) >= unref(detail).pages) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
							_push(`</button></div>`);
						} else _push(`<!---->`);
						_push(`</section><section id="inventory-sales-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-sales-tab"${ssrRenderDynamicAttr("hidden", unref(tab) !== "sales")}${ssrIncludeBooleanAttr(unref(tab) !== "sales") ? " inert" : ""}><h3>Доступность по каналам</h3>`);
						if (unref(detail).item.warehouseStock?.status === "CURRENT") _push(`<p>На складе ${ssrInterpolate(unref(detail).item.stock)} шт. · В резерве ${ssrInterpolate(unref(detail).item.reserved)} шт. · Свободно ${ssrInterpolate(unref(detail).item.warehouseStock.available)} шт.</p>`);
						else _push(`<p>Остатки 1С не подтверждены или устарели.</p>`);
						_push(`<!--[-->`);
						ssrRenderList(unref(detail).item.channelStocks || [], (channel) => {
							_push(`<div class="crm-channel-stock"><strong>${ssrInterpolate(sources[channel.channel])}</strong><strong>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? channel.quantity + " шт." : "—")}</strong><small>${ssrInterpolate(unref(detail).item.warehouseStock?.status !== "CURRENT" ? "Остатки 1С уточняются; оформить физический заказ пока нельзя." : channel.blocked ? "Продажи остановлены сценарием минимального запаса." : channel.quantity ? "Доступно для новых заказов." : "Нет доступного количества.")} ${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? ["WEB", "B2B"].includes(channel.channel) ? "Применяется при оформлении заказа." : "Остаток к передаче. Отправка на площадку ещё не подключена." : "")}</small></div>`);
						});
						_push(`<!--]--><p class="crm-inventory-note">Правила настраиваются во вкладке «Минимальный запас». Они не меняют складской остаток и не отменяют уже принятые заказы.</p></section><section id="inventory-reconciliation-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-reconciliation-tab"${ssrRenderDynamicAttr("hidden", unref(tab) !== "reconciliation")}${ssrIncludeBooleanAttr(unref(tab) !== "reconciliation") ? " inert" : ""}><div class="crm-stock-status"${ssrRenderAttr("data-state", unref(detail).item.warehouseStock?.status === "CURRENT" ? "MATCHED" : "STALE")} role="status">`);
						if (unref(detail).item.warehouseStock?.status === "CURRENT") _push(ssrRenderComponent(unref(CheckCircle2), { size: 24 }, null, _parent));
						else _push(ssrRenderComponent(unref(Clock3), { size: 24 }, null, _parent));
						_push(`<div><h3>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? "Остатки 1С актуальны" : "Нет актуального подтверждения 1С")}</h3><p>${ssrInterpolate(unref(detail).item.warehouseStock?.status === "CURRENT" ? "Данные получены из 1С; общий резерв включает временные удержания CRM." : "Дождитесь нового снимка остатков или проверьте обмен с 1С.")}</p></div></div>`);
						if (unref(detail).item.warehouseStock?.status === "CURRENT") _push(`<div class="crm-stock-snapshot-meta"><span>На ${ssrInterpolate(date(unref(detail).item.warehouseStock.asOf))}</span><span>Актуально до ${ssrInterpolate(date(unref(detail).item.warehouseStock.validUntil))}</span><span>Резерв 1С: ${ssrInterpolate(unref(detail).item.warehouseStock.reserved1C)} шт. · Временные удержания: ${ssrInterpolate(unref(detail).item.warehouseStock.localPending)} шт.</span></div>`);
						else _push(`<!---->`);
						if (unref(reconciliation)?.snapshot) {
							_push(`<details class="crm-ops-help"><summary>Предыдущая сверка CRM и 1С</summary>`);
							if (unref(reconciliation)) {
								_push(`<!--[--><div class="crm-stock-status"${ssrRenderAttr("data-state", unref(reconciliation).status)} role="status">`);
								if (unref(reconciliation).status === "MATCHED") _push(ssrRenderComponent(unref(CheckCircle2), { size: 24 }, null, _parent));
								else if (["PENDING", "STALE"].includes(unref(reconciliation).status)) _push(ssrRenderComponent(unref(Clock3), { size: 24 }, null, _parent));
								else if (unref(reconciliation).status === "MISSING") _push(ssrRenderComponent(unref(Database), { size: 24 }, null, _parent));
								else _push(ssrRenderComponent(unref(AlertTriangle), { size: 24 }, null, _parent));
								_push(`<div><h3>${ssrInterpolate(reconciliationLabels[unref(reconciliation).status])}</h3><p>${ssrInterpolate(reconciliationHints[unref(reconciliation).status])}</p></div></div>`);
								if (unref(reconciliation).snapshot) {
									_push(`<!--[--><div class="crm-stock-snapshot-meta"><span>Снимок на ${ssrInterpolate(date(unref(reconciliation).snapshot.asOf))}</span><span>Актуален до ${ssrInterpolate(date(unref(reconciliation).snapshot.validUntil))}</span><small>Получен ${ssrInterpolate(date(unref(reconciliation).snapshot.receivedAt))} · Версия ${ssrInterpolate(unref(reconciliation).snapshot.revision)}</small></div><div class="crm-stock-comparison" role="table" aria-label="Сравнение остатков CRM и 1С"><div role="row" class="crm-stock-comparison-head"><span role="columnheader">Количество, шт.</span><strong role="columnheader">Годные</strong><strong role="columnheader">Повреждённые</strong></div><div role="row"><span role="rowheader">Сейчас в CRM<small>Включая резерв ${ssrInterpolate(unref(detail).item.reserved)} шт.</small></span><strong role="cell">${ssrInterpolate(unref(detail).item.stock)}</strong><strong role="cell">${ssrInterpolate(unref(detail).item.damaged)}</strong></div><div role="row"><span role="rowheader">В снимке 1С<small>Физический остаток, включая резерв</small></span><strong role="cell">${ssrInterpolate(unref(reconciliation).snapshot.stock)}</strong><strong role="cell">${ssrInterpolate(unref(reconciliation).snapshot.damagedStock)}</strong></div>`);
									if (unref(reconciliation).expectedStock !== null) _push(`<!--[--><div role="row"><span role="rowheader">Ожидается с учётом движений CRM</span><strong role="cell">${ssrInterpolate(unref(reconciliation).expectedStock)}</strong><strong role="cell">${ssrInterpolate(unref(reconciliation).expectedDamaged)}</strong></div><div role="row" class="crm-stock-difference"><span role="rowheader">Разница CRM − ожидается</span><strong role="cell">${ssrInterpolate(signed(unref(reconciliation).difference))}</strong><strong role="cell">${ssrInterpolate(signed(unref(reconciliation).damagedDifference))}</strong></div><!--]-->`);
									else _push(`<!---->`);
									_push(`</div>`);
									if (unref(reconciliation).expectedStock !== null && unref(reconciliation).pendingOperations) _push(`<div class="crm-item-card crm-stack crm-execution-card"><h3>Ещё не отражено в снимке 1С</h3><p>Складских документов: ${ssrInterpolate(unref(reconciliation).pendingOperations)}</p><div class="crm-stock-pending"><span>Отгружено<strong>−${ssrInterpolate(unref(reconciliation).pendingShipped)} шт.</strong></span><span>Возвращено годных<strong>+${ssrInterpolate(unref(reconciliation).pendingReturned)} шт.</strong></span><span>Повреждённые возвраты<strong>+${ssrInterpolate(unref(reconciliation).pendingDamaged)} шт.</strong></span></div></div>`);
									else _push(`<!---->`);
									_push(`<p class="crm-inventory-note">Снимок 1С + годные возвраты − отгрузки, ещё не включённые в него, = ожидаемый годный остаток. Резерв из физического остатка при сверке не вычитается. Приём данных не меняет количества в CRM.</p><!--]-->`);
								} else _push(`<!---->`);
								_push(`<!--]-->`);
							} else _push(`<!---->`);
							_push(`</details>`);
						} else _push(`<!---->`);
						_push(`</section><section id="inventory-product-panel" class="crm-order-tab-panel crm-stack" role="tabpanel" aria-labelledby="inventory-product-tab"${ssrRenderDynamicAttr("hidden", unref(tab) !== "product")}${ssrIncludeBooleanAttr(unref(tab) !== "product") ? " inert" : ""}>`);
						if (picture(unref(detail).item)) _push(`<img${ssrRenderAttr("src", picture(unref(detail).item))}${ssrRenderAttr("alt", unref(detail).item.name)} class="crm-inventory-photo">`);
						else _push(`<!---->`);
						_push(`<div class="crm-item-card crm-stack crm-execution-card"><h3>${ssrInterpolate(unref(detail).item.name)}</h3><p>Вариант: ${ssrInterpolate(unref(detail).item.variantName)}</p><p>Артикул позиции: ${ssrInterpolate(unref(detail).item.sku)}</p><p>Артикул товара: ${ssrInterpolate(unref(detail).item.productSku)}</p>`);
						if (unref(detail).item.vendorCode) _push(`<p>Артикул производителя: ${ssrInterpolate(unref(detail).item.vendorCode)}</p>`);
						else _push(`<!---->`);
						_push(`<p>Цена варианта в каталоге: ${ssrInterpolate(money(unref(detail).item.price, unref(detail).item.currency))}</p><p>Категории: ${ssrInterpolate(unref(detail).item.categories.map((item) => item.nameRu).join(", ") || "не заданы")}</p><p>${ssrInterpolate(unref(detail).item.active ? "Активная позиция" : "Неактивная позиция")}</p><p>${ssrInterpolate(unref(detail).item.externalId ? "ID товара в 1С: " + unref(detail).item.externalId : "Товар ещё не связан с 1С")}</p></div></section><!--]-->`);
					} else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer">`);
					if (unref(detail)) _push(`<small>Данные на ${ssrInterpolate(date(unref(detail).asOf))}</small>`);
					else _push(`<!---->`);
					_push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(detailLoading) || unref(loading)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
					_push(`Обновить</button></footer></section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</main>`);
		};
	}
});
// pages/crm/inventory.vue
var _sfc_setup = inventory_vue_vue_type_script_setup_true_lang_default.setup;
inventory_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/inventory.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var inventory_default = inventory_vue_vue_type_script_setup_true_lang_default;

export { inventory_default as default };;globalThis.__timing__.logEnd('Load chunks/build/inventory-CwUl44FB');
//# sourceMappingURL=inventory-CwUl44FB.mjs.map
