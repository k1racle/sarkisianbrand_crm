globalThis.__timing__.logStart('Load chunks/build/PartnerWorkspacePage-SHPqpej7');import { c as useRoute, a as useWorkspaceSession, b as useWorkspaceAccess, e as crmDestination, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { defineComponent, computed, ref, reactive, watch, mergeProps, unref, withCtx, createTextVNode, createVNode, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderAttr, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, UserRoundPlus, Save, Check, SlidersHorizontal, Wallet, CircleHelp, Building2, ShieldCheck, Clock, Users, MousePointer2, ExternalLink, Search, X, Copy } from '@lucide/vue';

// components/workspace/PartnerWorkspacePage.vue?vue&type=script&setup=true&lang.ts
var PartnerWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "PartnerWorkspacePage",
	__ssrInlineRender: true,
	props: {
		kind: {},
		section: {}
	},
	setup(__props) {
		const props = __props;
		const route = useRoute();
		const bloggerSectionPath = (section) => route.path.startsWith("/crm/") ? `/crm/bloggers/${section}` : `/admin-workspace/bloggers-${section}`;
		const config = useRuntimeConfig(), { token, user } = useWorkspaceSession(), access = useWorkspaceAccess();
		const canWrite = computed(() => ["ADMIN", "SUPERVISOR"].includes(user.value?.role || "") && access.can("partners.write"));
		const canPay = computed(() => user.value?.role === "ADMIN" && access.can("partners.payouts"));
		const hasRowActions = computed(() => props.section === "participants" ? canWrite.value || canPay.value && props.kind === "BLOGGER" : props.section === "registrations" ? canWrite.value : props.section === "payouts" && canPay.value);
		const description = computed(() => ({
			overview: "Участники программы, привлечённые клиенты и вознаграждения.",
			participants: "Заявки, контакты и персональные условия участников.",
			registrations: "Проверяйте привлечённые организации и основания для вознаграждения.",
			rewards: "Начисления за покупки и привлечение нового бизнеса.",
			payouts: "Заявки партнёров на вывод денег и история решений.",
			settings: "Правила участия, вознаграждения и условия программы."
		})[props.section] || "Работа с партнёрами и реферальными клиентами.");
		const title = computed(() => crmDestination(route.path)?.label || {
			settings: props.kind === "BLOGGER" ? "Настройки авторов" : "Реферальная программа",
			participants: props.kind === "BLOGGER" ? "Заявки и партнёры" : "Участники",
			overview: "Авторы и блогеры",
			registrations: "Привлечённые организации",
			rewards: "Начисления",
			payouts: "Выплаты авторам"
		}[props.section] || "Партнёры");
		const data = ref(null), loading = ref(false), busy = ref(false), error = ref(""), notice = ref(""), search = ref(""), page = ref(1);
		let loadVersion = 0, loadController;
		const form = reactive({}), baseline = ref("");
		const edit = ref(null), decision = reactive({
			status: "ACTIVE",
			rewardPercent: "",
			note: "",
			paymentReference: "",
			payoutVerified: false
		}), invite = reactive({
			email: "",
			displayName: ""
		}), inviteMode = ref("existing");
		ref(null);
		const applicationLink = computed(() => "/account?tab=bloggers");
		useCatalogDialog(computed(() => !!edit.value), () => {
			if (!busy.value) edit.value = null;
		});
		const fields = [
			"name",
			"isEnabled",
			"rewardPercent",
			"customerRewardMode",
			"fixedCustomerRewardAmount",
			"attributionDays",
			"holdDays",
			"minimumOrderAmount",
			"firstOrderOnly",
			"minimumPayout",
			"signupRewardAmount",
			"signupRewardUnit",
			"signupHoldDays",
			"termsText",
			"autoSettlement"
		];
		const body = () => ({
			...Object.fromEntries(fields.map((key) => [key, [
				"rewardPercent",
				"fixedCustomerRewardAmount",
				"attributionDays",
				"holdDays",
				"minimumOrderAmount",
				"minimumPayout",
				"signupRewardAmount",
				"signupHoldDays"
			].includes(key) ? Number(form[key]) : form[key]])),
			signupRewardUnit: props.kind === "REFERRAL" ? "RUB" : form.signupRewardUnit
		});
		const dirty = computed(() => JSON.stringify(body()) !== baseline.value);
		onBeforeRouteLeave(() => !busy.value && (!(data.value && props.section === "settings" && dirty.value) || (void 0).confirm("Есть несохранённые настройки программы. Покинуть страницу?")));
		function api(path, options = {}) {
			return $fetch$1("/partners/admin/" + path, {
				baseURL: config.public.apiBase,
				headers: { Authorization: `Bearer ${token.value}` },
				timeout: 15e3,
				...options
			});
		}
		function message(e) {
			return Array.isArray(e?.data?.message) ? e.data.message.join(" · ") : e?.data?.message || "Не удалось выполнить действие. Повторите запрос.";
		}
		async function load(reset = true) {
			const version = ++loadVersion, identity = token.value;
			loadController?.abort();
			const controller = new AbortController();
			loadController = controller;
			loading.value = true;
			error.value = "";
			try {
				const result = await api(`${props.kind}/${props.section}`, {
					signal: controller.signal,
					query: {
						search: search.value,
						page: page.value
					}
				});
				if (version !== loadVersion || identity !== token.value) return;
				data.value = result;
				if (reset) {
					Object.assign(form, data.value.settings);
					for (const key of [
						"rewardPercent",
						"fixedCustomerRewardAmount",
						"minimumOrderAmount",
						"minimumPayout",
						"signupRewardAmount"
					]) form[key] = Number(form[key]);
					baseline.value = JSON.stringify(body());
				}
			} catch (e) {
				if (version === loadVersion && identity === token.value && !controller.signal.aborted) error.value = message(e);
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		const statuses = {
			INVITED: "Ждём согласия",
			PENDING: "Ожидает проверки",
			ACTIVE: "Активен",
			SUSPENDED: "Приостановлен",
			REJECTED: "Отклонено",
			APPROVED: "Подтверждено",
			REQUESTED: "Новая заявка",
			PAID: "Перевод отмечен вручную",
			CANCELLED: "Отменено",
			REVERSED: "Сторнировано",
			PROSPECT: "На проверке",
			ON_HOLD: "Приостановлена",
			ARCHIVED: "Архив"
		};
		const number = (v) => Number(v || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
		const amount = (row) => number(row.amount) + (row.unit === "BONUS" ? " бонусов" : " ₽");
		const date = (v) => v ? new Date(v).toLocaleDateString("ru-RU") : "—";
		const sum = (unit, status) => number(data.value?.summary?.totals?.find((v) => v.unit === unit && v.status === status)?._sum.amount);
		let searchTimer;
		watch(search, () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				page.value = 1;
				load(false);
			}, 300);
		});
		watch(page, () => load(false));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "partner-workspace crm-standard crm-management-workspace",
				"aria-busy": unref(loading) || unref(busy)
			}, _attrs))}><header class="${ssrRenderClass([{ "partner-settings-head": __props.section === "settings" }, "partner-page-head crm-page-header"])}"><div><h1>${ssrInterpolate(unref(title))}</h1><p class="partner-page-description">${ssrInterpolate(unref(description))}</p></div><div class="partner-actions"><button class="partner-button crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || __props.section === "settings" && unref(dirty)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить</button>`);
			if (__props.kind === "BLOGGER" && ["participants", "overview"].includes(__props.section) && unref(canWrite)) {
				_push(`<button class="partner-button partner-primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(UserRoundPlus), { size: 18 }, null, _parent));
				_push(`Пригласить партнёра</button>`);
			} else _push(`<!---->`);
			if (__props.section === "settings" && unref(canWrite)) {
				_push(`<button class="partner-button partner-primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty) || !unref(data)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 18 }, null, _parent));
				_push(`Сохранить</button>`);
			} else _push(`<!---->`);
			if (__props.section === "rewards" && unref(canWrite)) {
				_push(`<button class="partner-button partner-primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(data)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
				_push(`Обработать начисления</button>`);
			} else _push(`<!---->`);
			_push(`</div></header>`);
			if (unref(error)) _push(`<p class="partner-alert" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="partner-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (__props.section === "settings" && unref(data) && unref(dirty)) _push(`<p class="crm-management-dirty" role="status">Настройки изменены. Сохраните их, чтобы новые условия применялись к программе.</p>`);
			else _push(`<!---->`);
			if (unref(loading) && !unref(data)) _push(`<p role="status">Загружаем программу…</p>`);
			else _push(`<!---->`);
			if (unref(error) && !unref(data)) _push(`<button class="partner-button crm-button">Повторить загрузку</button>`);
			else _push(`<!---->`);
			if (unref(data)) {
				_push(`<!--[-->`);
				if (__props.section === "settings") {
					_push(`<form class="partner-settings"><div class="partner-settings-main"><fieldset class="partner-panel partner-setting-card crm-surface"${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy) || unref(loading)) ? " disabled" : ""}><header class="partner-card-heading"><span class="partner-card-icon">`);
					_push(ssrRenderComponent(unref(SlidersHorizontal), { size: 20 }, null, _parent));
					_push(`</span><div><h2>Программа</h2><p>Название и доступность для клиентов</p></div><span class="partner-status crm-badge"${ssrRenderAttr("data-status", unref(form).isEnabled ? "ACTIVE" : "SUSPENDED")}>${ssrInterpolate(unref(form).isEnabled ? "Открыта" : "Выключена")}</span></header><div class="partner-launch-row"><span><strong>Принимать участников</strong><small>${ssrInterpolate(__props.kind === "BLOGGER" ? "Заявки проходят проверку менеджером" : "Частные клиенты присоединяются самостоятельно")}</small></span><label class="partner-toggle crm-toggle-control"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(form).isEnabled) ? ssrLooseContain(unref(form).isEnabled, null) : unref(form).isEnabled) ? " checked" : ""} type="checkbox" role="switch" aria-label="Программа открыта для участия"><span aria-hidden="true"></span></label></div><label class="partner-field">Название программы<input class="crm-input"${ssrRenderAttr("value", unref(form).name)} maxlength="100" required></label></fieldset><fieldset class="partner-panel partner-setting-card crm-surface"${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy) || unref(loading)) ? " disabled" : ""}><header class="partner-card-heading"><span class="partner-card-icon">`);
					_push(ssrRenderComponent(unref(Wallet), { size: 20 }, null, _parent));
					_push(`</span><div><h2>${ssrInterpolate(__props.kind === "REFERRAL" ? "Вознаграждение за B2C" : "Комиссия за покупки")}</h2><p>${ssrInterpolate(__props.kind === "REFERRAL" ? "Вознаграждение за покупки приглашённых клиентов" : "Денежное вознаграждение за B2C-заказы")}</p></div></header>`);
					if (__props.kind === "REFERRAL") {
						_push(`<div class="partner-form-grid"><label>Способ начисления<select class="crm-input" aria-label="Способ начисления"><option value="FIXED"${ssrIncludeBooleanAttr(Array.isArray(unref(form).customerRewardMode) ? ssrLooseContain(unref(form).customerRewardMode, "FIXED") : ssrLooseEqual(unref(form).customerRewardMode, "FIXED")) ? " selected" : ""}>Фиксированная сумма за клиента</option><option value="PERCENT"${ssrIncludeBooleanAttr(Array.isArray(unref(form).customerRewardMode) ? ssrLooseContain(unref(form).customerRewardMode, "PERCENT") : ssrLooseEqual(unref(form).customerRewardMode, "PERCENT")) ? " selected" : ""}>Процент от покупки</option></select></label>`);
						if (unref(form).customerRewardMode === "FIXED") _push(`<label>Сумма за нового клиента, ₽<input class="crm-input"${ssrRenderAttr("value", unref(form).fixedCustomerRewardAmount)} type="number" min="0" max="100000000" step="0.01" required></label>`);
						else _push(`<label>Процент от покупки, %<input class="crm-input"${ssrRenderAttr("value", unref(form).rewardPercent)} type="number" min="0" max="100" step="0.01" required></label>`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`<div class="partner-form-grid">`);
					if (__props.kind === "BLOGGER") _push(`<label>Комиссия за B2C-заказ, %<input class="crm-input"${ssrRenderAttr("value", unref(form).rewardPercent)} type="number" min="0" max="100" step="0.01" required></label>`);
					else _push(`<!---->`);
					_push(`<label>Минимальная сумма товаров, ₽<input class="crm-input"${ssrRenderAttr("value", unref(form).minimumOrderAmount)} type="number" min="0" max="100000000" step="0.01" required></label><label>Ожидание после доставки, дней<input class="crm-input"${ssrRenderAttr("value", unref(form).holdDays)} type="number" min="0" max="365" required></label><label>Минимальная выплата, ₽<input class="crm-input"${ssrRenderAttr("value", unref(form).minimumPayout)} type="number" min="1" max="100000000" step="0.01" required></label></div>`);
					if (__props.kind === "BLOGGER") _push(`<label class="partner-option crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(form).firstOrderOnly) ? ssrLooseContain(unref(form).firstOrderOnly, null) : unref(form).firstOrderOnly) ? " checked" : ""} type="checkbox" role="switch"><span><strong>Только первая покупка</strong><small>Повторные заказы не приносят вознаграждение</small></span></label>`);
					else _push(`<!---->`);
					_push(`<div class="partner-example">`);
					_push(ssrRenderComponent(unref(CircleHelp), { size: 16 }, null, _parent));
					_push(`<span>${ssrInterpolate(__props.kind === "REFERRAL" ? unref(form).customerRewardMode === "FIXED" ? "За первого клиента — " + number(unref(form).fixedCustomerRewardAmount) + " ₽" : "С покупки на 5 000 ₽ — " + number(5e3 * Number(unref(form).rewardPercent || 0) / 100) + " ₽" : "С покупки на 5 000 ₽ — " + number(5e3 * Number(unref(form).rewardPercent || 0) / 100) + " ₽")}<small>Начисление после доставки и ${ssrInterpolate(unref(form).holdDays)} дней ожидания. Возвраты и отмены исключаются.</small></span></div></fieldset><fieldset class="partner-panel partner-setting-card crm-surface"${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy) || unref(loading)) ? " disabled" : ""}><header class="partner-card-heading"><span class="partner-card-icon">`);
					_push(ssrRenderComponent(unref(Building2), { size: 20 }, null, _parent));
					_push(`</span><div><h2>Привлечение салонов и бизнеса</h2><p>Фиксированная сумма за новую организацию, не за её покупки</p></div></header><div class="partner-form-grid"><label>Фиксированная сумма за салон, ₽<input class="crm-input"${ssrRenderAttr("value", unref(form).signupRewardAmount)} type="number" min="0" max="100000000"${ssrRenderAttr("step", unref(form).signupRewardUnit === "BONUS" ? 1 : .01)} required></label>`);
					if (__props.kind === "BLOGGER") _push(`<label>Вид вознаграждения<select class="crm-input" aria-label="Вид вознаграждения"><option value="RUB"${ssrIncludeBooleanAttr(Array.isArray(unref(form).signupRewardUnit) ? ssrLooseContain(unref(form).signupRewardUnit, "RUB") : ssrLooseEqual(unref(form).signupRewardUnit, "RUB")) ? " selected" : ""}>Деньги на партнёрский баланс</option><option value="BONUS"${ssrIncludeBooleanAttr(Array.isArray(unref(form).signupRewardUnit) ? ssrLooseContain(unref(form).signupRewardUnit, "BONUS") : ssrLooseEqual(unref(form).signupRewardUnit, "BONUS")) ? " selected" : ""}>Бонусы на сайте</option></select></label>`);
					else _push(`<!---->`);
					_push(`<label>Ожидание после проверки, дней<input class="crm-input"${ssrRenderAttr("value", unref(form).signupHoldDays)} type="number" min="0" max="365" required></label></div><p class="partner-inline-note">`);
					_push(ssrRenderComponent(unref(ShieldCheck), { size: 16 }, null, _parent));
					_push(`Один раз после проверки и активации. Сумма 0 отключает начисление.</p></fieldset><fieldset class="partner-panel partner-setting-card crm-surface"${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy) || unref(loading)) ? " disabled" : ""}><header class="partner-card-heading"><span class="partner-card-icon">`);
					_push(ssrRenderComponent(unref(Clock), { size: 20 }, null, _parent));
					_push(`</span><div><h2>Ссылки и начисления</h2><p>Как долго сохранять приглашение и подтверждать награды</p></div></header><div class="partner-form-grid"><label>Срок привязки ссылки, дней<input class="crm-input"${ssrRenderAttr("value", unref(form).attributionDays)} type="number" min="1" max="365" required></label></div><label class="partner-option crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(form).autoSettlement) ? ssrLooseContain(unref(form).autoSettlement, null) : unref(form).autoSettlement) ? " checked" : ""} type="checkbox" role="switch"><span><strong>Автоматическое подтверждение</strong><small>После доставки и окончания срока ожидания</small></span></label></fieldset><fieldset class="partner-panel partner-setting-card crm-surface"${ssrIncludeBooleanAttr(!unref(canWrite) || unref(busy) || unref(loading)) ? " disabled" : ""}><header class="partner-card-heading"><span class="partner-card-icon">`);
					_push(ssrRenderComponent(unref(ShieldCheck), { size: 20 }, null, _parent));
					_push(`</span><div><h2>Условия программы</h2><p>Участник принимает их перед подключением</p></div></header><label class="partner-field">Текст, который принимает участник<textarea class="crm-input" maxlength="6000" rows="6"${ssrIncludeBooleanAttr(unref(form).isEnabled) ? " required" : ""} placeholder="Условия участия, правила начислений и ограничения…">${ssrInterpolate(unref(form).termsText)}</textarea></label><p class="partner-inline-note">Самоприглашения и B2B-продажи исключены. Существующие начисления не пересчитываются.</p></fieldset></div><aside class="partner-settings-aside"><article class="partner-panel partner-program-summary crm-surface"><h2>${ssrInterpolate(unref(form).name || "Без названия")}</h2><span class="partner-status crm-badge"${ssrRenderAttr("data-status", unref(form).isEnabled ? "ACTIVE" : "SUSPENDED")}>${ssrInterpolate(unref(form).isEnabled ? "Открыта для участия" : "Программа выключена")}</span><dl><div><dt>${ssrInterpolate(__props.kind === "REFERRAL" ? "B2C-вознаграждение" : "Комиссия за B2C")}</dt><dd>${ssrInterpolate(__props.kind === "REFERRAL" ? unref(form).customerRewardMode === "FIXED" ? number(unref(form).fixedCustomerRewardAmount) + " ₽ за клиента" : number(unref(form).rewardPercent) + "%" : number(unref(form).rewardPercent) + "%")}</dd></div><div><dt>Привязка ссылки</dt><dd>${ssrInterpolate(unref(form).attributionDays)} дней</dd></div><div><dt>После доставки</dt><dd>${ssrInterpolate(unref(form).holdDays)} дней</dd></div><div><dt>Минимальная выплата</dt><dd>${ssrInterpolate(number(unref(form).minimumPayout))} ₽</dd></div><div><dt>Фиксированно за салон</dt><dd>${ssrInterpolate(Number(unref(form).signupRewardAmount) ? number(unref(form).signupRewardAmount) + (__props.kind === "BLOGGER" && unref(form).signupRewardUnit === "BONUS" ? " бонусов" : " ₽") : "Выключено")}</dd></div></dl><p class="partner-summary-note">${ssrInterpolate(__props.kind === "REFERRAL" ? "За нового B2C-клиента начисляется фиксированная сумма или процент с каждой покупки по ссылке. За салон — фиксированная сумма." : "Комиссия за B2C-покупки и фиксированное вознаграждение за новый бизнес — отдельно.")}</p><p class="partner-save-state"${ssrRenderAttr("data-dirty", unref(dirty))}>${ssrInterpolate(!unref(canWrite) ? "Только просмотр" : unref(dirty) ? "Есть несохранённые изменения" : "Все изменения сохранены")}</p></article></aside></form>`);
				} else {
					_push(`<!--[-->`);
					if (__props.section === "overview") {
						_push(`<div class="partner-kpis"><article class="partner-panel crm-surface">`);
						_push(ssrRenderComponent(unref(Users), { size: 20 }, null, _parent));
						_push(`<span>Партнёры</span><strong>${ssrInterpolate(unref(data).summary.participants)}</strong><small>${ssrInterpolate(unref(data).summary.pending)} заявок на проверке</small></article><article class="partner-panel crm-surface">`);
						_push(ssrRenderComponent(unref(MousePointer2), { size: 20 }, null, _parent));
						_push(`<span>Уникальные посетители</span><strong>${ssrInterpolate(unref(data).summary.uniqueVisitors)}</strong><small>после согласия по ссылке</small></article><article class="partner-panel crm-surface">`);
						_push(ssrRenderComponent(unref(Building2), { size: 20 }, null, _parent));
						_push(`<span>Привлечённые организации</span><strong>${ssrInterpolate(unref(data).summary.registrations)}</strong><small>регистрации, не B2B-продажи</small></article><article class="partner-panel crm-surface">`);
						_push(ssrRenderComponent(unref(Wallet), { size: 20 }, null, _parent));
						_push(`<span>Подтверждено деньгами</span><strong>${ssrInterpolate(sum("RUB", "APPROVED"))} ₽</strong><small>до вычета выплат</small></article></div>`);
					} else _push(`<!---->`);
					if (__props.section === "overview") {
						_push(`<div class="partner-overview"><article class="partner-panel crm-surface"><h2>В работе</h2><div class="partner-totals"><span>Деньги в ожидании<strong>${ssrInterpolate(sum("RUB", "PENDING"))} ₽</strong></span><span>Бонусы в ожидании<strong>${ssrInterpolate(sum("BONUS", "PENDING"))}</strong></span><span>Бонусы подтверждены<strong>${ssrInterpolate(sum("BONUS", "APPROVED"))}</strong></span></div></article><article class="partner-panel crm-surface"><h2>Работа с партнёрами</h2><nav class="partner-links">`);
						_push(ssrRenderComponent(_component_NuxtLink, { to: bloggerSectionPath("participants") }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Заявки и партнёры`);
									_push(ssrRenderComponent(unref(ExternalLink), { size: 16 }, null, _parent, _scopeId));
								} else return [createTextVNode("Заявки и партнёры"), createVNode(unref(ExternalLink), { size: 16 })];
							}),
							_: 1
						}, _parent));
						_push(ssrRenderComponent(_component_NuxtLink, { to: bloggerSectionPath("registrations") }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Проверить организации`);
									_push(ssrRenderComponent(unref(ExternalLink), { size: 16 }, null, _parent, _scopeId));
								} else return [createTextVNode("Проверить организации"), createVNode(unref(ExternalLink), { size: 16 })];
							}),
							_: 1
						}, _parent));
						if (unref(canPay)) _push(ssrRenderComponent(_component_NuxtLink, { to: bloggerSectionPath("payouts") }, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Очередь выплат`);
									_push(ssrRenderComponent(unref(ExternalLink), { size: 16 }, null, _parent, _scopeId));
								} else return [createTextVNode("Очередь выплат"), createVNode(unref(ExternalLink), { size: 16 })];
							}),
							_: 1
						}, _parent));
						else _push(`<!---->`);
						_push(`</nav></article></div>`);
					} else {
						_push(`<!--[-->`);
						if (__props.kind === "BLOGGER" && __props.section === "participants") _push(`<details class="partner-onboarding-help"><summary>Как пригласить партнёра</summary><p>Пригласите зарегистрированного клиента в программу авторов и блогеров или передайте ссылку на заявку. После принятия условий вы сможете одобрить участие.</p></details>`);
						else _push(`<!---->`);
						_push(`<article class="partner-panel partner-registry crm-surface"><div class="partner-registry-head"><label class="partner-search crm-input-group">`);
						_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
						_push(`<input class="crm-input"${ssrRenderAttr("value", unref(search))} placeholder="Имя партнёра, email или код ссылки" aria-label="Поиск партнёров"></label><span class="partner-record-count" role="status">${ssrInterpolate(unref(data).total)} записей</span></div>`);
						if (!unref(data).rows.length) {
							_push(`<div class="partner-empty">`);
							_push(ssrRenderComponent(unref(Users), { size: 28 }, null, _parent));
							_push(`<h2>${ssrInterpolate(unref(search) ? "Ничего не найдено" : "Пока нет записей")}</h2><p>${ssrInterpolate(unref(search) ? "Попробуйте другой запрос." : "Заявки и начисления появятся после запуска программы.")}</p></div>`);
						} else {
							_push(`<div class="partner-table-wrap"><table class="partner-table"><thead><tr><th>Партнёр</th>`);
							if (__props.section === "participants") _push(`<!--[--><th>Контакты и каналы</th><th>Ссылки / заказы</th><th>Статус</th><th>Процент</th><!--]-->`);
							else if (__props.section === "registrations") _push(`<!--[--><th>Организация</th><th>Вознаграждение</th><th>Статус</th><!--]-->`);
							else _push(`<!--[--><th>${ssrInterpolate(__props.section === "rewards" ? "Основание" : "Создано")}</th><th>Сумма</th><th>Статус</th><th>${ssrInterpolate(__props.section === "rewards" ? "Доступно после" : "Документ / решение")}</th><!--]-->`);
							if (unref(hasRowActions)) _push(`<th>Действия</th>`);
							else _push(`<!---->`);
							_push(`</tr></thead><tbody><!--[-->`);
							ssrRenderList(unref(data).rows, (row) => {
								_push(`<tr><td data-label="Партнёр"><strong>${ssrInterpolate(row.displayName || row.participant?.displayName)}</strong><small>${ssrInterpolate(row.code || row.participant?.code)}</small></td>`);
								if (__props.section === "participants") {
									_push(`<!--[--><td data-label="Контакты"><span>${ssrInterpolate(row.user.email)}</span><!--[-->`);
									ssrRenderList(row.channels, (channel) => {
										_push(`<a${ssrRenderAttr("href", channel.url)} target="_blank" rel="noopener noreferrer">${ssrInterpolate(channel.label)}`);
										_push(ssrRenderComponent(unref(ExternalLink), { size: 12 }, null, _parent));
										_push(`</a>`);
									});
									_push(`<!--]-->`);
									if (row.description) _push(`<small>${ssrInterpolate(row.description)}</small>`);
									else _push(`<!---->`);
									_push(`</td><td data-label="Ссылки и заказы">${ssrInterpolate(row._count.clicks)} / ${ssrInterpolate(row._count.attributions)}<small>${ssrInterpolate(row._count.registrations)} организаций</small></td><td data-label="Статус"><span class="partner-status crm-badge"${ssrRenderAttr("data-status", row.status)}>${ssrInterpolate(statuses[row.status])}</span>`);
									if (__props.kind === "BLOGGER") _push(`<small>${ssrInterpolate(row.payoutVerified ? "Получатель проверен" : "Получатель не проверен")}</small>`);
									else _push(`<!---->`);
									_push(`</td><td data-label="Процент">${ssrInterpolate(number(row.rewardPercent ?? unref(data).settings.rewardPercent))}%</td><!--]-->`);
								} else if (__props.section === "registrations") _push(`<!--[--><td data-label="Организация"><strong>${ssrInterpolate(row.organization.name)}</strong><small>ИНН ${ssrInterpolate(row.organization.inn || "не указан")}</small></td><td data-label="Вознаграждение">${ssrInterpolate(amount(row))}</td><td data-label="Статус"><span class="partner-status crm-badge">${ssrInterpolate(row.verifiedAt ? "Проверена" : "Требует проверки")}</span><small>${ssrInterpolate(statuses[row.organization.status] || row.organization.status)} · ${ssrInterpolate(row.reward ? statuses[row.reward.status] : "ещё не начислено")}</small></td><!--]-->`);
								else {
									_push(`<!--[--><td${ssrRenderAttr("data-label", __props.section === "rewards" ? "Основание" : "Создано")}>${ssrInterpolate(__props.section === "rewards" ? row.registrationId ? "Регистрация: " + row.registration?.organization.name : row.order?.orderNumber : date(row.createdAt))}`);
									if (__props.section === "rewards") _push(`<small>${ssrInterpolate(row.registrationId ? "Фиксированное вознаграждение" : "Комиссия за B2C-заказ")}</small>`);
									else _push(`<!---->`);
									_push(`</td><td data-label="Сумма"><strong>${ssrInterpolate(amount(row))}</strong></td><td data-label="Статус"><span class="partner-status crm-badge"${ssrRenderAttr("data-status", row.status)}>${ssrInterpolate(statuses[row.status])}</span></td><td${ssrRenderAttr("data-label", __props.section === "rewards" ? "Доступно после" : "Документ / решение")}>${ssrInterpolate(__props.section === "rewards" ? date(row.readyAt) : row.paymentReference || row.decisionNote || "—")}</td><!--]-->`);
								}
								if (unref(hasRowActions)) {
									_push(`<td data-label="Действия"><div class="partner-row-actions">`);
									if (__props.section === "participants") {
										_push(`<!--[-->`);
										if (unref(canWrite)) _push(`<button class="partner-button crm-button">Изменить</button>`);
										else _push(`<!---->`);
										if (unref(canPay) && __props.kind === "BLOGGER") _push(`<button class="partner-button crm-button">Получатель</button>`);
										else _push(`<!---->`);
										_push(`<!--]-->`);
									} else _push(`<!---->`);
									if (__props.section === "registrations" && unref(canWrite) && !row.verifiedAt) _push(`<button class="partner-button crm-button">Проверить</button>`);
									else _push(`<!---->`);
									if (__props.section === "payouts" && unref(canPay) && ["REQUESTED", "APPROVED"].includes(row.status)) _push(`<button class="partner-button crm-button">Решение</button>`);
									else _push(`<!---->`);
									_push(`</div></td>`);
								} else _push(`<!---->`);
								_push(`</tr>`);
							});
							_push(`<!--]--></tbody></table></div>`);
						}
						_push(`<footer class="partner-pagination"><span>Страница ${ssrInterpolate(unref(data).page)} из ${ssrInterpolate(unref(data).pages)}</span><div class="partner-actions"><button class="partner-button crm-button"${ssrIncludeBooleanAttr(unref(page) <= 1 || unref(loading)) ? " disabled" : ""}>Назад</button><button class="partner-button crm-button"${ssrIncludeBooleanAttr(unref(page) >= unref(data).pages || unref(loading)) ? " disabled" : ""}>Далее</button></div></footer></article><!--]-->`);
					}
					_push(`<!--]-->`);
				}
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(edit)) {
					_push(`<div class="partner-dialog-backdrop crm-management-backdrop"><section tabindex="-1" class="partner-dialog admin-dialog crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="partner-dialog-title"><header><h2 id="partner-dialog-title">${ssrInterpolate(unref(edit).type === "invite" ? "Пригласить партнёра" : unref(edit).type === "participant" ? "Решение по участнику" : unref(edit).type === "verification" ? "Проверка получателя" : unref(edit).type === "registration" ? "Проверка организации" : "Решение по выплате")}</h2><button class="partner-button partner-icon crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header>`);
					if (unref(edit).type === "invite") {
						_push(`<form><div class="partner-invite-tabs"><button type="button" class="partner-button crm-button"${ssrRenderAttr("aria-pressed", unref(inviteMode) === "existing")}>Клиент уже на сайте</button><button type="button" class="partner-button crm-button"${ssrRenderAttr("aria-pressed", unref(inviteMode) === "new")}>Новый участник</button></div>`);
						if (unref(inviteMode) === "existing") _push(`<!--[--><p class="partner-muted">Приглашение появится в личном кабинете клиента → Блогерам. Письмо автоматически не отправляется.</p><label>Email клиента<input class="crm-input"${ssrRenderAttr("value", unref(invite).email)} type="email" maxlength="254" required placeholder="name@example.ru"></label><label>Публичное имя<input class="crm-input"${ssrRenderAttr("value", unref(invite).displayName)} maxlength="120" placeholder="Необязательно"></label><!--]-->`);
						else _push(`<!---->`);
						_push(`<div class="partner-invite-link"><h3>${ssrInterpolate(unref(inviteMode) === "new" ? "Ссылка на заявку" : "Передайте участнику ссылку")}</h3>`);
						if (unref(inviteMode) === "new") _push(`<p class="partner-muted">Участник регистрируется на сайте, указывает канал и принимает условия программы авторов и блогеров. Заявка появится в этом разделе.</p>`);
						else _push(`<!---->`);
						_push(`<label>Страница заявки автора<input class="crm-input"${ssrRenderAttr("value", unref(applicationLink))} readonly></label><button class="partner-button crm-button" type="button">`);
						_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent));
						_push(`Скопировать ссылку на заявку</button></div>`);
						if (unref(error)) _push(`<p class="partner-alert" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						if (unref(notice)) _push(`<p class="partner-notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
						else _push(`<!---->`);
						_push(`<footer><button class="partner-button crm-button" type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Закрыть</button>`);
						if (unref(inviteMode) === "existing") {
							_push(`<button class="partner-button partner-primary crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(UserRoundPlus), { size: 18 }, null, _parent));
							_push(`Пригласить партнёра</button>`);
						} else _push(`<!---->`);
						_push(`</footer></form>`);
					} else {
						_push(`<form>`);
						if (unref(edit).type === "participant") {
							_push(`<!--[-->`);
							if (unref(edit).row.status === "INVITED") _push(`<p class="partner-muted">Ждём согласия участника в личном кабинете → Блогерам. До этого активация недоступна.</p>`);
							else _push(`<!---->`);
							_push(`<label>Статус<select class="crm-input" aria-label="Решение по статусу"><option value="ACTIVE"${ssrIncludeBooleanAttr(unref(edit).row.status === "INVITED") ? " disabled" : ""}${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "ACTIVE") : ssrLooseEqual(unref(decision).status, "ACTIVE")) ? " selected" : ""}>Активен</option><option value="SUSPENDED"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "SUSPENDED") : ssrLooseEqual(unref(decision).status, "SUSPENDED")) ? " selected" : ""}>Приостановлен</option><option value="REJECTED"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "REJECTED") : ssrLooseEqual(unref(decision).status, "REJECTED")) ? " selected" : ""}>Отклонён</option></select></label><label>Индивидуальный процент<input class="crm-input"${ssrRenderAttr("value", unref(decision).rewardPercent)} type="number" min="0" max="100" step="0.01" placeholder="Процент программы"></label><!--]-->`);
						} else _push(`<!---->`);
						if (unref(edit).type === "verification") _push(`<label class="partner-switch crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).payoutVerified) ? ssrLooseContain(unref(decision).payoutVerified, null) : unref(decision).payoutVerified) ? " checked" : ""} type="checkbox">Получатель и необходимые документы проверены</label>`);
						else _push(`<!---->`);
						if (unref(edit).type === "payout") {
							_push(`<!--[--><label>Решение<select class="crm-input" aria-label="Решение по статусу">`);
							if (unref(edit).row.status === "REQUESTED") _push(`<option value="APPROVED"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "APPROVED") : ssrLooseEqual(unref(decision).status, "APPROVED")) ? " selected" : ""}>Одобрить выплату</option>`);
							else _push(`<!---->`);
							if (unref(edit).row.status === "APPROVED") _push(`<option value="PAID"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "PAID") : ssrLooseEqual(unref(decision).status, "PAID")) ? " selected" : ""}>Отметить перевод вручную</option>`);
							else _push(`<!---->`);
							_push(`<option value="REJECTED"${ssrIncludeBooleanAttr(Array.isArray(unref(decision).status) ? ssrLooseContain(unref(decision).status, "REJECTED") : ssrLooseEqual(unref(decision).status, "REJECTED")) ? " selected" : ""}>Отклонить заявку</option></select></label>`);
							if (unref(decision).status === "PAID") _push(`<!--[--><p class="partner-alert">Отметьте только уже выполненный перевод. Номер документа пока не проверяется в 1С; деньги из CRM не отправляются.</p><label>Уникальный номер платёжного документа<input class="crm-input"${ssrRenderAttr("value", unref(decision).paymentReference)} minlength="3" maxlength="120" required></label><!--]-->`);
							else _push(`<!---->`);
							_push(`<!--]-->`);
						} else _push(`<!---->`);
						if (unref(edit).type === "registration") _push(`<p class="partner-muted">Подтвердите, что организация реальная, зарегистрирована впервые по ссылке партнёра и владелец проверен. Начисление станет доступно только при активном статусе организации.</p>`);
						else _push(`<!---->`);
						_push(`<label>Основание решения<textarea class="crm-input" minlength="3" maxlength="500" required rows="3">${ssrInterpolate(unref(decision).note)}</textarea></label>`);
						if (unref(error)) _push(`<p class="partner-alert" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<footer><button class="partner-button crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="button">Отмена</button><button class="partner-button partner-primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} type="submit">`);
						_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
						_push(`Подтвердить</button></footer></form>`);
					}
					_push(`</section></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/workspace/PartnerWorkspacePage.vue
var _sfc_setup = PartnerWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
PartnerWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/PartnerWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var PartnerWorkspacePage_default = Object.assign(PartnerWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "PartnerWorkspacePage" });

export { PartnerWorkspacePage_default as P };;globalThis.__timing__.logEnd('Load chunks/build/PartnerWorkspacePage-SHPqpej7');
//# sourceMappingURL=PartnerWorkspacePage-SHPqpej7.mjs.map
