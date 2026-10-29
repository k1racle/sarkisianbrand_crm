globalThis.__timing__.logStart('Load chunks/build/SystemWorkspacePage-DiH6zXBr');import { c as useRoute, a as useWorkspaceSession, e as crmDestination, W as WorkspaceLoading_default, N as NuxtLink, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { u as useContextMenu } from './useContextMenu-CQeSn2KJ.mjs';
import { C as CrmCardTabs_default } from './CrmCardTabs-CwDu8QcL.mjs';
import { defineComponent, computed, ref, reactive, watch, mergeProps, unref, isRef, withCtx, createTextVNode, createVNode, resolveDynamicComponent, nextTick, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent, ssrRenderClass, ssrRenderAttr, ssrRenderList, ssrRenderStyle, ssrRenderTeleport, ssrLooseContain, ssrLooseEqual, ssrRenderVNode, ssrRenderDynamicModel } from 'vue/server-renderer';
import { RefreshCw, ShieldCheck, Activity, Search, Plus, KeyRound, UserRoundX, UserRoundCheck, RotateCcw, X, Check, Users, ChevronLeft, ChevronRight, Link2, Clipboard, LockKeyhole, Trash2, ContactRound, Building2, Box, Clock3, ShieldAlert, AlertTriangle, Copy, ExternalLink, CircleAlert, CheckCircle2, Save, Bot, MessageCircleMore, Pencil } from '@lucide/vue';

// components/EcosystemAccounts.vue?vue&type=script&setup=true&lang.ts
var EcosystemAccounts_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "EcosystemAccounts",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const { token, user } = useWorkspaceSession();
		useContextMenu();
		const result = ref({
			items: [],
			total: 0,
			page: 1,
			pages: 1,
			totals: {
				all: 0,
				staff: 0,
				b2c: 0,
				b2b: 0,
				pendingChanges: 0
			}
		});
		const requests = ref([]);
		const type = ref("ALL");
		const search = ref("");
		const page = ref(1);
		const busy = ref(false);
		const hasLoaded = ref(false);
		const mutating = ref(false);
		let loadVersion = 0, loadController;
		const selected = ref(null);
		const notice = ref("");
		const error = ref("");
		const resetInfo = ref(null);
		const temporary = reactive({
			currentAdminPassword: "",
			temporaryPassword: ""
		});
		const edit = reactive({
			firstName: "",
			lastName: "",
			email: "",
			phone: ""
		});
		const dirty = computed(() => Boolean(selected.value) && (Object.entries(edit).some(([key, value]) => value !== (selected.value[key] || "")) || Boolean(temporary.currentAdminPassword || temporary.temporaryPassword)));
		function closeAccount() {
			if (!mutating.value && (!dirty.value || (void 0).confirm("Закрыть учётную запись без сохранения введённых данных?"))) selected.value = null;
		}
		useCatalogDialog(computed(() => Boolean(selected.value)), closeAccount);
		onBeforeRouteLeave(() => !mutating.value && (!dirty.value || (void 0).confirm("Уйти без сохранения данных учётной записи?")));
		let searchTimer;
		computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const roleLabels = {
			ADMIN: "Администратор платформы",
			CONTENT_MANAGER: "Контент-менеджер",
			MANAGER_B2B: "Менеджер B2B",
			MANAGER_SALES: "Менеджер продаж",
			MARKETPLACE_MANAGER: "Менеджер маркетплейсов",
			SUPERVISOR: "Руководитель направления",
			EXECUTIVE: "Руководитель компании",
			IT_SUPPORT: "IT-поддержка",
			CURATOR: "Куратор",
			WAREHOUSE: "Сотрудник склада",
			CUSTOMER_B2C: "Клиент B2C",
			CUSTOMER_B2B: "Партнёр B2B"
		};
		const tabs = computed(() => [
			{
				id: "ALL",
				label: "Все",
				count: result.value.totals.all
			},
			{
				id: "STAFF",
				label: "Сотрудники",
				count: result.value.totals.staff
			},
			{
				id: "B2C",
				label: "Клиенты B2C",
				count: result.value.totals.b2c
			},
			{
				id: "B2B",
				label: "Партнёры B2B",
				count: result.value.totals.b2b
			}
		]);
		async function load() {
			const version = ++loadVersion, identity = token.value;
			loadController?.abort();
			const controller = new AbortController();
			loadController = controller;
			busy.value = true;
			error.value = "";
			try {
				const [accounts, changes] = await Promise.all([$fetch$1("/system-settings/accounts", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` },
					signal: controller.signal,
					query: {
						type: type.value,
						search: search.value || void 0,
						page: page.value,
						limit: 30
					}
				}), $fetch$1("/system-settings/profile-change-requests", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` },
					signal: controller.signal
				})]);
				if (version !== loadVersion || identity !== token.value) return;
				result.value = accounts;
				requests.value = changes;
				hasLoaded.value = true;
			} catch (exception) {
				if (version === loadVersion && identity === token.value && !controller.signal.aborted) error.value = messageOf(exception);
			} finally {
				if (version === loadVersion) busy.value = false;
			}
		}
		function messageOf(exception) {
			return exception?.data?.message || exception?.message || "Не удалось выполнить действие";
		}
		function personName(item) {
			return [item.firstName, item.lastName].filter(Boolean).join(" ") || "Без имени";
		}
		watch(search, () => {
			if (searchTimer) clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				page.value = 1;
				load();
			}, 350);
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-0dbb46e8d1df": "",
				class: "accounts-panel crm-surface"
			}, _attrs))}><div data-v-ui-0dbb46e8d1df class="account-summary"><!--[-->`);
			ssrRenderList(unref(tabs), (tab) => {
				_push(`<button data-v-ui-0dbb46e8d1df class="${ssrRenderClass([{ active: unref(type) === tab.id }, "crm-button"])}"><span data-v-ui-0dbb46e8d1df>${ssrInterpolate(tab.label)}</span><strong data-v-ui-0dbb46e8d1df>${ssrInterpolate(unref(hasLoaded) ? tab.count : "—")}</strong></button>`);
			});
			_push(`<!--]--></div>`);
			if (unref(requests).length) {
				_push(`<div data-v-ui-0dbb46e8d1df class="requests"><header data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df><p data-v-ui-0dbb46e8d1df>ТРЕБУЮТ РЕШЕНИЯ</p><h2 data-v-ui-0dbb46e8d1df>Запросы на изменение данных</h2></div><b data-v-ui-0dbb46e8d1df>${ssrInterpolate(unref(requests).length)}</b></header><!--[-->`);
				ssrRenderList(unref(requests), (request) => {
					_push(`<article data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df class="request-person"><span class="crm-avatar" data-v-ui-0dbb46e8d1df>${ssrInterpolate((request.user.firstName || request.user.email).slice(0, 1).toUpperCase())}</span><span data-v-ui-0dbb46e8d1df><strong data-v-ui-0dbb46e8d1df>${ssrInterpolate(personName(request.user))}</strong><small data-v-ui-0dbb46e8d1df>${ssrInterpolate(request.user.email)} · ${ssrInterpolate(new Date(request.createdAt).toLocaleString("ru-RU"))}</small></span></div><div data-v-ui-0dbb46e8d1df class="changes">`);
					if (request.requestedData.firstName) _push(`<span data-v-ui-0dbb46e8d1df>Имя: <b data-v-ui-0dbb46e8d1df>${ssrInterpolate(request.requestedData.firstName)}</b></span>`);
					else _push(`<!---->`);
					if (request.requestedData.lastName) _push(`<span data-v-ui-0dbb46e8d1df>Фамилия: <b data-v-ui-0dbb46e8d1df>${ssrInterpolate(request.requestedData.lastName)}</b></span>`);
					else _push(`<!---->`);
					if (request.requestedData.phone) _push(`<span data-v-ui-0dbb46e8d1df>Телефон: <b data-v-ui-0dbb46e8d1df>${ssrInterpolate(request.requestedData.phone)}</b></span>`);
					else _push(`<!---->`);
					_push(`</div><div data-v-ui-0dbb46e8d1df class="request-actions"><button class="crm-button" data-v-ui-0dbb46e8d1df title="Подтвердить">`);
					_push(ssrRenderComponent(unref(Check), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					_push(`</button><button class="crm-button" data-v-ui-0dbb46e8d1df title="Отклонить">`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					_push(`</button></div></article>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			_push(`<div data-v-ui-0dbb46e8d1df class="accounts-card"><header data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df><p data-v-ui-0dbb46e8d1df>ЕДИНЫЙ РЕЕСТР</p><h2 data-v-ui-0dbb46e8d1df>Учётные записи платформы</h2><span data-v-ui-0dbb46e8d1df>Сотрудники, покупатели сайта и партнёры B2B в одном защищённом контуре</span></div><label class="crm-input-group" data-v-ui-0dbb46e8d1df>`);
			_push(ssrRenderComponent(unref(Search), {
				"data-v-ui-0dbb46e8d1df": "",
				size: 16
			}, null, _parent));
			_push(`<input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(search))} type="search" aria-label="Поиск учётных записей" placeholder="Имя, email, телефон или компания"></label></header><div data-v-ui-0dbb46e8d1df class="account-table"><div data-v-ui-0dbb46e8d1df class="account-row head crm-table-head"><span data-v-ui-0dbb46e8d1df>Пользователь</span><span data-v-ui-0dbb46e8d1df>Тип</span><span data-v-ui-0dbb46e8d1df>Организация</span><span data-v-ui-0dbb46e8d1df>Сессии</span><span data-v-ui-0dbb46e8d1df>Состояние</span></div><!--[-->`);
			ssrRenderList(unref(result).items, (item) => {
				_push(`<button data-v-ui-0dbb46e8d1df class="account-row crm-button crm-table-row crm-card-action"><span data-v-ui-0dbb46e8d1df class="account-person"><i class="crm-avatar" data-v-ui-0dbb46e8d1df>`);
				if (item.avatarUrl) _push(`<img data-v-ui-0dbb46e8d1df${ssrRenderAttr("src", new _ctx.URL(item.avatarUrl, unref(config).public.apiBase).toString())} alt="">`);
				else _push(`<!--[-->${ssrInterpolate((item.firstName || item.email).slice(0, 1).toUpperCase())}<!--]-->`);
				_push(`</i><span data-v-ui-0dbb46e8d1df><strong data-v-ui-0dbb46e8d1df>${ssrInterpolate(personName(item))}</strong><small data-v-ui-0dbb46e8d1df>${ssrInterpolate(item.email)}`);
				if (item.phone) _push(`<!--[--> · ${ssrInterpolate(item.phone)}<!--]-->`);
				else _push(`<!---->`);
				_push(`</small></span></span><span data-v-ui-0dbb46e8d1df><em data-v-ui-0dbb46e8d1df class="${ssrRenderClass([item.accountType.toLowerCase(), "crm-badge"])}">${ssrInterpolate(item.accountType === "STAFF" ? "Сотрудник" : item.accountType === "B2B" ? "B2B" : "B2C")}</em><small data-v-ui-0dbb46e8d1df>${ssrInterpolate(roleLabels[item.role])}</small></span><span data-v-ui-0dbb46e8d1df>${ssrInterpolate(item.b2bProfile?.companyName || item.organizationMemberships?.[0]?.organization?.name || "—")}</span><span data-v-ui-0dbb46e8d1df>${ssrInterpolate(item._count.sessions)}</span><span data-v-ui-0dbb46e8d1df${ssrRenderAttr("data-status", item.isActive ? "ACTIVE" : "SUSPENDED")} class="${ssrRenderClass([item.isActive ? "state-active" : "state-blocked", "crm-badge"])}">${ssrInterpolate(item.isActive ? "Активна" : "Заблокирована")}</span></button>`);
			});
			_push(`<!--]-->`);
			if (unref(hasLoaded) && !unref(result).items.length && !unref(busy)) {
				_push(`<div data-v-ui-0dbb46e8d1df class="empty">`);
				_push(ssrRenderComponent(unref(Users), {
					"data-v-ui-0dbb46e8d1df": "",
					size: 26
				}, null, _parent));
				_push(`<span data-v-ui-0dbb46e8d1df>Учётные записи не найдены</span></div>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(hasLoaded)) {
				_push(`<footer data-v-ui-0dbb46e8d1df><span data-v-ui-0dbb46e8d1df>Показано ${ssrInterpolate(unref(result).items.length)} из ${ssrInterpolate(unref(result).total)}</span><div data-v-ui-0dbb46e8d1df><button class="crm-button" data-v-ui-0dbb46e8d1df${ssrIncludeBooleanAttr(unref(page) <= 1 || unref(busy)) ? " disabled" : ""} aria-label="Предыдущая страница учётных записей">`);
				_push(ssrRenderComponent(unref(ChevronLeft), {
					"data-v-ui-0dbb46e8d1df": "",
					size: 16
				}, null, _parent));
				_push(`</button><b data-v-ui-0dbb46e8d1df>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(result).pages)}</b><button class="crm-button" data-v-ui-0dbb46e8d1df${ssrIncludeBooleanAttr(unref(page) >= unref(result).pages || unref(busy)) ? " disabled" : ""} aria-label="Следующая страница учётных записей">`);
				_push(ssrRenderComponent(unref(ChevronRight), {
					"data-v-ui-0dbb46e8d1df": "",
					size: 16
				}, null, _parent));
				_push(`</button></div></footer>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<div data-v-ui-0dbb46e8d1df class="account-backdrop admin-dialog-backdrop crm-management-backdrop"><aside data-v-ui-0dbb46e8d1df tabindex="-1" class="account-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="account-detail-title"><header data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df><p data-v-ui-0dbb46e8d1df>УЧЁТНАЯ ЗАПИСЬ</p><h2 id="account-detail-title" data-v-ui-0dbb46e8d1df>${ssrInterpolate(personName(unref(selected)))}</h2><span data-v-ui-0dbb46e8d1df>${ssrInterpolate(roleLabels[unref(selected).role])}</span></div><button class="crm-button" data-v-ui-0dbb46e8d1df aria-label="Закрыть учётную запись">`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 19
					}, null, _parent));
					_push(`</button></header><div data-v-ui-0dbb46e8d1df class="drawer-body admin-dialog-body">`);
					if (unref(error)) _push(`<p class="account-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(busy) || unref(mutating)) ? " disabled" : ""}><section data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df class="section-title"><div data-v-ui-0dbb46e8d1df><h3 data-v-ui-0dbb46e8d1df>Контактные данные</h3><p data-v-ui-0dbb46e8d1df>Нажмите «Сохранить данные», чтобы применить изменения. Действие попадёт в журнал аудита.</p></div>`);
					_push(ssrRenderComponent(unref(Users), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 18
					}, null, _parent));
					_push(`</div><div data-v-ui-0dbb46e8d1df class="fields"><label data-v-ui-0dbb46e8d1df><span data-v-ui-0dbb46e8d1df>Имя</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(edit).firstName)}></label><label data-v-ui-0dbb46e8d1df><span data-v-ui-0dbb46e8d1df>Фамилия</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(edit).lastName)}></label><label data-v-ui-0dbb46e8d1df class="wide"><span data-v-ui-0dbb46e8d1df>Email</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(edit).email)} type="email"></label><label data-v-ui-0dbb46e8d1df class="wide"><span data-v-ui-0dbb46e8d1df>Телефон</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(edit).phone)}></label></div><button data-v-ui-0dbb46e8d1df class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || !unref(dirty)) ? " disabled" : ""}>Сохранить данные</button></section><section data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df class="section-title"><div data-v-ui-0dbb46e8d1df><h3 data-v-ui-0dbb46e8d1df>Доступ</h3><p data-v-ui-0dbb46e8d1df>Блокировка немедленно завершает активные сессии.</p></div>`);
					_push(ssrRenderComponent(unref(ShieldCheck), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 18
					}, null, _parent));
					_push(`</div><div data-v-ui-0dbb46e8d1df class="access-state"><span data-v-ui-0dbb46e8d1df><strong data-v-ui-0dbb46e8d1df>${ssrInterpolate(unref(selected).isActive ? "Доступ разрешён" : "Доступ заблокирован")}</strong><small data-v-ui-0dbb46e8d1df>Активных сессий: ${ssrInterpolate(unref(selected)._count.sessions)}</small></span><button class="crm-button" data-v-ui-0dbb46e8d1df${ssrIncludeBooleanAttr(unref(selected).id === unref(user)?.id) ? " disabled" : ""}>`);
					if (unref(selected).isActive) _push(ssrRenderComponent(unref(UserRoundX), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					else _push(ssrRenderComponent(unref(UserRoundCheck), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					_push(`${ssrInterpolate(unref(selected).isActive ? "Заблокировать" : "Разблокировать")}</button></div></section><section data-v-ui-0dbb46e8d1df><div data-v-ui-0dbb46e8d1df class="section-title"><div data-v-ui-0dbb46e8d1df><h3 data-v-ui-0dbb46e8d1df>Восстановление пароля</h3><p data-v-ui-0dbb46e8d1df>Пароли никогда не отображаются и не отправляются в открытом виде.</p></div>`);
					_push(ssrRenderComponent(unref(KeyRound), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 18
					}, null, _parent));
					_push(`</div><button data-v-ui-0dbb46e8d1df class="secondary full crm-button">`);
					_push(ssrRenderComponent(unref(Link2), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					_push(`Создать одноразовую ссылку</button>`);
					if (unref(resetInfo)) {
						_push(`<div data-v-ui-0dbb46e8d1df class="reset-link"><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(resetInfo).resetUrl)} aria-label="Одноразовая ссылка восстановления пароля" readonly><button class="crm-button" data-v-ui-0dbb46e8d1df title="Копировать">`);
						_push(ssrRenderComponent(unref(Clipboard), {
							"data-v-ui-0dbb46e8d1df": "",
							size: 16
						}, null, _parent));
						_push(`</button><small data-v-ui-0dbb46e8d1df>Действует до ${ssrInterpolate(new Date(unref(resetInfo).expiresAt).toLocaleString("ru-RU"))}. Отправка письмом появится после подключения почтового провайдера.</small></div>`);
					} else _push(`<!---->`);
					_push(`<div data-v-ui-0dbb46e8d1df class="temp-password"><h4 data-v-ui-0dbb46e8d1df>Или установить временный пароль</h4><label data-v-ui-0dbb46e8d1df><span data-v-ui-0dbb46e8d1df>Ваш пароль администратора</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(temporary).currentAdminPassword)} type="password"></label><label data-v-ui-0dbb46e8d1df><span data-v-ui-0dbb46e8d1df>Временный пароль для пользователя</span><input class="crm-input" data-v-ui-0dbb46e8d1df${ssrRenderAttr("value", unref(temporary).temporaryPassword)} type="password" placeholder="Не менее 10 символов"></label><button data-v-ui-0dbb46e8d1df class="secondary full crm-button"${ssrIncludeBooleanAttr(!unref(temporary).currentAdminPassword || !unref(temporary).temporaryPassword) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(LockKeyhole), {
						"data-v-ui-0dbb46e8d1df": "",
						size: 16
					}, null, _parent));
					_push(`Установить и завершить сессии</button></div></section></fieldset></div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			if (unref(error) && !unref(selected)) _push(`<p data-v-ui-0dbb46e8d1df class="account-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) {
				_push(`<p data-v-ui-0dbb46e8d1df class="account-notice" role="status">`);
				_push(ssrRenderComponent(unref(Check), {
					"data-v-ui-0dbb46e8d1df": "",
					size: 15
				}, null, _parent));
				_push(`${ssrInterpolate(unref(notice))}</p>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/EcosystemAccounts.vue
var _sfc_setup$7 = EcosystemAccounts_vue_vue_type_script_setup_true_lang_default.setup;
EcosystemAccounts_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/EcosystemAccounts.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var EcosystemAccounts_default = Object.assign(EcosystemAccounts_vue_vue_type_script_setup_true_lang_default, { __name: "EcosystemAccounts" });
// components/EcosystemTrash.vue?vue&type=script&setup=true&lang.ts
var EcosystemTrash_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "EcosystemTrash",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const { token } = useWorkspaceSession();
		const entries = ref([]), selected = ref(null), preview = ref(null);
		const type = ref(""), search = ref(""), page = ref(1), pages = ref(1), total = ref(0);
		const loading = ref(false), detailLoading = ref(false), actionBusy = ref(false);
		const hasLoaded = ref(false);
		const busy = computed(() => loading.value || detailLoading.value || actionBusy.value);
		const error = ref(""), notice = ref(""), confirmation = ref(""), adminPassword = ref("");
		let timer, listVersion = 0, listController;
		const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const types = [
			{
				id: "",
				label: "Все данные",
				icon: Trash2
			},
			{
				id: "USER",
				label: "Учётные записи",
				icon: ContactRound
			},
			{
				id: "CUSTOMER",
				label: "Клиенты",
				icon: Users
			},
			{
				id: "ORGANIZATION",
				label: "Организации",
				icon: Building2
			},
			{
				id: "PRODUCT",
				label: "Товары",
				icon: Box
			},
			{
				id: "CATEGORY",
				label: "Категории",
				icon: Box
			}
		];
		const typeLabels = {
			USER: "Учётная запись",
			CUSTOMER: "Клиент",
			ORGANIZATION: "Организация B2B",
			PRODUCT: "Товар",
			CATEGORY: "Категория"
		};
		const visibleDependencies = computed(() => (preview.value?.dependencies || []).filter((item) => item.count !== 0));
		const canRestore = computed(() => !busy.value && selected.value?.canRestore === true && preview.value?.canRestore === true);
		const canPurge = computed(() => !busy.value && preview.value?.canPurge === true && confirmation.value === selected.value?.displayName && !!adminPassword.value);
		async function load() {
			const version = ++listVersion, identity = token.value;
			listController?.abort();
			listController = new AbortController();
			loading.value = true;
			error.value = "";
			try {
				const result = await $fetch$1("/data-lifecycle/trash", {
					baseURL: config.public.apiBase,
					headers: headers.value,
					signal: listController.signal,
					query: {
						type: type.value || void 0,
						search: search.value || void 0,
						page: page.value,
						limit: 50
					}
				});
				if (version !== listVersion || token.value !== identity) return;
				entries.value = result.items;
				total.value = result.total;
				pages.value = result.pages || 1;
				hasLoaded.value = true;
			} catch (e) {
				if (version === listVersion) {
					entries.value = [];
					error.value = messageOf(e);
				}
			} finally {
				if (version === listVersion) loading.value = false;
			}
		}
		function messageOf(e) {
			return e?.data?.message || "Не удалось выполнить действие. Обновите данные.";
		}
		function daysLeft(value) {
			return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 864e5));
		}
		watch(type, () => {
			page.value = 1;
			load();
		});
		watch(search, () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				page.value = 1;
				load();
			}, 350);
		});
		onBeforeRouteLeave(() => !actionBusy.value);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-fb6b400b9590": "",
				class: "trash-workspace"
			}, _attrs))}><aside data-v-ui-fb6b400b9590 class="trash-types"><label class="trash-type-select">Тип данных<select class="crm-input" aria-label="Тип данных в корзине"><!--[-->`);
			ssrRenderList(types, (item) => {
				_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(type)) ? ssrLooseContain(unref(type), item.id) : ssrLooseEqual(unref(type), item.id)) ? " selected" : ""}>${ssrInterpolate(item.label)}</option>`);
			});
			_push(`<!--]--></select></label><div class="trash-type-options"><header data-v-ui-fb6b400b9590><p data-v-ui-fb6b400b9590>ФИЛЬТР</p><h2 data-v-ui-fb6b400b9590>Тип данных</h2></header><!--[-->`);
			ssrRenderList(types, (item) => {
				_push(`<button data-v-ui-fb6b400b9590 class="${ssrRenderClass([{ active: unref(type) === item.id }, "crm-button"])}">`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(item.icon), {
					"data-v-ui-fb6b400b9590": "",
					size: 16
				}, null), _parent);
				_push(`<span data-v-ui-fb6b400b9590>${ssrInterpolate(item.label)}</span></button>`);
			});
			_push(`<!--]--><div data-v-ui-fb6b400b9590 class="retention">`);
			_push(ssrRenderComponent(unref(Clock3), {
				"data-v-ui-fb6b400b9590": "",
				size: 18
			}, null, _parent));
			_push(`<span data-v-ui-fb6b400b9590><strong data-v-ui-fb6b400b9590>Не менее 30 дней</strong><small data-v-ui-fb6b400b9590>Автоматического удаления нет. После срока хранения администратор может удалить запись вручную, если нет связанных данных.</small></span></div></div></aside><main data-v-ui-fb6b400b9590 class="trash-card crm-standard"><header data-v-ui-fb6b400b9590><div data-v-ui-fb6b400b9590><p data-v-ui-fb6b400b9590>БЕЗОПАСНОЕ УДАЛЕНИЕ</p><h2 data-v-ui-fb6b400b9590>Объекты в корзине</h2><span data-v-ui-fb6b400b9590>${ssrInterpolate(unref(hasLoaded) ? unref(total) : "—")} объектов в доступной области</span></div><div data-v-ui-fb6b400b9590 class="actions"><label class="crm-input-group" data-v-ui-fb6b400b9590>`);
			_push(ssrRenderComponent(unref(Search), {
				"data-v-ui-fb6b400b9590": "",
				size: 16
			}, null, _parent));
			_push(`<input class="crm-input" data-v-ui-fb6b400b9590${ssrRenderAttr("value", unref(search))} placeholder="Поиск по названию"></label><button class="crm-button crm-button--refresh" data-v-ui-fb6b400b9590 title="Обновить">`);
			_push(ssrRenderComponent(unref(RefreshCw), {
				"data-v-ui-fb6b400b9590": "",
				size: 16,
				class: { spin: unref(busy) }
			}, null, _parent));
			_push(`</button></div></header><div data-v-ui-fb6b400b9590 class="trash-table"><div data-v-ui-fb6b400b9590 class="trash-row head crm-table-head"><span data-v-ui-fb6b400b9590>Объект</span><span data-v-ui-fb6b400b9590>Тип</span><span data-v-ui-fb6b400b9590>Удалил</span><span data-v-ui-fb6b400b9590>Срок хранения</span><span data-v-ui-fb6b400b9590></span></div><!--[-->`);
			ssrRenderList(unref(entries), (entry) => {
				_push(`<button data-v-ui-fb6b400b9590 class="trash-row crm-button crm-table-row crm-card-action"><span data-v-ui-fb6b400b9590><i data-v-ui-fb6b400b9590>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(types.find((item) => item.id === entry.entityType)?.icon || unref(Trash2)), {
					"data-v-ui-fb6b400b9590": "",
					size: 16
				}, null), _parent);
				_push(`</i><span data-v-ui-fb6b400b9590><strong data-v-ui-fb6b400b9590>${ssrInterpolate(entry.displayName)}</strong><small data-v-ui-fb6b400b9590>${ssrInterpolate(entry.reason || "Причина не указана")}</small></span></span><span data-v-ui-fb6b400b9590>${ssrInterpolate(typeLabels[entry.entityType] || entry.entityType)}</span><span data-v-ui-fb6b400b9590>${ssrInterpolate([entry.actor?.firstName, entry.actor?.lastName].filter(Boolean).join(" ") || entry.actor?.email || "Система")}</span><span data-v-ui-fb6b400b9590><b data-v-ui-fb6b400b9590>${ssrInterpolate(daysLeft(entry.purgeAfter))}</b> дн.</span>`);
				_push(ssrRenderComponent(unref(RotateCcw), {
					"data-v-ui-fb6b400b9590": "",
					size: 16
				}, null, _parent));
				_push(`</button>`);
			});
			_push(`<!--]-->`);
			if (unref(hasLoaded) && !unref(entries).length && !unref(busy)) {
				_push(`<div data-v-ui-fb6b400b9590 class="empty">`);
				_push(ssrRenderComponent(unref(Trash2), {
					"data-v-ui-fb6b400b9590": "",
					size: 30
				}, null, _parent));
				_push(`<strong data-v-ui-fb6b400b9590>Корзина пуста</strong><span data-v-ui-fb6b400b9590>Удалённые объекты появятся здесь и будут доступны для восстановления.</span></div>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(hasLoaded)) _push(`<footer class="crm-action-bar"><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(pages))}</span><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(page) <= 1) ? " disabled" : ""}>Назад</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy) || unref(page) >= unref(pages)) ? " disabled" : ""}>Далее</button></footer>`);
			else _push(`<!---->`);
			_push(`</main>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<div class="trash-backdrop admin-dialog-backdrop crm-detail-backdrop"><aside class="trash-drawer admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="trash-detail-title"><header><div><p class="crm-muted">${ssrInterpolate(typeLabels[unref(selected).entityType])}</p><h2 id="trash-detail-title">${ssrInterpolate(unref(selected).displayName)}</h2><span class="crm-muted">В корзине с ${ssrInterpolate(new Date(unref(selected).trashedAt).toLocaleString("ru-RU"))}</span></div><button class="crm-button crm-button--icon" aria-label="Закрыть карточку корзины"${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), { size: 19 }, null, _parent));
					_push(`</button></header><div class="crm-detail-body crm-stack">`);
					if (unref(detailLoading)) _push(`<p class="crm-muted">Проверяем состояние и права…</p>`);
					else _push(`<!---->`);
					if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					if (unref(preview)?.canRestore && unref(selected).canRestore) {
						_push(`<section class="restore-block crm-detail-section"><h3 class="crm-icon-heading">`);
						_push(ssrRenderComponent(unref(RotateCcw), null, null, _parent));
						_push(`<span>Объект можно восстановить</span></h3><p class="crm-muted">Будет возвращено состояние, которое было до перемещения в корзину.</p><div class="crm-action-bar"><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(!unref(canRestore)) ? " disabled" : ""}>Восстановить</button></div></section>`);
					} else _push(`<!---->`);
					_push(`<section class="crm-detail-section"><h3 class="crm-icon-heading">`);
					_push(ssrRenderComponent(unref(ShieldAlert), null, null, _parent));
					_push(`<span>Связи и последствия</span></h3><p class="crm-muted">При наличии связанных рабочих записей окончательное удаление запрещено.</p>`);
					if (unref(preview)) {
						_push(`<div class="crm-record-list"><!--[-->`);
						ssrRenderList(unref(visibleDependencies), (dependency) => {
							_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(dependency.label)}</strong><small class="crm-muted">${ssrInterpolate(dependency.blocking ? "блокирует удаление" : "не блокирует")}</small></span><b>${ssrInterpolate(dependency.count ?? "Недоступно")}</b></article>`);
						});
						_push(`<!--]-->`);
						if (!unref(visibleDependencies).length) _push(`<p class="crm-muted">Связанных записей нет.</p>`);
						else _push(`<!---->`);
						_push(`</div>`);
					} else _push(`<!---->`);
					_push(`</section><section class="danger-zone crm-detail-section"><h3 class="crm-icon-heading">`);
					_push(ssrRenderComponent(unref(AlertTriangle), null, null, _parent));
					_push(`<span>Окончательное удаление</span></h3><p class="crm-muted">Действие нельзя отменить. Снимки этой записи в корзине также будут очищены.</p>`);
					if (unref(preview) && !unref(preview).canPurge) _push(`<div class="crm-record crm-surface crm-surface--tint" role="note"><span><strong>Удаление сейчас запрещено</strong><small class="crm-muted">Нужны права на изменение, истечение 30 дней хранения и отсутствие блокирующих связей.</small></span></div>`);
					else if (unref(preview)?.canPurge) {
						_push(`<!--[--><label><span>Введите точно: <b>${ssrInterpolate(unref(selected).displayName)}</b></span><input class="crm-input"${ssrRenderAttr("value", unref(confirmation))}${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""}></label><label><span>Пароль администратора</span><input class="crm-input"${ssrRenderAttr("value", unref(adminPassword))}${ssrIncludeBooleanAttr(unref(actionBusy)) ? " disabled" : ""} type="password" autocomplete="current-password"></label><div class="crm-action-bar"><button class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(!unref(canPurge)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
						_push(`Удалить без возможности восстановления</button></div><!--]-->`);
					} else _push(`<!---->`);
					_push(`</section></div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			if (unref(error)) _push(`<p data-v-ui-fb6b400b9590 class="trash-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) {
				_push(`<p data-v-ui-fb6b400b9590 class="trash-notice">`);
				_push(ssrRenderComponent(unref(Check), {
					"data-v-ui-fb6b400b9590": "",
					size: 15
				}, null, _parent));
				_push(`${ssrInterpolate(unref(notice))}</p>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/EcosystemTrash.vue
var _sfc_setup$6 = EcosystemTrash_vue_vue_type_script_setup_true_lang_default.setup;
EcosystemTrash_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/EcosystemTrash.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var EcosystemTrash_default = Object.assign(EcosystemTrash_vue_vue_type_script_setup_true_lang_default, { __name: "EcosystemTrash" });
// components/crm/CrmAccessProfiles.vue?vue&type=script&setup=true&lang.ts
var CrmAccessProfiles_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmAccessProfiles",
	__ssrInlineRender: true,
	setup(__props) {
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const catalog = ref(null), result = ref({
			items: [],
			total: 0,
			page: 1,
			limit: 30
		}), staff = ref([]);
		const loading = ref(false), busy = ref(false), error = ref(""), notice = ref(""), formError = ref("");
		const search = ref(""), archived = ref(false), page = ref(1), permissionSearch = ref(""), template = ref("");
		const mode = ref(null), draft = ref(null), baseline = ref("");
		const preview = ref(null), previewProfile = ref(null), employeeId = ref("");
		const assignment = ref(null);
		const dirty = computed(() => mode.value === "edit" && JSON.stringify(draft.value) !== baseline.value);
		const label = (person) => [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
		const filteredPermissions = computed(() => (catalog.value?.permissions || []).filter((permission) => `${permission.description || ""} ${permission.key}`.toLocaleLowerCase("ru-RU").includes(permissionSearch.value.toLocaleLowerCase("ru-RU"))));
		const reasons = {
			PROFILE: "По профилю",
			COMPANY_LEADERSHIP: "Руководство: вся компания",
			EXPLICIT_DENY: "Сохранённый личный запрет",
			ACCOUNT_UNAVAILABLE: "Учётная запись недоступна",
			UNKNOWN_SCOPE: "Неизвестная область",
			INVALID_DEPARTMENT_SELECTION: "Некорректный выбор отделов",
			SELECTED_DEPARTMENT_UNAVAILABLE: "Выбранный отдел отсутствует или в архиве",
			DEPARTMENT_NOT_ASSIGNED: "Действующий отдел не назначен",
			INVALID_DEPARTMENT_TREE: "Нарушена структура отделов"
		};
		let generation = 0, controller, filterTimer;
		const request = (path, options = {}) => $fetch$1(`/system-settings${path}`, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${session.token.value}` },
			timeout: 15e3,
			retry: 0,
			...options
		});
		const message = (e, fallback) => Array.isArray(e?.data?.message) ? e.data.message.join(". ") : e?.data?.message || fallback;
		async function load() {
			const identity = session.token.value, current = ++generation;
			controller?.abort();
			controller = new AbortController();
			loading.value = true;
			error.value = "";
			try {
				const options = { signal: controller.signal };
				const [nextCatalog, nextResult, nextStaff] = await Promise.all([
					request("/access-profiles/catalog", options),
					request("/access-profiles", {
						...options,
						query: {
							page: page.value,
							search: search.value,
							status: archived.value ? "archived" : "active"
						}
					}),
					request("/staff", options)
				]);
				if (current !== generation || identity !== session.token.value) return;
				catalog.value = nextCatalog;
				result.value = nextResult;
				staff.value = nextStaff;
			} catch (e) {
				if (current === generation && identity === session.token.value) error.value = message(e, "Не удалось загрузить профили доступа");
			} finally {
				if (current === generation) loading.value = false;
			}
		}
		function canLeave() {
			return !busy.value && (!dirty.value || (void 0).confirm("Закрыть профиль без сохранения изменений?"));
		}
		function close() {
			if (canLeave()) {
				mode.value = null;
				draft.value = null;
				preview.value = null;
				formError.value = "";
			}
		}
		useCatalogDialog(computed(() => mode.value !== null), close);
		function grantFor(key) {
			return draft.value?.grants.find((grant) => grant.permissionKey === key);
		}
		function unavailableDepartments(key) {
			return grantFor(key)?.departmentIds.filter((id) => !catalog.value?.departments.some((department) => department.id === id)) || [];
		}
		function filters() {
			page.value = 1;
			clearTimeout(filterTimer);
			filterTimer = setTimeout(load, 250);
		}
		watch([search, archived], filters);
		watch(employeeId, () => {
			preview.value = null;
			assignment.value = null;
			formError.value = "";
		});
		watch(() => session.token.value, () => {
			++generation;
			controller?.abort();
			mode.value = null;
			draft.value = null;
			preview.value = null;
			catalog.value = null;
			result.value = {
				items: [],
				total: 0
			};
			staff.value = [];
			if (session.token.value) load();
		});
		onBeforeRouteLeave(canLeave);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "crm-stack",
				"aria-label": "Профили доступа"
			}, _attrs))}><div class="crm-surface crm-register crm-stack"><h2>Настраиваемые профили доступа</h2><p role="note">${ssrInterpolate(unref(catalog)?.message)} Базовая роль по-прежнему определяет доступные рабочие разделы.</p><div class="crm-action-bar"><button class="crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading) || unref(busy)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(`Обновить профили</button><button class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(loading) || unref(busy) || !unref(catalog)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
			_push(`Новый профиль</button></div><label class="crm-input-group">`);
			_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
			_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" aria-label="Поиск профилей доступа" placeholder="Название профиля"></label><label class="crm-toggle-row"><span>Архив профилей</span><input${ssrIncludeBooleanAttr(Array.isArray(unref(archived)) ? ssrLooseContain(unref(archived), null) : unref(archived)) ? " checked" : ""} class="crm-check" type="checkbox"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label></div>`);
			if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			if (unref(loading)) _push(`<p role="status">Загружаем профили доступа…</p>`);
			else _push(`<!---->`);
			if (!unref(loading) && !unref(error)) {
				_push(`<div class="crm-record-list"><!--[-->`);
				ssrRenderList(unref(result).items, (item) => {
					_push(`<article class="crm-item-card crm-record"><span><strong>${ssrInterpolate(item.name)}</strong><small>${ssrInterpolate(item.description || "Без описания")}</small><small>${ssrInterpolate(item._count.grants)} разрешений · ${ssrInterpolate(item.archivedAt ? "В архиве" : "Действующий")} · версия ${ssrInterpolate(item.version)}</small></span>`);
					if (!item.archivedAt) {
						_push(`<!--[--><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Изменить</button><button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(ShieldCheck), { size: 18 }, null, _parent));
						_push(`Проверить и назначить</button><button class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Создать копию: ${item.name}`)}>`);
						_push(ssrRenderComponent(unref(Copy), { size: 18 }, null, _parent));
						_push(`</button><button class="crm-button crm-button--danger"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>В архив</button><!--]-->`);
					} else _push(`<button class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Восстановить</button>`);
					_push(`</article>`);
				});
				_push(`<!--]-->`);
				if (!unref(result).items.length) _push(`<p class="crm-empty">${ssrInterpolate(unref(search) ? "По этому названию ничего не найдено." : unref(archived) ? "Архив профилей пуст." : "Создайте первый профиль с нужными операциями и областью доступа.")}</p>`);
				else _push(`<!---->`);
				if (unref(result).total > unref(result).limit) {
					_push(`<nav class="crm-pagination" aria-label="Страницы проектов"><button class="crm-button crm-button--icon" aria-label="Предыдущая страница проектов"${ssrIncludeBooleanAttr(unref(busy) || unref(page) <= 1) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ChevronLeft), { size: 18 }, null, _parent));
					_push(`</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(Math.ceil(unref(result).total / unref(result).limit))}</span><button class="crm-button crm-button--icon" aria-label="Следующая страница проектов"${ssrIncludeBooleanAttr(unref(busy) || unref(page) * unref(result).limit >= unref(result).total) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 18 }, null, _parent));
					_push(`</button></nav>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(mode)) {
					_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><form class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="access-profile-title" tabindex="-1"><header><div><p class="crm-eyebrow">ПРОФИЛЬ ДОСТУПА</p><h2 id="access-profile-title">${ssrInterpolate(unref(mode) === "preview" ? "Предварительная проверка" : unref(draft)?.id ? "Редактировать профиль" : "Новый профиль")}</h2></div><button type="button" class="crm-button crm-button--icon"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть профиль">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
					if (unref(formError)) _push(`<p role="alert">${ssrInterpolate(unref(formError))}</p>`);
					else _push(`<!---->`);
					if (unref(mode) === "edit" && unref(draft)) {
						_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><label class="crm-field">Полное название роли<input${ssrRenderAttr("value", unref(draft).name)} class="crm-input" required maxlength="80" placeholder="Например, SMM-специалист"></label><label class="crm-field">Назначение профиля<textarea class="crm-input" rows="2" maxlength="1000" placeholder="Какие задачи выполняет эта роль">${ssrInterpolate(unref(draft).description)}</textarea></label><section class="crm-detail-section"><label class="crm-field">Шаблон операций<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(template)) ? ssrLooseContain(unref(template), "") : ssrLooseEqual(unref(template), "")) ? " selected" : ""}>Без шаблона</option><!--[-->`);
						ssrRenderList(unref(catalog).templates, (item) => {
							_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(template)) ? ssrLooseContain(unref(template), item.id) : ssrLooseEqual(unref(template), item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)}</option>`);
						});
						_push(`<!--]--></select></label><button type="button" class="crm-button"${ssrIncludeBooleanAttr(!unref(template)) ? " disabled" : ""}>Применить шаблон</button><p>Шаблон выбирает операции. Проверьте область каждой операции; для поддерживаемых операций по умолчанию — свои записи, для остальных — вся компания.</p></section><h3>Разрешения · ${ssrInterpolate(unref(draft).grants.length)}</h3><label class="crm-input-group">`);
						_push(ssrRenderComponent(unref(Search), { size: 18 }, null, _parent));
						_push(`<input${ssrRenderAttr("value", unref(permissionSearch))} class="crm-input" aria-label="Поиск операций" placeholder="Найти операцию"></label><!--[-->`);
						ssrRenderList(unref(filteredPermissions), (permission) => {
							_push(`<article class="crm-item-card crm-register crm-stack"><label class="crm-toggle-row"><span class="crm-stack"><strong>${ssrInterpolate(permission.description || permission.key)}</strong><small>${ssrInterpolate(permission.key)}</small></span><input type="checkbox" class="crm-check"${ssrRenderAttr("aria-label", `Разрешить: ${permission.description || permission.key}`)}${ssrIncludeBooleanAttr(!!grantFor(permission.key)) ? " checked" : ""}></label>`);
							if (grantFor(permission.key)) {
								_push(`<!--[--><label class="crm-field">Область действия<select class="crm-input"${ssrRenderAttr("aria-label", `Область: ${permission.description || permission.key}`)}${ssrRenderAttr("value", grantFor(permission.key).scope)}><!--[-->`);
								ssrRenderList(unref(catalog).scopes.filter((item) => item.id === "COMPANY" || unref(catalog).scopedPermissions?.includes(permission.key)), (scope) => {
									_push(`<option${ssrRenderAttr("value", scope.id)}>${ssrInterpolate(scope.label)}</option>`);
								});
								_push(`<!--]--></select></label>`);
								if (grantFor(permission.key).scope === "SELECTED_DEPARTMENTS") {
									_push(`<fieldset class="ui-fieldset-reset crm-stack"><legend>Выбранные отделы</legend>`);
									if (unavailableDepartments(permission.key).length) _push(`<!--[--><p role="alert">Некоторые выбранные отделы больше недоступны. Удалите их из проекта и выберите действующие.</p><button type="button" class="crm-button">Убрать недоступные отделы</button><!--]-->`);
									else _push(`<!---->`);
									_push(`<!--[-->`);
									ssrRenderList(unref(catalog).departments, (department) => {
										_push(`<label class="crm-toggle-row"><span>${ssrInterpolate(department.name)}</span><input${ssrIncludeBooleanAttr(Array.isArray(grantFor(permission.key).departmentIds) ? ssrLooseContain(grantFor(permission.key).departmentIds, department.id) : grantFor(permission.key).departmentIds) ? " checked" : ""} class="crm-check" type="checkbox"${ssrRenderAttr("value", department.id)}></label>`);
									});
									_push(`<!--]-->`);
									if (!unref(catalog).departments.length) _push(`<p>Сначала создайте действующие отделы в настройках CRM.</p>`);
									else _push(`<!---->`);
									_push(`</fieldset>`);
								} else _push(`<!---->`);
								_push(`<!--]-->`);
							} else _push(`<!---->`);
							_push(`</article>`);
						});
						_push(`<!--]-->`);
						if (!unref(filteredPermissions).length) _push(`<p>Операции не найдены. Выбранные разрешения сохранены в форме.</p>`);
						else _push(`<!---->`);
						_push(`</fieldset>`);
					} else _push(`<!---->`);
					if (unref(mode) === "preview") {
						_push(`<!--[--><section class="crm-detail-section"><h3>${ssrInterpolate(unref(previewProfile).name)}</h3><p>Проверьте операции и области, затем назначьте эту версию сотруднику. Назначение заменит прежний набор профилей.</p></section><label class="crm-field">Сотрудник для проверки<select class="crm-input"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(employeeId)) ? ssrLooseContain(unref(employeeId), "") : ssrLooseEqual(unref(employeeId), "")) ? " selected" : ""}>Выберите сотрудника</option><!--[-->`);
						ssrRenderList(unref(staff), (person) => {
							_push(`<option${ssrRenderAttr("value", person.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(employeeId)) ? ssrLooseContain(unref(employeeId), person.id) : ssrLooseEqual(unref(employeeId), person.id)) ? " selected" : ""}>${ssrInterpolate(label(person))}</option>`);
						});
						_push(`<!--]--></select></label>`);
						if (unref(preview)) {
							_push(`<section class="crm-detail-section" aria-label="Результат предварительной проверки"><p role="note">${ssrInterpolate(unref(preview).message)}</p><!--[-->`);
							ssrRenderList(unref(preview).decisions, (decision) => {
								_push(`<article class="crm-item-card crm-register crm-stack"><strong>${ssrInterpolate(decision.description)}</strong><small>${ssrInterpolate(decision.permissionKey)}</small><span>${ssrInterpolate(decision.allowed ? "Разрешено в расчёте" : "Не разрешено в расчёте")}</span><!--[-->`);
								ssrRenderList(decision.grants, (grant) => {
									_push(`<div class="crm-stack"><span>${ssrInterpolate(reasons[grant.reason] || "Правило не определено")}${ssrInterpolate(grant.effectiveScope ? " · " + unref(catalog).scopes.find((scope) => scope.id === grant.effectiveScope)?.label : "")}</span>`);
									if (grant.resolvedDepartmentIds.length) _push(`<small>${ssrInterpolate(grant.resolvedDepartmentIds.map((id) => unref(preview).departments.find((department) => department.id === id)?.name || id).join(", "))}</small>`);
									else _push(`<!---->`);
									_push(`</div>`);
								});
								_push(`<!--]--></article>`);
							});
							_push(`<!--]-->`);
							if (!unref(preview).decisions.length) _push(`<p>В профиле не выбрано ни одной операции. Он не выдаёт разрешений.</p>`);
							else _push(`<!---->`);
							_push(`</section>`);
						} else _push(`<!---->`);
						if (unref(preview) && unref(assignment)) {
							_push(`<section class="crm-detail-section crm-stack"><h3>Действующий доступ</h3><p>${ssrInterpolate(unref(assignment).accessProfileMode ? "Назначенные профили" : "Штатная роль и личные разрешения")}</p><!--[-->`);
							ssrRenderList(unref(assignment).accessAssignments, (item) => {
								_push(`<p>${ssrInterpolate(item.snapshot.name)} · версия ${ssrInterpolate(item.profileVersion)}</p>`);
							});
							_push(`<!--]-->`);
							if (unref(preview).employee.role === "ADMIN") _push(`<p>Администраторы сохраняют отдельную роль управления системой.</p>`);
							else {
								_push(`<div class="crm-action-bar"><button type="button" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Назначить проверенный профиль</button>`);
								if (unref(assignment).accessProfileMode) _push(`<button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Вернуть права штатной роли</button>`);
								else _push(`<!---->`);
								_push(`</div>`);
							}
							_push(`</section>`);
						} else _push(`<!---->`);
						_push(`<!--]-->`);
					} else _push(`<!---->`);
					_push(`</div><footer class="crm-detail-footer"><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>Отмена</button><button type="submit" class="crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(busy) || (unref(mode) === "edit" ? !unref(draft)?.name.trim() || !!unref(draft)?.id && !unref(dirty) : !unref(employeeId))) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Подождите…" : unref(mode) === "edit" ? "Сохранить профиль" : "Рассчитать доступ")}</button></footer></form></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
			_push(`</section>`);
		};
	}
});
// components/crm/CrmAccessProfiles.vue
var _sfc_setup$5 = CrmAccessProfiles_vue_vue_type_script_setup_true_lang_default.setup;
CrmAccessProfiles_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmAccessProfiles.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var CrmAccessProfiles_default = Object.assign(CrmAccessProfiles_vue_vue_type_script_setup_true_lang_default, { __name: "CrmAccessProfiles" });
// components/IntegrationBrandLogo.vue?vue&type=script&setup=true&lang.ts
var IntegrationBrandLogo_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "IntegrationBrandLogo",
	__ssrInlineRender: true,
	props: {
		provider: {},
		size: {}
	},
	setup(__props) {
		const props = __props;
		const failed = ref(false);
		const brands = {
			OZON: {
				src: "/crm/brands/ozon.svg",
				label: "OZON"
			},
			OZON_LOGISTICS: {
				src: "/crm/brands/ozon_logistics.svg",
				label: "OZON"
			},
			WILDBERRIES: {
				src: "/crm/brands/wildberries.svg",
				label: "WB"
			},
			YANDEX_MARKET: {
				src: "/crm/brands/yandex_market.svg",
				label: "Я"
			},
			YANDEX_DELIVERY: {
				src: "/crm/brands/yandex_delivery.svg",
				label: "Я"
			},
			CDEK: {
				src: "/crm/brands/cdek.svg",
				label: "CDEK",
				full: true
			},
			ONE_C: {
				src: "/crm/brands/one_c.svg",
				label: "1C"
			},
			YOOKASSA: {
				src: "/crm/brands/yookassa.svg",
				label: "ЮK"
			},
			TBANK: {
				src: "",
				label: "Т"
			},
			ROBOKASSA: {
				src: "",
				label: "Р"
			},
			CLOUDKASSIR: {
				src: "/crm/brands/cloudkassir.png",
				label: "CK"
			},
			SMS_AERO: {
				src: "/crm/brands/sms_aero.svg",
				label: "SMS"
			},
			TELEGRAM: {
				src: "/crm/brands/telegram.svg",
				label: "TG"
			},
			MAX: {
				src: "/crm/brands/max.svg",
				label: "MAX"
			},
			VK: {
				src: "/crm/brands/vk.svg",
				label: "VK"
			},
			VK_ID: {
				src: "/storefront/icons/vk-id.svg",
				label: "VK ID"
			},
			YANDEX_ID: {
				src: "/storefront/icons/yandex-id.svg",
				label: "Яндекс ID"
			}
		};
		const brand = computed(() => brands[props.provider]);
		watch(() => brand.value?.src, () => {
			failed.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<span${ssrRenderAttrs(mergeProps({
				"data-v-ui-5a4be72ea064": "",
				class: ["brand-logo", { "brand-logo--full": unref(brand)?.full }],
				"data-provider": __props.provider,
				style: __props.size ? { "--brand-logo-size": `${__props.size}px` } : void 0,
				title: unref(brand)?.label || __props.provider
			}, _attrs))}>`);
			if (unref(brand) && unref(brand).src && !unref(failed)) _push(`<img data-v-ui-5a4be72ea064${ssrRenderAttr("src", unref(brand).src)}${ssrRenderAttr("alt", unref(brand).label)} referrerpolicy="no-referrer">`);
			else if (unref(brand)) _push(`<strong data-v-ui-5a4be72ea064 class="brand-logo-label">${ssrInterpolate(unref(brand).label)}</strong>`);
			else _push(ssrRenderComponent(unref(Bot), { "data-v-ui-5a4be72ea064": "" }, null, _parent));
			_push(`</span>`);
		};
	}
});
// components/IntegrationBrandLogo.vue
var _sfc_setup$4 = IntegrationBrandLogo_vue_vue_type_script_setup_true_lang_default.setup;
IntegrationBrandLogo_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/IntegrationBrandLogo.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var IntegrationBrandLogo_default = Object.assign(IntegrationBrandLogo_vue_vue_type_script_setup_true_lang_default, { __name: "IntegrationBrandLogo" });
// components/EcosystemIntegrations.vue?vue&type=script&setup=true&lang.ts
var EcosystemIntegrations_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "EcosystemIntegrations",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		const { token } = useWorkspaceSession();
		useContextMenu();
		const integrations = ref([]);
		const loading = ref(true);
		const loaded = ref(false);
		const saving = ref(false);
		const selected = ref(null);
		useCatalogDialog(computed(() => Boolean(selected.value)), () => close());
		const draft = reactive({
			config: {},
			secrets: {},
			clearSecrets: []
		});
		const baseline = ref("");
		const dirty = computed(() => Boolean(selected.value) && JSON.stringify(draft) !== baseline.value);
		const category = ref("ALL");
		const categoryTabs = ref(null);
		function revealCategory() {
			const nav = categoryTabs.value;
			const button = nav?.querySelector("button.active");
			if (!nav || !button) return;
			const left = button.offsetLeft - nav.offsetLeft;
			if (left < nav.scrollLeft) nav.scrollLeft = left;
			else if (left + button.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = left + button.offsetWidth - nav.clientWidth;
		}
		watch(category, () => nextTick(revealCategory));
		const audience = ref("ALL");
		const search = ref("");
		const notice = ref("");
		const error = ref("");
		const paymentResultUrl = computed(() => {
			return "";
		});
		const categories = [
			{
				id: "ALL",
				label: "Все"
			},
			{
				id: "MARKETPLACE",
				label: "Маркетплейсы"
			},
			{
				id: "DELIVERY",
				label: "Доставка"
			},
			{
				id: "ERP",
				label: "1С и учёт"
			},
			{
				id: "PAYMENT",
				label: "Оплата"
			},
			{
				id: "FISCAL",
				label: "Онлайн-касса"
			},
			{
				id: "COMMUNICATION",
				label: "Сообщения"
			},
			{
				id: "BOT",
				label: "Боты"
			}
		];
		const audienceLabels = {
			EMPLOYEE: "Сотрудники",
			B2C: "B2C",
			B2B: "B2B"
		};
		const statusLabels = {
			NOT_CONFIGURED: "Требует настройки",
			DISABLED: "Выключена",
			CONFIGURED: "Настроена",
			CONNECTED: "Подключена",
			ERROR: "Ошибка"
		};
		const courseFiscalOptions = {
			courseFiscalMode: [{
				value: "PROVIDER",
				label: "Онлайн-касса платёжного провайдера"
			}],
			courseTaxation: [
				{
					value: "osn",
					label: "Общая система налогообложения"
				},
				{
					value: "usn_income",
					label: "УСН: доходы"
				},
				{
					value: "usn_income_outcome",
					label: "УСН: доходы минус расходы"
				},
				{
					value: "esn",
					label: "Единый сельскохозяйственный налог"
				},
				{
					value: "patent",
					label: "Патент"
				}
			],
			courseTax: [
				{
					value: "none",
					label: "Без НДС"
				},
				{
					value: "vat0",
					label: "НДС 0%"
				},
				{
					value: "vat5",
					label: "НДС 5%"
				},
				{
					value: "vat7",
					label: "НДС 7%"
				},
				{
					value: "vat10",
					label: "НДС 10%"
				},
				{
					value: "vat22",
					label: "НДС 22%"
				},
				{
					value: "vat105",
					label: "НДС 5/105"
				},
				{
					value: "vat107",
					label: "НДС 7/107"
				},
				{
					value: "vat110",
					label: "НДС 10/110"
				},
				{
					value: "vat122",
					label: "НДС 22/122"
				}
			],
			coursePaymentMethod: [{
				value: "full_payment",
				label: "Полный расчёт"
			}],
			coursePaymentObject: [
				{
					value: "service",
					label: "Услуга"
				},
				{
					value: "intellectual_activity",
					label: "Результат интеллектуальной деятельности"
				},
				{
					value: "another",
					label: "Иной предмет расчёта"
				}
			],
			courseFiscalConfirmed: [{
				value: "YES",
				label: "Сверено с бухгалтером"
			}]
		};
		const categoryLabels = Object.fromEntries(categories.map((item) => [item.id, item.label]));
		computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const filtered = computed(() => integrations.value.filter((item) => {
			if (category.value !== "ALL" && item.category !== category.value) return false;
			if (audience.value !== "ALL" && item.audience !== audience.value) return false;
			const query = search.value.trim().toLowerCase();
			return !query || `${item.name} ${item.provider} ${item.description}`.toLowerCase().includes(query);
		}));
		const counts = computed(() => ({
			total: integrations.value.length,
			enabled: integrations.value.filter((item) => item.isEnabled).length,
			configured: integrations.value.filter((item) => ["CONFIGURED", "CONNECTED"].includes(item.status)).length,
			attention: integrations.value.filter((item) => item.isEnabled && ["NOT_CONFIGURED", "ERROR"].includes(item.status)).length
		}));
		function close(force = false) {
			if (force !== true && (saving.value || dirty.value && !(void 0).confirm("Закрыть без сохранения настроек?"))) return false;
			selected.value = null;
			error.value = "";
			draft.secrets = {};
			draft.clearSecrets = [];
			return true;
		}
		onBeforeRouteLeave(() => !saving.value && (!dirty.value || (void 0).confirm("Уйти без сохранения настроек интеграции?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_IntegrationBrandLogo = IntegrationBrandLogo_default;
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-1e872dee0e70": "",
				class: "integration-settings"
			}, _attrs))}>`);
			if (unref(loading) && !unref(loaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем настройки…" }, null, _parent));
			else if (unref(error) && !unref(loaded)) _push(`<div class="crm-management-error" role="alert"><p>${ssrInterpolate(unref(error))}</p><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></div>`);
			else _push(`<!---->`);
			if (unref(loaded)) _push(`<div data-v-ui-1e872dee0e70 class="integration-kpis"><article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Подключений в реестре</span><strong data-v-ui-1e872dee0e70>${ssrInterpolate(unref(counts).total)}</strong><small data-v-ui-1e872dee0e70>все каналы экосистемы</small></article><article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Включено</span><strong data-v-ui-1e872dee0e70>${ssrInterpolate(unref(counts).enabled)}</strong><small data-v-ui-1e872dee0e70>участвуют в процессах</small></article><article class="crm-surface" data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Настроено</span><strong data-v-ui-1e872dee0e70>${ssrInterpolate(unref(counts).configured)}</strong><small data-v-ui-1e872dee0e70>обязательные поля заполнены</small></article><article data-v-ui-1e872dee0e70 class="${ssrRenderClass([{ warn: unref(counts).attention }, "crm-surface"])}"><span data-v-ui-1e872dee0e70>Требуют внимания</span><strong data-v-ui-1e872dee0e70>${ssrInterpolate(unref(counts).attention)}</strong><small data-v-ui-1e872dee0e70>включены без полной настройки</small></article></div>`);
			else _push(`<!---->`);
			if (unref(loaded)) {
				_push(`<article data-v-ui-1e872dee0e70 class="registry panel crm-surface"><header data-v-ui-1e872dee0e70 class="registry-head"><div data-v-ui-1e872dee0e70><p data-v-ui-1e872dee0e70 class="kicker">ЦЕНТР ПОДКЛЮЧЕНИЙ</p><h2 data-v-ui-1e872dee0e70>Интеграции экосистемы</h2><span data-v-ui-1e872dee0e70>Ключи хранятся зашифрованно и не возвращаются из API.</span></div><div data-v-ui-1e872dee0e70 class="registry-actions"><label class="crm-input-group" data-v-ui-1e872dee0e70>`);
				_push(ssrRenderComponent(unref(Search), {
					"data-v-ui-1e872dee0e70": "",
					size: 15
				}, null, _parent));
				_push(`<input class="crm-input" data-v-ui-1e872dee0e70${ssrRenderAttr("value", unref(search))} placeholder="Найти подключение"></label><button class="crm-button crm-button--refresh" data-v-ui-1e872dee0e70>`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-1e872dee0e70": "",
					size: 15,
					class: { spin: unref(loading) }
				}, null, _parent));
				_push(` Обновить</button></div></header><nav data-v-ui-1e872dee0e70 class="category-tabs" aria-label="Категории интеграций"><!--[-->`);
				ssrRenderList(categories, (item) => {
					_push(`<button type="button" data-v-ui-1e872dee0e70 class="${ssrRenderClass([{ active: unref(category) === item.id }, "crm-button"])}"${ssrRenderAttr("aria-pressed", unref(category) === item.id)}>${ssrInterpolate(item.label)}</button>`);
				});
				_push(`<!--]--></nav>`);
				if (unref(category) === "BOT" || unref(audience) !== "ALL") {
					_push(`<div data-v-ui-1e872dee0e70 class="audience-filter"><span data-v-ui-1e872dee0e70>Аудитория бота</span><!--[-->`);
					ssrRenderList([
						{
							id: "ALL",
							label: "Все"
						},
						{
							id: "EMPLOYEE",
							label: "Сотрудники"
						},
						{
							id: "B2C",
							label: "B2C"
						},
						{
							id: "B2B",
							label: "B2B"
						}
					], (item) => {
						_push(`<button data-v-ui-1e872dee0e70 class="${ssrRenderClass([{ active: unref(audience) === item.id }, "crm-button"])}">${ssrInterpolate(item.label)}</button>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (unref(loading)) _push(`<div data-v-ui-1e872dee0e70 class="loading-state">Загружаем реестр подключений…</div>`);
				else {
					_push(`<div data-v-ui-1e872dee0e70 class="integration-grid"><!--[-->`);
					ssrRenderList(unref(filtered), (item) => {
						_push(`<button data-v-ui-1e872dee0e70 class="integration-card crm-button crm-card-action crm-surface crm-item-card">`);
						_push(ssrRenderComponent(_component_IntegrationBrandLogo, { provider: item.provider }, null, _parent));
						_push(`<span data-v-ui-1e872dee0e70 class="integration-copy"><span data-v-ui-1e872dee0e70 class="card-title"><strong data-v-ui-1e872dee0e70>${ssrInterpolate(item.name)}</strong>`);
						if (item.audience) _push(`<em data-v-ui-1e872dee0e70>${ssrInterpolate(audienceLabels[item.audience])}</em>`);
						else _push(`<!---->`);
						_push(`</span><small data-v-ui-1e872dee0e70>${ssrInterpolate(item.description)}</small><span data-v-ui-1e872dee0e70 class="field-state"><i data-v-ui-1e872dee0e70 class="${ssrRenderClass(`state-${item.status.toLowerCase()}`)}"></i>${ssrInterpolate(statusLabels[item.status])} · ${ssrInterpolate(item.environment === "PRODUCTION" ? "рабочий режим" : "тестовый режим")}</span></span>`);
						_push(ssrRenderComponent(unref(ChevronRight), {
							"data-v-ui-1e872dee0e70": "",
							size: 18
						}, null, _parent));
						_push(`</button>`);
					});
					_push(`<!--]-->`);
					if (!unref(filtered).length) _push(`<p data-v-ui-1e872dee0e70 class="empty">Подключения по выбранному фильтру не найдены.</p>`);
					else _push(`<!---->`);
					_push(`</div>`);
				}
				if (unref(error) && !unref(selected)) _push(`<p data-v-ui-1e872dee0e70 class="form-error">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`</article>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<aside data-v-ui-1e872dee0e70 class="drawer-backdrop admin-dialog-backdrop crm-management-backdrop"><form data-v-ui-1e872dee0e70 tabindex="-1" class="integration-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-label="Настройки интеграции"><header data-v-ui-1e872dee0e70>`);
					_push(ssrRenderComponent(_component_IntegrationBrandLogo, {
						provider: unref(selected).provider,
						size: 42
					}, null, _parent));
					_push(`<div data-v-ui-1e872dee0e70><p data-v-ui-1e872dee0e70 class="kicker">${ssrInterpolate(unref(categoryLabels)[unref(selected).category])}</p><h2 data-v-ui-1e872dee0e70>${ssrInterpolate(unref(selected).name)}</h2>`);
					if (unref(selected).audience) _push(`<small data-v-ui-1e872dee0e70>Аудитория: ${ssrInterpolate(audienceLabels[unref(selected).audience])}</small>`);
					else _push(`<!---->`);
					_push(`</div><button data-v-ui-1e872dee0e70 type="button" class="close crm-button crm-button--icon" aria-label="Закрыть интеграцию">`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-1e872dee0e70": "",
						size: 18
					}, null, _parent));
					_push(`</button></header><div data-v-ui-1e872dee0e70 class="drawer-scroll admin-dialog-body"><p data-v-ui-1e872dee0e70 class="drawer-description">${ssrInterpolate(unref(selected).description)}</p>`);
					if (unref(selected).key === "ROBOKASSA") _push(`<p class="drawer-description">Укажите рабочие и тестовые пароли № 1 и № 2 одного магазина из личного кабинета Робокассы. Тестовые пароли должны отличаться от рабочих. В каждом режиме используется своя пара; для рабочего режима нужны обе пары.</p>`);
					else _push(`<!---->`);
					if (unref(paymentResultUrl)) _push(`<p class="drawer-description">Адрес уведомлений об оплате: <strong>${ssrInterpolate(unref(paymentResultUrl))}</strong> <button class="crm-button" type="button">Копировать</button>. Проверка заполнения не подтверждает, что платёж и чек работают.</p>`);
					else _push(`<!---->`);
					if (["ROBOKASSA", "TBANK"].includes(unref(selected).key)) _push(`<p class="drawer-description">Для продажи курсов укажите данные ИП и параметры чека, согласованные с бухгалтером. Проверьте, что этот терминал и касса оформлены на указанного ИП. Пока данные не заполнены и не сверены, оплата курсов через этот способ недоступна.</p>`);
					else _push(`<!---->`);
					if (["ROBOKASSA", "TBANK"].includes(unref(selected).key)) _push(`<p class="drawer-description">Сейчас поддерживается только полный расчёт. Не выбирайте его, пока бухгалтер не подтвердит, что он подходит для продажи курса: второй чек для предоплаты ещё не подключён.</p>`);
					else _push(`<!---->`);
					_push(`<div data-v-ui-1e872dee0e70 class="mode-row"><label data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>Режим</span><select class="crm-input" data-v-ui-1e872dee0e70><option data-v-ui-1e872dee0e70 value="TEST"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).environment) ? ssrLooseContain(unref(draft).environment, "TEST") : ssrLooseEqual(unref(draft).environment, "TEST")) ? " selected" : ""}>Тестовый</option><option data-v-ui-1e872dee0e70 value="PRODUCTION"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).environment) ? ssrLooseContain(unref(draft).environment, "PRODUCTION") : ssrLooseEqual(unref(draft).environment, "PRODUCTION")) ? " selected" : ""}>Рабочий</option></select></label><label data-v-ui-1e872dee0e70 class="switch-line crm-toggle-row"><span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Подключение включено</b><small data-v-ui-1e872dee0e70>Разрешить фоновые процессы</small></span><input class="crm-check" data-v-ui-1e872dee0e70${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isEnabled) ? ssrLooseContain(unref(draft).isEnabled, null) : unref(draft).isEnabled) ? " checked" : ""} type="checkbox"></label></div><div data-v-ui-1e872dee0e70 class="security-note">`);
					_push(ssrRenderComponent(unref(KeyRound), {
						"data-v-ui-1e872dee0e70": "",
						size: 17
					}, null, _parent));
					_push(`<span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Безопасное хранение</b><small data-v-ui-1e872dee0e70>Секреты шифруются AES-256-GCM. После сохранения их нельзя прочитать через интерфейс.</small></span></div><section data-v-ui-1e872dee0e70 class="fields"><h3 data-v-ui-1e872dee0e70>Параметры подключения</h3><!--[-->`);
					ssrRenderList(unref(selected).fields, (field) => {
						_push(`<label data-v-ui-1e872dee0e70><span data-v-ui-1e872dee0e70>${ssrInterpolate(field.label)} `);
						if (field.required) _push(`<b data-v-ui-1e872dee0e70>обязательно</b>`);
						else _push(`<!---->`);
						_push(`</span>`);
						if (field.type !== "secret" && field.key === "webhookUrl") {
							_push(`<span data-v-ui-1e872dee0e70 class="webhook-input"><input class="crm-input" data-v-ui-1e872dee0e70${ssrRenderAttr("value", unref(draft).config[field.key])} type="url"${ssrRenderAttr("placeholder", field.placeholder || "")}><button class="crm-button" data-v-ui-1e872dee0e70 type="button" title="Копировать адрес">`);
							_push(ssrRenderComponent(unref(Copy), {
								"data-v-ui-1e872dee0e70": "",
								size: 14
							}, null, _parent));
							_push(`</button></span>`);
						} else if (unref(selected).key === "ROBOKASSA" && field.key === "signatureAlgorithm") _push(`<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "") : ssrLooseEqual(unref(draft).config[field.key], "")) ? " selected" : ""}>Выберите алгоритм из кабинета Робокассы</option><option value="SHA256"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "SHA256") : ssrLooseEqual(unref(draft).config[field.key], "SHA256")) ? " selected" : ""}>SHA-256</option><option value="SHA512"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "SHA512") : ssrLooseEqual(unref(draft).config[field.key], "SHA512")) ? " selected" : ""}>SHA-512</option><option value="MD5"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "MD5") : ssrLooseEqual(unref(draft).config[field.key], "MD5")) ? " selected" : ""}>MD5</option></select>`);
						else if (["ROBOKASSA", "TBANK"].includes(unref(selected).key) && field.key === "fiscalMode") _push(`<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "") : ssrLooseEqual(unref(draft).config[field.key], "")) ? " selected" : ""}>Выберите способ фискализации</option><option value="EXTERNAL"${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "EXTERNAL") : ssrLooseEqual(unref(draft).config[field.key], "EXTERNAL")) ? " selected" : ""}>Чеки настроены вне платёжной формы</option></select>`);
						else if (["ROBOKASSA", "TBANK"].includes(unref(selected).key) && courseFiscalOptions[field.key]) {
							_push(`<select class="crm-input"><option value=""${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], "") : ssrLooseEqual(unref(draft).config[field.key], "")) ? " selected" : ""}>Выберите после сверки с бухгалтером</option><!--[-->`);
							ssrRenderList(courseFiscalOptions[field.key], (option) => {
								_push(`<option${ssrRenderAttr("value", option.value)}${ssrIncludeBooleanAttr(Array.isArray(unref(draft).config[field.key]) ? ssrLooseContain(unref(draft).config[field.key], option.value) : ssrLooseEqual(unref(draft).config[field.key], option.value)) ? " selected" : ""}>${ssrInterpolate(option.label)}</option>`);
							});
							_push(`<!--]--></select>`);
						} else if (field.type !== "secret") _push(`<input class="crm-input" data-v-ui-1e872dee0e70${ssrRenderDynamicModel(field.type === "url" ? "url" : field.type === "number" ? "number" : "text", unref(draft).config[field.key], null)}${ssrRenderAttr("type", field.type === "url" ? "url" : field.type === "number" ? "number" : "text")}${ssrRenderAttr("placeholder", field.placeholder || "")}>`);
						else {
							_push(`<span data-v-ui-1e872dee0e70 class="secret-input"><input class="crm-input" data-v-ui-1e872dee0e70${ssrRenderAttr("value", unref(draft).secrets[field.key])} type="password" autocomplete="new-password"${ssrRenderAttr("placeholder", field.configured && !unref(draft).clearSecrets.includes(field.key) ? "Сохранено ••••••••" : "Введите секрет")}>`);
							if (field.configured) _push(`<button data-v-ui-1e872dee0e70 type="button" class="${ssrRenderClass([{ danger: unref(draft).clearSecrets.includes(field.key) }, "crm-button"])}">${ssrInterpolate(unref(draft).clearSecrets.includes(field.key) ? "Отменить удаление" : "Удалить ключ")}</button>`);
							else _push(`<!---->`);
							_push(`</span>`);
						}
						if (field.hint) _push(`<small data-v-ui-1e872dee0e70>${ssrInterpolate(field.hint)}</small>`);
						else _push(`<!---->`);
						_push(`</label>`);
					});
					_push(`<!--]--></section><a data-v-ui-1e872dee0e70 class="docs-link"${ssrRenderAttr("href", unref(selected).documentationUrl)} target="_blank" rel="noopener noreferrer">`);
					_push(ssrRenderComponent(unref(ExternalLink), {
						"data-v-ui-1e872dee0e70": "",
						size: 15
					}, null, _parent));
					_push(` Открыть документацию ${ssrInterpolate(unref(selected).provider)}</a>`);
					if (unref(selected).lastTestMessage) {
						_push(`<div data-v-ui-1e872dee0e70 class="last-check"${ssrRenderAttr("data-status", unref(selected).status)}>`);
						if (unref(selected).status === "ERROR") _push(ssrRenderComponent(unref(CircleAlert), { size: 17 }, null, _parent));
						else _push(ssrRenderComponent(unref(CheckCircle2), {
							"data-v-ui-1e872dee0e70": "",
							size: 17
						}, null, _parent));
						_push(`<span data-v-ui-1e872dee0e70><b data-v-ui-1e872dee0e70>Последняя проверка</b><small data-v-ui-1e872dee0e70>${ssrInterpolate(unref(selected).lastTestMessage)}`);
						if (unref(selected).lastTestAt) _push(`<!--[--> · ${ssrInterpolate(new Date(unref(selected).lastTestAt).toLocaleString("ru-RU"))}<!--]-->`);
						else _push(`<!---->`);
						_push(`</small></span></div>`);
					} else _push(`<!---->`);
					if (unref(error)) {
						_push(`<p data-v-ui-1e872dee0e70 class="form-error">`);
						_push(ssrRenderComponent(unref(CircleAlert), {
							"data-v-ui-1e872dee0e70": "",
							size: 15
						}, null, _parent));
						_push(` ${ssrInterpolate(unref(error))}</p>`);
					} else _push(`<!---->`);
					_push(`</div><footer data-v-ui-1e872dee0e70>`);
					if (unref(selected).key === "ONE_C") {
						_push(`<button class="crm-button crm-button--refresh" data-v-ui-1e872dee0e70 type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
						_push(ssrRenderComponent(unref(RefreshCw), {
							"data-v-ui-1e872dee0e70": "",
							size: 15
						}, null, _parent));
						_push(` Запустить обмен</button>`);
					} else _push(`<!---->`);
					_push(`<button class="crm-button" data-v-ui-1e872dee0e70 type="button"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Check), {
						"data-v-ui-1e872dee0e70": "",
						size: 15
					}, null, _parent));
					_push(` ${ssrInterpolate(unref(selected).key === "ONE_C" ? "Проверить соединение" : "Проверить заполнение")}</button><button data-v-ui-1e872dee0e70 class="primary crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Save), {
						"data-v-ui-1e872dee0e70": "",
						size: 15
					}, null, _parent));
					_push(` ${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить")}</button></footer></form></aside>`);
				} else _push(`<!---->`);
			}, "body", !unref(route).path.startsWith("/crm/"), _parent);
			if (unref(notice)) _push(`<div data-v-ui-1e872dee0e70 class="integration-toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/EcosystemIntegrations.vue
var _sfc_setup$3 = EcosystemIntegrations_vue_vue_type_script_setup_true_lang_default.setup;
EcosystemIntegrations_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/EcosystemIntegrations.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var EcosystemIntegrations_default = Object.assign(EcosystemIntegrations_vue_vue_type_script_setup_true_lang_default, { __name: "EcosystemIntegrations" });
// components/BotCommandsSettings.vue?vue&type=script&setup=true&lang.ts
var BotCommandsSettings_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "BotCommandsSettings",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		const { token } = useWorkspaceSession();
		useContextMenu();
		const commands = ref([]);
		const botActivity = ref({
			items: [],
			identities: 0,
			unlinked: 0,
			statuses: {}
		});
		const loading = ref(true);
		const loaded = ref(false);
		const saving = ref(false);
		const selected = ref(null);
		useCatalogDialog(computed(() => Boolean(selected.value)), () => close());
		const search = ref("");
		const audienceFilter = ref("ALL");
		const channelFilter = ref("ALL");
		const notice = ref("");
		const error = ref("");
		const draft = reactive({});
		const baseline = ref("");
		const dirty = computed(() => Boolean(selected.value) && JSON.stringify(draft) !== baseline.value);
		const audiences = [
			{
				id: "EMPLOYEE",
				label: "Сотрудники"
			},
			{
				id: "B2C",
				label: "B2C-клиенты"
			},
			{
				id: "B2B",
				label: "B2B-клиенты"
			}
		];
		const channels = [
			{
				id: "TELEGRAM",
				label: "Telegram"
			},
			{
				id: "MAX",
				label: "MAX"
			},
			{
				id: "VK",
				label: "VK"
			}
		];
		const audienceLabels = Object.fromEntries(audiences.map((item) => [item.id, item.label]));
		const channelLabels = Object.fromEntries(channels.map((item) => [item.id, item.label]));
		const eventStatusLabels = {
			RECEIVED: "Принято",
			QUEUED: "В очереди",
			PROCESSING: "Обрабатывается",
			REQUIRES_AUTH: "Нужна привязка",
			COMPLETED: "Обработано",
			IGNORED: "Пропущено",
			FAILED: "Ошибка"
		};
		computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const filtered = computed(() => commands.value.filter((item) => {
			if (audienceFilter.value !== "ALL" && !item.audiences.includes(audienceFilter.value)) return false;
			if (channelFilter.value !== "ALL" && !item.channels.includes(channelFilter.value)) return false;
			const query = search.value.trim().toLowerCase();
			return !query || `${item.command} ${item.title} ${item.description || ""}`.toLowerCase().includes(query);
		}));
		const stats = computed(() => ({
			total: commands.value.length,
			enabled: commands.value.filter((item) => item.isEnabled).length,
			public: commands.value.filter((item) => !item.requiresAuth).length,
			protected: commands.value.filter((item) => item.requiresAuth).length
		}));
		function close(force = false) {
			if (force !== true && (saving.value || dirty.value && !(void 0).confirm("Закрыть без сохранения команды?"))) return false;
			selected.value = null;
			error.value = "";
			return true;
		}
		onBeforeRouteLeave(() => !saving.value && (!dirty.value || (void 0).confirm("Уйти без сохранения команды бота?")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_IntegrationBrandLogo = IntegrationBrandLogo_default;
			_push(`<section${ssrRenderAttrs(mergeProps({
				"data-v-ui-4d3f24510037": "",
				class: "command-settings"
			}, _attrs))}>`);
			if (unref(loading) && !unref(loaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем настройки…" }, null, _parent));
			else if (unref(error) && !unref(loaded)) _push(`<div class="crm-management-error" role="alert"><p>${ssrInterpolate(unref(error))}</p><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>Повторить загрузку</button></div>`);
			else _push(`<!---->`);
			if (unref(loaded)) _push(`<div data-v-ui-4d3f24510037 class="command-kpis"><article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Команд</span><strong data-v-ui-4d3f24510037>${ssrInterpolate(unref(stats).total)}</strong><small data-v-ui-4d3f24510037>в общем реестре</small></article><article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Активно</span><strong data-v-ui-4d3f24510037>${ssrInterpolate(unref(stats).enabled)}</strong><small data-v-ui-4d3f24510037>доступны пользователям</small></article><article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Без авторизации</span><strong data-v-ui-4d3f24510037>${ssrInterpolate(unref(stats).public)}</strong><small data-v-ui-4d3f24510037>публичные сценарии</small></article><article class="crm-surface" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>С проверкой профиля</span><strong data-v-ui-4d3f24510037>${ssrInterpolate(unref(stats).protected)}</strong><small data-v-ui-4d3f24510037>привязаны к экосистеме</small></article></div>`);
			else _push(`<!---->`);
			if (unref(loaded)) {
				_push(`<article data-v-ui-4d3f24510037 class="commands-panel"><header data-v-ui-4d3f24510037 class="commands-head"><div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">ЕДИНЫЙ РЕЕСТР СЦЕНАРИЕВ</p><h2 data-v-ui-4d3f24510037>Команды ботов</h2><span data-v-ui-4d3f24510037>Одна команда может работать в нескольких мессенджерах, но только для выбранных аудиторий.</span></div><div data-v-ui-4d3f24510037 class="head-actions"><label class="crm-input-group" data-v-ui-4d3f24510037>`);
				_push(ssrRenderComponent(unref(Search), {
					"data-v-ui-4d3f24510037": "",
					size: 15
				}, null, _parent));
				_push(`<input class="crm-input" data-v-ui-4d3f24510037 id="bot-command-query"${ssrRenderAttr("value", unref(search))} aria-label="Поиск команд ботов" placeholder="Команда или название"></label><button class="crm-button crm-button--refresh crm-button--icon" data-v-ui-4d3f24510037 aria-label="Обновить команды">`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-4d3f24510037": "",
					size: 15,
					class: { spin: unref(loading) }
				}, null, _parent));
				_push(`</button><button data-v-ui-4d3f24510037 class="primary crm-button crm-button--primary">`);
				_push(ssrRenderComponent(unref(Plus), {
					"data-v-ui-4d3f24510037": "",
					size: 15
				}, null, _parent));
				_push(` Новая команда</button></div></header><div data-v-ui-4d3f24510037 class="filters crm-toolbar bot-command-filters"><label>Аудитория<select class="crm-input" aria-label="Аудитория команды"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(audienceFilter)) ? ssrLooseContain(unref(audienceFilter), "ALL") : ssrLooseEqual(unref(audienceFilter), "ALL")) ? " selected" : ""}>Все аудитории</option><!--[-->`);
				ssrRenderList(audiences, (item) => {
					_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(audienceFilter)) ? ssrLooseContain(unref(audienceFilter), item.id) : ssrLooseEqual(unref(audienceFilter), item.id)) ? " selected" : ""}>${ssrInterpolate(item.label)}</option>`);
				});
				_push(`<!--]--></select></label><label>Канал<select class="crm-input" aria-label="Канал команды"><option value="ALL"${ssrIncludeBooleanAttr(Array.isArray(unref(channelFilter)) ? ssrLooseContain(unref(channelFilter), "ALL") : ssrLooseEqual(unref(channelFilter), "ALL")) ? " selected" : ""}>Все каналы</option><!--[-->`);
				ssrRenderList(channels, (item) => {
					_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(channelFilter)) ? ssrLooseContain(unref(channelFilter), item.id) : ssrLooseEqual(unref(channelFilter), item.id)) ? " selected" : ""}>${ssrInterpolate(item.label)}</option>`);
				});
				_push(`<!--]--></select></label>`);
				if (unref(audienceFilter) !== "ALL" || unref(channelFilter) !== "ALL") _push(`<button type="button" class="crm-button">Сбросить фильтры</button>`);
				else _push(`<!---->`);
				_push(`</div><div data-v-ui-4d3f24510037 class="command-table"><div data-v-ui-4d3f24510037 class="command-row head crm-table-head"><span data-v-ui-4d3f24510037>Команда</span><span data-v-ui-4d3f24510037>Аудитории</span><span data-v-ui-4d3f24510037>Каналы</span><span data-v-ui-4d3f24510037>Доступ</span><span data-v-ui-4d3f24510037>Состояние</span><span data-v-ui-4d3f24510037></span></div><!--[-->`);
				ssrRenderList(unref(filtered), (item) => {
					_push(`<div data-v-ui-4d3f24510037 class="command-row"><div data-v-ui-4d3f24510037 class="command-name"><span data-v-ui-4d3f24510037 class="bot-icon">`);
					_push(ssrRenderComponent(unref(Bot), {
						"data-v-ui-4d3f24510037": "",
						size: 17
					}, null, _parent));
					_push(`</span><span data-v-ui-4d3f24510037><code data-v-ui-4d3f24510037>${ssrInterpolate(item.command)}</code><strong data-v-ui-4d3f24510037>${ssrInterpolate(item.title)}</strong><small data-v-ui-4d3f24510037>${ssrInterpolate(item.description || "Описание не задано")}</small></span></div><div data-v-ui-4d3f24510037 class="chips"><!--[-->`);
					ssrRenderList(item.audiences, (value) => {
						_push(`<em data-v-ui-4d3f24510037>${ssrInterpolate(unref(audienceLabels)[value])}</em>`);
					});
					_push(`<!--]--></div><div data-v-ui-4d3f24510037 class="chips channels"><!--[-->`);
					ssrRenderList(item.channels, (value) => {
						_push(`<em data-v-ui-4d3f24510037>${ssrInterpolate(unref(channelLabels)[value])}</em>`);
					});
					_push(`<!--]--></div><span data-v-ui-4d3f24510037 class="access-state">`);
					if (item.requiresAuth) _push(ssrRenderComponent(unref(KeyRound), {
						"data-v-ui-4d3f24510037": "",
						size: 14
					}, null, _parent));
					else _push(ssrRenderComponent(unref(MessageCircleMore), {
						"data-v-ui-4d3f24510037": "",
						size: 14
					}, null, _parent));
					_push(`${ssrInterpolate(item.requiresAuth ? "Нужен профиль" : "Публичная")}</span><span data-v-ui-4d3f24510037 class="${ssrRenderClass(item.isEnabled ? "enabled" : "disabled")}"><i data-v-ui-4d3f24510037></i>${ssrInterpolate(item.isEnabled ? "Включена" : "Выключена")}</span><div data-v-ui-4d3f24510037 class="row-actions"><button class="crm-button" data-v-ui-4d3f24510037 title="Редактировать">`);
					_push(ssrRenderComponent(unref(Pencil), {
						"data-v-ui-4d3f24510037": "",
						size: 14
					}, null, _parent));
					_push(`</button><button class="crm-button" data-v-ui-4d3f24510037 title="Удалить">`);
					_push(ssrRenderComponent(unref(Trash2), {
						"data-v-ui-4d3f24510037": "",
						size: 14
					}, null, _parent));
					_push(`</button></div></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(filtered).length && !unref(loading)) _push(`<p data-v-ui-4d3f24510037 class="empty">Команды по выбранному фильтру не найдены.</p>`);
				else _push(`<!---->`);
				_push(`</div>`);
				if (unref(error) && !unref(selected)) _push(`<p data-v-ui-4d3f24510037 class="form-error">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`</article>`);
			} else _push(`<!---->`);
			if (unref(loaded)) {
				_push(`<article data-v-ui-4d3f24510037 class="activity-panel"><header data-v-ui-4d3f24510037 class="activity-head"><div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">ЖИВОЙ КОНТУР WEBHOOK</p><h2 data-v-ui-4d3f24510037>События и привязки профилей</h2><span data-v-ui-4d3f24510037>Входящие события защищены секретом, дедуплицируются и обрабатываются через очередь.</span></div><div data-v-ui-4d3f24510037 class="activity-summary"><span data-v-ui-4d3f24510037>`);
				_push(ssrRenderComponent(unref(Link2), {
					"data-v-ui-4d3f24510037": "",
					size: 14
				}, null, _parent));
				_push(`<b data-v-ui-4d3f24510037>${ssrInterpolate(unref(botActivity).identities)}</b> профилей</span><span data-v-ui-4d3f24510037 class="${ssrRenderClass({ attention: unref(botActivity).unlinked })}">`);
				_push(ssrRenderComponent(unref(CircleAlert), {
					"data-v-ui-4d3f24510037": "",
					size: 14
				}, null, _parent));
				_push(`<b data-v-ui-4d3f24510037>${ssrInterpolate(unref(botActivity).unlinked)}</b> ждут привязки</span></div></header><div data-v-ui-4d3f24510037 class="activity-table"><div data-v-ui-4d3f24510037 class="activity-row activity-labels"><span data-v-ui-4d3f24510037>Канал</span><span data-v-ui-4d3f24510037>Событие</span><span data-v-ui-4d3f24510037>Пользователь</span><span data-v-ui-4d3f24510037>Результат</span><span data-v-ui-4d3f24510037>Получено</span></div><!--[-->`);
				ssrRenderList(unref(botActivity).items.slice(0, 12), (item) => {
					_push(`<div data-v-ui-4d3f24510037 class="activity-row"><span data-v-ui-4d3f24510037 class="activity-channel">`);
					_push(ssrRenderComponent(_component_IntegrationBrandLogo, {
						provider: item.provider,
						size: 30
					}, null, _parent));
					_push(`<span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>${ssrInterpolate(unref(channelLabels)[item.provider] || item.provider)}</b><small data-v-ui-4d3f24510037>${ssrInterpolate(unref(audienceLabels)[item.audience])}</small></span></span><span data-v-ui-4d3f24510037 class="activity-command"><code data-v-ui-4d3f24510037>${ssrInterpolate(item.commandText || item.eventType || "Системное событие")}</code><small data-v-ui-4d3f24510037>${ssrInterpolate(item.command?.title || item.integration?.name)}</small></span><span data-v-ui-4d3f24510037>${ssrInterpolate(item.externalUserId || "Не определён")}</span><span data-v-ui-4d3f24510037 class="${ssrRenderClass([`event-${item.status.toLowerCase()}`, "event-status"])}"><i data-v-ui-4d3f24510037></i>${ssrInterpolate(eventStatusLabels[item.status] || item.status)}</span><span data-v-ui-4d3f24510037>${ssrInterpolate(new Date(item.receivedAt).toLocaleString("ru-RU"))}</span></div>`);
				});
				_push(`<!--]-->`);
				if (!unref(botActivity).items.length) {
					_push(`<div data-v-ui-4d3f24510037 class="activity-empty">`);
					_push(ssrRenderComponent(unref(Activity), {
						"data-v-ui-4d3f24510037": "",
						size: 22
					}, null, _parent));
					_push(`<b data-v-ui-4d3f24510037>Событий пока нет</b><span data-v-ui-4d3f24510037>Они появятся здесь после подключения webhook в кабинете мессенджера.</span></div>`);
				} else _push(`<!---->`);
				_push(`</div></article>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<aside data-v-ui-4d3f24510037 class="drawer-backdrop admin-dialog-backdrop crm-management-backdrop"><form data-v-ui-4d3f24510037 tabindex="-1" class="command-drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-label="Команда бота"><header data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037 class="bot-icon large">`);
					_push(ssrRenderComponent(unref(Bot), {
						"data-v-ui-4d3f24510037": "",
						size: 20
					}, null, _parent));
					_push(`</span><div data-v-ui-4d3f24510037><p data-v-ui-4d3f24510037 class="kicker">${ssrInterpolate(unref(selected).id ? "РЕДАКТИРОВАНИЕ СЦЕНАРИЯ" : "НОВЫЙ СЦЕНАРИЙ")}</p><h2 data-v-ui-4d3f24510037>${ssrInterpolate(unref(selected).id ? unref(draft).title : "Создать команду")}</h2></div><button data-v-ui-4d3f24510037 type="button" class="close crm-button crm-button--icon" aria-label="Закрыть команду бота">`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-4d3f24510037": "",
						size: 18
					}, null, _parent));
					_push(`</button></header><div data-v-ui-4d3f24510037 class="drawer-scroll admin-dialog-body"><div data-v-ui-4d3f24510037 class="two-fields"><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Команда</span><input class="crm-input" data-v-ui-4d3f24510037${ssrRenderAttr("value", unref(draft).command)} placeholder="/orders" required pattern="/?[a-z0-9_]{2,32}"></label><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Порядок</span><input class="crm-input" data-v-ui-4d3f24510037${ssrRenderAttr("value", unref(draft).sortOrder)} type="number" min="0" max="10000"></label></div><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Название</span><input class="crm-input" data-v-ui-4d3f24510037${ssrRenderAttr("value", unref(draft).title)} required maxlength="80" placeholder="Мои заказы"></label><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Описание</span><textarea class="crm-input" data-v-ui-4d3f24510037 rows="3" maxlength="300" placeholder="Что увидит пользователь после вызова команды">${ssrInterpolate(unref(draft).description)}</textarea></label><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Обработчик</span><input class="crm-input" data-v-ui-4d3f24510037${ssrRenderAttr("value", unref(draft).handlerKey)} required pattern="[A-Z0-9_]{2,64}" placeholder="CUSTOMER_ORDERS"><small data-v-ui-4d3f24510037>Системный код обработчика. Заглавные латинские буквы и подчёркивания.</small></label><section data-v-ui-4d3f24510037 class="choice-section"><h3 data-v-ui-4d3f24510037>Кому доступна команда</h3><!--[-->`);
					ssrRenderList(audiences, (item) => {
						_push(`<button data-v-ui-4d3f24510037 type="button" class="${ssrRenderClass([{ selected: unref(draft).audiences.includes(item.id) }, "crm-button"])}"><span data-v-ui-4d3f24510037>`);
						_push(ssrRenderComponent(unref(ShieldCheck), {
							"data-v-ui-4d3f24510037": "",
							size: 16
						}, null, _parent));
						_push(`${ssrInterpolate(item.label)}</span>`);
						if (unref(draft).audiences.includes(item.id)) _push(ssrRenderComponent(unref(CheckCircle2), {
							"data-v-ui-4d3f24510037": "",
							size: 16
						}, null, _parent));
						else _push(`<!---->`);
						_push(`</button>`);
					});
					_push(`<!--]--></section><section data-v-ui-4d3f24510037 class="choice-section"><h3 data-v-ui-4d3f24510037>В каких ботах работает</h3><!--[-->`);
					ssrRenderList(channels, (item) => {
						_push(`<button data-v-ui-4d3f24510037 type="button" class="${ssrRenderClass([{ selected: unref(draft).channels.includes(item.id) }, "crm-button"])}"><span data-v-ui-4d3f24510037>`);
						_push(ssrRenderComponent(unref(MessageCircleMore), {
							"data-v-ui-4d3f24510037": "",
							size: 16
						}, null, _parent));
						_push(`${ssrInterpolate(item.label)}</span>`);
						if (unref(draft).channels.includes(item.id)) _push(ssrRenderComponent(unref(CheckCircle2), {
							"data-v-ui-4d3f24510037": "",
							size: 16
						}, null, _parent));
						else _push(`<!---->`);
						_push(`</button>`);
					});
					_push(`<!--]--></section><label data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037>Шаблон ответа</span><textarea class="crm-input" data-v-ui-4d3f24510037 rows="5" maxlength="2000" placeholder="Необязательно. Можно использовать подготовленный системный обработчик.">${ssrInterpolate(unref(draft).responseTemplate)}</textarea></label><div data-v-ui-4d3f24510037 class="switches"><label class="crm-toggle-row" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>Требовать авторизацию</b><small data-v-ui-4d3f24510037>Проверять привязку мессенджера к профилю</small></span><input class="crm-check" data-v-ui-4d3f24510037${ssrIncludeBooleanAttr(Array.isArray(unref(draft).requiresAuth) ? ssrLooseContain(unref(draft).requiresAuth, null) : unref(draft).requiresAuth) ? " checked" : ""} type="checkbox"></label><label class="crm-toggle-row" data-v-ui-4d3f24510037><span data-v-ui-4d3f24510037><b data-v-ui-4d3f24510037>Команда включена</b><small data-v-ui-4d3f24510037>Показывать и обрабатывать команду</small></span><input class="crm-check" data-v-ui-4d3f24510037${ssrIncludeBooleanAttr(Array.isArray(unref(draft).isEnabled) ? ssrLooseContain(unref(draft).isEnabled, null) : unref(draft).isEnabled) ? " checked" : ""} type="checkbox"></label></div>`);
					if (unref(error)) {
						_push(`<p data-v-ui-4d3f24510037 class="form-error">`);
						_push(ssrRenderComponent(unref(CircleAlert), {
							"data-v-ui-4d3f24510037": "",
							size: 15
						}, null, _parent));
						_push(`${ssrInterpolate(unref(error))}</p>`);
					} else _push(`<!---->`);
					_push(`</div><footer data-v-ui-4d3f24510037><button class="crm-button" data-v-ui-4d3f24510037 type="button">Отмена</button><button data-v-ui-4d3f24510037 class="primary crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(saving)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Save), {
						"data-v-ui-4d3f24510037": "",
						size: 15
					}, null, _parent));
					_push(`${ssrInterpolate(unref(saving) ? "Сохраняем…" : "Сохранить команду")}</button></footer></form></aside>`);
				} else _push(`<!---->`);
			}, "body", !unref(route).path.startsWith("/crm/"), _parent);
			if (unref(notice)) _push(`<div data-v-ui-4d3f24510037 class="command-toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/BotCommandsSettings.vue
var _sfc_setup$2 = BotCommandsSettings_vue_vue_type_script_setup_true_lang_default.setup;
BotCommandsSettings_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BotCommandsSettings.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var BotCommandsSettings_default = Object.assign(BotCommandsSettings_vue_vue_type_script_setup_true_lang_default, { __name: "BotCommandsSettings" });
// components/crm/CrmEmployeeAccessReview.vue?vue&type=script&setup=true&lang.ts
var CrmEmployeeAccessReview_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CrmEmployeeAccessReview",
	__ssrInlineRender: true,
	props: { employeeId: {} },
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const session = useWorkspaceSession(), config = useRuntimeConfig();
		const result = ref(null), loading = ref(false), error = ref(""), search = ref(""), filter = ref("all");
		const sources = {
			ROLE: "По роли",
			PROFILE: "По назначенному профилю",
			ALLOW: "Личное разрешение",
			DENY: "Личный запрет",
			NOT_GRANTED: "Не выдано",
			BLOCKED_ACCOUNT: "Учётная запись заблокирована"
		};
		const visible = computed(() => (result.value?.permissions || []).filter((item) => (filter.value === "all" || item.allowed === (filter.value === "allowed")) && `${item.description} ${item.key}`.toLocaleLowerCase("ru-RU").includes(search.value.toLocaleLowerCase("ru-RU"))));
		const opened = ref(false);
		useCatalogDialog(computed(() => opened.value), () => emit("close"));
		let version = 0, controller;
		async function load() {
			controller?.abort();
			controller = new AbortController();
			const generation = ++version, identity = session.token.value;
			result.value = null;
			error.value = "";
			loading.value = true;
			try {
				const data = await $fetch$1(`/system-settings/staff/${encodeURIComponent(props.employeeId)}/access-review`, {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${identity}` },
					signal: controller.signal,
					timeout: 15e3
				});
				if (generation === version && identity === session.token.value) result.value = data;
			} catch (e) {
				if (generation === version && identity === session.token.value && !controller.signal.aborted) error.value = e?.data?.message || "Не удалось проверить права. Повторите запрос.";
			} finally {
				if (generation === version) loading.value = false;
			}
		}
		watch(() => `${props.employeeId}:${session.token.value}`, load, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderTeleport(_push, (_push) => {
				_push(`<div class="admin-dialog-backdrop crm-detail-backdrop"><section class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="access-review-title" tabindex="-1"><header><div><p class="crm-eyebrow">ПРОВЕРКА ДОСТУПА</p><h2 id="access-review-title">Права сотрудника</h2></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть проверку прав">`);
				_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
				_push(`</button></header><div class="admin-dialog-body crm-detail-body crm-stack">`);
				if (unref(loading)) _push(`<p role="status">Проверяем сохранённые настройки…</p>`);
				else _push(`<!---->`);
				if (unref(error)) _push(`<p role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				if (unref(result)) {
					_push(`<!--[--><section class="crm-detail-section"><h3 class="crm-icon-heading">`);
					_push(ssrRenderComponent(unref(ShieldCheck), { size: 18 }, null, _parent));
					_push(`<span>${ssrInterpolate([unref(result).employee.firstName, unref(result).employee.lastName].filter(Boolean).join(" ") || unref(result).employee.email)}</span></h3><p>${ssrInterpolate(unref(result).role?.label)}</p><p>${ssrInterpolate(unref(result).role?.description)}</p><p>Отдел: ${ssrInterpolate(unref(result).employee.department?.name || "Не назначен")}</p>`);
					if (!unref(result).employee.isActive) _push(`<p role="alert">Учётная запись заблокирована. Доступ закрыт.</p>`);
					else _push(`<!---->`);
					_push(`<p role="note">${ssrInterpolate(unref(result).dataVisibility.message)}</p><p>Показаны действующие разрешения и источник каждого решения. Личный запрет имеет приоритет.</p></section><label class="crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), {
						size: 18,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`<input${ssrRenderAttr("value", unref(search))} class="crm-input" aria-label="Поиск разрешений" placeholder="Найти разрешение"></label><label class="crm-field">Показать<select class="crm-input"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), "all") : ssrLooseEqual(unref(filter), "all")) ? " selected" : ""}>Все разрешения</option><option value="allowed"${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), "allowed") : ssrLooseEqual(unref(filter), "allowed")) ? " selected" : ""}>Разрешённые</option><option value="denied"${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), "denied") : ssrLooseEqual(unref(filter), "denied")) ? " selected" : ""}>Недоступные</option></select></label><div class="crm-stack" aria-label="Результат проверки прав"><!--[-->`);
					ssrRenderList(unref(visible), (permission) => {
						_push(`<article class="crm-item-card crm-stack crm-register"><strong>${ssrInterpolate(permission.description)}</strong><small>${ssrInterpolate(permission.key)}</small><span>${ssrInterpolate(permission.allowed ? "Разрешено" : "Недоступно")} · ${ssrInterpolate(sources[permission.source] || "Неизвестное правило")}</span></article>`);
					});
					_push(`<!--]-->`);
					if (!unref(visible).length) _push(`<p class="crm-empty">Нет разрешений по выбранному фильтру.</p>`);
					else _push(`<!---->`);
					_push(`</div><!--]-->`);
				} else _push(`<!---->`);
				_push(`</div><footer class="crm-detail-footer"><button type="button" class="crm-button">Закрыть</button><button type="button" class="crm-button"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
				_push(`Проверить снова</button></footer></section></div>`);
			}, "body", false, _parent);
		};
	}
});
// components/crm/CrmEmployeeAccessReview.vue
var _sfc_setup$1 = CrmEmployeeAccessReview_vue_vue_type_script_setup_true_lang_default.setup;
CrmEmployeeAccessReview_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/crm/CrmEmployeeAccessReview.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var CrmEmployeeAccessReview_default = Object.assign(CrmEmployeeAccessReview_vue_vue_type_script_setup_true_lang_default, { __name: "CrmEmployeeAccessReview" });
// components/workspace/SystemWorkspacePage.vue?vue&type=script&setup=true&lang.ts
var SystemWorkspacePage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SystemWorkspacePage",
	__ssrInlineRender: true,
	props: { pageSection: {} },
	setup(__props) {
		const route = useRoute();
		const props = __props;
		const { token, user } = useWorkspaceSession();
		useContextMenu();
		const section = computed(() => props.pageSection || String(route.query.section || "overview"));
		const dashboard = ref(null);
		const staff = ref([]);
		const access = ref({
			roles: [],
			permissions: []
		});
		const accessTab = ref("matrix");
		const audit = ref([]);
		const logs = ref({
			sync: [],
			integrations: [],
			recentAudit: [],
			jobs: [],
			queue: {
				connected: false,
				counts: {}
			}
		});
		const busy = ref(false);
		const mutating = ref(false), mutationError = ref("");
		const loadError = ref("");
		const pageLoaded = ref(false);
		const notice = ref("");
		const retrying = ref([]);
		const search = ref("");
		const showCreate = ref(false);
		const ownsRefresh = computed(() => [
			"overview",
			"staff",
			"access",
			"audit",
			"logs"
		].includes(section.value));
		const selectedEmployeeId = ref("");
		const showAccessReview = ref(false);
		const employee = reactive({
			firstName: "",
			lastName: "",
			email: "",
			password: "",
			role: "MANAGER_SALES"
		});
		const menu = {
			overview: {
				title: "Настройки экосистемы",
				kicker: "УПРАВЛЕНИЕ ПЛАТФОРМОЙ",
				description: "Центральное управление доступом, аудитом и техническим состоянием"
			},
			staff: {
				title: "Сотрудники",
				kicker: "УЧЁТНЫЕ ЗАПИСИ",
				description: "Команда, роли, блокировки и активные сессии"
			},
			accounts: {
				title: "Учётные записи",
				kicker: "ЕДИНЫЙ РЕЕСТР",
				description: "Сотрудники, клиенты B2C, партнёры B2B и восстановление доступа"
			},
			trash: {
				title: "Корзина данных",
				kicker: "ЖИЗНЕННЫЙ ЦИКЛ",
				description: "Восстановление и контролируемое окончательное удаление данных"
			},
			access: {
				title: "Роли и права",
				kicker: "БЕЗОПАСНОСТЬ ДОСТУПА",
				description: "Роли команды и разрешения на рабочие операции"
			},
			integrations: {
				title: "Интеграции",
				kicker: "ЦЕНТР ПОДКЛЮЧЕНИЙ",
				description: "Маркетплейсы, доставка, 1С, платежи, касса, сообщения и боты"
			},
			"bot-commands": {
				title: "Команды ботов",
				kicker: "СЦЕНАРИИ КОММУНИКАЦИЙ",
				description: "Команды Telegram, MAX и VK для сотрудников, B2C и B2B"
			},
			audit: {
				title: "Журнал действий",
				kicker: "АУДИТ ИЗМЕНЕНИЙ",
				description: "Единая история критических действий во всех рабочих пространствах"
			},
			logs: {
				title: "Технические журналы",
				kicker: "СОСТОЯНИЕ ИНТЕГРАЦИЙ",
				description: "Фоновые операции, синхронизации, ошибки и повторы"
			}
		};
		const title = computed(() => {
			const page = menu[section.value] || menu.overview;
			return {
				...page,
				title: crmDestination(route.path)?.label || page.title
			};
		});
		const roleLabels = computed(() => Object.fromEntries(access.value.roles.map((role) => [role, access.value.roleDetails?.find((item) => item.id === role)?.label || role])));
		const actionLabels = {
			LOGIN: "Вход",
			CREATE: "Создание",
			UPDATE: "Изменение",
			ARCHIVE: "Архивация",
			STATUS_CHANGE: "Смена статуса",
			COMMENT: "Комментарий",
			IMPORT: "Импорт",
			TEST: "Проверка"
		};
		const resourceLabels = {
			admin: "Админка сайта",
			crm: "CRM",
			marketplaces: "Маркетплейсы",
			oms: "Заказы",
			inventory: "Товары и остатки",
			helpdesk: "Helpdesk",
			"system-settings": "Настройки экосистемы",
			auth: "Авторизация",
			"1c-sync": "Интеграция 1С"
		};
		const jobLabels = {
			"1C_PRODUCTS_IMPORT": "Импорт товаров из 1С",
			"1C_FULL_EXCHANGE": "Полный обмен с 1С",
			"1C_ORDER_EXPORT": "Выгрузка заказа в 1С",
			BOT_WEBHOOK_PROCESS: "Обработка события бота",
			MARKETPLACE_ORDERS_IMPORT: "Импорт заказов маркетплейсов"
		};
		const jobStatusLabels = {
			WAITING: "В очереди",
			ACTIVE: "Выполняется",
			RETRYING: "Ожидает повтора",
			COMPLETED: "Завершена",
			FAILED: "Ошибка",
			CANCELLED: "Отменена"
		};
		const filteredStaff = computed(() => staff.value.filter((item) => !search.value || `${item.firstName || ""} ${item.lastName || ""} ${item.email} ${roleLabels.value[item.role] || ""}`.toLowerCase().includes(search.value.toLowerCase())));
		computed(() => ({ Authorization: `Bearer ${token.value}` }));
		const createDirty = computed(() => Boolean(employee.firstName || employee.lastName || employee.email || employee.password));
		function closeCreate() {
			if (!mutating.value && (!createDirty.value || (void 0).confirm("Закрыть форму без создания сотрудника?"))) showCreate.value = false;
		}
		useCatalogDialog(computed(() => showCreate.value), closeCreate);
		onBeforeRouteLeave(() => !mutating.value && (!showCreate.value || !createDirty.value || (void 0).confirm("Уйти без создания сотрудника?")));
		function canRetryJob(entry) {
			return !loadError.value && entry.canRetry === true && logs.value.jobs.some((row) => row.id === entry.id && row.canRetry === true) && !busy.value && !retrying.value.includes(entry.id);
		}
		function fieldNames(entry) {
			return entry.payload?.fields?.length ? entry.payload.fields.join(", ") : "без полей";
		}
		watch(section, () => {});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			const _component_EcosystemAccounts = EcosystemAccounts_default;
			const _component_EcosystemTrash = EcosystemTrash_default;
			const _component_CrmCardTabs = CrmCardTabs_default;
			const _component_NuxtLink = NuxtLink;
			const _component_CrmAccessProfiles = CrmAccessProfiles_default;
			const _component_EcosystemIntegrations = EcosystemIntegrations_default;
			const _component_BotCommandsSettings = BotCommandsSettings_default;
			const _component_CrmEmployeeAccessReview = CrmEmployeeAccessReview_default;
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-v-ui-c4cc81726fbf": "",
				class: "system-console crm-standard crm-management-workspace"
			}, _attrs))}><header data-v-ui-c4cc81726fbf class="system-header crm-page-header"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">${ssrInterpolate(unref(title).kicker)}</p><h1 data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(title).title)}</h1><span data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(title).description)}</span></div>`);
			if (unref(ownsRefresh)) {
				_push(`<button class="crm-button crm-button--refresh" data-v-ui-c4cc81726fbf${ssrIncludeBooleanAttr(unref(busy) || unref(mutating)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(RefreshCw), {
					"data-v-ui-c4cc81726fbf": "",
					size: 16,
					class: { spin: unref(busy) }
				}, null, _parent));
				_push(` Обновить </button>`);
			} else _push(`<!---->`);
			_push(`</header>`);
			if (unref(mutationError)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(mutationError))}</p>`);
			else _push(`<!---->`);
			if (unref(busy) && !unref(pageLoaded)) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Загружаем настройки экосистемы" }, null, _parent));
			else if (unref(loadError)) _push(`<div data-v-ui-c4cc81726fbf class="system-body crm-page-content"><p data-v-ui-c4cc81726fbf class="operation-error" role="alert">${ssrInterpolate(unref(loadError))}</p><button class="crm-button" data-v-ui-c4cc81726fbf type="button">Повторить загрузку</button></div>`);
			else if (unref(pageLoaded)) {
				_push(`<div data-v-ui-c4cc81726fbf class="system-body crm-page-content">`);
				if (unref(section) === "overview") {
					_push(`<!--[--><section data-v-ui-c4cc81726fbf class="kpis"><article class="crm-surface" data-v-ui-c4cc81726fbf><span data-v-ui-c4cc81726fbf>Сотрудники</span><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).activeStaff)}<small data-v-ui-c4cc81726fbf>/ ${ssrInterpolate(unref(dashboard).staff)}</small></strong><p data-v-ui-c4cc81726fbf>активных учётных записей</p></article><article class="crm-surface" data-v-ui-c4cc81726fbf><span data-v-ui-c4cc81726fbf>Активные сессии</span><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).sessions)}</strong><p data-v-ui-c4cc81726fbf>входов в рабочие кабинеты</p></article><article class="crm-surface" data-v-ui-c4cc81726fbf><span data-v-ui-c4cc81726fbf>Разрешения</span><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).permissions)}</strong><p data-v-ui-c4cc81726fbf>операций в матрице доступа</p></article><article class="crm-surface" data-v-ui-c4cc81726fbf><span data-v-ui-c4cc81726fbf>Действия сегодня</span><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).auditToday)}</strong><p data-v-ui-c4cc81726fbf>записей в журнале аудита</p></article></section><section data-v-ui-c4cc81726fbf class="overview-grid"><article data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">БЕЗОПАСНОСТЬ</p><h2 data-v-ui-c4cc81726fbf>Контур доступа</h2></div>`);
					_push(ssrRenderComponent(unref(ShieldCheck), {
						"data-v-ui-c4cc81726fbf": "",
						size: 22
					}, null, _parent));
					_push(`</div><div data-v-ui-c4cc81726fbf class="health"><i data-v-ui-c4cc81726fbf></i><span data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>Матрица прав включена</strong><small data-v-ui-c4cc81726fbf>Каждая критическая операция проверяется сервером</small></span></div><div data-v-ui-c4cc81726fbf class="health"><i data-v-ui-c4cc81726fbf></i><span data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>Аудит включён</strong><small data-v-ui-c4cc81726fbf>Изменения получают автора и идентификатор запроса</small></span></div><div data-v-ui-c4cc81726fbf class="health"><i data-v-ui-c4cc81726fbf class="${ssrRenderClass({ warn: unref(dashboard).staff !== unref(dashboard).activeStaff })}"></i><span data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).staff - unref(dashboard).activeStaff)} заблокированных записей</strong><small data-v-ui-c4cc81726fbf>Их активные сессии автоматически отзываются</small></span></div></article><article data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">ИНТЕГРАЦИИ</p><h2 data-v-ui-c4cc81726fbf>Техническое состояние</h2></div>`);
					_push(ssrRenderComponent(unref(Activity), {
						"data-v-ui-c4cc81726fbf": "",
						size: 22
					}, null, _parent));
					_push(`</div><div data-v-ui-c4cc81726fbf class="metric"><span data-v-ui-c4cc81726fbf>Подключённые каналы</span><b data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(dashboard).integrations)}</b></div><div data-v-ui-c4cc81726fbf class="metric"><span data-v-ui-c4cc81726fbf>Операции синхронизации</span><b data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(logs).sync.length)}</b></div><div data-v-ui-c4cc81726fbf class="metric"><span data-v-ui-c4cc81726fbf>Последний аудит</span><b data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(audit)[0] ? new Date(unref(audit)[0].createdAt).toLocaleTimeString("ru-RU", {
						hour: "2-digit",
						minute: "2-digit"
					}) : "—")}</b></div></article></section><!--]-->`);
				} else if (unref(section) === "accounts") _push(ssrRenderComponent(_component_EcosystemAccounts, null, null, _parent));
				else if (unref(section) === "trash") _push(ssrRenderComponent(_component_EcosystemTrash, null, null, _parent));
				else if (unref(section) === "staff") {
					_push(`<section data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">КОМАНДА</p><h2 data-v-ui-c4cc81726fbf>Сотрудники и доступ</h2><span data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(filteredStaff).length)} учётных записей</span></div><div data-v-ui-c4cc81726fbf class="actions"><label data-v-ui-c4cc81726fbf class="search crm-input-group">`);
					_push(ssrRenderComponent(unref(Search), {
						"data-v-ui-c4cc81726fbf": "",
						size: 16
					}, null, _parent));
					_push(`<input class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", unref(search))} type="search" aria-label="Поиск сотрудников" placeholder="Имя, email или роль"></label><button data-v-ui-c4cc81726fbf class="primary crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(mutating) || unref(busy)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(Plus), {
						"data-v-ui-c4cc81726fbf": "",
						size: 16
					}, null, _parent));
					_push(` Добавить </button></div></div><div data-v-ui-c4cc81726fbf class="staff-table"><div data-v-ui-c4cc81726fbf class="staff-row head crm-table-head"><span data-v-ui-c4cc81726fbf>Сотрудник</span><span data-v-ui-c4cc81726fbf>Роль</span><span data-v-ui-c4cc81726fbf>Сессии</span><span data-v-ui-c4cc81726fbf>Состояние</span><span data-v-ui-c4cc81726fbf>Действия</span></div><!--[-->`);
					ssrRenderList(unref(filteredStaff), (item) => {
						_push(`<div data-v-ui-c4cc81726fbf class="staff-row crm-data-row crm-table-row"><div data-v-ui-c4cc81726fbf><i data-v-ui-c4cc81726fbf>${ssrInterpolate((item.firstName || item.email).slice(0, 1).toUpperCase())}</i><span data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>${ssrInterpolate([item.firstName, item.lastName].filter(Boolean).join(" ") || "Без имени")}</strong><small data-v-ui-c4cc81726fbf${ssrRenderAttr("title", item.email)}>${ssrInterpolate(item.email)}</small></span></div><select class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", item.role)}${ssrIncludeBooleanAttr(unref(mutating) || unref(busy) || item.id === unref(user)?.id) ? " disabled" : ""} aria-label="Роль сотрудника"><!--[-->`);
						ssrRenderList(unref(access).roles, (role) => {
							_push(`<option data-v-ui-c4cc81726fbf${ssrRenderAttr("value", role)}>${ssrInterpolate(unref(roleLabels)[role])}</option>`);
						});
						_push(`<!--]--></select><span data-v-ui-c4cc81726fbf>${ssrInterpolate(item._count.sessions)}</span><span data-v-ui-c4cc81726fbf class="${ssrRenderClass(item.isActive ? "active" : "blocked")}">${ssrInterpolate(item.isActive ? "Активен" : "Заблокирован")}</span><div data-v-ui-c4cc81726fbf class="row-actions"><button type="button" class="crm-button" title="Проверить права сотрудника" aria-label="Проверить права сотрудника">`);
						_push(ssrRenderComponent(unref(ShieldCheck), { size: 18 }, null, _parent));
						_push(`</button><button class="crm-button" data-v-ui-c4cc81726fbf${ssrIncludeBooleanAttr(unref(mutating) || unref(busy)) ? " disabled" : ""} title="Отозвать сессии"${ssrRenderAttr("aria-label", "Отозвать сессии: " + (item.firstName || item.email))}>`);
						_push(ssrRenderComponent(unref(KeyRound), {
							"data-v-ui-c4cc81726fbf": "",
							size: 15
						}, null, _parent));
						_push(`</button>`);
						if (item.id !== unref(user)?.id) {
							_push(`<button class="crm-button" data-v-ui-c4cc81726fbf${ssrIncludeBooleanAttr(unref(mutating) || unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-label", (item.isActive ? "Заблокировать: " : "Разблокировать: ") + (item.firstName || item.email))}${ssrRenderAttr("title", item.isActive ? "Заблокировать" : "Разблокировать")}>`);
							if (item.isActive) _push(ssrRenderComponent(unref(UserRoundX), {
								"data-v-ui-c4cc81726fbf": "",
								size: 15
							}, null, _parent));
							else _push(ssrRenderComponent(unref(UserRoundCheck), {
								"data-v-ui-c4cc81726fbf": "",
								size: 15
							}, null, _parent));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`</div></div>`);
					});
					_push(`<!--]--></div>`);
					if (!unref(filteredStaff).length) _push(`<p class="crm-management-empty" role="status">${ssrInterpolate(unref(search) ? "Сотрудники не найдены. Измените запрос." : "Сотрудников пока нет. Добавьте первую учётную запись.")}</p>`);
					else _push(`<!---->`);
					_push(`</section>`);
				} else if (unref(section) === "access") {
					_push(`<section class="crm-stack">`);
					_push(ssrRenderComponent(_component_CrmCardTabs, {
						modelValue: unref(accessTab),
						"onUpdate:modelValue": ($event) => isRef(accessTab) ? accessTab.value = $event : null,
						prefix: "access-settings",
						tabs: [["matrix", "Действующие роли"], ["profiles", "Профили доступа"]],
						label: "Настройка ролей"
					}, null, _parent));
					_push(`<article id="access-settings-matrix-panel" role="tabpanel" aria-labelledby="access-settings-matrix-tab" data-v-ui-c4cc81726fbf class="panel crm-surface" style="${ssrRenderStyle(unref(accessTab) === "matrix" ? null : { display: "none" })}"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">БАЗОВЫЕ ПРАВА</p><h2 data-v-ui-c4cc81726fbf>Матрица ролей</h2><span data-v-ui-c4cc81726fbf>Разрешения каждой роли. Фактические права конкретного человека можно проверить в разделе «Сотрудники».</span></div>`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/crm/settings/staff",
						class: "crm-button"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`Сотрудники`);
							else return [createTextVNode("Сотрудники")];
						}),
						_: 1
					}, _parent));
					_push(`</div><div class="crm-matrix-scroll" role="region" aria-label="Матрица разрешений ролей — горизонтальная прокрутка" tabindex="0"><table class="crm-matrix-table" style="${ssrRenderStyle({ "--crm-matrix-role-count": unref(access).roles.length })}" aria-label="Матрица ролей"><thead><tr><th scope="col">Разрешение</th><!--[-->`);
					ssrRenderList(unref(access).roles, (role) => {
						_push(`<th scope="col">${ssrInterpolate(unref(roleLabels)[role])}</th>`);
					});
					_push(`<!--]--></tr></thead><tbody><!--[-->`);
					ssrRenderList(unref(access).permissions, (permission) => {
						_push(`<tr><th scope="row"><strong>${ssrInterpolate(permission.description)}</strong><small>${ssrInterpolate(permission.resource)} · ${ssrInterpolate(permission.action)}</small></th><!--[-->`);
						ssrRenderList(unref(access).roles, (role) => {
							_push(`<td><span class="crm-matrix-grant"${ssrRenderAttr("data-granted", permission.roles.includes(role))} role="img"${ssrRenderAttr("aria-label", permission.roles.includes(role) ? "Разрешено" : "Не выдано")}>${ssrInterpolate(permission.roles.includes(role) ? "●" : "—")}</span></td>`);
						});
						_push(`<!--]--></tr>`);
					});
					_push(`<!--]--></tbody></table></div><p class="crm-matrix-note">Ранее назначенные личные разрешения и запреты сохранены. Матрица показывает базовые права роли, без этих исключений.</p></article>`);
					if (unref(accessTab) === "profiles") {
						_push(`<section id="access-settings-profiles-panel" role="tabpanel" aria-labelledby="access-settings-profiles-tab">`);
						_push(ssrRenderComponent(_component_CrmAccessProfiles, null, null, _parent));
						_push(`</section>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				} else if (unref(section) === "integrations") _push(ssrRenderComponent(_component_EcosystemIntegrations, null, null, _parent));
				else if (unref(section) === "bot-commands") _push(ssrRenderComponent(_component_BotCommandsSettings, null, null, _parent));
				else if (unref(section) === "audit") {
					_push(`<section data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">ЦЕНТРАЛЬНАЯ ИСТОРИЯ</p><h2 data-v-ui-c4cc81726fbf>Журнал действий</h2><span data-v-ui-c4cc81726fbf>Последние ${ssrInterpolate(unref(audit).length)} записей</span></div></div><div data-v-ui-c4cc81726fbf class="audit-table"><div data-v-ui-c4cc81726fbf class="audit-row head crm-table-head"><span data-v-ui-c4cc81726fbf>Дата</span><span data-v-ui-c4cc81726fbf>Сотрудник</span><span data-v-ui-c4cc81726fbf>Действие</span><span data-v-ui-c4cc81726fbf>Раздел</span><span data-v-ui-c4cc81726fbf>Объект</span><span data-v-ui-c4cc81726fbf>Запрос</span></div><!--[-->`);
					ssrRenderList(unref(audit), (entry) => {
						_push(`<div data-v-ui-c4cc81726fbf class="audit-row crm-data-row crm-table-row"><span data-v-ui-c4cc81726fbf>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</span><div data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>${ssrInterpolate([entry.actor?.firstName, entry.actor?.lastName].filter(Boolean).join(" ") || "Система / клиент")}</strong><small data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.actor?.email || "Без учётной записи")}</small></div><span data-v-ui-c4cc81726fbf>${ssrInterpolate(actionLabels[entry.action] || entry.action)}</span><span data-v-ui-c4cc81726fbf>${ssrInterpolate(resourceLabels[entry.resource] || entry.resource)}</span><span data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.resourceId || "—")}<small data-v-ui-c4cc81726fbf>${ssrInterpolate(fieldNames(entry))}</small></span><code data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.correlationId?.slice(0, 8) || "—")}</code></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(audit).length) _push(`<p data-v-ui-c4cc81726fbf class="empty">Действий пока нет</p>`);
					else _push(`<!---->`);
					_push(`</div></section>`);
				} else {
					_push(`<section data-v-ui-c4cc81726fbf class="logs-grid"><article data-v-ui-c4cc81726fbf class="panel jobs-panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">ФОНОВЫЕ ОПЕРАЦИИ</p><h2 data-v-ui-c4cc81726fbf>Очередь и выполнения</h2><span data-v-ui-c4cc81726fbf>${ssrInterpolate(unref(logs).queue?.connected ? "Redis подключён" : "Redis недоступен")}</span></div><span data-v-ui-c4cc81726fbf class="${ssrRenderClass([{ off: !unref(logs).queue?.connected || unref(logs).queue?.workerEnabled === false }, "queue-health"])}"><i data-v-ui-c4cc81726fbf></i>${ssrInterpolate(!unref(logs).queue?.connected ? "Нет связи" : unref(logs).queue?.workerEnabled === false ? "Автоматика приостановлена" : "Работает")}</span></div><div data-v-ui-c4cc81726fbf class="job-row head crm-table-head crm-responsive-row crm-responsive-head"><span data-v-ui-c4cc81726fbf>Операция</span><span data-v-ui-c4cc81726fbf>Состояние</span><span data-v-ui-c4cc81726fbf>Прогресс</span><span data-v-ui-c4cc81726fbf>Попытки</span><span data-v-ui-c4cc81726fbf>Запущена</span><span data-v-ui-c4cc81726fbf></span></div><!--[-->`);
					ssrRenderList(unref(logs).jobs, (entry) => {
						_push(`<div data-v-ui-c4cc81726fbf class="job-row crm-table-row crm-responsive-row"><div data-v-ui-c4cc81726fbf class="crm-responsive-main"><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(jobLabels[entry.jobName] || entry.jobName)}</strong><small data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.correlationId.slice(0, 8))} · ${ssrInterpolate(entry.retryReason || "Подробные данные скрыты в общем журнале")}</small></div><span data-label="Состояние" data-v-ui-c4cc81726fbf class="${ssrRenderClass([`job-${entry.status.toLowerCase()}`, "crm-responsive-cell"])}">${ssrInterpolate(jobStatusLabels[entry.status] || entry.status)}</span><div class="crm-responsive-cell" data-label="Прогресс"><div data-v-ui-c4cc81726fbf class="job-progress"><i data-v-ui-c4cc81726fbf><em data-v-ui-c4cc81726fbf style="${ssrRenderStyle({ width: `${entry.progress}%` })}"></em></i><b data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.progress)}%</b></div></div><span class="crm-responsive-cell" data-label="Попытки" data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.attempts)} / ${ssrInterpolate(entry.maxAttempts)}</span><time class="crm-responsive-cell" data-label="Запущена" data-v-ui-c4cc81726fbf>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</time>`);
						if (entry.canRetry === true) {
							_push(`<button class="crm-button crm-button--icon crm-responsive-action" data-v-ui-c4cc81726fbf${ssrIncludeBooleanAttr(!canRetryJob(entry)) ? " disabled" : ""} title="Повторить постановку в очередь" aria-label="Повторить постановку в очередь">`);
							_push(ssrRenderComponent(unref(RotateCcw), {
								"data-v-ui-c4cc81726fbf": "",
								size: 14
							}, null, _parent));
							_push(`</button>`);
						} else _push(`<span class="crm-responsive-action" data-v-ui-c4cc81726fbf></span>`);
						_push(`</div>`);
					});
					_push(`<!--]-->`);
					if (!unref(logs).jobs.length) _push(`<p data-v-ui-c4cc81726fbf class="empty"> Фоновых операций пока не запускалось </p>`);
					else _push(`<!---->`);
					_push(`</article><article data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">ОБМЕН ДАННЫМИ</p><h2 data-v-ui-c4cc81726fbf>Журнал синхронизаций</h2></div></div><!--[-->`);
					ssrRenderList(unref(logs).sync, (entry) => {
						_push(`<div data-v-ui-c4cc81726fbf class="log-row crm-data-row"><div data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.system)}</strong><small data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.action)}</small></div><span data-v-ui-c4cc81726fbf class="${ssrRenderClass(entry.status === "SUCCESS" ? "active" : "blocked")}">${ssrInterpolate(entry.status === "SUCCESS" ? "Успешно" : "Ошибка")}</span><time data-v-ui-c4cc81726fbf>${ssrInterpolate(new Date(entry.createdAt).toLocaleString("ru-RU"))}</time></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(logs).sync.length) _push(`<p data-v-ui-c4cc81726fbf class="empty">Синхронизаций пока нет</p>`);
					else _push(`<!---->`);
					_push(`</article><article data-v-ui-c4cc81726fbf class="panel crm-surface"><div data-v-ui-c4cc81726fbf class="panel-head"><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">ВНЕШНИЕ КАНАЛЫ</p><h2 data-v-ui-c4cc81726fbf>Подключения</h2></div></div><!--[-->`);
					ssrRenderList(unref(logs).integrations, (entry) => {
						_push(`<div data-v-ui-c4cc81726fbf class="integration-row"><i data-v-ui-c4cc81726fbf class="${ssrRenderClass({ off: !entry.isActive })}"></i><div data-v-ui-c4cc81726fbf><strong data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.shopName || entry.channel)}</strong><small data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.lastError || "Ошибок не зафиксировано")}</small></div><span data-v-ui-c4cc81726fbf>${ssrInterpolate(entry.isActive ? "Подключено" : "Отключено")}</span></div>`);
					});
					_push(`<!--]-->`);
					if (!unref(logs).integrations.length) _push(`<p data-v-ui-c4cc81726fbf class="empty"> Подключений пока нет </p>`);
					else _push(`<!---->`);
					_push(`</article></section>`);
				}
				_push(`</div>`);
			} else _push(`<!---->`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(showCreate)) {
					_push(`<aside data-v-ui-c4cc81726fbf class="drawer-backdrop admin-dialog-backdrop crm-management-backdrop"><form data-v-ui-c4cc81726fbf tabindex="-1" class="drawer admin-dialog admin-dialog--drawer crm-management-dialog" role="dialog" aria-modal="true" aria-label="Добавить сотрудника"><header data-v-ui-c4cc81726fbf><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">НОВАЯ УЧЁТНАЯ ЗАПИСЬ</p><h2 data-v-ui-c4cc81726fbf>Добавить сотрудника</h2></div><button class="crm-button crm-button--icon" data-v-ui-c4cc81726fbf type="button" aria-label="Закрыть создание сотрудника"${ssrIncludeBooleanAttr(unref(mutating)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(X), {
						"data-v-ui-c4cc81726fbf": "",
						size: 18
					}, null, _parent));
					_push(`</button></header><div data-v-ui-c4cc81726fbf class="admin-dialog-body fields">`);
					if (unref(mutationError)) _push(`<p class="operation-error" role="alert">${ssrInterpolate(unref(mutationError))}</p>`);
					else _push(`<!---->`);
					_push(`<fieldset class="ui-fieldset-reset crm-stack"${ssrIncludeBooleanAttr(unref(mutating)) ? " disabled" : ""}><label data-v-ui-c4cc81726fbf>Имя<input class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", unref(employee).firstName)} required></label><label data-v-ui-c4cc81726fbf>Фамилия<input class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", unref(employee).lastName)}></label><label data-v-ui-c4cc81726fbf>Email<input class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", unref(employee).email)} type="email" required></label><label data-v-ui-c4cc81726fbf>Временный пароль<input class="crm-input" data-v-ui-c4cc81726fbf${ssrRenderAttr("value", unref(employee).password)} type="password" minlength="10" required></label><label data-v-ui-c4cc81726fbf>Роль<select class="crm-input" data-v-ui-c4cc81726fbf><!--[-->`);
					ssrRenderList(unref(access).roles, (role) => {
						_push(`<option data-v-ui-c4cc81726fbf${ssrRenderAttr("value", role)}${ssrIncludeBooleanAttr(Array.isArray(unref(employee).role) ? ssrLooseContain(unref(employee).role, role) : ssrLooseEqual(unref(employee).role, role)) ? " selected" : ""}>${ssrInterpolate(unref(roleLabels)[role])}</option>`);
					});
					_push(`<!--]--></select></label></fieldset></div><footer data-v-ui-c4cc81726fbf><button class="crm-button" data-v-ui-c4cc81726fbf type="button"${ssrIncludeBooleanAttr(unref(mutating)) ? " disabled" : ""}>Отмена</button><button data-v-ui-c4cc81726fbf class="primary crm-button crm-button--primary" type="submit"${ssrIncludeBooleanAttr(unref(mutating)) ? " disabled" : ""}>${ssrInterpolate(unref(mutating) ? "Создаём…" : "Создать сотрудника")}</button></footer></form></aside>`);
				} else _push(`<!---->`);
			}, "body", !unref(route).path.startsWith("/crm/"), _parent);
			if (unref(notice)) _push(`<div data-v-ui-c4cc81726fbf class="toast">${ssrInterpolate(unref(notice))}</div>`);
			else _push(`<!---->`);
			if (unref(showAccessReview) && unref(selectedEmployeeId)) _push(ssrRenderComponent(_component_CrmEmployeeAccessReview, {
				"employee-id": unref(selectedEmployeeId),
				onClose: ($event) => showAccessReview.value = false
			}, null, _parent));
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
// components/workspace/SystemWorkspacePage.vue
var _sfc_setup = SystemWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup;
SystemWorkspacePage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/SystemWorkspacePage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SystemWorkspacePage_default = Object.assign(SystemWorkspacePage_vue_vue_type_script_setup_true_lang_default, { __name: "SystemWorkspacePage" });

export { SystemWorkspacePage_default as S };;globalThis.__timing__.logEnd('Load chunks/build/SystemWorkspacePage-DiH6zXBr');
//# sourceMappingURL=SystemWorkspacePage-DiH6zXBr.mjs.map
