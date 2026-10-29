globalThis.__timing__.logStart('Load chunks/build/CrmWorkClock-Dx7xM2cg');import { a as useWorkspaceSession, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, withCtx, createVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { Clock3, Play, Pause, Square, ArrowUpRight, RefreshCw } from '@lucide/vue';

function workTimeLocal(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (key) => parts.find((p) => p.type === key).value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
function workTimeDuration(ms) {
  const minutes = Math.floor(Math.max(0, ms) / 6e4);
  return `${Math.floor(minutes / 60)} \u0447 ${minutes % 60} \u043C\u0438\u043D`;
}
function workTimeCounter(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1e3);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
}

// components/crm/CrmWorkClock.vue?vue&type=script&setup=true&lang.ts
var CrmWorkClock_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmWorkClock",
	__ssrInlineRender: true,
	props: { compact: { type: Boolean } },
	emits: ["changed"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const { token } = useWorkspaceSession(), config = useRuntimeConfig();
		const data = ref(null), loading = ref(false), saving = ref(false), error = ref(""), notice = ref("");
		const tick = ref(0), sampled = ref(0);
		const pending = ref(null);
		let loadVersion = 0;
		const request = (path, options = {}) => $fetch$1("/crm/work-time" + path, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || "Нет подтверждения от сервера. Проверьте соединение и обновите данные.";
		const delta = computed(() => data.value && !error.value ? Math.min(6e4, Math.max(0, tick.value - sampled.value)) : 0);
		const todayDelta = computed(() => data.value ? Math.min(delta.value, Math.max(0, Date.parse(data.value.todayEndsAt) - Date.parse(data.value.serverTime))) : 0);
		const worked = computed(() => (data.value?.today.workedMs || 0) + (data.value?.active?.status === "WORKING" ? todayDelta.value : 0));
		const breaks = computed(() => (data.value?.today.breakMs || 0) + (data.value?.active?.status === "BREAK" ? todayDelta.value : 0));
		const activeWorked = computed(() => (data.value?.active?.totals.workedMs || 0) + (data.value?.active?.status === "WORKING" ? delta.value : 0));
		const disabled = computed(() => loading.value || saving.value || !data.value?.canTrack || Boolean(error.value) || Boolean(pending.value));
		const stateLabel = computed(() => data.value?.active?.status === "BREAK" ? "На перерыве" : data.value?.active ? "Рабочий день идёт" : "Нет открытого рабочего дня");
		const time = (value) => new Date(value).toLocaleString("ru-RU", {
			timeZone: data.value?.timezone || "Europe/Moscow",
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		});
		async function load() {
			if (saving.value) return;
			const version = ++loadVersion, identity = token.value;
			loading.value = true;
			try {
				const result = await request("/current");
				if (version !== loadVersion || token.value !== identity) return;
				data.value = result;
				error.value = "";
				sampled.value = tick.value = performance.now();
			} catch (e) {
				if (version === loadVersion && token.value === identity) {
					error.value = message(e);
					data.value = null;
				}
			} finally {
				if (version === loadVersion && token.value === identity) loading.value = false;
			}
		}
		watch(token, () => {
			++loadVersion;
			data.value = null;
			pending.value = null;
			error.value = "";
			notice.value = "";
			saving.value = false;
			load();
		});
		__expose({ refresh: load });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: ["crm-surface crm-work-clock", { "crm-work-clock--compact": __props.compact }],
				"aria-label": "Мой рабочий день"
			}, _attrs))}>`);
			if (__props.compact) {
				_push(`<!--[--><div class="crm-clock-strip"><div class="crm-clock-copy">`);
				_push(ssrRenderComponent(unref(Clock3), { size: 20 }, null, _parent));
				_push(`<div><strong>Рабочий день</strong>`);
				if (unref(data)) _push(`<small>${ssrInterpolate(unref(stateLabel))}</small>`);
				else if (unref(loading)) _push(`<small role="status">Загружаем отметки…</small>`);
				else _push(`<small>Отметки недоступны</small>`);
				_push(`</div></div>`);
				if (unref(data)) _push(`<strong class="crm-clock-counter" aria-label="Работа сегодня">${ssrInterpolate(unref(workTimeCounter)(unref(worked)))}</strong>`);
				else _push(`<!---->`);
				if (unref(data)?.canTrack) {
					_push(`<div class="crm-clock-actions">`);
					if (!unref(data).active) {
						_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""} aria-label="Начать рабочий день">`);
						_push(ssrRenderComponent(unref(Play), { size: 16 }, null, _parent));
						_push(`Начать день</button>`);
					} else {
						_push(`<!--[-->`);
						if (unref(data).active.status === "WORKING") {
							_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Pause), { size: 16 }, null, _parent));
							_push(`Перерыв</button>`);
						} else {
							_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Play), { size: 16 }, null, _parent));
							_push(`Продолжить работу</button>`);
						}
						_push(`<button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""} aria-label="Завершить рабочий день" title="Завершить рабочий день">`);
						_push(ssrRenderComponent(unref(Square), { size: 16 }, null, _parent));
						_push(`</button><!--]-->`);
					}
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/crm/work-time",
					class: "crm-button crm-button--text crm-clock-history",
					"aria-label": "История времени",
					title: "История времени"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`<span${_scopeId}>История времени</span>`);
							_push(ssrRenderComponent(unref(ArrowUpRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createVNode("span", null, "История времени"), createVNode(unref(ArrowUpRight), { size: 18 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
				if (unref(error) || unref(notice) || unref(pending) && !unref(saving)) {
					_push(`<div class="crm-clock-feedback">`);
					if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
					else _push(`<!---->`);
					if (unref(pending) && !unref(saving)) _push(`<button class="crm-button">Проверить сохранение</button>`);
					else if (unref(error)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>Повторить загрузку</button>`);
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`<!--]-->`);
			} else {
				_push(`<!--[--><header class="crm-panel-header"><div><h2 class="crm-icon-heading">`);
				_push(ssrRenderComponent(unref(Clock3), { size: 18 }, null, _parent));
				_push(`<span>Мой рабочий день</span></h2></div><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`Обновить отметки</button></header><div class="crm-register crm-page-content--stack">`);
				if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
				else _push(`<!---->`);
				if (unref(loading) && !unref(data)) _push(`<p role="status">Загружаем рабочий день…</p>`);
				else _push(`<!---->`);
				if (unref(pending) && !unref(saving)) _push(`<div class="crm-action-bar crm-action-bar--spread"><p class="crm-inline-note">Результат запроса не подтверждён. Проверка использует тот же запрос и не создаст вторую отметку.</p><button class="crm-button">Проверить сохранение</button></div>`);
				else _push(`<!---->`);
				if (unref(error) && !unref(pending)) _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(loading) || unref(saving)) ? " disabled" : ""}>Повторить загрузку</button>`);
				else _push(`<!---->`);
				if (unref(data)) {
					_push(`<!--[--><div class="crm-action-bar crm-action-bar--spread"><span class="crm-badge">${ssrInterpolate(unref(stateLabel))}</span><span class="crm-inline-note">${ssrInterpolate(unref(data).timezone)}</span></div>`);
					if (unref(data).active?.longRunning) _push(`<p role="alert">День не закрыт больше 24 часов. Учёт не остановлен автоматически: проверьте отметки и завершите день. Не используйте этот интервал для расчёта зарплаты без проверки.</p>`);
					else _push(`<!---->`);
					_push(`<div class="crm-summary-grid"><div><small>Работа сегодня</small><strong>${ssrInterpolate(unref(workTimeCounter)(unref(worked)))}</strong></div><div><small>Перерывы сегодня</small><strong>${ssrInterpolate(unref(workTimeDuration)(unref(breaks)))}</strong></div><div><small>В текущем рабочем дне</small><strong>${ssrInterpolate(unref(data).active ? unref(workTimeDuration)(unref(activeWorked)) : "—")}</strong></div><div><small>Начало рабочего дня</small>`);
					if (unref(data).active) _push(`<strong>${ssrInterpolate(time(unref(data).active.startedAt))}</strong>`);
					else _push(`<span>Ещё не отмечено</span>`);
					_push(`</div></div>`);
					if (unref(data).canTrack) {
						_push(`<div class="crm-action-bar crm-action-bar--spread">`);
						if (!unref(data).active) {
							_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Play), { size: 18 }, null, _parent));
							_push(`Начать рабочий день</button>`);
						} else {
							_push(`<!--[-->`);
							if (unref(data).active.status === "WORKING") {
								_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
								_push(ssrRenderComponent(unref(Pause), { size: 18 }, null, _parent));
								_push(`Начать перерыв</button>`);
							} else {
								_push(`<button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
								_push(ssrRenderComponent(unref(Play), { size: 18 }, null, _parent));
								_push(`Вернуться к работе</button>`);
							}
							_push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(disabled)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Square), { size: 18 }, null, _parent));
							_push(`Завершить день</button><!--]-->`);
						}
						_push(`</div>`);
					} else _push(`<p class="crm-inline-note">Отметки доступны только для просмотра.</p>`);
					_push(`<p class="crm-inline-note">${ssrInterpolate(__props.compact ? "Перерывы не входят в рабочее время. Не забудьте завершить день." : "Перерывы не входят в рабочее время. График не завершает рабочий день автоматически. Отметки сохраняются на сервере; без связи новые отметки недоступны.")}</p><!--]-->`);
				} else _push(`<!---->`);
				_push(`</div><!--]-->`);
			}
			_push(`</section>`);
		};
	}
});
// components/crm/CrmWorkClock.vue
var _sfc_setup = CrmWorkClock_vue_vue_type_script_setup_true_lang_default.setup;
CrmWorkClock_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmWorkClock.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var CrmWorkClock_default = Object.assign(CrmWorkClock_vue_vue_type_script_setup_true_lang_default, { __name: "CrmWorkClock" });

export { CrmWorkClock_default as C, workTimeLocal as a, workTimeDuration as w };;globalThis.__timing__.logEnd('Load chunks/build/CrmWorkClock-Dx7xM2cg');
//# sourceMappingURL=CrmWorkClock-Dx7xM2cg.mjs.map
