globalThis.__timing__.logStart('Load chunks/build/chat-D6eKPT7r');import { W as WorkspaceLoading_default, a as useWorkspaceSession, j as useState, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { u as useCrmNavigation } from './useCrmNavigation-DNjlvJcr.mjs';
import { defineComponent, mergeProps, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
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
import '@lucide/vue';

// composables/usePlatformChat.ts
var realtime = null;
var unreadVersion = 0;
function usePlatformChat() {
	const config = useRuntimeConfig();
	const { token } = useWorkspaceSession();
	const isOpen = useState("platform-chat-open", () => false);
	const activeChannelId = useState("platform-chat-active-channel", () => "");
	const requestedChannelId = useState("platform-chat-requested-channel", () => "");
	const unread = useState("platform-chat-unread", () => 0);
	const connected = useState("platform-chat-connected", () => false);
	const lastMessage = useState("platform-chat-last-message", () => null);
	const lastChannel = useState("platform-chat-last-channel", () => null);
	const lastReminder = useState("platform-chat-last-reminder", () => null);
	function openChat(channelId) {
		if (channelId) requestedChannelId.value = channelId;
		isOpen.value = true;
	}
	function closeChat() {
		isOpen.value = false;
		requestedChannelId.value = "";
	}
	function toggleChat() {
		isOpen.value = !isOpen.value;
	}
	async function refreshUnread() {
		const version = ++unreadVersion, identity = token.value;
		if (!token.value) {
			unread.value = 0;
			return;
		}
		try {
			const result = await $fetch$1("/platform-chat/unread", {
				baseURL: config.public.apiBase,
				headers: { Authorization: `Bearer ${token.value}` }
			});
			if (version === unreadVersion && token.value === identity) unread.value = result.total;
		} catch {
			if (version === unreadVersion && token.value === identity) unread.value = 0;
		}
	}
	function connectRealtime() {}
	function joinRealtimeChannel(channelId) {
		realtime?.emit("platform-chat:join", { channelId });
	}
	function disconnectRealtime() {
		++unreadVersion;
		realtime?.disconnect();
		realtime = null;
		connected.value = false;
		isOpen.value = false;
		unread.value = 0;
		activeChannelId.value = "";
		requestedChannelId.value = "";
		lastMessage.value = null;
		lastChannel.value = null;
		lastReminder.value = null;
	}
	return {
		isOpen,
		activeChannelId,
		requestedChannelId,
		unread,
		connected,
		lastMessage,
		lastChannel,
		lastReminder,
		openChat,
		closeChat,
		toggleChat,
		refreshUnread,
		connectRealtime,
		joinRealtimeChannel,
		disconnectRealtime
	};
}
// pages/crm/chat.vue?vue&type=script&setup=true&lang.ts
var chat_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "chat",
	__ssrInlineRender: true,
	setup(__props) {
		usePlatformChat();
		useCrmNavigation();
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(WorkspaceLoading_default, mergeProps({ label: "Открываем чат платформы" }, _attrs), null, _parent));
		};
	}
});
// pages/crm/chat.vue
var _sfc_setup = chat_vue_vue_type_script_setup_true_lang_default.setup;
chat_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/crm/chat.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var chat_default = chat_vue_vue_type_script_setup_true_lang_default;

export { chat_default as default };;globalThis.__timing__.logEnd('Load chunks/build/chat-D6eKPT7r');
//# sourceMappingURL=chat-D6eKPT7r.mjs.map
