globalThis.__timing__.logStart('Load chunks/build/ContactMessagesWorkspace-DkOv7dhq');import { c as useRoute, a as useWorkspaceSession, b as useWorkspaceAccess, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCatalogDialog } from './useCatalogDialog-2pnsnnsL.mjs';
import { defineComponent, computed, ref, watch, mergeProps, unref, useSSRContext } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderComponent, ssrInterpolate, ssrRenderAttr, ssrLooseContain, ssrRenderList, ssrRenderClass, ssrRenderTeleport } from 'vue/server-renderer';
import { RefreshCw, Mail, Save, Inbox, X, Check } from '@lucide/vue';

// components/workspace/ContactMessagesWorkspace.vue?vue&type=script&setup=true&lang.ts
var ContactMessagesWorkspace_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "ContactMessagesWorkspace",
	__ssrInlineRender: true,
	setup(__props) {
		const config = useRuntimeConfig();
		const route = useRoute();
		const { token, user, generation } = useWorkspaceSession();
		const access = useWorkspaceAccess();
		const canEditSettings = computed(() => ["ADMIN", "SUPERVISOR"].includes(user.value?.role || "") && access.can("crm.write"));
		const canMarkRead = computed(() => access.can("crm.write"));
		const settings = ref(null);
		const recipient = ref("");
		const data = ref(null);
		const selected = ref(null);
		const page = ref(1);
		const unreadOnly = ref(false);
		const loading = ref(false);
		const saving = ref(false);
		const error = ref("");
		const notice = ref("");
		const recipientDirty = computed(() => settings.value != null && recipient.value.trim() !== (settings.value.recipientEmail || ""));
		let loadVersion = 0, loadController;
		function closeMessage() {
			selected.value = null;
		}
		useCatalogDialog(computed(() => Boolean(selected.value)), closeMessage);
		onBeforeRouteLeave(() => !saving.value && (!recipientDirty.value || (void 0).confirm("Уйти без сохранения адреса уведомлений?")));
		const api = (path, options = {}) => $fetch$1(`/admin/contact-messages${path}`, {
			baseURL: config.public.apiBase,
			headers: { Authorization: `Bearer ${token.value}` },
			timeout: 15e3,
			...options
		});
		const date = (value) => new Date(value).toLocaleString("ru-RU", {
			day: "2-digit",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
		const message = (e) => Array.isArray(e?.data?.message) ? e.data.message.join(" · ") : e?.data?.message || "Не удалось загрузить данные. Повторите попытку.";
		async function load() {
			if (!token.value) return;
			const version = ++loadVersion;
			loadController?.abort();
			const controller = new AbortController();
			loadController = controller;
			loading.value = true;
			error.value = "";
			const actorToken = token.value;
			try {
				const [inbox, configResult] = await Promise.all([api("", {
					signal: controller.signal,
					query: {
						page: page.value,
						unread: unreadOnly.value
					}
				}), api("/settings", { signal: controller.signal })]);
				if (version !== loadVersion || token.value !== actorToken) return;
				data.value = inbox;
				const keepRecipient = recipientDirty.value;
				settings.value = configResult;
				if (!saving.value && !keepRecipient) recipient.value = configResult.recipientEmail || "";
				if (selected.value) selected.value = inbox.items.find((item) => item.id === selected.value.id) || selected.value;
			} catch (e) {
				if (version === loadVersion && token.value === actorToken && !controller.signal.aborted) error.value = message(e);
			} finally {
				if (version === loadVersion) loading.value = false;
			}
		}
		async function open(item) {
			selected.value = item;
			if (item.readAt || !canMarkRead.value) return;
			try {
				const updated = await api(`/${item.id}/read`, { method: "PATCH" });
				selected.value = updated;
				if (data.value) {
					data.value.items = data.value.items.map((row) => row.id === item.id ? updated : row);
					data.value.unread = Math.max(0, data.value.unread - 1);
				}
			} catch (e) {
				error.value = message(e);
			}
		}
		watch([page, unreadOnly], () => {
			selected.value = null;
			load();
		});
		watch([() => user.value?.id, generation], () => {
			++loadVersion;
			loadController?.abort();
			data.value = null;
			settings.value = null;
			selected.value = null;
			recipient.value = "";
			if (token.value && user.value?.id) load();
		});
		watch(token, () => {
			if (token.value && user.value?.id) load();
		});
		let targetVersion = 0;
		async function openRequestedMessage() {
			const id = route.query.message, identity = token.value, version = ++targetVersion;
			if (typeof id !== "string" || !id || !identity) return;
			try {
				const item = await api("/" + encodeURIComponent(id));
				if (version === targetVersion && identity === token.value) await open(item);
			} catch (e) {
				if (version === targetVersion && identity === token.value) {
					selected.value = null;
					error.value = message(e);
				}
			}
		}
		watch(() => route.query.message, openRequestedMessage);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({
				class: "contact-inbox crm-standard crm-management-workspace",
				"aria-busy": unref(loading) || unref(saving)
			}, _attrs))}><header class="contact-inbox__head crm-page-header"><div><span class="contact-inbox__eyebrow">МАРКЕТИНГ / САЙТ</span><h1>Сообщения с сайта</h1><p>Обращения из формы на странице «Контакты» — в одном месте.</p></div><button type="button" class="contact-inbox__button crm-button crm-button--refresh"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RefreshCw), { size: 18 }, null, _parent));
			_push(` Обновить</button></header>`);
			if (unref(error)) _push(`<p class="contact-inbox__error" role="alert">${ssrInterpolate(unref(error))}</p>`);
			else _push(`<!---->`);
			if (unref(notice)) _push(`<p class="contact-inbox__notice" role="status">${ssrInterpolate(unref(notice))}</p>`);
			else _push(`<!---->`);
			_push(`<section class="contact-inbox__settings crm-surface" aria-labelledby="contact-inbox-settings-title"><div class="contact-inbox__settings-intro"><span class="contact-inbox__symbol">`);
			_push(ssrRenderComponent(unref(Mail), { size: 22 }, null, _parent));
			_push(`</span><div><h2 id="contact-inbox-settings-title">Уведомления на почту</h2><p>Укажите адрес, куда дублировать новые сообщения. Даже без почтовой доставки обращения сохраняются здесь.</p></div></div><form class="contact-inbox__settings-form"><label for="contact-recipient">Почта получателя</label><div><input class="crm-input" id="contact-recipient"${ssrRenderAttr("value", unref(recipient))} type="email" autocomplete="email" placeholder="manager@example.ru"${ssrIncludeBooleanAttr(!unref(canEditSettings) || unref(saving)) ? " disabled" : ""}>`);
			if (unref(canEditSettings)) {
				_push(`<button type="submit" class="contact-inbox__button contact-inbox__button--dark crm-button crm-button--primary"${ssrIncludeBooleanAttr(unref(saving) || unref(loading) || !unref(settings) || !unref(recipientDirty)) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(Save), { size: 17 }, null, _parent));
				_push(` Сохранить</button>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(recipientDirty)) _push(`<small role="status">Адрес изменён. Сохраните его, чтобы новые уведомления приходили на эту почту.</small>`);
			else _push(`<!---->`);
			if (unref(settings)) _push(`<small>${ssrInterpolate(!unref(settings).recipientEmail ? "Адрес не задан: сообщения остаются только в этом разделе." : unref(settings).deliveryEnabled ? "Почтовая доставка включена. Статус конкретных писем проверяйте в почтовой очереди." : "Почтовая доставка сейчас выключена в конфигурации сервера. Сообщения сохраняются и в админке, и в очереди писем.")}</small>`);
			else _push(`<!---->`);
			_push(`</form></section><section class="contact-inbox__panel crm-surface" aria-labelledby="contact-inbox-list-title"><header class="contact-inbox__panel-head"><div><h2 id="contact-inbox-list-title">Входящие `);
			if (unref(data)) _push(`<span>${ssrInterpolate(unref(data).total)}</span>`);
			else _push(`<!---->`);
			_push(`</h2>`);
			if (unref(data)) _push(`<p>Непрочитанных: ${ssrInterpolate(unref(data).unread)}</p>`);
			else _push(`<!---->`);
			_push(`</div><label class="contact-inbox__filter crm-toggle-row"><input class="crm-check"${ssrIncludeBooleanAttr(Array.isArray(unref(unreadOnly)) ? ssrLooseContain(unref(unreadOnly), null) : unref(unreadOnly)) ? " checked" : ""} type="checkbox"> Только новые</label></header>`);
			if (unref(loading) && !unref(data)) _push(`<p class="contact-inbox__empty" role="status">Загружаем сообщения…</p>`);
			else if (unref(data) && !unref(data).items.length) {
				_push(`<div class="contact-inbox__empty">`);
				_push(ssrRenderComponent(unref(Inbox), { size: 30 }, null, _parent));
				_push(`<strong>${ssrInterpolate(unref(unreadOnly) ? "Новых сообщений нет" : "Сообщений пока нет")}</strong><span>Новые обращения появятся здесь после отправки формы на сайте.</span></div>`);
			} else if (unref(data)) {
				_push(`<div class="contact-inbox__list"><!--[-->`);
				ssrRenderList(unref(data).items, (item) => {
					_push(`<button type="button" class="${ssrRenderClass([{ "is-unread": !item.readAt }, "contact-inbox__row crm-button crm-card-action crm-interactive"])}"><span class="contact-inbox__avatar">${ssrInterpolate(item.name.slice(0, 1).toUpperCase())}</span><span class="contact-inbox__row-body"><strong>${ssrInterpolate(item.name)} `);
					if (!item.readAt) _push(`<span class="contact-inbox__new">Новое</span>`);
					else _push(`<!---->`);
					_push(`</strong><span>${ssrInterpolate(item.message)}</span></span><time${ssrRenderAttr("datetime", item.createdAt)}>${ssrInterpolate(date(item.createdAt))}</time></button>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			if (unref(data) && unref(data).pages > 1) _push(`<footer class="contact-inbox__pagination" role="navigation" aria-label="Страницы сообщений"><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(page) <= 1 || unref(loading)) ? " disabled" : ""}>Назад</button><span>${ssrInterpolate(unref(page))} / ${ssrInterpolate(unref(data).pages)}</span><button class="crm-button" type="button"${ssrIncludeBooleanAttr(unref(page) >= unref(data).pages || unref(loading)) ? " disabled" : ""}>Далее</button></footer>`);
			else _push(`<!---->`);
			_push(`</section>`);
			ssrRenderTeleport(_push, (_push) => {
				if (unref(selected)) {
					_push(`<div class="contact-inbox__backdrop crm-management-backdrop"><section tabindex="-1" class="contact-inbox__detail admin-dialog crm-management-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-inbox-detail-title"><header><div><h2 id="contact-inbox-detail-title">${ssrInterpolate(unref(selected).name)}</h2><time${ssrRenderAttr("datetime", unref(selected).createdAt)}>${ssrInterpolate(date(unref(selected).createdAt))}</time></div><button type="button" class="crm-button crm-button--icon" aria-label="Закрыть обращение">`);
					_push(ssrRenderComponent(unref(X), { size: 18 }, null, _parent));
					_push(`</button></header><div class="admin-dialog-body crm-stack"><div class="contact-inbox__contact">`);
					if (unref(selected).phone) _push(`<a${ssrRenderAttr("href", `tel:${unref(selected).phone.replace(/[^+\d]/g, "")}`)}>${ssrInterpolate(unref(selected).phone)}</a>`);
					else _push(`<!---->`);
					if (unref(selected).email) _push(`<a${ssrRenderAttr("href", `mailto:${unref(selected).email}`)}>${ssrInterpolate(unref(selected).email)}</a>`);
					else _push(`<!---->`);
					_push(`</div><div class="contact-inbox__message">${ssrInterpolate(unref(selected).message)}</div><p class="contact-inbox__delivery">`);
					_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
					_push(` Сообщение сохранено${ssrInterpolate(unref(selected).notificationStatus === "QUEUED" ? " и поставлено в очередь письма" : ". Почтовое уведомление не сформировано")}.</p></div></section></div>`);
				} else _push(`<!---->`);
			}, "body", !unref(route).path.startsWith("/crm/"), _parent);
			_push(`</main>`);
		};
	}
});
// components/workspace/ContactMessagesWorkspace.vue
var _sfc_setup = ContactMessagesWorkspace_vue_vue_type_script_setup_true_lang_default.setup;
ContactMessagesWorkspace_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/workspace/ContactMessagesWorkspace.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var ContactMessagesWorkspace_default = Object.assign(ContactMessagesWorkspace_vue_vue_type_script_setup_true_lang_default, { __name: "ContactMessagesWorkspace" });

export { ContactMessagesWorkspace_default as C };;globalThis.__timing__.logEnd('Load chunks/build/ContactMessagesWorkspace-DkOv7dhq');
//# sourceMappingURL=ContactMessagesWorkspace-DkOv7dhq.mjs.map
