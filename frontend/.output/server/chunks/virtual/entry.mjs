globalThis.__timing__.logStart('Load chunks/virtual/entry');import { defineProdDiagnostics } from 'nostics';
import { ansiFormatter } from 'nostics/formatters/ansi';
import { shallowReactive, reactive, effectScope, getCurrentScope, hasInjectionContext, getCurrentInstance, inject, toRef, isRef, ref, watchEffect, onScopeDispose, toValue, createApp, provide, onErrorCaptured, onServerPrefetch, unref, createVNode, resolveDynamicComponent, defineComponent, computed, withCtx, toDisplayString, openBlock, createBlock, createTextVNode, createCommentVNode, shallowRef, cloneVNode, h, createElementBlock, mergeProps, customRef, isVNode, withAsyncContext, watch, resolveComponent, nextTick, isReadonly, Suspense, Fragment, useSSRContext, isShallow, isReactive, toRaw } from 'vue';
import { e as createError, E as joinURL, J as withQuery, K as sanitizeStatusCode, L as parseURL, M as decodePath, O as isScriptProtocol, $ as $fetch, P as klona, Q as getRequestHeader, R as isEqual, S as splitCookiesString, T as getResponseHeader, U as setCookie, V as getCookie, W as deleteCookie, X as parseQuery, Y as hasProtocol, Z as withTrailingSlash, _ as withoutTrailingSlash, a0 as defu } from '../_/nitro.mjs';
import { b as baseURL, p as publicAssetsURL } from '../routes/renderer.mjs';
import { FlatMetaPlugin } from 'unhead/plugins';
import { walkResolver, hasOwn } from 'unhead/utils';
import { RouterView, createMemoryHistory, createRouter, START_LOCATION, isNavigationFailure, NavigationFailureType } from 'vue-router';
import { ssrRenderSuspense, ssrRenderComponent, ssrRenderVNode, ssrInterpolate, ssrRenderAttrs, ssrRenderSlot, ssrRenderList, ssrRenderTeleport, ssrRenderClass, ssrRenderAttr, ssrRenderStyle, ssrIncludeBooleanAttr, ssrRenderDynamicModel, ssrLooseContain } from 'vue/server-renderer';
import { RotateCcw, ArrowRight, LoaderCircle, Menu, ChevronDown, Heart, Grid2X2, ArrowUpRight, Phone, Mail, MapPin, X, Search, ChevronRight, ChevronLeft, EyeOff, Eye, BriefcaseBusiness, Trash2, ShoppingBag, Check, Minus, Plus, ArrowLeft } from '@lucide/vue';

function flatHooks(configHooks, hooks = {}, parentName) {
	for (const key in configHooks) {
		const subHook = configHooks[key];
		const name = parentName ? `${parentName}:${key}` : key;
		if (typeof subHook === "object" && subHook !== null) flatHooks(subHook, hooks, name);
		else if (typeof subHook === "function") hooks[name] = subHook;
	}
	return hooks;
}
const createTask = /* @__PURE__ */ (() => {
	if (console.createTask) return console.createTask;
	const defaultTask = { run: (fn) => fn() };
	return () => defaultTask;
})();
function callHooks(hooks, args, startIndex, task) {
	for (let i = startIndex; i < hooks.length; i += 1) try {
		const result = task ? task.run(() => hooks[i](...args)) : hooks[i](...args);
		if (result && typeof result.then === "function") return Promise.resolve(result).then(() => callHooks(hooks, args, i + 1, task));
	} catch (error) {
		return Promise.reject(error);
	}
}
function serialTaskCaller(hooks, args, name) {
	if (hooks.length > 0) return callHooks(hooks, args, 0, createTask(name));
}
function parallelTaskCaller(hooks, args, name) {
	if (hooks.length > 0) {
		const task = createTask(name);
		return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
	}
}
function callEachWith(callbacks, arg0) {
	for (const callback of [...callbacks]) callback(arg0);
}
var Hookable = class {
	_hooks;
	_before;
	_after;
	_deprecatedHooks;
	_deprecatedMessages;
	constructor() {
		this._hooks = {};
		this._before = void 0;
		this._after = void 0;
		this._deprecatedMessages = void 0;
		this._deprecatedHooks = {};
		this.hook = this.hook.bind(this);
		this.callHook = this.callHook.bind(this);
		this.callHookWith = this.callHookWith.bind(this);
	}
	hook(name, function_, options = {}) {
		if (!name || typeof function_ !== "function") return () => {};
		const originalName = name;
		let dep;
		while (this._deprecatedHooks[name]) {
			dep = this._deprecatedHooks[name];
			name = dep.to;
		}
		if (dep && !options.allowDeprecated) {
			let message = dep.message;
			if (!message) message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
			if (!this._deprecatedMessages) this._deprecatedMessages = /* @__PURE__ */ new Set();
			if (!this._deprecatedMessages.has(message)) {
				console.warn(message);
				this._deprecatedMessages.add(message);
			}
		}
		if (!function_.name) try {
			Object.defineProperty(function_, "name", {
				get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
				configurable: true
			});
		} catch {}
		this._hooks[name] = this._hooks[name] || [];
		this._hooks[name].push(function_);
		return () => {
			if (function_) {
				this.removeHook(name, function_);
				function_ = void 0;
			}
		};
	}
	hookOnce(name, function_) {
		let _unreg;
		let _function = (...arguments_) => {
			if (typeof _unreg === "function") _unreg();
			_unreg = void 0;
			_function = void 0;
			return function_(...arguments_);
		};
		_unreg = this.hook(name, _function);
		return _unreg;
	}
	removeHook(name, function_) {
		const hooks = this._hooks[name];
		if (hooks) {
			const index = hooks.indexOf(function_);
			if (index !== -1) hooks.splice(index, 1);
			if (hooks.length === 0) this._hooks[name] = void 0;
		}
	}
	clearHook(name) {
		this._hooks[name] = void 0;
	}
	deprecateHook(name, deprecated) {
		this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
		const _hooks = this._hooks[name] || [];
		this._hooks[name] = void 0;
		for (const hook of _hooks) this.hook(name, hook);
	}
	deprecateHooks(deprecatedHooks) {
		for (const name in deprecatedHooks) this.deprecateHook(name, deprecatedHooks[name]);
	}
	addHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		const removeFns = Object.keys(hooks).map((key) => this.hook(key, hooks[key]));
		return () => {
			for (const unreg of removeFns) unreg();
			removeFns.length = 0;
		};
	}
	removeHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		for (const key in hooks) this.removeHook(key, hooks[key]);
	}
	removeAllHooks() {
		this._hooks = {};
	}
	callHook(name, ...args) {
		return this.callHookWith(serialTaskCaller, name, args);
	}
	callHookParallel(name, ...args) {
		return this.callHookWith(parallelTaskCaller, name, args);
	}
	callHookWith(caller, name, args) {
		const event = this._before || this._after ? {
			name,
			args,
			context: {}
		} : void 0;
		if (this._before) callEachWith(this._before, event);
		const result = caller(this._hooks[name] ? [...this._hooks[name]] : [], args, name);
		if (result instanceof Promise) return result.finally(() => {
			if (this._after && event) callEachWith(this._after, event);
		});
		if (this._after && event) callEachWith(this._after, event);
		return result;
	}
	beforeEach(function_) {
		this._before = this._before || [];
		this._before.push(function_);
		return () => {
			if (this._before !== void 0) {
				const index = this._before.indexOf(function_);
				if (index !== -1) this._before.splice(index, 1);
			}
		};
	}
	afterEach(function_) {
		this._after = this._after || [];
		this._after.push(function_);
		return () => {
			if (this._after !== void 0) {
				const index = this._after.indexOf(function_);
				if (index !== -1) this._after.splice(index, 1);
			}
		};
	}
};
function createHooks() {
	return new Hookable();
}
const isBrowser = "undefined" !== "undefined";
function createDebugger(hooks, _options = {}) {
	const options = {
		inspect: isBrowser,
		group: isBrowser,
		filter: () => true,
		..._options
	};
	const _filter = options.filter;
	const filter = typeof _filter === "string" ? (name) => name.startsWith(_filter) : _filter;
	const _tag = options.tag ? `[${options.tag}] ` : "";
	const logPrefix = (event) => _tag + event.name + "".padEnd(event._id, "\0");
	const _idCtr = {};
	const unsubscribeBefore = hooks.beforeEach((event) => {
		if (filter !== void 0 && !filter(event.name)) return;
		_idCtr[event.name] = _idCtr[event.name] || 0;
		event._id = _idCtr[event.name]++;
		console.time(logPrefix(event));
	});
	const unsubscribeAfter = hooks.afterEach((event) => {
		if (filter !== void 0 && !filter(event.name)) return;
		if (options.group) console.groupCollapsed(event.name);
		if (options.inspect) console.timeLog(logPrefix(event), event.args);
		else console.timeEnd(logPrefix(event));
		if (options.group) console.groupEnd();
		_idCtr[event.name]--;
	});
	return { close: () => {
		unsubscribeBefore();
		unsubscribeAfter();
	} };
}

// node_modules/nuxt/dist/app/diagnostics/_shared.js
/**
* Shared configuration for the runtime (E<N>xxx) diagnostics catalogs.
*
* Catalogs are split by domain and imported directly where used (no barrel),
* so the browser bundle only pulls in the codes a module references. Pair the
* pure-call annotations on each `defineDiagnostics()` with dev-guarded,
* statement-level report calls so report-only diagnostics strip from production.
*
* Codes are stable, fully-qualified `NUXT_E<NNNN>` identifiers. Codes with a
* dedicated docs page resolve a `see:` URL via {@link docsBase}; the rest opt
* out with `docs: false`.
*/
function docsBase(code) {
	return `https://nuxt.com/docs/4.x/errors/${code.replace("NUXT_", "").toLowerCase()}`;
}
var ansi = (open, close) => (s) => `\x1B[${open}m${s}\x1B[${close}m`;
var colors = {
	red: ansi(31, 39),
	yellow: ansi(33, 39),
	cyan: ansi(36, 39),
	gray: ansi(90, 39),
	bold: ansi(1, 22),
	dim: ansi(2, 22)
};
ansiFormatter(colors);
var prodReporter = (diagnostic) => {
	console.error(`[${diagnostic.name}]`);
};
var prodReporters = [prodReporter];
// node_modules/nuxt/dist/app/diagnostics/core.js
/**
* E1xxx
* Core / Nuxt-instance / lifecycle runtime diagnostics.
*/
var appDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
// node_modules/nuxt/node_modules/unctx/dist/index.mjs
function _getAsyncLocalStorage() {
	return globalThis.AsyncLocalStorage || globalThis.process?.getBuiltinModule?.("node:async_hooks")?.AsyncLocalStorage;
}
var _WeakRef = globalThis.WeakRef || class StrongRef {
	#value;
	constructor(value) {
		this.#value = value;
	}
	deref() {
		return this.#value;
	}
};
function createContext(opts = {}) {
	let currentInstance;
	let isSingleton = false;
	const checkConflict = (instance) => {
		if (currentInstance && currentInstance !== instance) throw new Error("Context conflict");
	};
	let als;
	if (opts.asyncContext) {
		const _AsyncLocalStorage = opts.AsyncLocalStorage || _getAsyncLocalStorage();
		if (_AsyncLocalStorage) als = new _AsyncLocalStorage();
		else console.warn("[unctx] `AsyncLocalStorage` is not provided.");
	}
	const _wrapInstance = (instance) => als && instance !== null && typeof instance === "object" ? { __unctx_weak: new _WeakRef(instance) } : instance;
	const _unwrapInstance = (store) => store && store.__unctx_weak ? store.__unctx_weak.deref() : store;
	const _getCurrentInstance = () => {
		if (als) {
			const store = als.getStore();
			if (store !== void 0) return _unwrapInstance(store);
		}
		return currentInstance;
	};
	return {
		use: () => {
			const _instance = _getCurrentInstance();
			if (_instance === void 0) throw new Error("Context is not available");
			return _instance;
		},
		tryUse: () => {
			return _getCurrentInstance() ?? null;
		},
		set: (instance, replace) => {
			if (!replace) checkConflict(instance);
			currentInstance = instance;
			isSingleton = true;
		},
		unset: () => {
			currentInstance = void 0;
			isSingleton = false;
		},
		call: (instance, callback) => {
			checkConflict(instance);
			currentInstance = instance;
			try {
				return als ? als.run(_wrapInstance(instance), callback) : callback();
			} finally {
				if (!isSingleton) currentInstance = void 0;
			}
		},
		async callAsync(instance, callback) {
			currentInstance = instance;
			const onRestore = () => {
				currentInstance = instance;
			};
			const onLeave = () => currentInstance === instance ? onRestore : void 0;
			asyncHandlers.add(onLeave);
			try {
				const r = als ? als.run(_wrapInstance(instance), callback) : callback();
				if (!isSingleton) currentInstance = void 0;
				return await r;
			} finally {
				asyncHandlers.delete(onLeave);
			}
		}
	};
}
function createNamespace(defaultOpts = {}) {
	const contexts = {};
	return { get(key, opts = {}) {
		if (!contexts[key]) contexts[key] = createContext({
			...defaultOpts,
			...opts
		});
		return contexts[key];
	} };
}
var _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
var globalKey = "__unctx__";
var defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
var getContext$1 = (key, opts = {}) => defaultNamespace.get(key, opts);
var asyncHandlersKey = "__unctx_async_handlers__";
var asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
	const restores = [];
	for (const leaveHandler of asyncHandlers) {
		const restore = leaveHandler();
		if (restore) restores.push(restore);
	}
	const restore = () => {
		for (const restore of restores) restore();
	};
	let awaitable = function_();
	if (awaitable && typeof awaitable === "object" && "catch" in awaitable) awaitable = awaitable.catch((error) => {
		restore();
		throw error;
	});
	return [awaitable, restore];
}
// node_modules/nuxt/dist/app/internal/context.js
globalThis.__nuxt_app_ctx__ ||= {};
function getContext(key, opts) {
	return getContext$1(key, opts);
}
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fnuxt.config.mjs
var nuxtLinkDefaults = {
	"componentName": "NuxtLink"};
var asyncDataDefaults = { "deep": true };
var fetchDefaults = {};
// node_modules/nuxt/dist/app/nuxt.js
function getNuxtAppCtx(id = "nuxt-app") {
	return getContext(id, { asyncContext: false });
}
var NuxtPluginIndicator = "__nuxt_plugin";
/** @since 3.0.0 */
function createNuxtApp(options) {
	let hydratingCount = 0;
	const nuxtApp = {
		_id: options.id || "nuxt-app",
		_scope: effectScope(),
		provide: void 0,
		versions: {
			get nuxt() {
				return "4.6.2";
			},
			get vue() {
				return nuxtApp.vueApp.version;
			}
		},
		payload: shallowReactive({
			...options.ssrContext?.payload || {},
			data: shallowReactive({}),
			state: reactive({}),
			once: /* @__PURE__ */ new Set(),
			_errors: shallowReactive({})
		}),
		static: { data: {} },
		runWithContext(fn) {
			if (nuxtApp._scope.active && !getCurrentScope()) return nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn));
			return callWithNuxt(nuxtApp, fn);
		},
		isHydrating: false,
		deferHydration() {
			if (!nuxtApp.isHydrating) return () => {};
			hydratingCount++;
			let called = false;
			return () => {
				if (called) return;
				called = true;
				hydratingCount--;
				if (hydratingCount === 0) {
					nuxtApp.isHydrating = false;
					return nuxtApp.callHook("app:suspense:resolve");
				}
			};
		},
		_asyncDataPromises: {},
		_asyncData: shallowReactive({}),
		_state: shallowReactive({}),
		_payloadRevivers: {},
		...options
	};
	nuxtApp.payload.serverRendered = true;
	if (nuxtApp.ssrContext) {
		nuxtApp.payload.path = nuxtApp.ssrContext.url;
		nuxtApp.ssrContext.nuxt = nuxtApp;
		nuxtApp.ssrContext.payload = nuxtApp.payload;
		nuxtApp.ssrContext.config = {
			public: nuxtApp.ssrContext.runtimeConfig.public,
			app: nuxtApp.ssrContext.runtimeConfig.app
		};
	}
	nuxtApp.hooks = createHooks();
	nuxtApp.hook = nuxtApp.hooks.hook;
	{
		const runHooks = async (hooks, args) => {
			for (const hook of hooks) await nuxtApp.runWithContext(() => hook(...args));
		};
		const contextCaller = runHooks;
		nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, args);
	}
	nuxtApp.callHook = nuxtApp.hooks.callHook;
	nuxtApp.provide = (name, value) => {
		const $name = "$" + name;
		defineGetter(nuxtApp, $name, value);
		defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
	};
	defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
	defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
	const runtimeConfig = options.ssrContext.runtimeConfig;
	nuxtApp.provide("config", runtimeConfig);
	return nuxtApp;
}
/** @since 3.0.0 */
async function applyPlugin(nuxtApp, plugin) {
	if (typeof plugin === "function") {
		const run = () => nuxtApp.runWithContext(() => plugin(nuxtApp));
		const { provide } = await run() || {};
		if (provide && typeof provide === "object") for (const key in provide) nuxtApp.provide(key, provide[key]);
	}
}
/** @since 3.0.0 */
async function applyPlugins(nuxtApp, plugins) {
	let error;
	for (const plugin of plugins) try {
		await applyPlugin(nuxtApp, plugin);
	} catch (e) {
		if (!nuxtApp.payload.error) throw e;
		error ||= e;
	}
	if (error) throw nuxtApp.payload.error || error;
}
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function defineNuxtPlugin(plugin) {
	if (typeof plugin === "function") return plugin;
	const _name = plugin._name || plugin.name;
	delete plugin.name;
	return Object.assign(plugin.setup || (() => {}), plugin, {
		[NuxtPluginIndicator]: true,
		_name
	});
}
/**
* Ensures that the setup function passed in has access to the Nuxt instance via `useNuxtApp`.
* @param nuxt A Nuxt instance
* @param setup The function to call
* @since 3.0.0
*/
function callWithNuxt(nuxt, setup, args) {
	const fn = () => setup();
	const nuxtAppCtx = getNuxtAppCtx(nuxt._id);
	return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
}
function tryUseNuxtApp(id) {
	let nuxtAppInstance;
	if (hasInjectionContext()) nuxtAppInstance = getCurrentInstance()?.appContext.app.$nuxt;
	nuxtAppInstance ||= getNuxtAppCtx(id).tryUse();
	return nuxtAppInstance || null;
}
function useNuxtApp(id) {
	const nuxtAppInstance = tryUseNuxtApp(id);
	if (!nuxtAppInstance) throw appDiagnostics.NUXT_E1001();
	return nuxtAppInstance;
}
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function useRuntimeConfig(_event) {
	return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
	Object.defineProperty(obj, key, { get: () => val });
}

// node_modules/nuxt/dist/app/error.js
var NUXT_ERROR_SIGNATURE = "__nuxt_error";
/** @since 3.0.0 */
var isNuxtError = (error) => !!error && typeof error === "object" && "__nuxt_error" in error;
/** @since 3.0.0 */
var createError$2 = (error) => {
	if (isNuxtError(error)) return error;
	if (typeof error !== "string" && error?.statusText) error.message ??= error.statusText;
	const nuxtError = createError(error ?? {});
	Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
		value: true,
		configurable: false,
		writable: false
	});
	Object.defineProperty(nuxtError, "status", {
		get: () => nuxtError.statusCode,
		configurable: true
	});
	Object.defineProperty(nuxtError, "statusText", {
		get: () => nuxtError.statusMessage,
		configurable: true
	});
	return nuxtError;
};
// node_modules/nuxt/dist/app/utils.js
var PROBE_BASE_A = "https://a.invalid/probe/";
var PROBE_BASE_B = "https://b.invalid/probe/";
function parseAnchorURL(value, base = PROBE_BASE_A) {
	try {
		return new URL(value, base);
	} catch {
		return null;
	}
}
function resolvesWithoutBase(value) {
	const resolved = parseAnchorURL(value);
	return !!resolved && resolved.href === parseAnchorURL(value, PROBE_BASE_B)?.href;
}
/** Whether a URL string is a path rooted at the current origin, so carries no protocol. */
function isRootedPath(value) {
	if (value[0] !== "/" || value[1] === "/" || value[1] === "\\") return false;
	return value[1] !== "	" && value[1] !== "\n" && value[1] !== "\r" || !resolvesWithoutBase(value);
}
/** Whether a URL string carries its own protocol or authority. */
function isAbsoluteHref(value) {
	return !!value && !isRootedPath(value) && resolvesWithoutBase(value);
}
/** The script-capable protocol a URL string would navigate to, or `null` when it is safe. */
function getScriptProtocol(value) {
	if (!value || isRootedPath(value)) return null;
	let resolved = parseAnchorURL(value.replace(/[\u0000-\u001F\u007F\s]+/g, ""));
	while (resolved?.protocol === "view-source:") resolved = parseAnchorURL(resolved.pathname);
	if (!resolved) return "";
	return isScriptProtocol(resolved.protocol) ? resolved.protocol : null;
}
/** Returns the value unchanged when safe to use as an anchor `href`, or `null`. */
function sanitizeAnchorHref(value) {
	return getScriptProtocol(value) === null ? value : null;
}
// node_modules/nuxt/dist/app/components/injections.js
var LayoutMetaSymbol = Symbol("layout-meta");
var PageRouteSymbol = Symbol("route");
// node_modules/nuxt/dist/app/diagnostics/navigation.js
/**
* E2xxx
* Navigation / routing / middleware runtime diagnostics.
*/
var navigationDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
// node_modules/nuxt/dist/app/composables/router.js
/** @since 3.0.0 */
var useRouter = (() => {
	return useNuxtApp()?.$router;
});
/**
* Whether the current effect scope is (a descendant of) the component instance's scope.
* A detached scope (e.g. `createSharedComposable`) outlives the component, so the
* per-page route injected there would freeze after navigation (#18903).
*/
function getParentScope(scope) {
	const internal = scope;
	return internal.parent ?? internal.subs?.sub;
}
function isScopeWithinInstance(instance) {
	const instanceScope = instance.scope;
	let scope = getCurrentScope();
	while (scope) {
		if (scope === instanceScope) return true;
		scope = getParentScope(scope);
	}
	return false;
}
/** @since 3.0.0 */
var useRoute = (() => {
	if (hasInjectionContext()) {
		const instance = getCurrentInstance();
		if (!instance || isScopeWithinInstance(instance)) return inject(PageRouteSymbol, useNuxtApp()._route);
	}
	return useNuxtApp()._route;
});
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function defineNuxtRouteMiddleware(middleware) {
	return middleware;
}
/** @since 3.0.0 */
var isProcessingMiddleware = () => {
	try {
		if (useNuxtApp()._processingMiddleware) return true;
	} catch {
		return false;
	}
	return false;
};
var HTML_ATTR_UNSAFE_RE = /[&"'<>]/g;
var HTML_ATTR_ENCODE_MAP = {
	"&": "&amp;",
	"\"": "&quot;",
	"'": "&#x27;",
	"<": "&lt;",
	">": "&gt;"
};
function encodeForHtmlAttr(value) {
	return value.replace(HTML_ATTR_UNSAFE_RE, (c) => HTML_ATTR_ENCODE_MAP[c]);
}
/**
* A helper that aids in programmatic navigation within your Nuxt application.
*
* Can be called on the server and on the client, within pages, route middleware, plugins, and more.
* @param {RouteLocationRaw | undefined | null} [to] - The route to navigate to. Accepts a route object, string path, `undefined`, or `null`. Defaults to '/'.
* @param {NavigateToOptions} [options] - Optional customization for controlling the behavior of the navigation.
* @returns {Promise<void | NavigationFailure | false> | false | void | RouteLocationRaw} The navigation result, which varies depending on context and options.
* @see https://nuxt.com/docs/4.x/api/utils/navigate-to
* @since 3.0.0
*/
var navigateTo = (to, options) => {
	to ||= "/";
	const toPath = typeof to === "string" ? to : "path" in to ? resolveRouteObject(to) : useRouter().resolve(to).href;
	const isExternalHost = isAbsoluteHref(toPath);
	const isExternal = options?.external || isExternalHost;
	if (isExternal) {
		if (!options?.external) throw navigationDiagnostics.NUXT_E2001({ toPath });
		const protocol = getScriptProtocol(toPath);
		if (protocol !== null) throw navigationDiagnostics.NUXT_E2002({
			toPath,
			protocol
		});
	}
	const inMiddleware = isProcessingMiddleware();
	const router = useRouter();
	const nuxtApp = useNuxtApp();
	if (nuxtApp.ssrContext) {
		const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
		const location = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
		const redirect = async function(response) {
			await nuxtApp.callHook("app:redirected");
			const encodedHeader = encodeURL(location, isExternalHost);
			const encodedLoc = encodeForHtmlAttr(encodedHeader);
			nuxtApp.ssrContext["~renderResponse"] = {
				statusCode: sanitizeStatusCode(options?.redirectCode || 302, 302),
				body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
				headers: { location: encodedHeader }
			};
			return response;
		};
		if (!isExternal && inMiddleware) {
			let expectedPath = fullPath;
			if (typeof to === "string" && toPath.includes("?")) {
				const target = router.resolve(to);
				expectedPath = router.resolve({
					path: target.path,
					query: target.query,
					hash: target.hash
				}).fullPath || "/";
			}
			router.afterEach((final) => final.fullPath === expectedPath ? redirect(false) : void 0);
			return to;
		}
		return redirect(!inMiddleware ? void 0 : false);
	}
	if (isExternal) {
		nuxtApp._scope.stop();
		if (options?.replace) (void 0).replace(toPath);
		else (void 0).href = toPath;
		if (inMiddleware) {
			if (!nuxtApp.isHydrating) return false;
			return new Promise(() => {});
		}
		return Promise.resolve();
	}
	const encodedTo = typeof to === "string" ? encodeRoutePath(to) : to;
	return options?.replace ? router.replace(encodedTo) : router.push(encodedTo);
};
/**
* @internal
*/
function resolveRouteObject(to) {
	return withQuery(to.path || "", to.query || {}) + (to.hash || "");
}
/**
* @internal
*/
function encodeURL(location, isExternalHost = false) {
	const url = new URL(location, "http://localhost");
	if (!isExternalHost) return url.pathname.replace(/^\/{2,}/, "/") + url.search + url.hash;
	if (location.startsWith("//")) return url.toString().replace(url.protocol, "");
	return url.toString();
}
/**
* Encode the pathname of a route location string. Ensures decoded paths like
* `/café` are percent-encoded to match vue-router's encoded route records.
* Already-encoded paths are not double-encoded.
* @internal
*/
function encodeRoutePath(url) {
	const parsed = parseURL(url);
	return encodeVueRouterPath(decodePath(parsed.pathname)) + parsed.search + parsed.hash;
}
var ENC_PIPE_RE = /%7C/g;
var ENC_BRACKET_OPEN_RE = /%5B/g;
var ENC_BRACKET_CLOSE_RE = /%5D/g;
var ENC_ENC_SLASH_RE = /%252F/gi;
var HASH_RE = /#/g;
var QUESTION_MARK_RE = /\?/g;
/**
* Apply vue-router's own path encoding, which leaves sub-delimiters like `&`
* and `+` literal. This must stay in sync with `encodeVueRouterPath` in
* `unrouting`, which encodes the route records we need to match against.
*/
function encodeVueRouterPath(value) {
	return encodeURI(value).replace(ENC_PIPE_RE, "|").replace(ENC_BRACKET_OPEN_RE, "[").replace(ENC_BRACKET_CLOSE_RE, "]").replace(HASH_RE, "%23").replace(QUESTION_MARK_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F");
}
// node_modules/nuxt/dist/app/composables/error.js
/** @since 3.0.0 */
var useError = /* @__NO_SIDE_EFFECTS__ */ () => toRef(useNuxtApp().payload, "error");
/** @since 3.0.0 */
var showError = (error) => {
	const nuxtError = createError$2(error);
	try {
		const error = /* @__PURE__ */ useError();
		error.value ||= nuxtError;
	} catch {
		throw nuxtError;
	}
	return nuxtError;
};
/**
* Show the error page unless the current client is a crawler, in which case the
* bot receives the already server-rendered HTML instead (#32137, #35338).
*
* @internal
*/
var _showErrorUnlessCrawler = async (nuxtApp, error) => {
	await nuxtApp.runWithContext(() => showError(error));
};
/** @since 3.0.0 */
var clearError = async (options = {}) => {
	const nuxtApp = useNuxtApp();
	const error = /* @__PURE__ */ useError();
	nuxtApp.callHook("app:error:cleared", options);
	if (options.redirect) await useRouter().replace(options.redirect);
	error.value = void 0;
};

// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Ffetch.mjs
if (!globalThis.$fetch) globalThis.$fetch = $fetch.create({ baseURL: baseURL() });
var $fetch$1$1 = globalThis.$fetch;

// node_modules/nuxt/dist/app/diagnostics/state.js
/**
* E7xxx
* Payload / state / cookie runtime diagnostics.
*/
var stateDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
// node_modules/nuxt/dist/app/composables/state.js
var useStateKeyPrefix = "$s";
function useState(...args) {
	const autoKey = typeof args[args.length - 1] === "string" ? args.pop() : void 0;
	if (typeof args[0] !== "string") args.unshift(autoKey);
	const [_key, init] = args;
	if (!_key || typeof _key !== "string") throw stateDiagnostics.NUXT_E7009({ key: _key });
	if (init !== void 0 && typeof init !== "function") throw stateDiagnostics.NUXT_E7007({ type: typeof init });
	const key = useStateKeyPrefix + _key;
	const nuxtApp = useNuxtApp();
	const state = toRef(nuxtApp.payload.state, key);
	if (init) nuxtApp._state[key] ??= { _default: init };
	if (state.value === void 0 && init) {
		const initialValue = init();
		if (isRef(initialValue)) {
			nuxtApp.payload.state[key] = initialValue;
			return state;
		}
		state.value = initialValue;
	}
	return state;
}

const browserSessions = /* @__PURE__ */ new WeakMap();
let browserSessionRevision = 0;
function nextSessionRevision() {
  var _a, _b;
  try {
    if (typeof ((_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) === "function") return globalThis.crypto.randomUUID();
    if (typeof ((_b = globalThis.crypto) == null ? void 0 : _b.getRandomValues) === "function") return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");
  } catch {
  }
  return `${Date.now().toString(36)}-${(++browserSessionRevision).toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function readStored(name, keys) {
  try {
    const envelope = localStorage.getItem(name);
    if (envelope !== null) {
      const row = JSON.parse(envelope);
      if (row.version !== 1 || typeof row.token !== "string" || typeof row.refreshToken !== "string" || row.user !== null && (typeof row.user !== "object" || typeof row.user.id !== "string")) return null;
      return { value: { token: row.token, refreshToken: row.refreshToken, user: row.user }, revision: envelope };
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const first = [localStorage.getItem(keys.token), localStorage.getItem(keys.refresh), localStorage.getItem(keys.user)];
      const second = [localStorage.getItem(keys.token), localStorage.getItem(keys.refresh), localStorage.getItem(keys.user)];
      if (JSON.stringify(first) === JSON.stringify(second)) return { value: { token: first[0] || "", refreshToken: first[1] || "", user: first[2] ? JSON.parse(first[2]) : null }, revision: JSON.stringify(first) };
    }
  } catch {
  }
  return null;
}
function makeBrowserSession(name, keys, get, adopt) {
  let observed;
  function sync(initial = false) {
    const row = readStored(name, keys);
    if (!row || !initial && observed === void 0 || row.revision === observed) return false;
    observed = row.revision;
    adopt(row.value, initial);
    return true;
  }
  function persist(force = false, expectedRefresh) {
    var _a, _b;
    const row = readStored(name, keys);
    const current = get();
    const expectedPair = expectedRefresh !== void 0 && (row == null ? void 0 : row.value.refreshToken) === expectedRefresh && ((_a = row.value.user) == null ? void 0 : _a.id) === ((_b = current.user) == null ? void 0 : _b.id);
    if (!force && row && observed !== void 0 && row.revision !== observed && !expectedPair) {
      sync();
      return false;
    }
    if (!force && row && JSON.stringify(row.value) === JSON.stringify(current)) {
      observed = row.revision;
      return true;
    }
    const value = get();
    const envelope = JSON.stringify({ version: 1, revision: nextSessionRevision(), ...value });
    localStorage.setItem(name, envelope);
    observed = envelope;
    value.token ? localStorage.setItem(keys.token, value.token) : localStorage.removeItem(keys.token);
    value.refreshToken ? localStorage.setItem(keys.refresh, value.refreshToken) : localStorage.removeItem(keys.refresh);
    value.user ? localStorage.setItem(keys.user, JSON.stringify(value.user)) : localStorage.removeItem(keys.user);
    return true;
  }
  async function locked(action) {
    var _a;
    if (typeof navigator !== "undefined" && ((_a = navigator.locks) == null ? void 0 : _a.request)) return navigator.locks.request(name + ":refresh", action);
    return action();
  }
  return { sync, persist, locked, storageKey: name };
}
function browserSession(app, name, keys, get, adopt) {
  let sessions = browserSessions.get(app);
  if (!sessions) {
    sessions = /* @__PURE__ */ new Map();
    browserSessions.set(app, sessions);
  }
  if (!sessions.has(name)) sessions.set(name, makeBrowserSession(name, keys, get, adopt));
  return sessions.get(name);
}

// composables/useWorkspaceSession.ts
var storageKeys = {
	token: "sarkisian-workspace-token",
	refresh: "sarkisian-workspace-refresh",
	user: "sarkisian-workspace-user"
};
var internalRoles = /* @__PURE__ */ new Set([
	"ADMIN",
	"CONTENT_MANAGER",
	"MANAGER_B2B",
	"MANAGER_SALES",
	"MARKETPLACE_MANAGER",
	"SUPERVISOR",
	"EXECUTIVE",
	"IT_SUPPORT",
	"CURATOR",
	"WAREHOUSE"
]);
var workspaceRefreshes = /* @__PURE__ */ new WeakMap();
var workspaceRestores = /* @__PURE__ */ new WeakMap();
var workspaceStatus = (error) => Number(error?.response?.status || error?.statusCode || error?.status || 0);
function useWorkspaceSession() {
	const config = useRuntimeConfig();
	const app = useNuxtApp();
	const token = useState("workspace-token", () => "");
	const refreshToken = useState("workspace-refresh-token", () => "");
	const user = useState("workspace-user", () => null);
	const hydrated = useState("workspace-hydrated", () => false);
	const logoutWarning = useState("workspace-logout-warning", () => "");
	const generation = useState("workspace-session-generation", () => 0);
	const sessionError = useState("workspace-session-error", () => "");
	const browser = browserSession(app, "sarkisian-workspace-session", storageKeys, () => ({
		token: token.value,
		refreshToken: refreshToken.value,
		user: user.value
	}), (value, initial) => {
		const nextUser = value.user && internalRoles.has(value.user.role) ? value.user : null;
		const valid = !value.user || Boolean(nextUser);
		const nextToken = valid ? value.token : "", nextRefresh = valid ? value.refreshToken : "";
		if (!initial && (user.value?.id !== nextUser?.id || !nextToken && !nextRefresh)) {
			generation.value++;
			workspaceRefreshes.delete(app);
			workspaceRestores.delete(app);
		}
		token.value = nextToken;
		refreshToken.value = nextRefresh;
		user.value = nextUser;
		sessionError.value = "";
	});
	const syncStoredSession = () => false;
	function hydrate() {}
	function persist(force = false, expectedRefresh) {
		return true;
	}
	async function login(email, password) {
		const actor = generation.value;
		const result = await $fetch$1$1("/auth/login", {
			baseURL: config.public.apiBase,
			method: "POST",
			body: {
				email,
				password
			}
		});
		if (generation.value !== actor) throw new Error("Сессия изменилась. Повторите вход.");
		if (!internalRoles.has(result.user.role)) throw new Error("Для этой учётной записи предназначен клиентский кабинет");
		generation.value++;
		workspaceRefreshes.delete(app);
		workspaceRestores.delete(app);
		token.value = result.accessToken;
		refreshToken.value = result.refreshToken;
		user.value = result.user;
		logoutWarning.value = "";
		sessionError.value = "";
		hydrated.value = true;
		return result.user;
	}
	async function refresh() {
		const actor = generation.value, pending = workspaceRefreshes.get(app);
		if (pending?.generation === actor) return pending.promise;
		const initialRefresh = refreshToken.value;
		if (!initialRefresh) {
			logout(false);
			return false;
		}
		const promise = browser.locked(async () => {
			try {
				if (generation.value !== actor) return false;
				if (refreshToken.value !== initialRefresh) return Boolean(token.value);
				const result = await $fetch$1$1("/auth/refresh", {
					baseURL: config.public.apiBase,
					method: "POST",
					body: { refreshToken: initialRefresh },
					timeout: 1e4,
					retry: 0
				});
				if (generation.value !== actor) return false;
				if (refreshToken.value !== initialRefresh) return Boolean(token.value);
				if (!result?.accessToken || !result?.refreshToken) throw new Error("Не удалось обновить сессию. Повторите попытку.");
				token.value = result.accessToken;
				refreshToken.value = result.refreshToken;
				return generation.value === actor && Boolean(token.value);
			} catch (error) {
				if (generation.value === actor && refreshToken.value !== initialRefresh && token.value) return true;
				if (generation.value === actor && refreshToken.value === initialRefresh && [401, 403].includes(workspaceStatus(error))) logout(false);
				throw error;
			}
		});
		const flight = {
			generation: actor,
			promise
		};
		workspaceRefreshes.set(app, flight);
		try {
			return await promise;
		} finally {
			if (workspaceRefreshes.get(app) === flight) workspaceRefreshes.delete(app);
		}
	}
	async function request(path, options = {}) {
		const beforeSync = generation.value;
		if (generation.value !== beforeSync) throw new Error("Сессия изменилась в другой вкладке. Повторите действие.");
		const actor = generation.value, initialToken = token.value;
		const send = async () => {
			const headers = new Headers(options.headers);
			headers.set("Authorization", `Bearer ${token.value}`);
			const result = await $fetch$1$1(path, {
				baseURL: config.public.apiBase,
				timeout: 1e4,
				retry: 0,
				...options,
				headers
			});
			if (generation.value !== actor) throw new Error("Сессия изменилась. Повторите действие.");
			return result;
		};
		try {
			return await send();
		} catch (error) {
			if (workspaceStatus(error) !== 401 || generation.value !== actor || options.signal?.aborted) throw error;
			if (generation.value !== actor) throw error;
			if (token.value === initialToken && !await refresh()) throw error;
			if (generation.value !== actor || !token.value) throw error;
			return send();
		}
	}
	async function restoreUser() {
		const actor = generation.value, pending = workspaceRestores.get(app);
		if (pending?.generation === actor) return pending.promise;
		if (!token.value && !refreshToken.value) return null;
		const promise = (async () => {
			try {
				if (!token.value && !await refresh()) return null;
				const account = await request("/auth/me");
				if (generation.value !== actor) return user.value;
				if (!account || !internalRoles.has(account.role)) {
					logout(false);
					return null;
				}
				user.value = account;
				sessionError.value = "";
				return account;
			} catch (error) {
				if (generation.value !== actor) return user.value;
				if ([401, 403].includes(workspaceStatus(error))) {
					logout(false);
					return null;
				}
				sessionError.value = "Не удалось проверить сессию. Проверьте соединение и повторите попытку.";
				throw error;
			}
		})();
		const flight = {
			generation: actor,
			promise
		};
		workspaceRestores.set(app, flight);
		try {
			return await promise;
		} finally {
			if (workspaceRestores.get(app) === flight) workspaceRestores.delete(app);
		}
	}
	function logout(explicit = true) {
		generation.value++;
		workspaceRefreshes.delete(app);
		workspaceRestores.delete(app);
		token.value = "";
		refreshToken.value = "";
		user.value = null;
		sessionError.value = "";
	}
	async function endSession() {
		const actor = generation.value;
		let revoked = !token.value && !refreshToken.value;
		try {
			if (token.value || refreshToken.value) revoked = (await request("/auth/logout", {
				method: "POST",
				timeout: 1e4
			}))?.loggedOut === true;
		} catch {} finally {
			if (generation.value === actor) {
				logout();
				logoutWarning.value = revoked ? "" : "Вы вышли на этом устройстве. Сервер не подтвердил отзыв сессии. Когда связь восстановится, войдите и завершите прежнюю сессию в своём профиле.";
			}
		}
		return { revoked };
	}
	return {
		token,
		refreshToken,
		user,
		hydrated,
		generation,
		logoutWarning,
		sessionError,
		syncStoredSession,
		storageKey: browser.storageKey,
		hydrate,
		persist,
		login,
		refresh,
		request,
		restoreUser,
		logout,
		endSession
	};
}

// node_modules/nuxt/dist/app/diagnostics/head.js
/**
* E6xxx
* Head / unhead runtime diagnostics.
*/
var unheadDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
// node_modules/@unhead/vue/dist/shared/vue.DKb5ZKVl.mjs
var headSymbol = "usehead";
// @__NO_SIDE_EFFECTS__
function injectHead$1() {
	if (hasInjectionContext()) {
		const instance = inject(headSymbol);
		if (instance) return instance;
	}
	throw new Error("useHead() was called without provide context, ensure you call it through the setup() function.");
}
// node_modules/@unhead/vue/dist/shared/vue.D2XR8FqS.mjs
var VueResolver = /* @__PURE__ */ Object.assign((_, value) => isRef(value) ? toValue(value) : value, { _static: true });
// node_modules/@unhead/vue/dist/shared/vue.CXwiCT15.mjs
function useHead$1(input, options = {}) {
	const head = options.head || /* @__PURE__ */ injectHead$1();
	return head.ssr ? head.push(input || {}, options) : clientUseHead(head, input, options);
}
function clientUseHead(head, input, options = {}) {
	const scope = getCurrentScope();
	if (scope && !scope.active) return {
		patch() {},
		dispose() {},
		_i: -1
	};
	const deactivated = ref(false);
	if (options.onRendered && scope) {
		const _onRendered = options.onRendered;
		options = {
			...options,
			onRendered: (ctx) => scope.run(() => _onRendered(ctx))
		};
	}
	let entry;
	watchEffect(() => {
		const i = deactivated.value ? {} : walkResolver(input, VueResolver);
		if (entry) entry.patch(i);
		else entry = head.push(i, options);
	});
	if (getCurrentInstance()) ; else if (scope) onScopeDispose(() => entry.dispose());
	return entry;
}
function normalizeSeoMetaInput(input) {
	if (input._flatMeta) return input;
	const meta = {};
	for (const key in input) {
		if (!hasOwn(input, key) || key === "title" || key === "titleTemplate") continue;
		meta[key] = input[key];
	}
	return {
		title: input.title,
		titleTemplate: input.titleTemplate,
		_flatMeta: meta
	};
}
function useSeoMeta$1(input = {}, options = {}) {
	(options.head || /* @__PURE__ */ injectHead$1()).use(FlatMetaPlugin);
	const entry = useHead$1(normalizeSeoMetaInput(input), options);
	const corePatch = entry.patch;
	if (!entry.__patched) {
		entry.patch = (input2) => corePatch(normalizeSeoMetaInput(input2));
		entry.__patched = true;
	}
	return entry;
}
// node_modules/nuxt/dist/head/runtime/composables.js
/**
* Injects the head client from the Nuxt context or Vue inject.
*/
function injectHead(nuxtApp) {
	const nuxt = nuxtApp || useNuxtApp();
	return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
		if (hasInjectionContext()) {
			const head = inject("usehead");
			if (!head) throw unheadDiagnostics.NUXT_E6001();
			return head;
		}
	});
}
function useHead(input, options = {}) {
	return useHead$1(input, {
		head: options.head || injectHead(options.nuxt),
		...options
	});
}
function useSeoMeta(input, options = {}) {
	return useSeoMeta$1(input, {
		head: options.head || injectHead(options.nuxt),
		...options
	});
}

const CRM_GROUPS = ["\u041C\u043E\u0439 \u0434\u0435\u043D\u044C", "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", "\u0424\u0438\u043D\u0430\u043D\u0441\u044B", "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM"];
const CRM_MODULES = [
  { id: "marketplaces", label: "\u041C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u044B", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", icon: "Store" },
  { id: "loyalty", label: "\u041A\u043B\u0443\u0431 \u043F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u0435\u0439", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "BadgeCheck" },
  { id: "referrals", label: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "Network" },
  { id: "bloggers", label: "\u0410\u0432\u0442\u043E\u0440\u044B \u0438 \u0431\u043B\u043E\u0433\u0435\u0440\u044B", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "Video" },
  { id: "connections", label: "\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438", group: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM", icon: "PlugZap" }
];
const CRM_DESTINATIONS = [
  { id: "studio-rewards", path: "/crm/studio-rewards", label: "\u041D\u0430\u0433\u0440\u0430\u0434\u044B \u0438\u0433\u0440\u044B", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "TicketPercent" },
  { id: "courses", path: "/crm/courses", label: "\u041A\u0443\u0440\u0441\u044B", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "BookOpen" },
  { id: "crm-dashboard", path: "/crm/", label: "\u041C\u043E\u0439 \u0434\u0435\u043D\u044C", group: "\u041C\u043E\u0439 \u0434\u0435\u043D\u044C", icon: "CalendarDays" },
  { id: "pipeline", path: "/crm/deals", label: "\u0412\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436", group: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", icon: "Kanban" },
  { id: "customers", path: "/crm/customers", label: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B", group: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", icon: "ContactRound" },
  { id: "organizations", path: "/crm/organizations", label: "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u0438", group: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", icon: "Building2" },
  // Keep this legacy screen addressable without promising a storefront-only filter it does not implement.
  { id: "web-customers", path: "/crm/buyers", label: "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u0438", group: "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", icon: "UserRound", sidebarFallbackFor: "customers", screen: "store", section: "customers" },
  { id: "web-orders", path: "/crm/orders", label: "\u0417\u0430\u043A\u0430\u0437\u044B \u0441\u0430\u0439\u0442\u0430", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", icon: "ShoppingBag", screen: "store", section: "orders" },
  { id: "b2b-orders", path: "/crm/b2b-orders", label: "\u0417\u0430\u043A\u0430\u0437\u044B B2B", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", icon: "PackageCheck" },
  { id: "order-fulfillment", path: "/crm/fulfillment", label: "\u0421\u0431\u043E\u0440\u043A\u0430 \u0438 \u043E\u0442\u0433\u0440\u0443\u0437\u043A\u0430", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", icon: "Truck" },
  { id: "inventory", path: "/crm/inventory", label: "\u0422\u043E\u0432\u0430\u0440\u044B \u0438 \u043E\u0441\u0442\u0430\u0442\u043A\u0438", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", icon: "Boxes" },
  { id: "channel-dashboard", path: "/crm/marketplaces/overview", label: "\u041E\u0431\u0437\u043E\u0440 \u043C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u043E\u0432", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", parent: "marketplaces", icon: "Store", screen: "channels", section: "overview" },
  { id: "channel-orders", path: "/crm/marketplaces/orders", label: "\u0417\u0430\u043A\u0430\u0437\u044B \u043C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u043E\u0432", group: "\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435", parent: "marketplaces", icon: "ReceiptText", screen: "channels", section: "orders" },
  { id: "payment-calendar", path: "/crm/payment-calendar", label: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439", group: "\u0424\u0438\u043D\u0430\u043D\u0441\u044B", icon: "CalendarCheck2" },
  { id: "tasks", path: "/crm/tasks", label: "\u0417\u0430\u0434\u0430\u0447\u0438", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "ListTodo" },
  { id: "crm-files", path: "/crm/files", label: "\u0424\u0430\u0439\u043B\u044B", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "FolderOpen" },
  { id: "work-schedule", path: "/crm/work-schedule", label: "\u0413\u0440\u0430\u0444\u0438\u043A\u0438 \u0440\u0430\u0431\u043E\u0442\u044B", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "CalendarFold" },
  { id: "work-time", path: "/crm/work-time", label: "\u0420\u0430\u0431\u043E\u0447\u0435\u0435 \u0432\u0440\u0435\u043C\u044F", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "Clock3" },
  { id: "crm-meetings", path: "/crm/meetings", label: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u0439", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "CalendarClock" },
  { id: "crm-chat", path: "/crm/chat", label: "\u0427\u0430\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B", group: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430", icon: "MessageSquareText" },
  { id: "content-plan", path: "/crm/content-plan", label: "\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u043F\u043B\u0430\u043D", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "Clapperboard" },
  { id: "loyalty-members", path: "/crm/loyalty/members", label: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043A\u043B\u0443\u0431\u0430", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", parent: "loyalty", icon: "BadgeCheck", screen: "store", section: "loyalty-members" },
  { id: "loyalty-settings", path: "/crm/loyalty/settings", label: "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u043A\u043B\u0443\u0431\u0430", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", parent: "loyalty", icon: "NotebookPen", screen: "store", section: "loyalty-settings" },
  ...["participants", "rewards", "settings"].map((section) => ({ id: `referral-${section}`, path: `/crm/referrals/${section}`, label: { participants: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439", rewards: "\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0437\u0430 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438", settings: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439" }[section], group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", parent: "referrals", icon: { participants: "Network", rewards: "Coins", settings: "SlidersHorizontal" }[section], screen: "partner", section, kind: "REFERRAL" })),
  ...["overview", "participants", "registrations", "rewards", "payouts", "settings"].map((section) => ({ id: `bloggers-${section}`, path: `/crm/bloggers/${section}`, label: { overview: "\u041E\u0431\u0437\u043E\u0440 \u0430\u0432\u0442\u043E\u0440\u043E\u0432", participants: "\u0417\u0430\u044F\u0432\u043A\u0438 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", registrations: "\u041F\u0440\u0438\u0432\u043B\u0435\u0447\u0451\u043D\u043D\u044B\u0435 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u0438", rewards: "\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u0440\u0430\u043C", payouts: "\u0412\u044B\u043F\u043B\u0430\u0442\u044B \u0430\u0432\u0442\u043E\u0440\u0430\u043C", settings: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u043E\u0432" }[section], group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", parent: "bloggers", icon: { overview: "Video", participants: "UsersRound", registrations: "Handshake", rewards: "BadgeDollarSign", payouts: "Wallet", settings: "Settings2" }[section], screen: "partner", section, kind: "BLOGGER" })),
  { id: "bloggers-gifts", path: "/crm/bloggers/gifts", label: "\u041F\u043E\u0434\u0430\u0440\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u0430\u043C", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", parent: "bloggers", icon: "PackagePlus", screen: "partner-gifts" },
  { id: "partner-documents-settings", path: "/crm/partners/documents", label: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u043E\u0432", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "FileSignature", screen: "partner-documents-settings", section: "documents" },
  { id: "promotions", path: "/crm/promotions", label: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u044B", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "Megaphone", screen: "store", section: "promotions" },
  { id: "gift-cards", path: "/crm/gift-cards", label: "\u041F\u043E\u0434\u0430\u0440\u043E\u0447\u043D\u044B\u0435 \u043A\u0430\u0440\u0442\u044B", group: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u044B", icon: "Gift", screen: "store", section: "gift-cards" },
  { id: "contact-messages", path: "/crm/messages", label: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441 \u0441\u0430\u0439\u0442\u0430", group: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", icon: "Inbox", screen: "messages" },
  { id: "helpdesk", path: "/crm/support/overview", label: "\u0426\u0435\u043D\u0442\u0440 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438", group: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", icon: "LifeBuoy", screen: "support", section: "overview" },
  { id: "tickets", path: "/crm/support/tickets", label: "\u0412\u0441\u0435 \u0437\u0430\u044F\u0432\u043A\u0438", group: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", icon: "Headset", screen: "support", section: "tickets" },
  { id: "queues", path: "/crm/support/queues", label: "\u041E\u0447\u0435\u0440\u0435\u0434\u0438 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438", group: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", icon: "ListOrdered", screen: "support", section: "queues" },
  { id: "knowledge", path: "/crm/support/knowledge", label: "\u0411\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439", group: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430", icon: "BookOpen", screen: "support", section: "knowledge" },
  { id: "leadership", path: "/crm/reports/overview", label: "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438", group: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", icon: "ChartNoAxesCombined", screen: "reports", section: "overview" },
  { id: "sales-report", path: "/crm/reports/sales", label: "\u041E\u0442\u0447\u0451\u0442 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", group: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", icon: "TrendingUp", screen: "reports", section: "sales" },
  { id: "customers-report", path: "/crm/reports/customers", label: "\u041E\u0442\u0447\u0451\u0442 \u043F\u043E \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C", group: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", icon: "ChartPie", screen: "reports", section: "customers" },
  ...["overview", "staff", "departments", "access", "accounts"].map((section) => ({
    id: section === "overview" ? "system-overview" : section,
    path: `/crm/settings/${section}`,
    group: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM",
    label: { overview: "\u041E\u0431\u0437\u043E\u0440 \u0441\u0438\u0441\u0442\u0435\u043C\u044B", staff: "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438", departments: "\u041E\u0442\u0434\u0435\u043B\u044B", access: "\u0420\u043E\u043B\u0438 \u0438 \u043F\u0440\u0430\u0432\u0430", accounts: "\u0423\u0447\u0451\u0442\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438" }[section],
    icon: { overview: "MonitorCog", staff: "Contact", departments: "Workflow", access: "ShieldCheck", accounts: "UserCog" }[section],
    screen: "system",
    section
  })),
  { id: "integrations", path: "/crm/settings/integrations", label: "\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B", group: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM", parent: "connections", icon: "PlugZap", screen: "system", section: "integrations" },
  { id: "channel-integrations", path: "/crm/marketplaces/integrations", label: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u043E\u0432", group: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM", parent: "connections", icon: "Cable", screen: "channels", section: "integrations" },
  ...["bot-commands", "salon-subscription", "audit", "logs", "trash"].map((section) => ({
    id: section,
    path: `/crm/settings/${section}`,
    group: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 CRM",
    label: { "bot-commands": "\u041A\u043E\u043C\u0430\u043D\u0434\u044B \u0431\u043E\u0442\u043E\u0432", "salon-subscription": "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u0441\u0430\u043B\u043E\u043D\u043E\u0432", audit: "\u0416\u0443\u0440\u043D\u0430\u043B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", logs: "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0436\u0443\u0440\u043D\u0430\u043B\u044B", trash: "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u0445" }[section],
    icon: { "bot-commands": "Bot", "salon-subscription": "CalendarRange", audit: "History", logs: "Terminal", trash: "Trash2" }[section],
    screen: "system",
    section
  }))
];
function crmNavigationItems(leaves) {
  return CRM_DESTINATIONS.flatMap((destination) => {
    var _a;
    const source = leaves.find((item) => item.id === destination.id);
    if (!source) return [];
    const parentLabel = (_a = CRM_MODULES.find((module) => module.id === destination.parent)) == null ? void 0 : _a.label;
    return [{ ...destination, to: destination.path, parentLabel, keywords: `${source.label} ${source.keywords || ""} ${parentLabel || ""}` }];
  });
}
function crmPrimaryItems(items) {
  return items.filter((item) => !item.sidebarFallbackFor || !items.some((other) => other.id === item.sidebarFallbackFor));
}
function crmNavigationGroups(items) {
  const visible = crmPrimaryItems(items);
  return CRM_GROUPS.map((label) => {
    const groupItems = visible.filter((item) => item.group === label);
    const entries = [];
    for (const item of groupItems) {
      const module = CRM_MODULES.find((module2) => module2.id === item.parent);
      if (!module) entries.push({ id: item.id, label: item.label, icon: item.icon, item });
      else if (!entries.some((entry) => entry.id === module.id)) entries.push({ id: module.id, label: module.label, icon: module.icon, children: groupItems.filter((child) => child.parent === module.id) });
    }
    return { label, entries };
  }).filter((group) => group.entries.length);
}
function searchCrmNavigation(items, query) {
  const normalize = (text) => text.toLocaleLowerCase("ru-RU").replace(/ё/g, "\u0435");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return crmPrimaryItems(items).filter((item) => terms.every((term) => normalize(`${item.label} ${item.group} ${item.keywords}`).includes(term)));
}
const CRM_LEGACY_ROUTES = {
  "/crm-pipeline": "/crm/deals",
  "/crm-customers": "/crm/customers",
  "/crm-organizations": "/crm/organizations",
  "/crm-tasks": "/crm/tasks",
  "/crm-chat": "/crm/chat"
};
const isCrmPath = (path) => path === "/crm" || path.startsWith("/crm/");
const crmDestination = (path) => CRM_DESTINATIONS.find((item) => item.path.replace(/\/$/, "") === path.replace(/\/$/, ""));
function crmLegacyPath(path, section) {
  const clean = path.replace(/\/$/, "");
  if (CRM_LEGACY_ROUTES[clean]) return CRM_LEGACY_ROUTES[clean];
  const roots = { "/crm-marketplaces": "/crm/marketplaces", "/system-settings": "/crm/settings", "/helpdesk": "/crm/support", "/leadership": "/crm/reports" };
  for (const [old, target] of Object.entries(roots)) {
    if (clean !== old && !clean.startsWith(old + "/")) continue;
    let leaf = clean === old ? typeof section === "string" ? section : "overview" : clean.slice(old.length + 1);
    if (old === "/crm-marketplaces") leaf = leaf === "settings" ? "integrations" : leaf === "dashboard" ? "overview" : leaf;
    const next = `${target}/${leaf}`;
    return crmDestination(next) ? next : void 0;
  }
  const legacyStore = { orders: "/crm/orders", customers: "/crm/buyers", "contact-messages": "/crm/messages", promotions: "/crm/promotions", "gift-cards": "/crm/gift-cards", "loyalty-settings": "/crm/loyalty/settings", "loyalty-members": "/crm/loyalty/members" };
  if (clean === "/admin-workspace" || clean.startsWith("/admin-workspace/")) {
    const leaf = clean === "/admin-workspace" ? section : clean.slice("/admin-workspace/".length);
    if (typeof leaf !== "string") return;
    if (legacyStore[leaf]) return legacyStore[leaf];
    const partner = /^(bloggers|referral)-(.+)$/.exec(leaf);
    const next = partner && `/crm/${partner[1] === "referral" ? "referrals" : "bloggers"}/${partner[2]}`;
    return next && crmDestination(next) ? next : void 0;
  }
}

const COOKIE_MAX_AGE_LIMIT = 3456e4;
function endIndex(str, min, len) {
	const index = str.indexOf(";", min);
	return index === -1 ? len : index;
}
function eqIndex(str, min, max) {
	const index = str.indexOf("=", min);
	return index < max ? index : -1;
}
function valueSlice(str, min, max) {
	if (min === max) return "";
	let start = min;
	let end = max;
	do {
		const code = str.charCodeAt(start);
		if (code !== 32 && code !== 9) break;
	} while (++start < end);
	while (end > start) {
		const code = str.charCodeAt(end - 1);
		if (code !== 32 && code !== 9) break;
		end--;
	}
	return str.slice(start, end);
}
const NullObject = /* @__PURE__ */ (() => {
	const C = function() {};
	C.prototype = Object.create(null);
	return C;
})();
function parse(str, options) {
	const obj = new NullObject();
	const len = str.length;
	if (len < 2) return obj;
	const dec = options?.decode || decode;
	const allowMultiple = options?.allowMultiple || false;
	let index = 0;
	do {
		const eqIdx = eqIndex(str, index, len);
		if (eqIdx === -1) break;
		const endIdx = endIndex(str, index, len);
		if (eqIdx > endIdx) {
			index = str.lastIndexOf(";", eqIdx - 1) + 1;
			continue;
		}
		const key = valueSlice(str, index, eqIdx);
		if (options?.filter && !options.filter(key)) {
			index = endIdx + 1;
			continue;
		}
		const val = dec(valueSlice(str, eqIdx + 1, endIdx));
		if (allowMultiple) {
			const existing = obj[key];
			if (existing === void 0) obj[key] = val;
			else if (Array.isArray(existing)) existing.push(val);
			else obj[key] = [existing, val];
		} else if (obj[key] === void 0) obj[key] = val;
		index = endIdx + 1;
	} while (index < len);
	return obj;
}
function decode(str) {
	if (!str.includes("%")) return str;
	try {
		return decodeURIComponent(str);
	} catch {
		return str;
	}
}
const maxAgeRegExp = /^-?\d+$/;
const _nullProto = /* @__PURE__ */ Object.getPrototypeOf({});
function parseSetCookie(str, options) {
	const len = str.length;
	let _endIdx = len;
	let eqIdx = -1;
	for (let i = 0; i < len; i++) {
		const c = str.charCodeAt(i);
		if (c === 59) {
			_endIdx = i;
			break;
		}
		if (c === 61 && eqIdx === -1) eqIdx = i;
	}
	if (eqIdx >= _endIdx) eqIdx = -1;
	const name = eqIdx === -1 ? "" : _trim(str, 0, eqIdx);
	if (name && name in _nullProto) return void 0;
	let value = eqIdx === -1 ? _trim(str, 0, _endIdx) : _trim(str, eqIdx + 1, _endIdx);
	if (!name && !value) return void 0;
	if (name.length + value.length > 4096) return void 0;
	if (options?.decode !== false) value = _decode(value, options?.decode);
	const setCookie = {
		name,
		value
	};
	let index = _endIdx + 1;
	while (index < len) {
		let endIdx = len;
		let attrEqIdx = -1;
		for (let i = index; i < len; i++) {
			const c = str.charCodeAt(i);
			if (c === 59) {
				endIdx = i;
				break;
			}
			if (c === 61 && attrEqIdx === -1) attrEqIdx = i;
		}
		if (attrEqIdx >= endIdx) attrEqIdx = -1;
		const attr = attrEqIdx === -1 ? _trim(str, index, endIdx) : _trim(str, index, attrEqIdx);
		const val = attrEqIdx === -1 ? void 0 : _trim(str, attrEqIdx + 1, endIdx);
		if (val === void 0 || val.length <= 1024) switch (attr.toLowerCase()) {
			case "httponly":
				setCookie.httpOnly = true;
				break;
			case "secure":
				setCookie.secure = true;
				break;
			case "partitioned":
				setCookie.partitioned = true;
				break;
			case "domain":
				if (val) setCookie.domain = (val.charCodeAt(0) === 46 ? val.slice(1) : val).toLowerCase();
				break;
			case "path":
				setCookie.path = val;
				break;
			case "max-age":
				if (val && maxAgeRegExp.test(val)) setCookie.maxAge = Math.min(Number(val), COOKIE_MAX_AGE_LIMIT);
				break;
			case "expires": {
				if (!val) break;
				const date = new Date(val);
				if (Number.isFinite(date.valueOf())) {
					const maxDate = new Date(Date.now() + COOKIE_MAX_AGE_LIMIT * 1e3);
					setCookie.expires = date > maxDate ? maxDate : date;
				}
				break;
			}
			case "priority": {
				if (!val) break;
				const priority = val.toLowerCase();
				if (priority === "low" || priority === "medium" || priority === "high") setCookie.priority = priority;
				break;
			}
			case "samesite": {
				if (!val) break;
				const sameSite = val.toLowerCase();
				if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") setCookie.sameSite = sameSite;
				else setCookie.sameSite = "lax";
				break;
			}
			default: {
				const attrLower = attr.toLowerCase();
				if (attrLower && !(attrLower in _nullProto)) setCookie[attrLower] = val;
			}
		}
		index = endIdx + 1;
	}
	return setCookie;
}
function _trim(str, start, end) {
	if (start === end) return "";
	let s = start;
	let e = end;
	while (s < e && (str.charCodeAt(s) === 32 || str.charCodeAt(s) === 9)) s++;
	while (e > s && (str.charCodeAt(e - 1) === 32 || str.charCodeAt(e - 1) === 9)) e--;
	return str.slice(s, e);
}
function _decode(value, decode) {
	if (!decode && !value.includes("%")) return value;
	try {
		return (decode || decodeURIComponent)(value);
	} catch {
		return value;
	}
}

const homeEnglish = {
  "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E": "Home",
  "\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u043F\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443": "Catalog navigation",
  "\u0413\u043B\u0430\u0432\u043D\u0430\u044F": "Home",
  "\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0438 \u0442\u043E\u0432\u0430\u0440\u0430": "Product photos",
  "\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F": "Photo",
  "\u0410\u0440\u0442\u0438\u043A\u0443\u043B": "SKU",
  "\u042D\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u0430": "Digital gift card",
  "\u041D\u043E\u043C\u0438\u043D\u0430\u043B \u043A\u0430\u0440\u0442\u044B": "Gift card value",
  "\u0412\u0430\u0440\u0438\u0430\u043D\u0442 \u0442\u043E\u0432\u0430\u0440\u0430": "Product variant",
  "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443": "Add to cart",
  "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u043F\u043E \u0420\u043E\u0441\u0441\u0438\u0438": "Delivery across Russia",
  "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u043E\u043F\u043B\u0430\u0442\u044B": "Delivery and payment",
  "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442": "Original product",
  "\u041D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u043E\u0442 \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044F": "Directly from the manufacturer",
  "\u041E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0435": "About the product",
  "\u0421\u0432\u0435\u0434\u0435\u043D\u0438\u044F \u043E \u0442\u043E\u0432\u0430\u0440\u0435": "Product details",
  "\u0412\u0430\u0440\u0438\u0430\u043D\u0442": "Variant",
  "\u0426\u0432\u0435\u0442": "Color",
  "\u0420\u0430\u0437\u043C\u0435\u0440": "Size",
  "\u0412\u0435\u0441": "Weight",
  "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0442": "Purchasing and returns",
  "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0438 \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C \u0441 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C\u0438 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430.": "Check your selected variant and read the store policies.",
  "\u041F\u043E\u043C\u043E\u0436\u0435\u043C \u0441 \u0432\u044B\u0431\u043E\u0440\u043E\u043C": "Need help choosing?",
  "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043D\u0430\u0431\u043E\u0440": "Complete your collection",
  "\u0412\u0430\u043C \u0442\u0430\u043A\u0436\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u0442\u044C\u0441\u044F": "You may also like",
  "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E": "Explore the collection",
  "\u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0442\u043E\u0432\u0430\u0440\u044B": "Similar products",
  "\u0412\u0435\u0441\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433": "Full catalog",
  "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433": "Back to catalog",
  "\u0422\u043E\u0432\u0430\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D": "Product not found",
  "\u0422\u043E\u0432\u0430\u0440": "Product",
  "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F": "Valid for",
  "\u0434\u043D\u0435\u0439 \u0441 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u0432\u044B\u043F\u0443\u0441\u043A\u0430.": "days from issue.",
  "\u041A\u043E\u0434 \u0441\u0442\u0430\u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0437\u0430\u043A\u0430\u0437\u0430 \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043E\u043F\u043B\u0430\u0442\u044B.": "Your code will be available on the order page once payment is confirmed.",
  "\u041A\u0430\u0440\u0442\u0443 \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0447\u0430\u0441\u0442\u044F\u043C\u0438; \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F. \u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E, \u0431\u0435\u0437 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0441\u043A\u0438\u0434\u043E\u043A.": "The card can be used in parts, with the remaining balance saved. Gift cards are purchased separately, without delivery or discounts.",
  "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0442\u043E\u0432\u0430\u0440. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.": "Could not add the product. Please try again.",
  "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0443\u0442\u043E\u0447\u043D\u044F\u0439\u0442\u0435 \u0443 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430. \u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C \u0441 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0435\u0439 \u043D\u0430 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435.": "Contact our team for product details. Read the instructions on the packaging before use.",
  "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435": "Favorites",
  "\u0426\u0435\u043D\u0430": "Price",
  "\u043E\u0442": "from",
  "\u0434\u043E": "to",
  "\u041E\u0431\u044A\u0451\u043C": "Volume",
  "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F": "Category",
  "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D": "Not specified",
  "\u0412\u0441\u0435 \u0442\u043E\u0432\u0430\u0440\u044B": "All products",
  "\u0424\u0438\u043B\u044C\u0442\u0440\u044B \u0438 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430": "Filters and sorting",
  "\u0426\u0435\u043D\u0430 \u043E\u0442": "Minimum price",
  "\u0426\u0435\u043D\u0430 \u0434\u043E": "Maximum price",
  "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C": "Apply",
  "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C": "Reset",
  "\u041F\u043E\u0438\u0441\u043A": "Search",
  "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0430\u0440\u0442\u0438\u043A\u0443\u043B": "Name or SKU",
  "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430": "Sorting",
  "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u0438\u043D\u043A\u0438": "Newest first",
  "\u041F\u043E \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0441\u0442\u0438": "Most popular",
  "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u0435\u0448\u0435\u0432\u043B\u0435": "Price: low to high",
  "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E\u0440\u043E\u0436\u0435": "Price: high to low",
  "\u041F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E": "Name",
  "\u0422\u043E\u043B\u044C\u043A\u043E \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438": "In stock only",
  "\u0414\u043B\u044F \u0447\u0435\u0433\u043E": "Purpose",
  "\u041E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u0438": "Features",
  "\u0426\u0435\u043D\u0430 \xAB\u043E\u0442\xBB \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u0446\u0435\u043D\u044B \xAB\u0434\u043E\xBB.": "Minimum price must not exceed maximum price.",
  "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E": "Remove from favorites",
  "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435": "Add to favorites",
  "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443": "Added to cart",
  "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435": "View product",
  "\u0422\u043E\u0432\u0430\u0440\u044B": "Products",
  "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B.": "Unable to load filters.",
  "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433.": "Unable to load the catalog.",
  "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C": "Retry",
  "\u0422\u043E\u0432\u0430\u0440\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B": "No products found",
  "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438\u043B\u0438 \u0441\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B.": "Change or reset the filters.",
  "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B": "Reset filters",
  "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430": "Catalog pages",
  "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430": "Previous page",
  "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430": "Next page",
  "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0442\u043E\u0432\u0430\u0440\u044B\u2026": "Loading products\u2026",
  "\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F": "Quick access",
  "\u0421\u043E\u0446\u0441\u0435\u0442\u0438": "Social media",
  "\u0421\u043E\u0446\u0441\u0435\u0442\u0438 \u0431\u0440\u0435\u043D\u0434\u0430": "Brand social media",
  "\u0421\u043E\u0437\u0434\u0430\u043D\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u043C": "Created by a professional",
  "\u0414\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432": "For professionals",
  "\u041E\u0441\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u0438\u0446\u0430": "Founder",
  "\u041C\u0430\u0441\u0442\u0435\u0440 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430": "Nail professional",
  "SARKISIAN \u2014 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0434\u043B\u044F \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430 \u043F\u043E\u0434 \u043B\u0438\u0447\u043D\u044B\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u044B \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D. \u0412 \u043E\u0441\u043D\u043E\u0432\u0435 \u0431\u0440\u0435\u043D\u0434\u0430 \u2014 \u043E\u043F\u044B\u0442 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043A \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435.": "SARKISIAN creates professional nail materials under Svetlana Sarkisian\u2019s personal supervision. The brand is built on hands-on experience and care for everyday work.",
  "\u0421\u0432\u0435\u0442\u043B\u0430\u043D\u0430 \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D \u2014 \u043C\u0430\u0441\u0442\u0435\u0440 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430, \u0431\u043B\u043E\u0433\u0435\u0440 \u0438 \u043E\u0441\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u0438\u0446\u0430 SARKISIAN. \u0412 \u0435\u0451 \u0440\u0430\u0431\u043E\u0442\u0435 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u044E\u0442\u0441\u044F \u0434\u0432\u0430 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F: \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0434\u043B\u044F \u043D\u043E\u0433\u0442\u0435\u0432\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0438\u0441\u0430.": "Svetlana Sarkisian is a nail professional, creator and founder of SARKISIAN. Her work combines hands-on nail artistry with the development of professional nail materials.",
  "\u0412 \u0441\u0432\u043E\u0451\u043C \u0431\u043B\u043E\u0433\u0435 \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u0430 \u0440\u0430\u0441\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043E \u0440\u0430\u0431\u043E\u0442\u0435 \u0441 \u043D\u043E\u0433\u0442\u044F\u043C\u0438 \u0438 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u043C \u043E\u043F\u044B\u0442\u043E\u043C. \u042D\u0442\u0443 \u0436\u0435 \u0441\u0432\u044F\u0437\u044C \u0441 \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C\u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442 \u0431\u0440\u0435\u043D\u0434: \u043E\u0442 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u0430 \u0441 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C\u0438 \u0434\u043E \u0438\u0445 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0432 \u0441\u0430\u043B\u043E\u043D\u0435.": "Svetlana shares her nail techniques and professional experience on her blog. The brand continues this connection with professionals, from discovering materials to using them in the salon.",
  "\u0425\u043E\u0440\u043E\u0448\u0438\u0439 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0441\u043E\u0441\u0440\u0435\u0434\u043E\u0442\u043E\u0447\u0438\u0442\u044C\u0441\u044F \u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0435 \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0435. \u041F\u043E\u044D\u0442\u043E\u043C\u0443 \u043D\u0430\u043C \u0432\u0430\u0436\u043D\u044B \u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u0432\u0438\u0434 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430, \u043D\u043E \u0438 \u0442\u043E, \u043D\u0430\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441 \u043D\u0438\u043C \u0443\u0434\u043E\u0431\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C.": "Good materials help you focus on your client and the result. We care about how a product looks and how easy it is to use every day.",
  "\u0412\u0441\u0451 \u0434\u043B\u044F \u0432\u0430\u0448\u0435\u0439 \u0442\u0435\u0445\u043D\u0438\u043A\u0438": "Everything for your technique",
  "\u0412 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u0433\u0435\u043B\u0438, \u0433\u0435\u043B\u044C-\u043B\u0430\u043A\u0438, \u0431\u0430\u0437\u044B, \u0442\u043E\u043F\u044B, \u0444\u0440\u0435\u0437\u044B \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B. \u0412 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0438, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435, \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B.": "Explore gels, gel polishes, bases, top coats, drill bits and tools. Each product page includes photos, descriptions, prices and available variants.",
  "\u0412\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u043F\u043E\u0434 \u043F\u0440\u0438\u0432\u044B\u0447\u043D\u0443\u044E \u0442\u0435\u0445\u043D\u0438\u043A\u0443 \u0438 \u0437\u0430\u0434\u0430\u0447\u0438. \u0415\u0441\u043B\u0438 \u0441\u043E\u043C\u043D\u0435\u0432\u0430\u0435\u0442\u0435\u0441\u044C, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043D\u0430\u043C: \u043F\u043E\u043C\u043E\u0436\u0435\u043C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C\u0441\u044F \u0432 \u0430\u0441\u0441\u043E\u0440\u0442\u0438\u043C\u0435\u043D\u0442\u0435, \u043D\u0435 \u043E\u0431\u0435\u0449\u0430\u044F \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0432\u0441\u0435\u0445.": "Choose products for your technique and needs. If you need advice, contact us: we will help you explore the range and find what suits your work.",
  "\u0417\u0430\u0431\u043E\u0442\u0430 \u043D\u0435 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u043E\u0439": "Care continues after your purchase",
  "\u041E\u0442 \u0432\u044B\u0431\u043E\u0440\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430 \u0434\u043E \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u043E \u0437\u0430\u043A\u0430\u0437\u0443 \u2014 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043D\u0430 \u0441\u0432\u044F\u0437\u0438. \u0417\u0430\u043A\u0430\u0437\u044B, \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u043E\u043A\u0443\u043F\u043E\u043A \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u043B\u0438\u0447\u043D\u043E\u043C \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435.": "From choosing a material to questions about your order, our team stays in touch. Orders, support requests and purchase history are available in your account.",
  "\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u043B\u043E\u044F\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044C\u0441\u044F \u043A \u043B\u044E\u0431\u0438\u043C\u044B\u043C \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430\u043C. \u0410\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0431\u043E\u043D\u0443\u0441\u043E\u0432 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u044E\u0442\u0441\u044F \u0432 \u0432\u0430\u0448\u0435\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435.": "Our loyalty programme helps you return to your favourite products. Your current balance and reward terms are available in your account.",
  "\u0414\u043B\u044F \u0441\u0430\u043B\u043E\u043D\u043E\u0432 \u0438 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u043E\u0432": "For salons and professionals",
  "\u0414\u043B\u044F B2B-\u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u043F\u0440\u0435\u0434\u0443\u0441\u043C\u043E\u0442\u0440\u0435\u043D \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442: \u0437\u0430\u043A\u0430\u0437\u044B \u0434\u043B\u044F \u0431\u0438\u0437\u043D\u0435\u0441\u0430, \u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0439 \u0431\u0430\u0437\u043E\u0439 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u0438 \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0443\u0441\u043B\u0443\u0433\u0438.": "B2B customers have a dedicated account for business orders, client management and appointment booking.",
  "\u0425\u043E\u0442\u0438\u0442\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0441 SARKISIAN \u043A\u0430\u043A \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0430\u0440\u0442\u043D\u0451\u0440? \u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432\u043E \u0432\u0445\u043E\u0434 B2B \u0438\u043B\u0438 \u0441\u0432\u044F\u0436\u0438\u0442\u0435\u0441\u044C \u0441 \u043D\u0430\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u0430.": "Would you like to become a SARKISIAN professional partner? Sign in to the B2B account or contact us to discuss partnership terms.",
  "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E": "Partnerships",
  "\u041E \u0431\u0440\u0435\u043D\u0434\u0435": "About us",
  "\u041A\u0430\u0442\u0430\u043B\u043E\u0433": "Catalog",
  "\u041E\u043D\u043B\u0430\u0439\u043D": "Online",
  "\u0437\u0430\u043F\u0438\u0441\u044C": "booking",
  "\u041A\u0443\u0440\u0441\u044B": "Courses",
  "\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u0430\u044F": "Referral",
  "\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430": "program",
  "\u041A\u043E\u0440\u0437\u0438\u043D\u0430": "Cart",
  "\u041B\u0438\u0447\u043D\u044B\u0439": "My",
  "\u043A\u0430\u0431\u0438\u043D\u0435\u0442": "account",
  "\u041B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442": "My account",
  "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E": "Open menu",
  "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E": "Close menu",
  "\u042F\u0437\u044B\u043A \u0438 \u0432\u0430\u043B\u044E\u0442\u0430": "Language and currency",
  "\u041A\u0443\u0440\u0441\u044B \u0432\u0430\u043B\u044E\u0442 \u043F\u0440\u0438\u043C\u0435\u0440\u043D\u044B\u0435": "Exchange rates are approximate",
  "\u041A\u0443\u0440\u0441\u044B SARKISIAN": "SARKISIAN courses",
  "\u041E\u0431\u0443\u0447\u0430\u044E\u0449\u0438\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0437\u0436\u0435.": "Training programs will be available here later.",
  "\u0423\u0437\u043D\u0430\u0442\u044C \u043E\u0431 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0438": "Ask about training",
  "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u043E \u043A\u0443\u0440\u0441\u0430\u0445": "Close course information",
  "\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F": "Contact us",
  "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438": "Privacy policy",
  "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F \u043E\u0444\u0435\u0440\u0442\u0430": "Terms of sale",
  "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430": "Returns policy",
  "\u041F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0440\u0435\u043D\u0434 \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044E \u0438\u0437\u043D\u0443\u0442\u0440\u0438.": "A premium brand for nail professionals, created by someone who knows the craft.",
  "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u0435\u0435": "Materials that help you work faster and with confidence",
  "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u0435\u0435.": "Materials that help you work faster and with confidence.",
  "\u041E\u0442 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u2014 \u043A \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C": "From a professional \u2014 to professionals",
  "\u041E": "About",
  "\u0431\u0440\u0435\u043D\u0434\u0435": "the brand",
  "\u0421\u0432\u0435\u0442\u043B\u0430\u043D\u0430": "Svetlana",
  "\u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D": "Sarkisian",
  "\u0412 \u0435\u0451 \u0440\u0430\u0431\u043E\u0442\u0435 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u044E\u0442\u0441\u044F \u0434\u0432\u0430 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F: \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0434\u043B\u044F \u043D\u043E\u0433\u0442\u0435\u0432\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0438\u0441\u0430.": "Her work brings together hands-on nail artistry and the development of professional nail materials.",
  "\u041E\u0441\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C": "Brand",
  "\u0431\u0440\u0435\u043D\u0434\u0430": "founder",
  "\u0411\u043B\u043E\u0433\u0435\u0440": "Creator",
  "\u041C\u0430\u0441\u0442\u0435\u0440": "Nail",
  "\u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430": "professional",
  "\u041F\u043E\u043D\u0438\u043C\u0430\u0435\u043C \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044E \u0438\u0437\u043D\u0443\u0442\u0440\u0438": "We know the craft from the inside",
  "\u041E\u043F\u044B\u0442 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B \u0441\u0442\u0430\u043B \u043E\u0441\u043D\u043E\u0432\u043E\u0439 \u0431\u0440\u0435\u043D\u0434\u0430. SARKISIAN \u0432\u044B\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0434\u043B\u044F \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430 \u043F\u043E\u0434 \u043B\u0438\u0447\u043D\u044B\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u044B \u2014 \u0441 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435\u043C \u043A \u0442\u043E\u043C\u0443, \u043A\u0430\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442 \u0432\u0435\u0434\u0451\u0442 \u0441\u0435\u0431\u044F \u0432 \u0440\u0443\u043A\u0430\u0445 \u043C\u0430\u0441\u0442\u0435\u0440\u0430.": "Daily salon experience shaped the brand. Svetlana personally oversees SARKISIAN nail materials, with attention to how each product performs in a professional\u2019s hands.",
  "\u0411\u0440\u0435\u043D\u0434 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0446\u0435\u043D\u044F\u0442 \u043F\u043E\u043D\u044F\u0442\u043D\u044B\u0439 \u0432\u044B\u0431\u043E\u0440 \u0438 \u0432\u043D\u0438\u043C\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0435 \u043A \u0441\u0432\u043E\u0435\u0439 \u0440\u0430\u0431\u043E\u0442\u0435.": "Materials and tools for professionals who value a clear choice and care for their craft.",
  "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B": "Products",
  "\u0412 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u0433\u0435\u043B\u0438, \u0433\u0435\u043B\u044C-\u043B\u0430\u043A\u0438, \u0431\u0430\u0437\u044B, \u0442\u043E\u043F\u044B, \u0444\u0440\u0435\u0437\u044B \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B.": "Explore gels, gel polishes, bases, top coats, drill bits and tools.",
  "\u0412 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0438, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435, \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B.": "Find photos, descriptions, prices and available variants on each product page.",
  "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u2026": "Loading products\u2026",
  "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0442\u043E\u0432\u0430\u0440\u044B.": "Could not load products.",
  "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437": "Try again",
  "\u0422\u043E\u0432\u0430\u0440\u044B \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.": "This selection is currently unavailable.",
  "\u0412\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u043F\u043E\u0434 \u043F\u0440\u0438\u0432\u044B\u0447\u043D\u0443\u044E \u0442\u0435\u0445\u043D\u0438\u043A\u0443 \u0438 \u0437\u0430\u0434\u0430\u0447\u0438. \u0415\u0441\u043B\u0438 \u0441\u043E\u043C\u043D\u0435\u0432\u0430\u0435\u0442\u0435\u0441\u044C,": "Choose products for your technique and needs. If you need advice,",
  "\u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043D\u0430\u043C": "contact us",
  ": \u043F\u043E\u043C\u043E\u0436\u0435\u043C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C\u0441\u044F \u0432 \u0430\u0441\u0441\u043E\u0440\u0442\u0438\u043C\u0435\u043D\u0442\u0435, \u043D\u0435 \u043E\u0431\u0435\u0449\u0430\u044F \u0443\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0432\u0441\u0435\u0445.": ": we will help you explore the range and find what suits your work.",
  "\u041F\u043E\u0447\u0435\u043C\u0443": "Why",
  "\u043D\u0430\u0441? \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442": "choose us?",
  "\u0417\u0430\u043A\u0430\u0437\u0430\u0442\u044C": "Shop now",
  "\u0414\u043B\u044F": "For",
  "\u0431\u0438\u0437\u043D\u0435\u0441\u0430": "business",
  "\u0431\u043B\u043E\u0433\u0435\u0440\u043E\u0432": "creators",
  "\u041C\u043E\u0439": "My",
  "\u0441\u0430\u043B\u043E\u043D": "salon",
  "\u0417\u0430\u043A\u0443\u043F\u043A\u0438": "Shop",
  "\u041E\u0442\u043A\u0440\u044B\u0442\u044C": "Explore",
  "\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442?": "How does it work?",
  "\u0423\u0437\u043D\u0430\u0442\u044C \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435": "Learn more",
  "\u0417\u0430 \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0441\u0430\u043B\u043E\u043D\u0430 \u0438\u043B\u0438 \u0431\u0438\u0437\u043D\u0435\u0441\u0430 \u043F\u0440\u0435\u0434\u0443\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0430 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430.": "Earn a separate fixed reward for referring a new salon or business.",
  "[ \u0417\u0430 \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0441\u0430\u043B\u043E\u043D\u0430 ]": "[ Refer a new salon ]",
  "[ \u0424\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430 ]": "[ Earn a fixed reward ]",
  "[ \u0414\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u043E\u043F\u044B\u0442\u043E\u043C \u0441 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0435\u0439 ]": "[ Share your expertise ]",
  "[ \u0421\u043B\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F\u043C\u0438 ]": "[ Track your referrals ]",
  "[ \u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0434\u0435\u043D\u0435\u0436\u043D\u043E\u0435 \u0432\u043E\u0437\u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0435 ]": "[ Receive cash rewards ]",
  "\u0424\u043E\u0442\u043E \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0437\u0436\u0435": "Photo coming soon",
  "\u041F\u043E\u0434\u0430\u0440\u043E\u0447\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u0430": "Gift card",
  "\u0412 \u043D\u0430\u043B\u0438\u0447\u0438\u0438": "In stock",
  "\u041D\u0435\u0442 \u0432 \u043D\u0430\u043B\u0438\u0447\u0438\u0438": "Out of stock",
  "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u043C\u2026": "Adding\u2026",
  "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u043E\u043C\u0438\u043D\u0430\u043B": "Choose value",
  "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E": "Added",
  "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443": "Add to cart",
  "\u043E\u0442 ": "from ",
  "\u041F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442. \u041E\u043F\u043B\u0430\u0442\u0430 \u0432 \u0440\u0443\u0431\u043B\u044F\u0445.": "Approximate conversion. Checkout is in RUB.",
  "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043A\u0443\u0440\u0441\u044B. \u041F\u043E\u043A\u0430 \u0446\u0435\u043D\u044B \u0432 \u0440\u0443\u0431\u043B\u044F\u0445.": "Loading exchange rates. Prices are currently in RUB.",
  "\u041A\u0443\u0440\u0441\u044B \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u2014 \u0446\u0435\u043D\u044B \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0432 \u0440\u0443\u0431\u043B\u044F\u0445.": "Exchange rates unavailable \u2014 prices are shown in RUB.",
  "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0443\u0440\u0441\u044B": "Retry exchange rates",
  "\u041A\u0443\u0440\u0441 \u0426\u0411 \u043E\u0442": "Bank of Russia rates as of",
  "\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435": "View all",
  "SARKISIAN \u2014 \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0440\u0435\u043D\u0434 \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044E \u0438\u0437\u043D\u0443\u0442\u0440\u0438.": "SARKISIAN is a premium brand for nail professionals that knows the craft from the inside.",
  "\u041C\u044B \u043D\u0435 \u043F\u0440\u043E\u0441\u0442\u043E \u043F\u0440\u043E\u0434\u0430\u0451\u043C \u2014 \u043C\u044B \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u043C \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u043E\u0434 \u043B\u0438\u0447\u043D\u044B\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u044B \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D. \u0422\u043E\u043B\u044C\u043A\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u044F, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0443\u0434\u043E\u0431\u043D\u044B \u0432 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435.": "We produce professional materials under Svetlana Sarkisian\u2019s personal supervision, focusing on products that work in everyday practice.",
  "\u0414\u0432\u0430 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u0430 \u2014 \u0434\u043B\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B \u0441\u0430\u043B\u043E\u043D\u0430 \u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u043E\u043A SARKISIAN.": "Two dedicated workspaces for daily salon operations and SARKISIAN purchasing.",
  "\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B.": "Professional materials.",
  "\u0423\u0434\u043E\u0431\u043D\u044B\u0439 \u0431\u0438\u0437\u043D\u0435\u0441.": "Business made easier.",
  "\u0417\u0430\u043A\u0443\u043F\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C\u044E \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u0432 \u043E\u0434\u043D\u043E\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435. \u0414\u0432\u0430 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u0430 \u2014 \u0434\u043B\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B \u0441\u0430\u043B\u043E\u043D\u0430 \u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u043E\u043A SARKISIAN.": "Order professional materials and manage client bookings from one account, with dedicated spaces for salon operations and SARKISIAN purchasing.",
  "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0441\u0430\u043B\u043E\u043D\u043E\u043C.": "Manage your salon.",
  "\u0417\u0430\u043A\u0443\u043F\u0430\u0439\u0442\u0435 \u0441 \u0432\u044B\u0433\u043E\u0434\u043E\u0439.": "Order on your terms.",
  "\u041F\u043E\u043A\u0443\u043F\u0430\u0439\u0442\u0435 \u043B\u044E\u0431\u0438\u043C\u043E\u0435.": "Shop your favorites.",
  "\u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0431\u043E\u043B\u044C\u0448\u0435.": "Get more back.",
  "\u041E \u043A\u043B\u0443\u0431\u0435": "About the club",
  "\u0412\u0441\u0442\u0443\u043F\u0438\u0442\u044C \u0432 \u043A\u043B\u0443\u0431": "Join the club",
  "\u0411\u043E\u043D\u0443\u0441\u044B \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432": "Earn rewards towards your next orders",
  "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0443\u0447\u0430\u0441\u0442\u0438\u044F \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0432 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435": "Your membership level and program terms in your account",
  "\u0411\u0430\u043B\u0430\u043D\u0441 \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0439 \u0432\u0441\u0435\u0433\u0434\u0430 \u043F\u043E\u0434 \u0440\u0443\u043A\u043E\u0439": "Your reward balance and history at your fingertips",
  "\u0420\u0430\u0441\u0441\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u0440\u0443\u0437\u044C\u044F\u043C \u043E SARKISIAN \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0435. \u0417\u0430 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u044B\u0445 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u043F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0431\u043E\u043D\u0443\u0441\u044B \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.": "Share SARKISIAN with friends using your personal link. Earn rewards from qualifying purchases towards your next orders.",
  "\u0411\u044B\u0441\u0442\u0440\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430": "Prompt dispatch",
  "\u041F\u0435\u0440\u0435\u0434\u0430\u0451\u043C \u0437\u0430\u043A\u0430\u0437 \u0432 \u0441\u0431\u043E\u0440\u043A\u0443 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u0438 \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u043C \u043E \u043A\u0430\u0436\u0434\u043E\u043C \u044D\u0442\u0430\u043F\u0435.": "We start preparing your order after payment and keep you informed along the way.",
  "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0446\u0438\u044F": "Original products",
  "\u041D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u043E\u0442 SARKISIAN BRAND \u2014 \u0441 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u043A\u0430\u0436\u0434\u043E\u0439 \u043F\u0430\u0440\u0442\u0438\u0438.": "Directly from SARKISIAN BRAND, with checks on every batch.",
  "\u0411\u043E\u043D\u0443\u0441\u044B \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0438": "Shopping rewards",
  "\u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C \u0447\u0430\u0441\u0442\u044C \u0437\u0430\u043A\u0430\u0437\u0430 \u0431\u0430\u043B\u043B\u0430\u043C\u0438 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u043F\u043E\u043A\u0443\u043F\u043E\u043A.": "Earn points on your orders to use on future purchases.",
  "\u0421\u043E\u0437\u0434\u0430\u043D\u043E \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432": "Made for professionals",
  "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u043E\u0439 \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D \u0432 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435.": "Products tested by Svetlana Sarkisian in real everyday practice."
};

const homeSectionKeys = ["hero", "categories", "bestsellers", "business", "club", "referral", "bloggers", "manifesto", "story", "benefits"];
const legacyHomeSections = homeSectionKeys.filter((key) => !["business", "referral", "bloggers"].includes(key));
const defaultBusinessPreview = {
  salonTitle: "\u041C\u043E\u0439 \u0441\u0430\u043B\u043E\u043D",
  purchasesTitle: "\u0417\u0430\u043A\u0443\u043F\u043A\u0438 SARKISIAN",
  scheduleTitle: "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C",
  appointmentTitle: "\u041C\u0430\u043D\u0438\u043A\u044E\u0440 \u0441 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435\u043C",
  appointmentDetail: "\u0417\u0430\u043F\u0438\u0441\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \xB7 90 \u043C\u0438\u043D\u0443\u0442",
  secondAppointmentTitle: "\u0423\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0446\u0438\u044F",
  secondAppointmentDetail: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \xB7 60 \u043C\u0438\u043D\u0443\u0442",
  breakTitle: "\u041F\u0435\u0440\u0435\u0440\u044B\u0432",
  widgetTitle: "\u041E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u044C \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432",
  widgetAction: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0440\u0435\u043C\u044F",
  productTitle: "\u0413\u0435\u043B\u044C-\u043C\u0443\u0441\u0441 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u0438\u0440\u0443\u044E\u0449\u0438\u0439",
  productDetail: "\u041A\u0430\u043C\u0443\u0444\u043B\u0438\u0440\u0443\u044E\u0449\u0438\u0439 \u2116 23 \xB7 15 \u0433",
  productCaption: "\u041F\u0440\u0438\u043C\u0435\u0440 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u0446\u0435\u043D\u044B",
  productImageUrl: "/storefront/products/gel-mousse-23.jpg",
  productPrice: 663,
  orderTitle: "\u0412\u0430\u0448 \u0437\u0430\u043A\u0430\u0437",
  orderBody: "\u0417\u0430\u043A\u0430\u0437 \u2192 \u0421\u043A\u043B\u0430\u0434 \u2192 \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430",
  demoLabel: "\u041F\u0440\u0438\u043C\u0435\u0440 \u0434\u0430\u043D\u043D\u044B\u0445"
};
const link = (id, label, url, action = "none") => ({ id, label, url, action, newTab: false });
const defaultSiteContent = {
  contacts: { phone: "8 (918) 449-63-94", email: "info@sarkisianbrand.ru", country: "\u0420\u043E\u0441\u0441\u0438\u044F" },
  brand: { name: "SARKISIAN BRAND", logoUrl: "/sarkisian-logo.png", footerText: "\u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430. \u041E\u0442 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u2014 \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C." },
  home: {
    order: [...homeSectionKeys],
    hidden: [],
    business: { eyebrow: "SARKISIAN \u0414\u041B\u042F \u0411\u0418\u0417\u041D\u0415\u0421\u0410", title: "\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B.", accent: "\u0423\u0434\u043E\u0431\u043D\u044B\u0439 \u0431\u0438\u0437\u043D\u0435\u0441.", body: "\u0417\u0430\u043A\u0443\u043F\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C\u044E \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u0432 \u043E\u0434\u043D\u043E\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435. \u0414\u0432\u0430 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u0430 \u2014 \u0434\u043B\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B \u0441\u0430\u043B\u043E\u043D\u0430 \u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u043E\u043A SARKISIAN.", buttonLabel: "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0431\u0438\u0437\u043D\u0435\u0441\u0430", url: "/business", visualLabel: "\u0412\u0410\u0428 \u0420\u0410\u0411\u041E\u0427\u0418\u0419 \u041A\u0410\u0411\u0418\u041D\u0415\u0422", visualTitle: "\u0412\u0441\u0451 \u0432\u0430\u0436\u043D\u043E\u0435 \u2014 \u043F\u043E\u0434 \u0440\u0443\u043A\u043E\u0439", visualImageUrl: "", visualVideoUrl: "", visualLines: ["\u0417\u0430\u043A\u0443\u043F\u043A\u0438 \u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F", "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C, \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u044B", "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0438 \u0432\u0438\u0434\u0436\u0435\u0442 \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u0438"], theme: "light", preview: defaultBusinessPreview },
    referral: { eyebrow: "\u0420\u0415\u0424\u0415\u0420\u0410\u041B\u042C\u041D\u0410\u042F \u041F\u0420\u041E\u0413\u0420\u0410\u041C\u041C\u0410", title: "\u0414\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u043B\u044E\u0431\u0438\u043C\u044B\u043C.", accent: "\u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0431\u043E\u043D\u0443\u0441\u044B.", body: "\u0420\u0430\u0441\u0441\u043A\u0430\u0436\u0438\u0442\u0435 \u0434\u0440\u0443\u0437\u044C\u044F\u043C \u043E SARKISIAN \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0435. \u0417\u0430 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u044B\u0445 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432 \u043F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0431\u043E\u043D\u0443\u0441\u044B \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435.", buttonLabel: "\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442", url: "/club/referrals", visualLabel: "\u041E\u0422 \u041C\u0410\u0421\u0422\u0415\u0420\u0410 \u2014 \u0414\u0420\u0423\u0417\u042C\u042F\u041C", visualTitle: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F \u0441 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u0435\u043C", visualImageUrl: "", visualVideoUrl: "", visualLines: ["\u0412\u0430\u0448\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430", "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0451\u043D\u043D\u043E\u0433\u043E \u043A\u043B\u0438\u0435\u043D\u0442\u0430", "\u0411\u043E\u043D\u0443\u0441\u044B \u0434\u043B\u044F \u043B\u044E\u0431\u0438\u043C\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432"], theme: "light" },
    bloggers: { eyebrow: "\u0411\u041B\u041E\u0413\u0415\u0420\u0410\u041C \u0418 \u0410\u0412\u0422\u041E\u0420\u0410\u041C", title: "\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u043A\u043E\u043D\u0442\u0435\u043D\u0442.", accent: "\u0420\u0430\u0441\u0442\u0438\u0442\u0435 \u0441 \u0431\u0440\u0435\u043D\u0434\u043E\u043C.", body: "\u0414\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u043E\u043F\u044B\u0442\u043E\u043C \u0441 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0435\u0439, \u0441\u043B\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430\u043C\u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439 \u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0434\u0435\u043D\u0435\u0436\u043D\u043E\u0435 \u0432\u043E\u0437\u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0435. \u0417\u0430 \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0441\u0430\u043B\u043E\u043D\u0430 \u0438\u043B\u0438 \u0431\u0438\u0437\u043D\u0435\u0441\u0430 \u043F\u0440\u0435\u0434\u0443\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0430 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430.", buttonLabel: "\u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E", url: "/partnerships#bloggers", visualLabel: "\u041F\u0410\u0420\u0422\u041D\u0401\u0420\u042B SARKISIAN", visualTitle: "\u0412\u0430\u0448 \u043E\u043F\u044B\u0442 \u0438\u043C\u0435\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", visualImageUrl: "/storefront/svetlana-creator-youtube.jpg", visualVideoUrl: "/storefront/svetlana-creator-video.mp4", visualLines: ["\u0421\u0441\u044B\u043B\u043A\u0430 \u0438 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439", "\u0412\u043E\u0437\u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0435 \u0437\u0430 B2C-\u043F\u043E\u043A\u0443\u043F\u043A\u0438", "\u041E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430 \u0437\u0430 \u043D\u043E\u0432\u044B\u0439 \u0431\u0438\u0437\u043D\u0435\u0441"], theme: "dark" },
    categories: { eyebrow: "\u0412\u042B\u0411\u0418\u0420\u0410\u0419\u0422\u0415 \u041F\u041E \u0417\u0410\u0414\u0410\u0427\u0415", title: "\u0412\u0441\u0451 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0435\n\u0434\u043B\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u044B", buttonLabel: "\u0412\u0435\u0441\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433" },
    bestsellers: { eyebrow: "\u0412\u042B\u0411\u041E\u0420 \u041C\u0410\u0421\u0422\u0415\u0420\u041E\u0412", title: "\u0411\u0435\u0441\u0442\u0441\u0435\u043B\u043B\u0435\u0440\u044B", buttonLabel: "\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435", mode: "popular", productIds: [] },
    club: { label: "SARKISIAN CLUB", title: "\u041F\u043E\u043A\u0443\u043F\u0430\u0439\u0442\u0435 \u043B\u044E\u0431\u0438\u043C\u043E\u0435.", accent: "\u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0431\u043E\u043B\u044C\u0448\u0435.", benefits: [
      { id: "rewards", icon: "award", text: "\u0411\u043E\u043D\u0443\u0441\u044B \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0438 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432" },
      { id: "levels", icon: "gift", text: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0443\u0447\u0430\u0441\u0442\u0438\u044F \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0432 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435" },
      { id: "balance", icon: "shield", text: "\u0411\u0430\u043B\u0430\u043D\u0441 \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0439 \u0432\u0441\u0435\u0433\u0434\u0430 \u043F\u043E\u0434 \u0440\u0443\u043A\u043E\u0439" }
    ], joinLabel: "\u0412\u0441\u0442\u0443\u043F\u0438\u0442\u044C \u0432 \u043A\u043B\u0443\u0431", aboutLabel: "\u041E \u043A\u043B\u0443\u0431\u0435", previewLabel: "\u041F\u0440\u0438\u043C\u0435\u0440 \u0431\u043E\u043D\u0443\u0441\u043D\u043E\u0433\u043E \u0431\u0430\u043B\u0430\u043D\u0441\u0430", previewBalance: 1250 },
    manifesto: { text: "SARKISIAN \u2014 \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0440\u0435\u043D\u0434 \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u043C\u0430\u043D\u0438\u043A\u044E\u0440\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044E \u0438\u0437\u043D\u0443\u0442\u0440\u0438." },
    story: { eyebrow: "SARKISIAN BRAND", title: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C", accent: "\u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u0435\u0435", body: "\u041C\u044B \u043D\u0435 \u043F\u0440\u043E\u0441\u0442\u043E \u043F\u0440\u043E\u0434\u0430\u0451\u043C \u2014 \u043C\u044B \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u043C \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u043E\u0434 \u043B\u0438\u0447\u043D\u044B\u043C \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u044B \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D. \u0422\u043E\u043B\u044C\u043A\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u044F, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0443\u0434\u043E\u0431\u043D\u044B \u0432 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435.", buttonLabel: "\u041F\u043E\u0437\u043D\u0430\u043A\u043E\u043C\u0438\u0442\u044C\u0441\u044F \u0441 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430\u043C\u0438", portraitUrl: "/storefront/svetlana-portrait.png" },
    benefits: [
      { id: "delivery", icon: "package", eyebrow: "01 / \u0414\u041E\u0421\u0422\u0410\u0412\u041A\u0410", title: "\u0411\u044B\u0441\u0442\u0440\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430", body: "\u041F\u0435\u0440\u0435\u0434\u0430\u0451\u043C \u0437\u0430\u043A\u0430\u0437 \u0432 \u0441\u0431\u043E\u0440\u043A\u0443 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u0438 \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u043C \u043E \u043A\u0430\u0436\u0434\u043E\u043C \u044D\u0442\u0430\u043F\u0435." },
      { id: "quality", icon: "shield", eyebrow: "02 / \u041A\u0410\u0427\u0415\u0421\u0422\u0412\u041E", title: "\u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0434\u0443\u043A\u0446\u0438\u044F", body: "\u041D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u043E\u0442 SARKISIAN BRAND \u2014 \u0441 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0435\u043C \u043A\u0430\u0436\u0434\u043E\u0439 \u043F\u0430\u0440\u0442\u0438\u0438." },
      { id: "club", icon: "award", eyebrow: "03 / SARKISIAN CLUB", title: "\u0411\u043E\u043D\u0443\u0441\u044B \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0438", body: "\u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C \u0447\u0430\u0441\u0442\u044C \u0437\u0430\u043A\u0430\u0437\u0430 \u0431\u0430\u043B\u043B\u0430\u043C\u0438 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u043F\u043E\u043A\u0443\u043F\u043E\u043A." },
      { id: "expertise", icon: "sparkles", eyebrow: "04 / \u042D\u041A\u0421\u041F\u0415\u0420\u0422\u0418\u0417\u0410", title: "\u0421\u043E\u0437\u0434\u0430\u043D\u043E \u0434\u043B\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432", body: "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u043E\u0439 \u0421\u0430\u0440\u043A\u0438\u0441\u044F\u043D \u0432 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0439 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435." }
    ]
  },
  footer: { columns: [
    { id: "buyers", title: "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044F\u043C", items: [link("catalog", "\u041A\u0430\u0442\u0430\u043B\u043E\u0433", "/catalog"), link("account", "\u041B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442", "/account", "account"), link("favorites", "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", "/favorites", "favorites"), link("cart", "\u041A\u043E\u0440\u0437\u0438\u043D\u0430", "/cart", "cart")] },
    { id: "company", title: "\u041A\u043E\u043C\u043F\u0430\u043D\u0438\u044F", items: [link("about", "\u041E \u0431\u0440\u0435\u043D\u0434\u0435", "/about"), link("delivery", "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0438 \u043E\u043F\u043B\u0430\u0442\u0430", "/delivery"), link("club", "\u041E \u043A\u043B\u0443\u0431\u0435", "/club"), link("studio", "\u0418\u0433\u0440\u0430 \xAB\u0421\u0442\u0443\u0434\u0438\u044F\xBB", "/studio"), link("business", "\u0414\u043B\u044F \u0431\u0438\u0437\u043D\u0435\u0441\u0430", "/business"), link("partnerships", "\u0414\u043B\u044F \u0431\u043B\u043E\u0433\u0435\u0440\u043E\u0432", "/partnerships"), link("contacts", "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B", "/contacts"), link("b2b", "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 B2B", "/b2b-login")] }
  ], legalLinks: [
    { id: "privacy", label: "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438", url: "/privacy", newTab: false },
    { id: "oferta", label: "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F \u043E\u0444\u0435\u0440\u0442\u0430", url: "/oferta", newTab: false },
    { id: "returns", label: "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430", url: "/returns", newTab: false }
  ] }
};
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function safeSiteContentUrl(value, image = false) {
  if (typeof value !== "string" || !value || value.length > 500 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return false;
  }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.split(/[/?#]/).includes("..") || decoded.startsWith("//")) return false;
  if (value.startsWith("/")) return !image || value === "/sarkisian-logo.png" || /^\/(?:storefront\/|api\/v1\/media\/files\/)/.test(value);
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && host.includes(".") && !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) && !/\.(?:localhost|local|internal|test|invalid)$/.test(host) && !host.includes(":") && !/^\d+(?:\.\d+){3}$/.test(host);
  } catch {
    return false;
  }
}
function siteContentPhoneHref(phone) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 11 && digits.startsWith("8") ? `+7${digits.slice(1)}` : phone.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+7${digits}` : `+${digits || "79184496394"}`}`;
}
const limits = { phone: 30, email: 254, country: 80, name: 80, logoUrl: 500, footerText: 500, eyebrow: 100, title: 200, visualLabel: 100, visualTitle: 200, visualImageUrl: 500, visualVideoUrl: 500, buttonLabel: 80, label: 80, accent: 200, text: 250, joinLabel: 80, aboutLabel: 80, previewLabel: 100, body: 1e3, portraitUrl: 500, id: 80, url: 500 };
const templates = {
  "home.club.benefits": { id: "", icon: "award", text: "" },
  "home.benefits": { id: "", icon: "package", eyebrow: "", title: "", body: "" },
  "footer.columns": { id: "", title: "", items: [] },
  "footer.columns.items": { id: "", label: "", url: "/catalog", action: "none", newTab: false },
  "footer.legalLinks": { id: "", label: "", url: "/privacy", newTab: false }
};
const arrayLimits = { "home.club.benefits": 6, "home.benefits": 8, "footer.columns": 4, "footer.columns.items": 12, "footer.legalLinks": 8 };
function mergeValue(base, input, path) {
  if (Array.isArray(base)) {
    if (!Array.isArray(input)) return base.map((item) => mergeValue(item, void 0, path));
    if (path === "home.order" || path === "home.hidden") {
      const valid = input.every((item) => homeSectionKeys.includes(item)) && new Set(input).size === input.length;
      if (!valid) return [...base];
      if (path === "home.hidden") return [...input];
      if (input.length === homeSectionKeys.length) return [...input];
      if (input.length === legacyHomeSections.length && legacyHomeSections.every((key2) => input.includes(key2))) {
        const clubIndex = input.indexOf("club");
        return [...input.slice(0, clubIndex), "business", "club", "referral", "bloggers", ...input.slice(clubIndex + 1)];
      }
      return [...base];
    }
    if (path.endsWith(".visualLines")) return input.length <= 4 && input.every((item) => typeof item === "string" && item.length <= 150) ? [...input] : [...base];
    if (path === "home.bestsellers.productIds") return input.length <= 8 && input.every((item) => typeof item === "string" && !!item.trim() && item.length <= 80) && new Set(input).size === input.length ? [...input] : [...base];
    const template = templates[path];
    if (!template || input.length > arrayLimits[path]) return base.map((item) => mergeValue(item, void 0, path));
    if (!input.every((item) => object(item) && (item.id === void 0 || typeof item.id === "string" && !!item.id.trim() && item.id.length <= 80))) return base.map((item) => mergeValue(item, void 0, path));
    const rows = input.map((item, index) => {
      const fallback = (item.id === void 0 ? base[index] : base.find((row) => row.id === item.id)) || { ...template, id: `${path.replace(/\./g, "-")}-${index + 1}` };
      return mergeValue(fallback, item, path);
    });
    return new Set(rows.map((item) => item.id)).size === rows.length ? rows : base.map((item) => mergeValue(item, void 0, path));
  }
  if (object(base)) return Object.fromEntries(Object.keys(base).map((key2) => [key2, mergeValue(base[key2], object(input) && Object.prototype.hasOwnProperty.call(input, key2) ? input[key2] : void 0, path ? `${path}.${key2}` : key2)]));
  if (typeof base === "boolean") return typeof input === "boolean" ? input : base;
  if (typeof base === "number") return Number.isInteger(input) && input >= 0 && input <= 1e6 ? input : base;
  if (typeof input !== "string") return base;
  const key = path.split(".").pop();
  const max = key === "productImageUrl" ? 500 : path === "home.manifesto.text" ? 500 : path === "home.story.body" ? 2e3 : path === "footer.columns.title" ? 100 : limits[key] || 80;
  if (input.length > max) return base;
  if (key === "visualImageUrl" || key === "visualVideoUrl") return input === "" || safeSiteContentUrl(input, true) ? input : base;
  if (key === "logoUrl" || key === "portraitUrl" || key === "productImageUrl") return safeSiteContentUrl(input, true) ? input : base;
  if (key === "url") return safeSiteContentUrl(input) ? input : base;
  if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return base;
  if (key === "phone" && !/^\+?[\d ()-]+$/.test(input)) return base;
  const allowed = key === "theme" ? ["dark", "light", "rose"] : key === "mode" ? ["popular", "manual"] : key === "action" ? ["none", "account", "favorites", "cart"] : key === "icon" ? path.startsWith("home.club.") ? ["award", "gift", "shield"] : ["package", "shield", "award", "sparkles"] : void 0;
  return allowed && !allowed.includes(input) ? base : input;
}
function mergeSiteContent(input) {
  return mergeValue(defaultSiteContent, input, "");
}

function catalogCategoryPath(category) {
  const slug = typeof category === "string" ? category : category.slug;
  return `/catalog/${encodeURIComponent(slug)}`;
}
function catalogProductCategory(product) {
  var _a;
  return (_a = [...product.categories || []].filter((item) => {
    var _a2;
    return ((_a2 = item.category) == null ? void 0 : _a2.slug) && item.category.isActive !== false;
  }).sort((a, b) => {
    var _a2, _b;
    return Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || (((_a2 = a.category) == null ? void 0 : _a2.sortOrder) || 0) - (((_b = b.category) == null ? void 0 : _b.sortOrder) || 0) || a.category.slug.localeCompare(b.category.slug, "en");
  })[0]) == null ? void 0 : _a.category;
}
function catalogProductPath(product) {
  const category = catalogProductCategory(product);
  return `${category ? catalogCategoryPath(category) : "/catalog"}/${encodeURIComponent(product.slug)}`;
}

const legacyPhotos = {
  "/catalog/gel-muss-prozrachnyi-15-gr.jpg": "/storefront/products/gel-mousse-clear.jpg",
  "/catalog/freza-almaznaya-shar-40-mm.jpg": "/storefront/products/cutter-ball.jpg",
  "/catalog/gel-muss-kamufliruyushchiy-23.jpg": "/storefront/products/gel-mousse-23.jpg",
  "/catalog/gel-skorostnoy-002-30-ml.jpg": "/storefront/products/speed-gel-002.jpg",
  "/catalog/gel-skorostnoy-111-30-ml.jpg": "/storefront/products/gel-skorostnoy-111-30-ml.jpg",
  "/catalog/gel-skorostnoy-011-30-ml.jpg": "/storefront/products/gel-skorostnoy-011-30-ml.jpg",
  "/catalog/gel-modeliruyushchiy-201-30-ml.jpg": "/storefront/products/gel-modeliruyushchiy-201-30-ml.jpg",
  "/catalog/gel-skorostnoy-021-shimmer-30-ml.jpg": "/storefront/products/gel-skorostnoy-021-shimmer-30-ml.jpg",
  "/catalog/nozhnitsy-pro-levsha.jpg": "/storefront/products/nozhnitsy-pro-levsha.jpg",
  "/catalog/nozhnitsy-pro-pravsha.jpg": "/storefront/products/nozhnitsy-pro-pravsha.jpg"
};
function normalizeMediaImageUrl(value, apiBase, siteUrl = "http://localhost:3001") {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw || /[\x00-\x20\\]/.test(raw) || !/^(?:\/(?!\/)|https?:\/\/)/i.test(raw)) return "";
  try {
    if (/^\/api(?:\/|$)/.test(raw)) return apiBase.startsWith("/") ? raw : new URL(raw, new URL(apiBase, siteUrl).origin).href;
    if (raw.startsWith("/")) return raw;
    const parsed = new URL(raw);
    return parsed.username || parsed.password ? "" : parsed.href;
  } catch {
    return "";
  }
}
function resolveProductImageUrl(value, apiBase, siteUrl) {
  const normalized = normalizeMediaImageUrl(value, apiBase, siteUrl);
  return normalized.startsWith("/catalog/") ? legacyPhotos[normalized] || "" : normalized;
}

const DEFAULT_PRODUCT_BADGES = [
  { id: "new", label: "\u041D\u043E\u0432\u0438\u043D\u043A\u0430", color: "#202127", textColor: "#ffffff", isActive: true, rule: "new", newDays: 30 },
  { id: "popular", label: "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0435", color: "#202127", textColor: "#ffffff", isActive: true, rule: "manual", newDays: 30 },
  { id: "sale", label: "\u0421\u043A\u0438\u0434\u043A\u0430", color: "#ff5948", textColor: "#ffffff", isActive: true, rule: "sale", newDays: 30 }
];
function storefrontVariantPrice(variant, gift = false, now = Date.now()) {
  var _a, _b;
  const regular = Number((_b = (_a = variant == null ? void 0 : variant.regularPrice) != null ? _a : variant == null ? void 0 : variant.price) != null ? _b : 0), sale = Number(variant == null ? void 0 : variant.salePrice);
  const starts = (variant == null ? void 0 : variant.saleStartsAt) ? new Date(variant.saleStartsAt).getTime() : -Infinity;
  const ends = (variant == null ? void 0 : variant.saleEndsAt) ? new Date(variant.saleEndsAt).getTime() : Infinity;
  return !gift && (variant == null ? void 0 : variant.salePrice) != null && Number.isFinite(sale) && sale >= 0 && sale < regular && starts <= now && now < ends ? sale : regular;
}
function storefrontBadges(product, definitions, now = Date.now()) {
  const created = new Date(product.createdAt).getTime(), age = now - created;
  return definitions.filter((b) => {
    var _a, _b;
    return b.isActive && (b.rule === "manual" ? (_a = product.badgeIds) == null ? void 0 : _a.includes(b.id) : b.rule === "new" ? age >= 0 && age < b.newDays * 864e5 : b.rule === "sale" && product.productType !== "GIFT_CARD" && ((_b = product.variants) == null ? void 0 : _b.some((v) => {
      var _a2;
      return v.isActive !== false && storefrontVariantPrice(v, false, now) < Number((_a2 = v.regularPrice) != null ? _a2 : v.price);
    })));
  }).slice(0, 3);
}

function catalogVolume(variant, product) {
  var _a, _b, _c;
  const options = (variant == null ? void 0 : variant.options) || {};
  const configured = (_c = (_b = (_a = options.volume) != null ? _a : options["\u043E\u0431\u044A\u0435\u043C"]) != null ? _b : options["\u043E\u0431\u044A\u0451\u043C"]) != null ? _c : options.weight;
  const source = configured == null ? `${(variant == null ? void 0 : variant.name) || ""} ${(product == null ? void 0 : product.nameRu) || ""}` : String(configured);
  const match = source.match(/(?:^|[^\d])([0-9]+(?:[.,][0-9]+)?)\s*(мл|ml|гр|г|g)(?![a-zа-я])/i);
  if (match) return `${Number(match[1].replace(",", "."))} ${/^(ml|мл)$/i.test(match[2]) ? "\u043C\u043B" : "\u0433\u0440"}`;
  return configured != null && /^\d+(?:[.,]\d+)?$/.test(source.trim()) ? String(Number(source.trim().replace(",", "."))) : "";
}

async function fetchFavoriteProducts(ids, fetchBatch) {
  const unique = [...new Set(ids)];
  if (unique.some((id) => typeof id !== "string" || !/^[A-Za-z0-9-]{1,80}$/.test(id))) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0433\u043E \u0442\u043E\u0432\u0430\u0440\u0430");
  const products = /* @__PURE__ */ new Map();
  const batches = [];
  for (let offset = 0; offset < unique.length; offset += 8) batches.push(unique.slice(offset, offset + 8));
  for (let offset = 0; offset < batches.length; offset += 4) {
    const group = batches.slice(offset, offset + 4);
    const results = await Promise.all(group.map((batch) => fetchBatch(batch)));
    for (let index = 0; index < group.length; index++) {
      const batch = group[index], result = results[index];
      if (!result || !Array.isArray(result.items)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430");
      for (const item of result.items) {
        if (!item || typeof item.id !== "string" || !batch.includes(item.id)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0442\u043E\u0432\u0430\u0440 \u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430");
        products.set(item.id, item);
      }
    }
  }
  return unique.flatMap((id) => products.has(id) ? [products.get(id)] : []);
}

// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fglobal-polyfills.mjs
if (!("global" in globalThis)) globalThis.global = globalThis;
// node_modules/nuxt/dist/head/runtime/island-head.js
/**
* No-op `head.push` until the returned `unfreeze` runs. Plugin/transformer
* augmentations on the same head are unaffected.
*/
function freezeHead(head) {
	const realPush = head.push;
	head.push = () => ({
		dispose: () => {},
		patch: () => {},
		_i: 0
	});
	return () => {
		head.push = realPush;
	};
}
// node_modules/nuxt/dist/head/runtime/plugins/unhead.server.js
var plugin$3 = defineNuxtPlugin({
	name: "nuxt:head",
	enforce: "pre",
	setup(nuxtApp) {
		const head = nuxtApp.ssrContext.head;
		if (nuxtApp.ssrContext.islandContext) {
			const unfreeze = freezeHead(head);
			nuxtApp.hooks.hookOnce("app:created", unfreeze);
		}
		nuxtApp.vueApp.use(head);
	}
});
// node_modules/nuxt/dist/pages/runtime/utils.js
var ROUTE_KEY_PARENTHESES_RE$1 = /(:\w+)\([^)]+\)/g;
var ROUTE_KEY_SYMBOLS_RE$1 = /(:\w+)[?+*]/g;
var ROUTE_KEY_NORMAL_RE$1 = /:\w+/g;
var interpolatePath = (route, match) => {
	return match.path.replace(ROUTE_KEY_PARENTHESES_RE$1, "$1").replace(ROUTE_KEY_SYMBOLS_RE$1, "$1").replace(ROUTE_KEY_NORMAL_RE$1, (r) => route.params[r.slice(1)]?.toString() || "");
};
var generateRouteKey$1 = (routeProps, override) => {
	const matchedRoute = routeProps.route.matched.find((m) => m.components?.default === routeProps.Component.type);
	const source = matchedRoute?.meta.key ?? (matchedRoute && interpolatePath(routeProps.route, matchedRoute));
	return typeof source === "function" ? source(routeProps.route) : source;
};
/** @since 3.9.0 */
function toArray(value) {
	return Array.isArray(value) ? value : [value];
}
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Froute-rules.mjs
var foldedMatcher = /* @__PURE__ */ (() => {
	const $0 = { redirect: "/admin-workspace" }, $1 = { redirect: "/crm-marketplaces" }, $2 = {};
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1);
		if (p === "/admin") r.push({ data: $0 });
		else if (p === "/marketplaces") r.push({ data: $1 });
		else if (p === "/courses/my") r.push({ data: $2 });
		else if (p === "/media-library") r.push({ data: $2 });
		else if (p === "/meeting-guest") r.push({ data: $2 });
		else if (p === "/crm/sw.js") r.push({ data: $2 });
		else if (p === "/crm/manifest.webmanifest") r.push({ data: $2 });
		else if (p.charCodeAt(p.length - 1) === 47) {
			if (p === "/admin/") r.push({ data: $0 });
			else if (p === "/marketplaces/") r.push({ data: $1 });
			else if (p === "/courses/my/") r.push({ data: $2 });
			else if (p === "/media-library/") r.push({ data: $2 });
			else if (p === "/meeting-guest/") r.push({ data: $2 });
			else if (p === "/crm/sw.js/") r.push({ data: $2 });
			else if (p === "/crm/manifest.webmanifest/") r.push({ data: $2 });
		}
		let s = p.split("/");
		if (s.length > 1 && s[s.length - 1] === "") {
			s.pop();
			p = p.slice(0, -1);
		}
		let l = s.length;
		if (l > 1) {
			if (s[1] === "booking") r.push({
				data: $2,
				params: { "_": p.slice(9) }
			});
			else if (s[1] === "booking-manage") r.push({
				data: $2,
				params: { "_": p.slice(16) }
			});
			else if (s[1] === "courses") {
				if (l > 2) {
					if (s[2] === "my") r.push({
						data: $2,
						params: { "_": p.slice(12) }
					});
				}
			} else if (s[1] === "meeting-guest") r.push({
				data: $2,
				params: { "_": p.slice(15) }
			});
			else if (s[1] === "crm") r.push({
				data: $2,
				params: { "_": p.slice(5) }
			});
		}
		return r.reverse();
	};
})();
var decodeRoutePath = function decodeRoutePath(path) {
	if (!path.includes("%")) return path;
	const queryIndex = path.indexOf("?");
	const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
	try {
		return queryIndex === -1 ? decodeURI(pathname) : decodeURI(pathname) + path.slice(queryIndex);
	} catch {
		return path;
	}
};
var normalizePath = (path, fold) => {
	if (typeof path !== "string") return path;
	const decoded = decodeRoutePath(path);
	return fold ? decoded.toLowerCase() : decoded;
};
var virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froute_rules_default = (path) => defu({}, ...foldedMatcher("", normalizePath(path, true)).map((r) => r.data).reverse());
// node_modules/nuxt/dist/app/components/utils.js
var ROUTE_KEY_PARENTHESES_RE = /(:\w+)\([^)]+\)/g;
var ROUTE_KEY_SYMBOLS_RE = /(:\w+)[?+*]/g;
var ROUTE_KEY_NORMAL_RE = /:\w+/g;
function generateRouteKey(route) {
	const source = route?.meta.key ?? route.path.replace(ROUTE_KEY_PARENTHESES_RE, "$1").replace(ROUTE_KEY_SYMBOLS_RE, "$1").replace(ROUTE_KEY_NORMAL_RE, (r) => route.params[r.slice(1)]?.toString() || "");
	return typeof source === "function" ? source(route) : source;
}
/**
* Utility used within router guards
* return true if the route has been changed with a page change during navigation
*/
function isChangingPage(to, from) {
	if (to === from || from === START_LOCATION) return false;
	if (generateRouteKey(to) !== generateRouteKey(from)) return true;
	if (to.matched.every((comp, index) => comp.components && comp.components.default === from.matched[index]?.components?.default)) return false;
	return true;
}
var VALID_TAG_RE = /^[a-z][a-z0-9-]*$/i;
/** Return `tag` if it is a safe HTML tag name, otherwise `fallback`. */
function sanitizeTag(tag, fallback) {
	return tag && VALID_TAG_RE.test(tag) ? tag : fallback;
}
// node_modules/nuxt/dist/pages/runtime/router.options.js
var router_options_default = { scrollBehavior(to, from, savedPosition) {
	const nuxtApp = useNuxtApp();
	const router = useRouter();
	const hashScrollBehaviour = router.options?.scrollBehaviorType ?? "auto";
	if (to.path.replace(/\/$/, "") === from.path.replace(/\/$/, "")) {
		if (from.hash && !to.hash) return savedPosition ?? {
			left: 0,
			top: 0
		};
		if (to.hash) return {
			el: to.hash,
			top: _getHashElementScrollMarginTop(to.hash),
			behavior: hashScrollBehaviour
		};
		return false;
	}
	if ((typeof to.meta.scrollToTop === "function" ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop) === false) return false;
	if (from === START_LOCATION) return _calculatePosition(to, from, savedPosition, hashScrollBehaviour);
	return new Promise((resolve) => {
		const doScroll = () => {
			requestAnimationFrame(() => {
				if (router.currentRoute.value.fullPath !== to.fullPath) {
					resolve(false);
					return;
				}
				resolve(_calculatePosition(to, from, savedPosition, hashScrollBehaviour));
			});
		};
		nuxtApp.hooks.hookOnce("page:loading:end", () => {
			const transitionPromise = nuxtApp["~transitionPromise"];
			if (transitionPromise) transitionPromise.then(doScroll);
			else doScroll();
		});
	});
} };
function _getHashElementScrollMarginTop(hash) {
	const elem = (void 0).getElementById(hash.slice(1));
	if (!elem) return 0;
	return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0) + (Number.parseFloat(getComputedStyle((void 0).documentElement).scrollPaddingTop) || 0);
}
function _calculatePosition(to, from, savedPosition, defaultHashScrollBehaviour) {
	if (savedPosition) return savedPosition;
	if (to.hash) return {
		el: to.hash,
		top: _getHashElementScrollMarginTop(to.hash),
		behavior: isChangingPage(to, from) ? defaultHashScrollBehaviour : "instant"
	};
	return {
		left: 0,
		top: 0
	};
}
var virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default = {
	hashMode: false,
	scrollBehaviorType: "auto",
	sensitive: false,
	...router_options_default
};
Object.assign(Object.create(null), {});
var pageIslandRoutes = Object.assign(Object.create(null), {});
// node_modules/nuxt/dist/pages/runtime/validate.js
var middleware$1 = defineNuxtRouteMiddleware(async (to) => {
	let __temp, __restore;
	if (!to.meta?.validate) return;
	const result = ([__temp, __restore] = executeAsync(() => Promise.resolve(to.meta.validate(to))), __temp = await __temp, __restore(), __temp);
	if (result === true) return;
	return createError$2({
		fatal: false,
		status: result && (result.status || result.statusCode) || 404,
		statusText: result && (result.statusText || result.statusMessage) || `Page Not Found: ${to.fullPath}`,
		data: { path: to.fullPath }
	});
});
// middleware/crm-routes.global.ts
var crm_routes_global_default = defineNuxtRouteMiddleware((to) => {
	const path = to.path === "/crm" ? "/crm/" : crmLegacyPath(to.path, to.query.section);
	if (path) return navigateTo({
		path,
		query: to.query,
		hash: to.hash
	}, {
		replace: true,
		redirectCode: 302
	});
});
// composables/useB2BSession.ts
var keys = {
	token: "sarkisian-b2b-token",
	refresh: "sarkisian-b2b-refresh",
	user: "sarkisian-b2b-user"
};
var refreshes = /* @__PURE__ */ new WeakMap();
var restores = /* @__PURE__ */ new WeakMap();
var statusOf = (error) => Number(error?.response?.status || error?.statusCode || error?.status || 0);
function useB2BSession() {
	const sessionApp = useNuxtApp();
	const config = useRuntimeConfig();
	const token = useState("b2b-token", () => "");
	const refreshToken = useState("b2b-refresh", () => "");
	const user = useState("b2b-user", () => null);
	const hydrated = useState("b2b-hydrated", () => false);
	const generation = useState("b2b-session-generation", () => 0);
	const logoutWarning = useState("b2b-logout-warning", () => "");
	const organizations = useState("b2b-organizations", () => []);
	const selectedOrganizationId = useState("b2b-organization", () => "");
	const organizationRevision = useState("b2b-organization-revision", () => 0);
	const organizationUser = useState("b2b-organization-user", () => "");
	const organizationSelectionRequired = useState("b2b-organization-selection-required", () => false);
	const branding = useState("salon-branding", () => null);
	function resetOrganizations() {
		organizations.value = [];
		selectedOrganizationId.value = "";
		organizationUser.value = "";
		organizationSelectionRequired.value = false;
		organizationRevision.value++;
		branding.value = null;
	}
	function selectOrganization(id) {
		if (id && !organizations.value.some((item) => item.id === id)) throw new Error("Нет доступа к выбранной организации");
		organizationSelectionRequired.value = !id;
		if (selectedOrganizationId.value === id) return;
		selectedOrganizationId.value = id;
		organizationRevision.value++;
		branding.value = null;
	}
	async function loadOrganizations(force = false) {
		if (!user.value?.id) return [];
		if (!force && organizationUser.value === user.value.id) return organizations.value;
		const currentUser = user.value.id;
		const rows = await request("/b2b/organizations");
		if (user.value?.id !== currentUser) return [];
		organizations.value = rows;
		organizationUser.value = currentUser;
		const remembered = "";
		const lostSelection = Boolean(selectedOrganizationId.value) || organizationSelectionRequired.value;
		selectOrganization(rows.some((item) => item.id === selectedOrganizationId.value) ? selectedOrganizationId.value : lostSelection ? "" : rows.some((item) => item.id === remembered) ? remembered : rows.length === 1 ? rows[0].id : "");
		return rows;
	}
	const browser = browserSession(sessionApp, "sarkisian-b2b-session", keys, () => ({
		token: token.value,
		refreshToken: refreshToken.value,
		user: user.value
	}), (value, initial) => {
		const nextUser = value.user?.role === "CUSTOMER_B2B" ? value.user : null;
		const valid = !value.user || Boolean(nextUser), nextToken = valid ? value.token : "", nextRefresh = valid ? value.refreshToken : "";
		if (!initial && (user.value?.id !== nextUser?.id || !nextToken && !nextRefresh)) {
			generation.value++;
			resetOrganizations();
			refreshes.delete(sessionApp);
			restores.delete(sessionApp);
		}
		token.value = nextToken;
		refreshToken.value = nextRefresh;
		user.value = nextUser;
	});
	const syncStoredSession = () => false;
	function persist(force = false, expectedRefresh) {
		return true;
	}
	function hydrate() {}
	async function login(email, password) {
		const actor = generation.value;
		const result = await $fetch$1$1("/auth/login", {
			baseURL: config.public.apiBase,
			method: "POST",
			body: {
				email,
				password
			},
			timeout: 15e3,
			retry: 0
		});
		if (generation.value !== actor) throw new Error("Сессия изменилась. Повторите вход.");
		if (result.user.role !== "CUSTOMER_B2B") throw new Error("Для этой учётной записи предназначен другой кабинет");
		adoptSession(result, actor);
		return result.user;
	}
	function adoptSession(result, expectedGeneration) {
		if (expectedGeneration !== void 0 && generation.value !== expectedGeneration) throw new Error("Сессия изменилась. Войдите в созданный бизнес-аккаунт отдельно.");
		if (result.user?.role !== "CUSTOMER_B2B" || !result.accessToken || !result.refreshToken) throw new Error("Требуется отдельная бизнес-учётная запись");
		generation.value++;
		resetOrganizations();
		refreshes.delete(sessionApp);
		restores.delete(sessionApp);
		token.value = result.accessToken;
		refreshToken.value = result.refreshToken;
		user.value = result.user;
		logoutWarning.value = "";
		hydrated.value = true;
	}
	function logout(explicit = true) {
		generation.value++;
		token.value = "";
		refreshToken.value = "";
		user.value = null;
		resetOrganizations();
		refreshes.delete(sessionApp);
		restores.delete(sessionApp);
	}
	async function refresh() {
		const pending = refreshes.get(sessionApp);
		if (pending) return pending;
		const actor = generation.value, initialRefresh = refreshToken.value;
		if (!initialRefresh) {
			logout(false);
			return false;
		}
		const work = browser.locked(async () => {
			try {
				if (generation.value !== actor) return false;
				if (refreshToken.value !== initialRefresh) return Boolean(token.value);
				const result = await $fetch$1$1("/auth/refresh", {
					baseURL: config.public.apiBase,
					method: "POST",
					body: { refreshToken: initialRefresh },
					timeout: 1e4,
					retry: 0
				});
				if (generation.value !== actor) return false;
				if (refreshToken.value !== initialRefresh) return Boolean(token.value);
				if (!result?.accessToken || !result?.refreshToken) throw new Error("Сервер не вернул данные сессии. Повторите попытку.");
				token.value = result.accessToken;
				refreshToken.value = result.refreshToken;
				return generation.value === actor && Boolean(token.value);
			} catch (error) {
				if (generation.value === actor && refreshToken.value !== initialRefresh && token.value) return true;
				if (generation.value === actor && refreshToken.value === initialRefresh && [401, 403].includes(statusOf(error))) logout(false);
				throw error;
			}
		});
		refreshes.set(sessionApp, work);
		try {
			return await work;
		} finally {
			if (refreshes.get(sessionApp) === work) refreshes.delete(sessionApp);
		}
	}
	async function request(path, options = {}) {
		const beforeSync = generation.value;
		if (generation.value !== beforeSync) throw new Error("Сессия изменилась в другой вкладке. Повторите действие.");
		const actor = generation.value, initialToken = token.value;
		const businessRequest = path.startsWith("/b2b/") && path !== "/b2b/organizations";
		const organization = selectedOrganizationId.value, revision = organizationRevision.value;
		const send = () => {
			if (businessRequest && organizationUser.value === user.value?.id && !organization) throw new Error("Выберите организацию перед продолжением работы");
			if (businessRequest && organizationRevision.value !== revision) throw new Error("Организация изменилась. Повторите действие в выбранном кабинете.");
			const headers = new Headers(options.headers);
			headers.set("Authorization", `Bearer ${token.value}`);
			headers.delete("X-B2B-Organization-Id");
			if (businessRequest && organization) headers.set("X-B2B-Organization-Id", organization);
			return $fetch$1$1(path, {
				baseURL: config.public.apiBase,
				timeout: 2e4,
				retry: 0,
				...options,
				headers
			}).then((result) => {
				if (generation.value !== actor) throw new Error("Сессия изменилась. Повторите действие в текущем кабинете.");
				if (businessRequest && organizationRevision.value !== revision) throw new Error("Организация изменилась. Данные предыдущей организации не загружены.");
				return result;
			});
		};
		try {
			return await send();
		} catch (error) {
			if (statusOf(error) !== 401 || generation.value !== actor || options.signal?.aborted) throw error;
			if (generation.value !== actor) throw error;
			if (token.value === initialToken && !await refresh()) throw error;
			if (generation.value !== actor || !token.value) throw error;
			return send();
		}
	}
	async function restore() {
		const pending = restores.get(sessionApp);
		if (pending) return pending;
		if (!token.value && !refreshToken.value) return null;
		const actor = generation.value;
		const work = (async () => {
			try {
				if (!token.value && !await refresh()) return null;
				const account = await request("/auth/me");
				if (generation.value !== actor) return user.value;
				if (account?.role !== "CUSTOMER_B2B") {
					logout(false);
					return null;
				}
				user.value = account;
				return account;
			} catch (error) {
				if (generation.value !== actor) return user.value;
				if ([401, 403].includes(statusOf(error))) {
					logout(false);
					return null;
				}
				throw error;
			}
		})();
		restores.set(sessionApp, work);
		try {
			return await work;
		} finally {
			if (restores.get(sessionApp) === work) restores.delete(sessionApp);
		}
	}
	async function endSession() {
		const actor = generation.value;
		let revoked = !token.value;
		try {
			if (token.value) revoked = (await request("/auth/logout", {
				method: "POST",
				timeout: 1e4
			}))?.loggedOut === true;
		} catch {} finally {
			if (generation.value === actor) {
				logout();
				logoutWarning.value = revoked ? "" : "Вы вышли на этом устройстве. Сервер не подтвердил завершение сессии. Проверьте активные сессии в профиле после восстановления связи.";
			}
		}
		return { revoked };
	}
	return {
		token,
		refreshToken,
		user,
		hydrated,
		generation,
		logoutWarning,
		syncStoredSession,
		storageKey: browser.storageKey,
		organizations,
		selectedOrganizationId,
		organizationRevision,
		loadOrganizations,
		selectOrganization,
		adoptSession,
		hydrate,
		persist,
		login,
		restore,
		refresh,
		request,
		logout,
		endSession
	};
}
// composables/useWorkspaceAccess.ts
var workspaceAccessFlights = /* @__PURE__ */ new WeakMap();
function useWorkspaceAccess() {
	const session = useWorkspaceSession(), app = useNuxtApp();
	const identity = computed(() => `${session.user.value?.id || ""}:${session.token.value}`);
	const state = useState("workspace-access", () => ({
		identity: "",
		permissions: [],
		ready: false,
		loading: false,
		error: "",
		version: 0
	}));
	const current = computed(() => state.value.identity === identity.value && state.value.ready);
	const loading = computed(() => state.value.identity === identity.value && state.value.loading);
	const error = computed(() => state.value.identity === identity.value ? state.value.error : "");
	async function refresh() {
		const actor = session.generation.value, pending = workspaceAccessFlights.get(app);
		if (pending?.generation === actor) return pending.promise;
		const version = state.value.version + 1;
		state.value = {
			identity: identity.value,
			permissions: [],
			ready: false,
			loading: Boolean(session.token.value || session.refreshToken.value),
			error: "",
			version
		};
		if (!session.token.value && !session.refreshToken.value) return;
		const promise = (async () => {
			try {
				for (let attempt = 0; attempt < 3; attempt++) {
					const requestedIdentity = identity.value;
					state.value.identity = requestedIdentity;
					state.value.loading = true;
					const result = await session.request("/auth/access");
					if (session.generation.value !== actor || state.value.version !== version) return;
					if (requestedIdentity !== identity.value) continue;
					if (!Array.isArray(result.permissions) || result.permissions.some((key) => typeof key !== "string")) throw new Error("Invalid access response");
					state.value = {
						identity: requestedIdentity,
						permissions: result.permissions,
						ready: true,
						loading: false,
						error: "",
						version
					};
					return;
				}
				throw new Error("Session changed during access check");
			} catch {
				if (session.generation.value === actor && state.value.version === version) state.value = {
					identity: identity.value,
					permissions: [],
					ready: false,
					loading: false,
					error: "Не удалось проверить права доступа. Проверьте соединение и повторите попытку.",
					version
				};
			} finally {
				if (state.value.version === version) state.value.loading = false;
			}
		})();
		const flight = {
			generation: actor,
			promise
		};
		workspaceAccessFlights.set(app, flight);
		try {
			await promise;
		} finally {
			if (workspaceAccessFlights.get(app) === flight) workspaceAccessFlights.delete(app);
		}
	}
	function can(permission) {
		return !permission || current.value && state.value.permissions.includes(permission);
	}
	async function ensure() {
		if (!current.value) await refresh();
	}
	return {
		ready: current,
		loading,
		error,
		can,
		refresh,
		ensure
	};
}
// composables/useWorkspaceNavigation.ts
var INTERNAL = [
	"ADMIN",
	"CONTENT_MANAGER",
	"MANAGER_B2B",
	"MANAGER_SALES",
	"MARKETPLACE_MANAGER",
	"SUPERVISOR",
	"EXECUTIVE",
	"IT_SUPPORT",
	"CURATOR",
	"WAREHOUSE"
];
var WEB = [
	"ADMIN",
	"MANAGER_SALES",
	"SUPERVISOR",
	"WAREHOUSE",
	"EXECUTIVE"
];
var CATALOG = [
	"ADMIN",
	"CONTENT_MANAGER",
	"MANAGER_SALES",
	"SUPERVISOR",
	"WAREHOUSE"
];
var CRM_READ = [...[
	"ADMIN",
	"MANAGER_B2B",
	"MANAGER_SALES",
	"SUPERVISOR"
], "EXECUTIVE"];
var MARKETING = [
	"ADMIN",
	"MANAGER_SALES",
	"SUPERVISOR"
];
var SITE = [
	"ADMIN",
	"CONTENT_MANAGER",
	"SUPERVISOR"
];
var CHANNELS = [
	"ADMIN",
	"MARKETPLACE_MANAGER",
	"SUPERVISOR",
	"EXECUTIVE",
	"WAREHOUSE"
];
var SUPPORT = [
	"ADMIN",
	"IT_SUPPORT",
	"SUPERVISOR",
	"EXECUTIVE"
];
var REPORTS = [
	"ADMIN",
	"EXECUTIVE",
	"SUPERVISOR"
];
var ADMIN = ["ADMIN"];
/** One registry for rail, toolbar, command search, breadcrumbs and the workspace hub.
* site-content is the only coordinated new section: parent wires its actual editor.
* No hypothetical warehouse/refund routes are exposed.
* Every protected data section uses the same permission keys as its API.
*/
var WORKSPACE_NAVIGATION = [
	{
		id: "courses",
		label: "Обучение",
		description: "Курсы, программа и тарифы.",
		icon: "BookOpen",
		items: [{
			id: "courses",
			label: "Курсы",
			to: "/crm/courses",
			permission: "lms.read",
			roles: [
				"ADMIN",
				"SUPERVISOR",
				"CONTENT_MANAGER"
			],
			keywords: "обучение уроки тарифы программа видео презентации"
		}]
	},
	{
		id: "studio",
		label: "Игра и награды",
		description: "Условия обмена монет на скидки.",
		icon: "Gift",
		items: [{
			id: "studio-rewards",
			label: "Награды игры",
			to: "/crm/studio-rewards",
			permission: "promotions.read",
			roles: [
				"ADMIN",
				"CONTENT_MANAGER",
				"MANAGER_SALES",
				"SUPERVISOR"
			],
			keywords: "игра студия скидки монеты промокоды награды"
		}]
	},
	{
		id: "dashboard",
		label: "Рабочий стол",
		description: "Быстрые переходы и обзор интернет-магазина.",
		icon: "LayoutDashboard",
		items: [{
			id: "web-dashboard",
			label: "Обзор магазина",
			to: "/admin-workspace/dashboard",
			permission: "admin.read",
			roles: CATALOG
		}]
	},
	{
		id: "sales",
		label: "Продажи",
		description: "Заказы интернет-магазина.",
		icon: "ShoppingBag",
		items: [
			{
				id: "inventory",
				label: "Товары и остатки",
				to: "/crm/inventory",
				permission: "inventory.read",
				requires: ["oms.read"],
				roles: [
					"ADMIN",
					"MANAGER_B2B",
					"MANAGER_SALES",
					"MARKETPLACE_MANAGER",
					"SUPERVISOR",
					"EXECUTIVE",
					"WAREHOUSE"
				],
				keywords: "склад товары артикул sku наличие остатки резервы отгрузить"
			},
			{
				id: "b2b-orders",
				label: "Заказы B2B",
				to: "/crm/b2b-orders",
				permission: "oms.read",
				roles: [
					"ADMIN",
					"MANAGER_B2B",
					"MANAGER_SALES",
					"MARKETPLACE_MANAGER",
					"SUPERVISOR",
					"EXECUTIVE",
					"WAREHOUSE"
				],
				keywords: "опт компании поставки заказы"
			},
			{
				id: "order-fulfillment",
				label: "Сборка и отгрузка",
				to: "/crm/fulfillment",
				permission: "oms.read",
				roles: [
					"ADMIN",
					"MANAGER_B2B",
					"MANAGER_SALES",
					"MARKETPLACE_MANAGER",
					"SUPERVISOR",
					"EXECUTIVE",
					"WAREHOUSE"
				],
				keywords: "склад сборка отгрузка исполнение"
			},
			{
				id: "web-orders",
				label: "Заказы интернет-магазина",
				to: "/admin-workspace/orders",
				permission: "web_orders.read",
				roles: WEB,
				keywords: "web продажи оплата доставка"
			}
		]
	},
	{
		id: "catalog",
		label: "Каталог",
		description: "Товары, варианты и карточки интернет-магазина.",
		icon: "Boxes",
		items: [
			{
				id: "products",
				label: "Товары",
				to: "/admin-workspace/products",
				permission: "catalog.read",
				roles: CATALOG,
				keywords: "каталог sku артикул карточки остатки"
			},
			{
				id: "categories",
				label: "Категории",
				to: "/admin-workspace/categories",
				permission: "catalog.read",
				roles: CATALOG,
				keywords: "дерево подкатегории фото описание порядок"
			},
			{
				id: "product-badges",
				label: "Бейджи товаров",
				to: "/admin-workspace/product-badges",
				permission: "catalog.read",
				roles: CATALOG,
				keywords: "новинка популярное скидка метки"
			}
		]
	},
	{
		id: "crm",
		label: "CRM",
		description: "Клиенты, организации, воронка и задачи команды.",
		icon: "Users",
		items: [
			{
				id: "crm-dashboard",
				label: "Обзор CRM",
				to: "/crm/",
				permission: "crm.read",
				roles: CRM_READ
			},
			{
				id: "pipeline",
				label: "Воронка продаж",
				to: "/crm/deals",
				permission: "crm.read",
				roles: CRM_READ,
				keywords: "сделки лиды kanban"
			},
			{
				id: "customers",
				label: "Клиенты 360°",
				to: "/crm/customers",
				permission: "customers.read",
				roles: CRM_READ
			},
			{
				id: "web-customers",
				label: "Клиенты интернет-магазина",
				to: "/admin-workspace/customers",
				permission: "crm.read",
				roles: MARKETING
			},
			{
				id: "organizations",
				label: "Организации B2B",
				to: "/crm/organizations",
				permission: "customers.read",
				roles: CRM_READ,
				keywords: "компании партнеры"
			},
			{
				id: "tasks",
				label: "Задачи",
				to: "/crm/tasks",
				permission: "crm.read",
				roles: CRM_READ,
				keywords: "календарь gantt команда"
			},
			{
				id: "crm-files",
				label: "Файлы",
				to: "/crm/files",
				permission: "crm.read",
				roles: CRM_READ,
				keywords: "диск документы папки вложения загрузка"
			},
			{
				id: "work-schedule",
				label: "Графики работы",
				to: "/crm/work-schedule",
				permission: "work_schedule.read",
				roles: INTERNAL,
				keywords: "смены работа сотрудники календарь выходные отсутствие расписание"
			},
			{
				id: "work-time",
				label: "Рабочее время",
				to: "/crm/work-time",
				permission: "work_time.read",
				roles: INTERNAL,
				keywords: "начать завершить день перерыв фактическое время история часов"
			},
			{
				id: "crm-chat",
				label: "Чат команды",
				to: "/crm/chat",
				roles: INTERNAL,
				keywords: "общение сообщения переписка сотрудники"
			},
			{
				id: "crm-meetings",
				label: "Календарь событий",
				to: "/crm/meetings",
				permission: "meetings.read",
				roles: INTERNAL,
				keywords: "мероприятия совещания планёрки собеседования расписание приглашения участие Google Яндекс Apple"
			},
			{
				id: "payment-calendar",
				label: "Календарь платежей",
				to: "/crm/payment-calendar",
				permission: "payment_calendar.read",
				roles: INTERNAL,
				keywords: "финансы расходы связь интернет сервер подписка сумма оплата периодичность"
			},
			{
				id: "content-plan",
				label: "Контент-план",
				to: "/crm/content-plan",
				permission: "content_plan.read",
				roles: [...CRM_READ, "CONTENT_MANAGER"],
				keywords: "smm смм контент календарь рилс reels shorts шортс сценарий публикации"
			}
		]
	},
	{
		id: "loyalty",
		label: "Бонусная программа",
		description: "Правила клуба и бонусные счета клиентов.",
		icon: "Award",
		items: [{
			id: "loyalty-settings",
			label: "Настройки программы",
			to: "/admin-workspace/loyalty-settings",
			permission: "loyalty.read",
			roles: MARKETING,
			keywords: "клуб баллы правила sarkisian club начисления"
		}, {
			id: "loyalty-members",
			label: "Участники",
			to: "/admin-workspace/loyalty-members",
			permission: "loyalty.read",
			roles: MARKETING,
			keywords: "клуб счета баланс история бонусы"
		}]
	},
	{
		id: "referral",
		label: "Реферальная программа",
		description: "Персональные ссылки и бонусы частным клиентам.",
		icon: "UserRoundPlus",
		items: [
			{
				id: "referral-settings",
				label: "Настройки программы",
				to: "/admin-workspace/referral-settings",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "referral-participants",
				label: "Участники",
				to: "/admin-workspace/referral-participants",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "referral-rewards",
				label: "Начисления",
				to: "/admin-workspace/referral-rewards",
				roles: MARKETING,
				permission: "partners.read"
			}
		]
	},
	{
		id: "bloggers",
		label: "Авторы и блогеры",
		description: "Партнёры, аналитика, привлечённые организации и выплаты.",
		icon: "Users",
		items: [
			{
				id: "bloggers-overview",
				label: "Обзор",
				to: "/admin-workspace/bloggers-overview",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "bloggers-participants",
				label: "Заявки и партнёры",
				to: "/admin-workspace/bloggers-participants",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "bloggers-registrations",
				label: "Привлечённые организации",
				to: "/admin-workspace/bloggers-registrations",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "bloggers-rewards",
				label: "Начисления",
				to: "/admin-workspace/bloggers-rewards",
				roles: MARKETING,
				permission: "partners.read",
				keywords: "блогеры начисления авторы вознаграждения"
			},
			{
				id: "bloggers-payouts",
				label: "Выплаты",
				to: "/admin-workspace/bloggers-payouts",
				roles: ADMIN,
				permission: "partners.payouts",
				keywords: "выплаты блогерам авторам"
			},
			{
				id: "bloggers-settings",
				label: "Настройки программы",
				to: "/admin-workspace/bloggers-settings",
				roles: MARKETING,
				permission: "partners.read"
			},
			{
				id: "bloggers-gifts",
				label: "Подарки авторам",
				to: "/crm/bloggers/gifts",
				roles: ["ADMIN", "SUPERVISOR"],
				permission: "partners.write",
				keywords: "товары подарок блогеру автору бесплатная отправка сборка склад"
			}
		]
	},
	{
		id: "partner-documents",
		label: "Документы партнёров",
		description: "Общие документы для блогеров и участников реферальной программы.",
		icon: "FileSignature",
		items: [{
			id: "partner-documents-settings",
			label: "Шаблоны, генератор и подпись",
			to: "/crm/partners/documents",
			roles: ["ADMIN", "SUPERVISOR"],
			permission: "partners.write",
			keywords: "договоры документы шаблоны генератор SMS ПЭП ИП ООО рефералы блогеры"
		}]
	},
	{
		id: "marketing",
		label: "Маркетинг",
		description: "Промокоды и подарочные карты.",
		icon: "Megaphone",
		items: [
			{
				id: "contact-messages",
				label: "Сообщения с сайта",
				to: "/admin-workspace/contact-messages",
				permission: "crm.read",
				roles: MARKETING,
				keywords: "контакты форма обратной связи письма обращения"
			},
			{
				id: "promotions",
				label: "Промокоды",
				to: "/admin-workspace/promotions",
				permission: "promotions.read",
				roles: MARKETING,
				keywords: "скидки акции"
			},
			{
				id: "gift-cards",
				label: "Подарочные карты",
				to: "/admin-workspace/gift-cards",
				anyOf: ["gift_card_product.read", "gift_cards.read"],
				roles: MARKETING,
				keywords: "сертификаты номиналы"
			}
		]
	},
	{
		id: "site",
		label: "Сайт",
		description: "Витрина, содержание страниц и навигация магазина.",
		icon: "Palette",
		items: [
			{
				id: "appearance",
				label: "Витрина и баннеры",
				to: "/admin-workspace/appearance",
				permission: "catalog.read",
				roles: SITE,
				keywords: "главная фото категории соцсети меню"
			},
			{
				id: "site-content",
				label: "Контент сайта",
				to: "/admin-workspace/site-content",
				permission: "catalog.read",
				roles: SITE,
				keywords: "главная блоки тексты"
			},
			{
				id: "pages",
				label: "Страницы сайта",
				to: "/admin-workspace/pages",
				permission: "catalog.read",
				roles: SITE,
				keywords: "доставка контакты оферта политика"
			},
			{
				id: "catalog-menu",
				label: "Меню каталога",
				to: "/admin-workspace/catalog-menu",
				permission: "catalog.read",
				roles: SITE,
				keywords: "категории навигация"
			}
		]
	},
	{
		id: "support",
		label: "Поддержка",
		description: "Заявки, очереди и база знаний helpdesk.",
		icon: "Headphones",
		items: [
			{
				id: "helpdesk",
				label: "Обзор поддержки",
				to: "/helpdesk/overview",
				permission: "helpdesk.read",
				roles: SUPPORT
			},
			{
				id: "tickets",
				label: "Все заявки",
				to: "/helpdesk/tickets",
				permission: "helpdesk.read",
				roles: SUPPORT
			},
			{
				id: "queues",
				label: "Очереди",
				to: "/helpdesk/queues",
				permission: "helpdesk.read",
				roles: SUPPORT
			},
			{
				id: "knowledge",
				label: "База знаний",
				to: "/helpdesk/knowledge",
				permission: "helpdesk.read",
				roles: SUPPORT
			}
		]
	},
	{
		id: "channels",
		label: "Маркетплейсы",
		description: "Обзор маркетплейсов и настройки подключений.",
		icon: "Cable",
		items: [
			{
				id: "channel-dashboard",
				label: "Обзор маркетплейсов",
				to: "/crm-marketplaces/overview",
				permission: "marketplace.read",
				roles: CHANNELS
			},
			{
				id: "channel-orders",
				label: "Заказы маркетплейсов",
				to: "/crm-marketplaces/orders",
				permission: "marketplace.read",
				roles: CHANNELS,
				keywords: "ozon wb wildberries каналы продажи"
			},
			{
				id: "channel-integrations",
				label: "Подключения каналов",
				to: "/crm-marketplaces/integrations",
				permission: "marketplace.read",
				roles: CHANNELS
			}
		]
	},
	{
		id: "reports",
		label: "Отчёты",
		description: "Результаты компании, продажи и клиентская аналитика.",
		icon: "BarChart3",
		items: [
			{
				id: "leadership",
				label: "Результаты компании",
				to: "/leadership/overview",
				permission: "leadership.read",
				roles: REPORTS
			},
			{
				id: "sales-report",
				label: "Отчёт по продажам",
				to: "/leadership/sales",
				permission: "leadership.read",
				roles: REPORTS
			},
			{
				id: "customers-report",
				label: "Отчёт по клиентам",
				to: "/leadership/customers",
				permission: "leadership.read",
				roles: REPORTS
			}
		]
	},
	{
		id: "settings",
		label: "Настройки",
		description: "Доступ, сотрудники, интеграции и журналы экосистемы.",
		icon: "Settings",
		items: [
			{
				id: "system-overview",
				label: "Обзор системы",
				to: "/system-settings/overview",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "salon-subscription",
				label: "Подписка салонов",
				to: "/system-settings/salon-subscription",
				permission: "system.manage",
				roles: ADMIN,
				keywords: "тариф цена онлайн запись виджет салон подписка"
			},
			{
				id: "accounts",
				label: "Учётные записи",
				to: "/system-settings/accounts",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "trash",
				label: "Корзина данных",
				to: "/system-settings/trash",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "departments",
				label: "Отделы",
				to: "/crm/settings/departments",
				permission: "system.manage",
				roles: ADMIN,
				keywords: "команда структура руководитель подразделения"
			},
			{
				id: "staff",
				label: "Сотрудники",
				to: "/system-settings/staff",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "access",
				label: "Роли и права",
				to: "/system-settings/access",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "integrations",
				label: "Интеграции системы",
				to: "/system-settings/integrations",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "bot-commands",
				label: "Команды ботов",
				to: "/system-settings/bot-commands",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "audit",
				label: "Журнал действий",
				to: "/system-settings/audit",
				permission: "system.manage",
				roles: ADMIN
			},
			{
				id: "logs",
				label: "Технические журналы",
				to: "/system-settings/logs",
				permission: "system.manage",
				roles: ADMIN
			}
		]
	},
	{
		id: "media",
		label: "Медиатека",
		description: "Общие изображения и файлы для редакторов.",
		icon: "Images",
		items: [{
			id: "media-library",
			label: "Медиатека",
			to: "/media-library",
			permission: "media.read",
			roles: INTERNAL,
			keywords: "файлы изображения фото загрузки"
		}]
	}
];
function buildWorkspaceNavigation(role, can = () => true) {
	if (!role || !INTERNAL.includes(role)) return [];
	const order = [
		"dashboard",
		"sales",
		"catalog",
		"site",
		"loyalty",
		"referral",
		"bloggers",
		"partner-documents",
		"marketing",
		"crm",
		"support",
		"channels",
		"reports",
		"media",
		"settings"
	];
	return WORKSPACE_NAVIGATION.map((group) => ({
		...group,
		items: group.items.filter((item) => item.roles.includes(role) && can(item.permission) && (item.requires || []).every((key) => can(key)) && (!item.anyOf?.length || item.anyOf.some((key) => can(key)))).map((item) => {
			const destination = CRM_DESTINATIONS.find((destination) => destination.id === item.id);
			return {
				...item,
				label: destination?.label || item.label,
				keywords: `${item.keywords || ""} ${item.label} ${destination?.group || ""}`,
				to: destination?.path || item.to
			};
		})
	})).filter((group) => group.items.length).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
function flattenWorkspaceNavigation(groups) {
	return groups.flatMap((group) => group.items.map((item) => ({
		...item,
		groupId: group.id,
		groupLabel: group.label
	})));
}
var DEFAULT_SECTIONS = {
	"/admin-workspace": "dashboard",
	"/crm-marketplaces": "dashboard",
	"/helpdesk": "overview",
	"/leadership": "overview",
	"/system-settings": "overview"
};
function findWorkspaceLeaf(groups, path, section) {
	const crm = crmDestination(crmLegacyPath(path, section) || path);
	if (crm) return flattenWorkspaceNavigation(groups).find((item) => item.id === crm.id) || null;
	if (Array.isArray(section)) return null;
	const current = String(section || DEFAULT_SECTIONS[path] || "");
	const destination = DEFAULT_SECTIONS[path] ? `${path}/${path === "/crm-marketplaces" && ["dashboard", "settings"].includes(current) ? current === "settings" ? "integrations" : "overview" : current}` : path;
	return flattenWorkspaceNavigation(groups).find((item) => {
		const [itemPath, query] = item.to.split("?");
		return itemPath === destination && (!query || (new URLSearchParams(query).get("section") || "") === current);
	}) || null;
}
function searchWorkspaceLeaves(groups, query) {
	const terms = query.trim().toLocaleLowerCase("ru-RU").replace(/ё/g, "е").split(/\s+/).filter(Boolean);
	return flattenWorkspaceNavigation(groups).filter((item) => {
		const text = `${item.label} ${item.groupLabel} ${item.keywords || ""}`.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
		return terms.every((term) => text.includes(term));
	});
}
function sanitizeWorkspacePreferences(value, groups) {
	const allowed = new Set(flattenWorkspaceNavigation(groups).map((item) => item.id));
	const source = value && typeof value === "object" ? value : {};
	const ids = (data, limit) => Array.isArray(data) ? [...new Set(data.filter((id) => typeof id === "string" && allowed.has(id)))].slice(0, limit) : [];
	return {
		favorites: ids(source.favorites, 12),
		recent: ids(source.recent, 8),
		start: typeof source.start === "string" && allowed.has(source.start) ? source.start : null
	};
}
function useWorkspaceNavigation() {
	const route = useRoute();
	const { user } = useWorkspaceSession();
	const access = useWorkspaceAccess();
	const groups = computed(() => {
		const allowed = buildWorkspaceNavigation(user.value?.role, access.can);
		return route.path.startsWith("/admin-workspace") || route.path === "/media-library" ? allowed.filter((group) => [
			"dashboard",
			"catalog",
			"site",
			"media"
		].includes(group.id)) : allowed;
	});
	const leaves = computed(() => flattenWorkspaceNavigation(groups.value));
	const active = computed(() => findWorkspaceLeaf(groups.value, route.path, route.query.section));
	const preferences = useState("workspace-navigation-preferences", () => ({
		favorites: [],
		recent: [],
		start: null
	}));
	useState("workspace-navigation-preferences-owner", () => "");
	const paletteOpen = useState("workspace-navigation-palette-open", () => false);
	const resolved = computed(() => sanitizeWorkspacePreferences(preferences.value, groups.value));
	const favorites = computed(() => resolved.value.favorites.flatMap((id) => leaves.value.filter((item) => item.id === id)));
	const recent = computed(() => resolved.value.recent.flatMap((id) => leaves.value.filter((item) => item.id === id)));
	const start = computed(() => leaves.value.find((item) => item.id === resolved.value.start) || null);
	const breadcrumbs = computed(() => active.value && active.value.id !== "workspace" ? [
		{
			label: "Админка сайта",
			to: "/admin-workspace/dashboard"
		},
		...active.value.groupLabel !== "Рабочий стол" ? [{
			label: active.value.groupLabel,
			to: groups.value.find((group) => group.id === active.value.groupId)?.items[0]?.to || "/workspace"
		}] : [],
		{
			label: active.value.label,
			to: active.value.to
		}
	] : [{
		label: "Админка сайта",
		to: "/admin-workspace/dashboard"
	}]);
	function toggleFavorite(id) {
		if (!leaves.value.some((item) => item.id === id)) return;
		const ids = resolved.value.favorites;
		preferences.value = {
			...resolved.value,
			favorites: ids.includes(id) ? ids.filter((value) => value !== id) : [...ids.slice(0, 11), id]
		};
	}
	function setStart(id) {
		if (id !== null && !leaves.value.some((item) => item.id === id)) return;
		preferences.value = {
			...resolved.value,
			start: id
		};
	}
	function rememberCurrent() {
		if (!access.ready.value) return;
		if (!active.value || active.value.id === "workspace") return;
		preferences.value = {
			...resolved.value,
			recent: [active.value.id, ...resolved.value.recent.filter((id) => id !== active.value.id)].slice(0, 8)
		};
	}
	watch(() => `${user.value?.id || ""}:${user.value?.role || ""}:${route.fullPath}`, rememberCurrent);
	watch(access.ready, (ready) => {
		if (ready) rememberCurrent();
	});
	return {
		groups,
		leaves,
		active,
		breadcrumbs,
		favorites,
		recent,
		start,
		paletteOpen,
		toggleFavorite,
		setStart,
		search: (query) => searchWorkspaceLeaves(groups.value, query)
	};
}
// middleware/workspace-auth.global.ts
var workspace_auth_global_default = defineNuxtRouteMiddleware(async (to) => {});
// middleware/workspace-pages.global.ts
var sections = {
	"/admin-workspace": [
		"dashboard",
		"appearance",
		"site-content",
		"catalog-menu",
		"pages",
		"orders",
		"products",
		"categories",
		"product-badges",
		"customers",
		"loyalty-settings",
		"loyalty-members",
		"promotions",
		"gift-cards",
		"contact-messages",
		"referral-settings",
		"referral-participants",
		"referral-rewards",
		"bloggers-overview",
		"bloggers-participants",
		"bloggers-registrations",
		"bloggers-rewards",
		"bloggers-payouts",
		"bloggers-settings"
	],
	"/crm-marketplaces": [
		"overview",
		"orders",
		"integrations"
	],
	"/helpdesk": [
		"overview",
		"tickets",
		"queues",
		"knowledge"
	],
	"/system-settings": [
		"overview",
		"salon-subscription",
		"accounts",
		"trash",
		"staff",
		"access",
		"integrations",
		"bot-commands",
		"audit",
		"logs"
	],
	"/leadership": [
		"overview",
		"sales",
		"customers"
	]
};
var workspace_pages_global_default = defineNuxtRouteMiddleware((to) => {
	const choices = sections[to.path];
	if (!choices) {
		if (Object.keys(sections).some((base) => to.path.startsWith(base + "/")) && "section" in to.query) {
			const query = { ...to.query };
			delete query.section;
			return navigateTo({
				path: to.path,
				query,
				hash: to.hash
			}, { replace: true });
		}
		return;
	}
	let section = typeof to.query.section === "string" ? to.query.section : choices[0];
	if (to.path === "/crm-marketplaces") section = section === "settings" ? "integrations" : section === "dashboard" ? "overview" : section;
	if (!choices.includes(section)) section = choices[0];
	const query = { ...to.query };
	delete query.section;
	return navigateTo({
		path: to.path + "/" + section,
		query,
		hash: to.hash
	}, { replace: true });
});
// node_modules/nuxt/dist/app/diagnostics/manifest.js
/**
* E5xxx
* App manifest / route-rules runtime diagnostics.
*/
var manifestDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
// node_modules/nuxt/dist/app/composables/manifest.js
function routeRulesMatcher(path) {
	return virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froute_rules_default(path);
}
function getRouteRules(arg) {
	const path = typeof arg === "string" ? arg : arg.path;
	try {
		return routeRulesMatcher(path);
	} catch (e) {
		manifestDiagnostics.NUXT_E5003({
			path,
			cause: e
		});
		return {};
	}
}
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fmiddleware.mjs
var globalMiddleware = [
	middleware$1,
	crm_routes_global_default,
	workspace_auth_global_default,
	workspace_pages_global_default,
	/* @__PURE__ */ defineNuxtRouteMiddleware((to) => {})
];
var namedMiddleware = { "catalog-legacy-links": () => import('../build/catalog-legacy-links-AXrwFwl1.mjs') };
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Froutes.mjs
var virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froutes_default = [
	{
		name: "crm-bloggers-gifts",
		path: "/crm/bloggers/gifts",
		component: () => import('../build/gifts-D15hoNch.mjs')
	},
	{
		name: "crm-bloggers-legal-entities",
		path: "/crm/bloggers/legal-entities",
		meta: { middleware: () => navigateTo("/crm/partners/documents", { redirectCode: 301 }) },
		component: () => import('../build/legal-entities-ZcxGJ9LE.mjs')
	},
	{
		name: "crm-bloggers-overview",
		path: "/crm/bloggers/overview",
		component: () => import('../build/overview-BoeWi9I6.mjs')
	},
	{
		name: "crm-bloggers-participants",
		path: "/crm/bloggers/participants",
		component: () => import('../build/participants-B-ZVzyeZ.mjs')
	},
	{
		name: "crm-bloggers-payouts",
		path: "/crm/bloggers/payouts",
		component: () => import('../build/payouts-CsxLVyIO.mjs')
	},
	{
		name: "crm-bloggers-registrations",
		path: "/crm/bloggers/registrations",
		component: () => import('../build/registrations-DBw8bB8L.mjs')
	},
	{
		name: "crm-bloggers-rewards",
		path: "/crm/bloggers/rewards",
		component: () => import('../build/rewards-Db9VoEcE.mjs')
	},
	{
		name: "crm-bloggers-settings",
		path: "/crm/bloggers/settings",
		component: () => import('../build/settings-CiBReE7g.mjs')
	},
	{
		name: "crm-loyalty-members",
		path: "/crm/loyalty/members",
		component: () => import('../build/members-aTrgRac2.mjs')
	},
	{
		name: "crm-loyalty-settings",
		path: "/crm/loyalty/settings",
		component: () => import('../build/settings-D1vdDK0X.mjs')
	},
	{
		name: "crm-marketplace-workspace-integrations",
		path: "/crm/marketplaces/integrations",
		component: () => import('../build/integrations-B2UrRp9g.mjs')
	},
	{
		name: "crm-marketplace-workspace-orders",
		path: "/crm/marketplaces/orders",
		component: () => import('../build/orders-DWAvfDD3.mjs')
	},
	{
		name: "crm-marketplace-workspace-overview",
		path: "/crm/marketplaces/overview",
		component: () => import('../build/overview-DUsF41--.mjs')
	},
	{
		name: "crm-partners-documents",
		path: "/crm/partners/documents",
		component: () => import('../build/documents-DutUoMrb.mjs')
	},
	{
		name: "crm-referrals-participants",
		path: "/crm/referrals/participants",
		component: () => import('../build/participants-Blg5VJWy.mjs')
	},
	{
		name: "crm-referrals-rewards",
		path: "/crm/referrals/rewards",
		component: () => import('../build/rewards-BLp9Kayr.mjs')
	},
	{
		name: "crm-referrals-settings",
		path: "/crm/referrals/settings",
		component: () => import('../build/settings-5-Z-Ny_8.mjs')
	},
	{
		name: "crm-reports-customers",
		path: "/crm/reports/customers",
		component: () => import('../build/customers-DqwyTD4u.mjs')
	},
	{
		name: "crm-reports-overview",
		path: "/crm/reports/overview",
		component: () => import('../build/overview-G8ycv_23.mjs')
	},
	{
		name: "crm-reports-sales",
		path: "/crm/reports/sales",
		component: () => import('../build/sales-BAPF9TDN.mjs')
	},
	{
		name: "crm-settings-access",
		path: "/crm/settings/access",
		component: () => import('../build/access-CHvfCLCa.mjs')
	},
	{
		name: "crm-settings-accounts",
		path: "/crm/settings/accounts",
		component: () => import('../build/accounts-DAXsd7j_.mjs')
	},
	{
		name: "crm-settings-audit",
		path: "/crm/settings/audit",
		component: () => import('../build/audit-BWI4HSR4.mjs')
	},
	{
		name: "crm-settings-bot-commands",
		path: "/crm/settings/bot-commands",
		component: () => import('../build/bot-commands-CrVmLbE-.mjs')
	},
	{
		name: "crm-settings-departments",
		path: "/crm/settings/departments",
		component: () => import('../build/departments-BQ8b0VBX.mjs')
	},
	{
		name: "crm-settings-integrations",
		path: "/crm/settings/integrations",
		component: () => import('../build/integrations-XyHM36iN.mjs')
	},
	{
		name: "crm-settings-logs",
		path: "/crm/settings/logs",
		component: () => import('../build/logs-B5cLIUOs.mjs')
	},
	{
		name: "crm-settings-overview",
		path: "/crm/settings/overview",
		component: () => import('../build/overview-38HHzmMg.mjs')
	},
	{
		name: "crm-settings-salon-subscription",
		path: "/crm/settings/salon-subscription",
		component: () => import('../build/salon-subscription-DwPMhVyp.mjs')
	},
	{
		name: "crm-settings-staff",
		path: "/crm/settings/staff",
		component: () => import('../build/staff-Dy68n5-h.mjs')
	},
	{
		name: "crm-settings-trash",
		path: "/crm/settings/trash",
		component: () => import('../build/trash-CK5kRyHn.mjs')
	},
	{
		name: "crm-support-knowledge",
		path: "/crm/support/knowledge",
		component: () => import('../build/knowledge-NXw0otBJ.mjs')
	},
	{
		name: "crm-support-overview",
		path: "/crm/support/overview",
		component: () => import('../build/overview-CzszreC5.mjs')
	},
	{
		name: "crm-support-queues",
		path: "/crm/support/queues",
		component: () => import('../build/queues-CDTk137G.mjs')
	},
	{
		name: "crm-support-tickets",
		path: "/crm/support/tickets",
		component: () => import('../build/tickets-CoPermDa.mjs')
	},
	{
		name: "courses-my-id",
		path: "/courses/my/:id()",
		component: () => import('../build/_id_-D4Dc66_5.mjs')
	},
	{
		name: "admin-workspace-appearance",
		path: "/admin-workspace/appearance",
		component: () => import('../build/appearance-Dxdtw8gF.mjs')
	},
	{
		name: "admin-workspace-bloggers-overview",
		path: "/admin-workspace/bloggers-overview",
		component: () => import('../build/bloggers-overview-9WzMPayn.mjs')
	},
	{
		name: "admin-workspace-bloggers-participants",
		path: "/admin-workspace/bloggers-participants",
		component: () => import('../build/bloggers-participants-Dxr3oizJ.mjs')
	},
	{
		name: "admin-workspace-bloggers-payouts",
		path: "/admin-workspace/bloggers-payouts",
		component: () => import('../build/bloggers-payouts-Cc02TjWM.mjs')
	},
	{
		name: "admin-workspace-bloggers-registrations",
		path: "/admin-workspace/bloggers-registrations",
		component: () => import('../build/bloggers-registrations-DMbI2S2v.mjs')
	},
	{
		name: "admin-workspace-bloggers-rewards",
		path: "/admin-workspace/bloggers-rewards",
		component: () => import('../build/bloggers-rewards-CnWDn2CO.mjs')
	},
	{
		name: "admin-workspace-bloggers-settings",
		path: "/admin-workspace/bloggers-settings",
		component: () => import('../build/bloggers-settings-BpNqXpK6.mjs')
	},
	{
		name: "admin-workspace-catalog-menu",
		path: "/admin-workspace/catalog-menu",
		component: () => import('../build/catalog-menu-CeIr0J6C.mjs')
	},
	{
		name: "admin-workspace-categories",
		path: "/admin-workspace/categories",
		component: () => import('../build/categories-CAs_0twb.mjs')
	},
	{
		name: "admin-workspace-contact-messages",
		path: "/admin-workspace/contact-messages",
		component: () => import('../build/contact-messages-dFm0EtGe.mjs')
	},
	{
		name: "admin-workspace-customers",
		path: "/admin-workspace/customers",
		component: () => import('../build/customers-CXpK5B6Y.mjs')
	},
	{
		name: "admin-workspace-dashboard",
		path: "/admin-workspace/dashboard",
		component: () => import('../build/dashboard-C4E_9n_z.mjs')
	},
	{
		name: "admin-workspace-gift-cards",
		path: "/admin-workspace/gift-cards",
		component: () => import('../build/gift-cards-BC_tlvVV.mjs')
	},
	{
		name: "admin-workspace-loyalty",
		path: "/admin-workspace/loyalty",
		component: () => import('../build/loyalty-CQ0ZPIg7.mjs')
	},
	{
		name: "admin-workspace-loyalty-members",
		path: "/admin-workspace/loyalty-members",
		component: () => import('../build/loyalty-members-BmhttyK8.mjs')
	},
	{
		name: "admin-workspace-loyalty-settings",
		path: "/admin-workspace/loyalty-settings",
		component: () => import('../build/loyalty-settings-BGn1FLyO.mjs')
	},
	{
		name: "admin-workspace-orders",
		path: "/admin-workspace/orders",
		component: () => import('../build/orders-DS2fJmZx.mjs')
	},
	{
		name: "admin-workspace-pages",
		path: "/admin-workspace/pages",
		component: () => import('../build/pages-sRYw0wpt.mjs')
	},
	{
		name: "admin-workspace-partner-legal-entities",
		path: "/admin-workspace/partner-legal-entities",
		meta: { middleware: () => navigateTo("/crm/partners/documents", { redirectCode: 301 }) },
		component: () => import('../build/partner-legal-entities-CWNycH-f.mjs')
	},
	{
		name: "admin-workspace-product-badges",
		path: "/admin-workspace/product-badges",
		component: () => import('../build/product-badges-BxvmEDCG.mjs')
	},
	{
		name: "admin-workspace-products",
		path: "/admin-workspace/products",
		component: () => import('../build/products-B08QUjk6.mjs')
	},
	{
		name: "admin-workspace-promotions",
		path: "/admin-workspace/promotions",
		component: () => import('../build/promotions-IWKkb5C1.mjs')
	},
	{
		name: "admin-workspace-referral-participants",
		path: "/admin-workspace/referral-participants",
		component: () => import('../build/referral-participants-CZH_176Y.mjs')
	},
	{
		name: "admin-workspace-referral-rewards",
		path: "/admin-workspace/referral-rewards",
		component: () => import('../build/referral-rewards-DEUwmuqG.mjs')
	},
	{
		name: "admin-workspace-referral-settings",
		path: "/admin-workspace/referral-settings",
		component: () => import('../build/referral-settings-C6z9Mhtp.mjs')
	},
	{
		name: "admin-workspace-site-content",
		path: "/admin-workspace/site-content",
		component: () => import('../build/site-content-nmF8Il6q.mjs')
	},
	{
		name: "auth-callback",
		path: "/auth/callback",
		component: () => import('../build/callback-_CrDTea2.mjs')
	},
	{
		name: "club-referrals",
		path: "/club/referrals",
		component: () => import('../build/referrals-OMIs4cQK.mjs')
	},
	{
		name: "courses-my",
		path: "/courses/my",
		component: () => import('../build/my-SGeO1cEp.mjs')
	},
	{
		name: "crm-marketplaces-integrations",
		path: "/crm-marketplaces/integrations",
		component: () => import('../build/integrations-fJYcFKKf.mjs')
	},
	{
		name: "crm-marketplaces-orders",
		path: "/crm-marketplaces/orders",
		component: () => import('../build/orders-CMY6Zdsy.mjs')
	},
	{
		name: "crm-marketplaces-overview",
		path: "/crm-marketplaces/overview",
		component: () => import('../build/overview-CCv_PDeu.mjs')
	},
	{
		name: "crm-b2b-orders",
		path: "/crm/b2b-orders",
		component: () => import('../build/b2b-orders-BrtqAWKS.mjs')
	},
	{
		name: "crm-buyers",
		path: "/crm/buyers",
		component: () => import('../build/buyers-CuuHxXol.mjs')
	},
	{
		name: "crm-chat",
		path: "/crm/chat",
		component: () => import('../build/chat-D6eKPT7r.mjs')
	},
	{
		name: "crm-content-plan",
		path: "/crm/content-plan",
		component: () => import('../build/content-plan-BcfN5RcM.mjs')
	},
	{
		name: "crm-courses",
		path: "/crm/courses",
		component: () => import('../build/courses-Bibxvzaf.mjs')
	},
	{
		name: "crm-customers",
		path: "/crm/customers",
		component: () => import('../build/customers-C5GRkxy7.mjs')
	},
	{
		name: "crm-deals",
		path: "/crm/deals",
		component: () => import('../build/deals-Bw4IBnjT.mjs')
	},
	{
		name: "crm-files",
		path: "/crm/files",
		component: () => import('../build/files-BAEnFtzS.mjs')
	},
	{
		name: "crm-fulfillment",
		path: "/crm/fulfillment",
		component: () => import('../build/fulfillment-DATA6JF1.mjs')
	},
	{
		name: "crm-gift-cards",
		path: "/crm/gift-cards",
		component: () => import('../build/gift-cards-CqwuoKuT.mjs')
	},
	{
		name: "crm-inventory",
		path: "/crm/inventory",
		component: () => import('../build/inventory-CwUl44FB.mjs')
	},
	{
		name: "crm-login",
		path: "/crm/login",
		component: () => import('../build/login-Dtvz6NGm.mjs')
	},
	{
		name: "crm-meetings",
		path: "/crm/meetings",
		component: () => import('../build/meetings-KRuLEKCe.mjs')
	},
	{
		name: "crm-messages",
		path: "/crm/messages",
		component: () => import('../build/messages-Ob_maXNG.mjs')
	},
	{
		name: "crm-orders",
		path: "/crm/orders",
		component: () => import('../build/orders-BlRd62Cc.mjs')
	},
	{
		name: "crm-organizations",
		path: "/crm/organizations",
		component: () => import('../build/organizations-BLTCeixE.mjs')
	},
	{
		name: "crm-payment-calendar",
		path: "/crm/payment-calendar",
		component: () => import('../build/payment-calendar-BeiukRCa.mjs')
	},
	{
		name: "crm-promotions",
		path: "/crm/promotions",
		component: () => import('../build/promotions-niKrzkCL.mjs')
	},
	{
		name: "crm-studio-rewards",
		path: "/crm/studio-rewards",
		component: () => import('../build/studio-rewards-CD2TDiiv.mjs')
	},
	{
		name: "crm-tasks",
		path: "/crm/tasks",
		component: () => import('../build/tasks-DiroW7WH.mjs')
	},
	{
		name: "crm-work-schedule",
		path: "/crm/work-schedule",
		component: () => import('../build/work-schedule-Behs3-Gt.mjs')
	},
	{
		name: "crm-work-time",
		path: "/crm/work-time",
		component: () => import('../build/work-time-1R-wOz5U.mjs')
	},
	{
		name: "helpdesk-knowledge",
		path: "/helpdesk/knowledge",
		component: () => import('../build/knowledge-DjaJ1D9c.mjs')
	},
	{
		name: "helpdesk-overview",
		path: "/helpdesk/overview",
		component: () => import('../build/overview-DWnFkiLx.mjs')
	},
	{
		name: "helpdesk-queues",
		path: "/helpdesk/queues",
		component: () => import('../build/queues-Df4TEfFO.mjs')
	},
	{
		name: "helpdesk-tickets",
		path: "/helpdesk/tickets",
		component: () => import('../build/tickets-CAqKFoeP.mjs')
	},
	{
		name: "leadership-customers",
		path: "/leadership/customers",
		component: () => import('../build/customers-CXthib_R.mjs')
	},
	{
		name: "leadership-overview",
		path: "/leadership/overview",
		component: () => import('../build/overview-TAzw-0W-.mjs')
	},
	{
		name: "leadership-sales",
		path: "/leadership/sales",
		component: () => import('../build/sales-D4i6UYa_.mjs')
	},
	{
		name: "system-settings-access",
		path: "/system-settings/access",
		component: () => import('../build/access-BCTL9AiO.mjs')
	},
	{
		name: "system-settings-accounts",
		path: "/system-settings/accounts",
		component: () => import('../build/accounts-DjaBaApu.mjs')
	},
	{
		name: "system-settings-audit",
		path: "/system-settings/audit",
		component: () => import('../build/audit-BxXY71qa.mjs')
	},
	{
		name: "system-settings-bot-commands",
		path: "/system-settings/bot-commands",
		component: () => import('../build/bot-commands-DhVVgpAu.mjs')
	},
	{
		name: "system-settings-integrations",
		path: "/system-settings/integrations",
		component: () => import('../build/integrations-BDkwlZKP.mjs')
	},
	{
		name: "system-settings-logs",
		path: "/system-settings/logs",
		component: () => import('../build/logs-Cnn4toFW.mjs')
	},
	{
		name: "system-settings-overview",
		path: "/system-settings/overview",
		component: () => import('../build/overview-Cq9vA5jJ.mjs')
	},
	{
		name: "system-settings-salon-subscription",
		path: "/system-settings/salon-subscription",
		component: () => import('../build/salon-subscription-BNR1oQDW.mjs')
	},
	{
		name: "system-settings-staff",
		path: "/system-settings/staff",
		component: () => import('../build/staff-CyJU7kew.mjs')
	},
	{
		name: "system-settings-trash",
		path: "/system-settings/trash",
		component: () => import('../build/trash--VWBZYP5.mjs')
	},
	{
		name: "booking-manage-organizationId",
		path: "/booking-manage/:organizationId()",
		component: () => import('../build/_organizationId_-C1X3RVra.mjs')
	},
	{
		name: "booking-organizationId",
		path: "/booking/:organizationId()",
		component: () => import('../build/_organizationId_-D1Fydqiv.mjs')
	},
	{
		name: "courses-id",
		path: "/courses/:id()",
		component: () => import('../build/_id_-CMXEWSgG.mjs')
	},
	{
		name: "orders-orderNumber",
		path: "/orders/:orderNumber()",
		component: () => import('../build/_orderNumber_-BiPnX2TT.mjs')
	},
	{
		name: "r-code",
		path: "/r/:code()",
		component: () => import('../build/_code_-CQlIFSXG.mjs')
	},
	{
		name: "account",
		path: "/account",
		component: () => import('../build/account-BY9D6eF4.mjs')
	},
	{
		name: "admin",
		path: "/admin",
		component: () => import('../build/admin-BKHB-kjW.mjs')
	},
	{
		name: "admin-workspace",
		path: "/admin-workspace",
		component: () => import('../build/admin-workspace-CjPRqerP.mjs')
	},
	{
		name: "b2b",
		path: "/b2b",
		component: () => import('../build/b2b-CAZmyvp6.mjs')
	},
	{
		name: "b2b-invite",
		path: "/b2b-invite",
		component: () => import('../build/b2b-invite-xRFL-lni.mjs')
	},
	{
		name: "b2b-login",
		path: "/b2b-login",
		component: () => import('../build/b2b-login-K8Xi5yYT.mjs')
	},
	{
		name: "business-registration",
		path: "/business-registration",
		component: () => import('../build/business-registration-s8CINSzV.mjs')
	},
	{
		name: "cart",
		path: "/cart",
		component: () => import('../build/cart-CdpUC-R1.mjs')
	},
	{
		name: "catalog",
		path: "/catalog",
		meta: { "middleware": "catalog-legacy-links" },
		component: () => import('../build/catalog-BxLEtyQM.mjs')
	},
	{
		name: "catalog-path",
		path: "/catalog/:segments(.*)*",
		meta: { key: (route) => route.path },
		component: () => import('../build/catalog-path-DhUZt0U6.mjs')
	},
	{
		name: "courses",
		path: "/courses",
		component: () => import('../build/courses-BKX4U11-.mjs')
	},
	{
		name: "crm",
		path: "/crm",
		component: () => import('../build/crm-B7Hb_pC1.mjs')
	},
	{
		name: "crm-marketplaces",
		path: "/crm-marketplaces",
		component: () => import('../build/crm-marketplaces-fvnTIUo7.mjs')
	},
	{
		name: "favorites",
		path: "/favorites",
		component: () => import('../build/favorites-D5yR41QR.mjs')
	},
	{
		name: "helpdesk",
		path: "/helpdesk",
		component: () => import('../build/helpdesk-zWsAkLtM.mjs')
	},
	{
		name: "leadership",
		path: "/leadership",
		component: () => import('../build/leadership-B42h1Wj9.mjs')
	},
	{
		name: "login",
		path: "/login",
		component: () => import('../build/login-D5--7r5I.mjs')
	},
	{
		name: "media-library",
		path: "/media-library",
		component: () => import('../build/media-library-ByUdU9CM.mjs')
	},
	{
		name: "meeting-guest",
		path: "/meeting-guest",
		component: () => import('../build/meeting-guest-DszGp8x0.mjs')
	},
	{
		name: "password-reset",
		path: "/password-reset",
		component: () => import('../build/password-reset-BOlbbGy0.mjs')
	},
	{
		name: "studio",
		path: "/studio",
		component: () => import('../build/studio-CWBAbGUb.mjs')
	},
	{
		name: "system-settings",
		path: "/system-settings",
		component: () => import('../build/system-settings-DnIEQgLy.mjs')
	},
	{
		name: "workspace",
		path: "/workspace",
		component: () => import('../build/workspace-1CL3H57y.mjs')
	},
	{
		name: "workspace-login",
		path: "/workspace-login",
		component: () => import('../build/workspace-login-CGWyneTg.mjs')
	},
	{
		name: "page",
		path: "/:page()",
		component: () => import('../build/_page_-CuK__8hm.mjs')
	},
	{
		name: "index",
		path: "/",
		component: () => import('../build/pages-r1c4QPI6.mjs')
	},
	{
		name: void 0,
		path: "/marketplaces",
		component: {}
	}
];
// node_modules/nuxt/dist/pages/runtime/plugins/router.js
var plugin$2 = defineNuxtPlugin({
	name: "nuxt:router",
	enforce: "pre",
	async setup(nuxtApp) {
		let __temp, __restore;
		let routerBase = useRuntimeConfig().app.baseURL;
		const history = virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.history?.(routerBase) ?? createMemoryHistory(routerBase);
		const routes = virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.routes ? ([__temp, __restore] = executeAsync(() => virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.routes(virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froutes_default)), __temp = await __temp, __restore(), __temp) ?? virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froutes_default : virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Froutes_default;
		let startPosition;
		const router = createRouter({
			...virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default,
			scrollBehavior: (to, from, savedPosition) => {
				if (from === START_LOCATION) {
					startPosition = savedPosition;
					return;
				}
				if (virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.scrollBehavior) {
					router.options.scrollBehavior = virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.scrollBehavior;
					if ("scrollRestoration" in (void 0).history) {
						const unsub = router.beforeEach(() => {
							unsub();
							(void 0).history.scrollRestoration = "manual";
						});
					}
					return virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.scrollBehavior(to, START_LOCATION, startPosition || savedPosition);
				}
			},
			history,
			routes
		});
		nuxtApp.vueApp.use(router);
		const previousRoute = shallowRef(router.currentRoute.value);
		router.afterEach((_to, from) => {
			previousRoute.value = from;
		});
		Object.defineProperty(nuxtApp.vueApp.config.globalProperties, "previousRoute", { get: () => previousRoute.value });
		const initialURL = nuxtApp.ssrContext.url;
		const _route = shallowRef(router.currentRoute.value);
		const syncCurrentRoute = () => {
			_route.value = router.currentRoute.value;
		};
		router.afterEach((to, from) => {
			const lastTo = to.matched.at(-1)?.components?.default;
			const lastFrom = from.matched.at(-1)?.components?.default;
			if (lastTo === lastFrom) {
				if (generateRouteKey$1({
					route: to,
					Component: { type: lastTo }
				}) === generateRouteKey$1({
					route: from,
					Component: { type: lastFrom }
				})) syncCurrentRoute();
				return;
			}
			if (to.matched.length < from.matched.length && to.matched.every((m, i) => m.components?.default === from.matched[i]?.components?.default)) syncCurrentRoute();
		});
		const route = { sync: syncCurrentRoute };
		for (const key in _route.value) Object.defineProperty(route, key, {
			get: () => _route.value[key],
			enumerable: true
		});
		nuxtApp._route = shallowReactive(route);
		nuxtApp._middleware ||= {
			global: [],
			named: {}
		};
		const error = useError();
		const isServerPage = nuxtApp.ssrContext?.islandContext?.name?.startsWith("page_");
		if (!nuxtApp.ssrContext?.islandContext || isServerPage) router.afterEach(async (to, _from, failure) => {
			delete nuxtApp._processingMiddleware;
			delete nuxtApp._middlewareTo;
			if (failure) await nuxtApp.callHook("page:loading:end");
			if (failure?.type === 4) return;
			if (to.redirectedFrom && to.fullPath !== initialURL) await nuxtApp.runWithContext(() => navigateTo(to.fullPath || "/"));
		});
		router.onError(async () => {
			delete nuxtApp._processingMiddleware;
			delete nuxtApp._middlewareTo;
			await nuxtApp.callHook("page:loading:end");
		});
		try {
			[__temp, __restore] = executeAsync(() => router.push(initialURL)), __temp = await __temp, __restore();
			[__temp, __restore] = executeAsync(() => router.isReady()), await __temp, __restore();
		} catch (error) {
			[__temp, __restore] = executeAsync(() => _showErrorUnlessCrawler(nuxtApp, error)), await __temp, __restore();
		}
		const resolvedInitialRoute = router.currentRoute.value;
		syncCurrentRoute();
		if (nuxtApp.ssrContext?.islandContext && !isServerPage) return { provide: { router } };
		const initialLayout = nuxtApp.payload.state._layout;
		router.beforeEach(async (to, from) => {
			await nuxtApp.callHook("page:loading:start");
			to.meta = reactive(to.meta);
			if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) to.meta.layout = initialLayout;
			nuxtApp._processingMiddleware = true;
			nuxtApp._middlewareTo = to;
			if (!nuxtApp.ssrContext?.islandContext || isServerPage) {
				const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
				for (const component of to.matched) {
					const componentMiddleware = component.meta.middleware;
					if (!componentMiddleware) continue;
					for (const entry of toArray(componentMiddleware)) middlewareEntries.add(entry);
				}
				const routeRules = getRouteRules({ path: to.path });
				if (routeRules.appMiddleware) for (const key in routeRules.appMiddleware) if (routeRules.appMiddleware[key]) middlewareEntries.add(key);
				else middlewareEntries.delete(key);
				for (const entry of middlewareEntries) {
					const middleware = typeof entry === "string" ? nuxtApp._middleware.named[entry] || await namedMiddleware[entry]?.().then((r) => r.default || r) : entry;
					if (!middleware) throw navigationDiagnostics.NUXT_E2004({
						entry: String(entry),
						validMiddleware: void 0
					});
					try {
						const run = () => nuxtApp.runWithContext(() => middleware(to, from));
						const result = await run();
						if (result === false || result instanceof Error) {
							const error = result || createError$2({
								status: 404,
								statusText: `Page Not Found: ${initialURL}`
							});
							await nuxtApp.runWithContext(() => showError(error));
							return false;
						}
						if (result === true) continue;
						if (result === false) return result;
						if (result) {
							if (isNuxtError(result) && result.fatal) await nuxtApp.runWithContext(() => showError(result));
							return result;
						}
					} catch (err) {
						const error = createError$2(err);
						if (error.fatal) await nuxtApp.runWithContext(() => showError(error));
						return error;
					}
				}
			}
		});
		if (isServerPage) router.beforeResolve((to) => {
			const expected = pageIslandRoutes[nuxtApp.ssrContext.islandContext.name];
			const actual = to.matched.find((m) => (m.components?.default)?.__nuxt_island)?.components?.default;
			if (!expected || expected !== actual?.__nuxt_island) {
				nuxtApp.ssrContext["~renderResponse"] = {
					statusCode: 400,
					statusMessage: "Invalid island request path"
				};
				return false;
			}
		});
		router.afterEach((to, _from, failure) => {
			if (to.matched.length === 0 && !error.value && !isNavigationFailure(failure, NavigationFailureType.aborted | NavigationFailureType.cancelled)) return nuxtApp.runWithContext(() => showError(createError$2({
				status: 404,
				fatal: false,
				statusText: `Page not found: ${to.fullPath}`,
				data: { path: to.fullPath }
			})));
		});
		nuxtApp.hooks.hookOnce("app:created", async () => {
			try {
				if ("name" in resolvedInitialRoute) resolvedInitialRoute.name = void 0;
				await router.replace({
					...resolvedInitialRoute,
					force: true
				});
				router.options.scrollBehavior = virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Frouter_options_default.scrollBehavior;
			} catch (error) {
				await _showErrorUnlessCrawler(nuxtApp, error);
			}
		});
		return { provide: { router } };
	}
});
// node_modules/nuxt/dist/app/plugins/debug-hooks.js
var plugin$1 = /* @__PURE__ */ defineNuxtPlugin({
	name: "nuxt:debug:hooks",
	enforce: "pre",
	setup(nuxtApp) {
		createDebugger(nuxtApp.hooks, { tag: "nuxt-app" });
	}
});
// node_modules/nuxt/dist/app/composables/payload.js
/**
* This is an experimental function for configuring passing rich data from server -> client.
* @since 3.4.0
*/
function definePayloadReducer(name, reduce) {
	useNuxtApp().ssrContext["~payloadReducers"][name] = reduce;
}
// node_modules/nuxt/dist/app/plugins/revive-payload.server.js
var reducers = [
	["NuxtError", (data) => isNuxtError(data) && data.toJSON()],
	["EmptyShallowRef", (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
	["EmptyRef", (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
	["ShallowRef", (data) => isRef(data) && isShallow(data) && data.value],
	["ShallowReactive", (data) => isReactive(data) && isShallow(data) && toRaw(data)],
	["Ref", (data) => isRef(data) && data.value],
	["Reactive", (data) => isReactive(data) && toRaw(data)]
];
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fplugins.server.mjs
var virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fplugins_server_default = [
	plugin$3,
	plugin$2,
	plugin$1,
	/* @__PURE__ */ defineNuxtPlugin({
		name: "nuxt:revive-payload:server",
		setup() {
			for (const [reducer, fn] of reducers) definePayloadReducer(reducer, fn);
		}
	}),
	defineNuxtPlugin({ name: "nuxt:global-components" })
];
defineComponent({
	name: "ServerPlaceholder",
	render() {
		return createElementBlock("div");
	}
});
// node_modules/nuxt/dist/app/components/client-only.js
var clientOnlySymbol = Symbol.for("nuxt:client-only");
var ClientOnly = defineComponent({
	name: "ClientOnly",
	inheritAttrs: false,
	props: [
		"fallback",
		"placeholder",
		"placeholderTag",
		"fallbackTag"
	],
	setup(props, { slots, attrs }) {
		const mounted = shallowRef(false);
		const vm = getCurrentInstance();
		if (vm) vm._nuxtClientOnly = true;
		provide(clientOnlySymbol, true);
		return () => {
			if (mounted.value) {
				const vnodes = slots.default?.();
				if (vnodes && vnodes.length === 1 && true) return [cloneVNode(vnodes[0], attrs)];
				return vnodes;
			}
			const slot = slots.fallback || slots.placeholder;
			if (slot) return h(slot);
			const fallbackStr = props.fallback || props.placeholder || "";
			const fallbackTag = sanitizeTag(props.fallbackTag || props.placeholderTag, "span");
			return createElementBlock(fallbackTag, attrs, fallbackStr);
		};
	}
});
// node_modules/nuxt/dist/app/components/route-provider.js
var defineRouteProvider = (name = "RouteProvider") => defineComponent({
	name,
	props: {
		route: {
			type: Object,
			required: true
		},
		vnode: Object,
		vnodeRef: Object,
		renderKey: String,
		trackRootNodes: Boolean,
		routeRecord: Object
	},
	setup(props) {
		const previousKey = props.renderKey;
		const previousRoute = props.route;
		const route = {};
		for (const key in props.route) Object.defineProperty(route, key, {
			get: () => previousKey === props.renderKey ? props.route[key] : previousRoute[key],
			enumerable: true
		});
		provide(PageRouteSymbol, shallowReactive(route));
		return () => {
			if (!props.vnode) return props.vnode;
			return h(props.vnode, { ref: props.vnodeRef });
		};
	}
});
var RouteProvider = defineRouteProvider();
// node_modules/nuxt/dist/pages/runtime/page.js
var page_default = defineComponent({
	name: "NuxtPage",
	inheritAttrs: false,
	props: {
		name: { type: String },
		transition: {
			type: [Boolean, Object],
			default: void 0
		},
		keepalive: {
			type: [Boolean, Object],
			default: void 0
		},
		route: { type: Object },
		pageKey: {
			type: [Function, String],
			default: null
		}
	},
	setup(props, { attrs, slots, expose }) {
		const nuxtApp = useNuxtApp();
		const pageRef = ref();
		inject(PageRouteSymbol, null);
		expose({ pageRef });
		inject(LayoutMetaSymbol, null);
		nuxtApp.deferHydration();
		return () => {
			return h(RouterView, {
				name: props.name,
				route: props.route,
				...attrs
			}, { default: markStableSlot((routeProps) => {
				return h(Suspense, { suspensible: true }, { default() {
					return h(RouteProvider, {
						vnode: slots.default ? normalizeSlot(slots.default, routeProps) : routeProps.Component,
						route: routeProps.route,
						vnodeRef: pageRef
					});
				} });
			}) });
		};
	}
});
function markStableSlot(fn) {
	const wrapped = ((routeProps) => {
		const result = fn(routeProps);
		if (Array.isArray(result)) return result;
		if (result == null || !isVNode(result)) return [createCommentVNode()];
		return [result];
	});
	wrapped._n = true;
	return wrapped;
}
function normalizeSlot(slot, data) {
	const slotContent = slot(data);
	return slotContent.length === 1 ? h(slotContent[0]) : h(Fragment, void 0, slotContent);
}
// components/WorkspaceLoading.vue?vue&type=script&setup=true&lang.ts
var WorkspaceLoading_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "WorkspaceLoading",
	__ssrInlineRender: true,
	props: { label: { default: "Загружаем рабочее пространство" } },
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				"data-v-ui-74ff4091789e": "",
				class: "workspace-loading"
			}, _attrs))}>`);
			_push(ssrRenderComponent(unref(LoaderCircle), {
				"data-v-ui-74ff4091789e": "",
				size: 24
			}, null, _parent));
			_push(`<span data-v-ui-74ff4091789e>${ssrInterpolate(__props.label)}</span></div>`);
		};
	}
});
// components/WorkspaceLoading.vue
var _sfc_setup$25 = WorkspaceLoading_vue_vue_type_script_setup_true_lang_default.setup;
WorkspaceLoading_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/WorkspaceLoading.vue");
	return _sfc_setup$25 ? _sfc_setup$25(props, ctx) : void 0;
};
var WorkspaceLoading_default = Object.assign(WorkspaceLoading_vue_vue_type_script_setup_true_lang_default, { __name: "WorkspaceLoading" });
// composables/useWorkspaceLayout.ts
/** Layout preference only: independent of business data, roles and mobile navigation. */
function useWorkspaceLayout() {
	const railCollapsed = useState("workspace-rail-collapsed", () => false);
	useState("workspace-layout-hydrated", () => false);
	function setRailCollapsed(collapsed) {
		railCollapsed.value = collapsed;
	}
	return {
		railCollapsed,
		setRailCollapsed,
		toggleRail: () => setRailCollapsed(!railCollapsed.value)
	};
}
// node_modules/nuxt/dist/app/composables/ssr.js
var $fetch$1 = $fetch$1$1;
/** @since 3.0.0 */
function useRequestEvent(nuxtApp) {
	nuxtApp ||= useNuxtApp();
	return nuxtApp.ssrContext?.event;
}
/** @since 3.2.0 */
function useRequestFetch() {
	return useRequestEvent()?.$fetch || $fetch$1;
}
// node_modules/nuxt/dist/app/composables/cookie.js
function parseCookieValue(value) {
	if (value === "undefined") return;
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed === "number" && String(parsed) !== value) return value;
		return parsed;
	} catch {
		return value;
	}
}
function resolveExpires(expires) {
	return typeof expires === "function" ? expires() : expires;
}
var CookieDefaults = {
	path: "/",
	watch: true,
	decode: (val) => val ? parseCookieValue(decodeURIComponent(val)) : val,
	encode: (val) => {
		if (typeof val !== "string" || val === "undefined") return encodeURIComponent(JSON.stringify(val));
		try {
			if (typeof JSON.parse(val) !== "string") return encodeURIComponent(JSON.stringify(val));
		} catch {}
		return encodeURIComponent(val);
	},
	refresh: false
};
function useCookie(name, _opts) {
	const opts = {
		...CookieDefaults,
		..._opts
	};
	opts.filter ??= (key) => key === name;
	const nuxtApp = useNuxtApp();
	const jar = readServerCookieJar(nuxtApp);
	const rawValue = opts.filter(name) ? jar[name] : void 0;
	const cookies = { [name]: rawValue === void 0 ? void 0 : opts.decode(rawValue) };
	let delay;
	if (opts.maxAge !== void 0) delay = opts.maxAge * 1e3;
	else if (opts.expires) {
		const expires = resolveExpires(opts.expires);
		if (expires) delay = expires.getTime() - Date.now();
	}
	const hasExpired = delay !== void 0 && delay <= 0;
	const cookie = cookieServerRef(name, klona(hasExpired ? void 0 : cookies[name] ?? opts.default?.()), opts, nuxtApp);
	if (!opts.readonly && rawValue === void 0) {
		const initialValue = cookie.value;
		if (initialValue !== void 0 && initialValue !== null) updateServerCookieJar(nuxtApp, name, opts.encode(initialValue));
	}
	{
		const writeFinalCookieValue = () => {
			const valueIsSame = isEqual(cookie.value, cookies[name]);
			if (opts.readonly || valueIsSame && !opts.refresh) return;
			nuxtApp._cookiesChanged ||= {};
			if (valueIsSame && opts.refresh && !nuxtApp._cookiesChanged[name]) return;
			nuxtApp._cookies ||= {};
			if (name in nuxtApp._cookies) {
				if (isEqual(cookie.value, nuxtApp._cookies[name])) return;
			}
			nuxtApp._cookies[name] = cookie.value;
			const encoded = cookie.value === null || cookie.value === void 0 ? void 0 : opts.encode(cookie.value);
			writeServerCookie(useRequestEvent(nuxtApp), name, encoded, opts);
		};
		const unhook = nuxtApp.hooks.hookOnce("app:rendered", writeFinalCookieValue);
		nuxtApp.hooks.hookOnce("app:error", () => {
			unhook();
			return writeFinalCookieValue();
		});
	}
	return cookie;
}
/**
* Cookie jar for the current request, seeded from the incoming `cookie` header.
*
* @see https://github.com/nuxt/nuxt/issues/22631
*/
function readServerCookieJar(nuxtApp) {
	const event = useRequestEvent(nuxtApp);
	const jar = nuxtApp._cookieJar ??= parse(getRequestHeader(event, "cookie") || "", { decode: identity });
	const setCookies = readResponseSetCookies(event);
	for (let i = nuxtApp._appliedSetCookies || 0; i < setCookies.length; i++) {
		const cookie = parseSetCookie(setCookies[i], { decode: false });
		if (!cookie) continue;
		if (cookie.maxAge !== void 0 && cookie.maxAge <= 0 || cookie.expires && cookie.expires.getTime() <= Date.now()) delete jar[cookie.name];
		else jar[cookie.name] = cookie.value;
	}
	nuxtApp._appliedSetCookies = setCookies.length;
	return jar;
}
function updateServerCookieJar(nuxtApp, name, value) {
	const jar = readServerCookieJar(nuxtApp);
	if (value === void 0) delete jar[name];
	else jar[name] = value;
}
function readResponseSetCookies(event) {
	return splitCookiesString(getResponseHeader(event, "set-cookie") ?? []);
}
var identity = (val) => val;
function toSerializeOptions(opts) {
	const { encode: _encode, decode: _decode, expires, ...rest } = opts;
	return {
		...rest,
		expires: resolveExpires(expires),
		encode: identity
	};
}
function writeServerCookie(event, name, value, opts = {}) {
	if (event) {
		const serializeOpts = toSerializeOptions(opts);
		if (value !== void 0) return setCookie(event, name, value, serializeOpts);
		if (getCookie(event, name) !== void 0 || responseSetsCookie(event, name)) return deleteCookie(event, name, serializeOpts);
	}
}
function responseSetsCookie(event, name) {
	for (const raw of readResponseSetCookies(event)) if (parseSetCookie(raw, { decode: false })?.name === name) return true;
	return false;
}
/**
* Custom ref that tracks explicit cookie writes on the server.
*
* This is required for the `refresh` option to ensure the cookie is
* re-written on SSR even when the value remains unchanged.
*/
function cookieServerRef(name, value, opts, nuxtApp) {
	const internalRef = ref(value);
	return customRef((track, trigger) => {
		return {
			get() {
				track();
				return internalRef.value;
			},
			set(newValue) {
				nuxtApp._cookiesChanged ||= {};
				nuxtApp._cookiesChanged[name] = true;
				if (!opts.readonly) updateServerCookieJar(nuxtApp, name, newValue === null || newValue === void 0 ? void 0 : opts.encode(newValue));
				internalRef.value = newValue;
				trigger();
			}
		};
	});
}
// composables/useCrmTheme.ts
function useCrmTheme() {
	const preference = useCookie("sarkisian-crm-theme", {
		default: () => "light",
		maxAge: 31536e3,
		sameSite: "lax",
		path: "/"
	});
	const theme = useState("crm-theme", () => preference.value === "dark" ? "dark" : "light");
	function toggleTheme() {
		theme.value = theme.value === "dark" ? "light" : "dark";
		preference.value = theme.value;
	}
	return {
		theme,
		toggleTheme
	};
}
// composables/useCrmDensity.ts
function preferences(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return Object.fromEntries(Object.entries(value).filter(([id, mode]) => id.length <= 180 && (mode === "compact" || mode === "comfortable")).slice(-24));
}
/** Non-sensitive display preferences only. No reload, record changes or API calls. */
function useCrmDensity() {
	const { user } = useWorkspaceSession();
	const cookie = useCookie("sarkisian-crm-density-v1", {
		default: () => ({}),
		sameSite: "lax",
		path: "/",
		maxAge: 31536e3
	});
	const saved = useState("crm-density-preferences", () => preferences(cookie.value));
	const density = computed(() => user.value?.id && Object.hasOwn(saved.value, user.value.id) ? saved.value[user.value.id] : "compact");
	function setDensity(value) {
		if (!user.value?.id || !["compact", "comfortable"].includes(value)) return;
		const next = preferences({
			...saved.value,
			[user.value.id]: value
		});
		saved.value = next;
		cookie.value = next;
	}
	return {
		density,
		setDensity,
		toggleDensity: () => setDensity(density.value === "compact" ? "comfortable" : "compact")
	};
}
// app.vue?vue&type=script&setup=true&lang.ts
var app_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "app",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute();
		useRouter().currentRoute;
		const { token} = useWorkspaceSession();
		ref(false);
		useWorkspaceLayout();
		const internalRoutes = [
			"/workspace",
			"/admin-workspace",
			"/media-library",
			"/crm",
			"/crm-pipeline",
			"/crm-customers",
			"/crm-organizations",
			"/crm-tasks",
			"/crm-chat",
			"/crm-marketplaces",
			"/leadership",
			"/helpdesk",
			"/system-settings"
		];
		const isInternal = computed(() => internalRoutes.some((path) => route.path === path || route.path.startsWith(`${path}/`)));
		const isCrm = computed(() => isCrmPath(route.path));
		const { theme } = useCrmTheme();
		const { density } = useCrmDensity();
		computed(() => isInternal.value && Boolean(token.value));
		computed(() => route.path === "/admin-workspace" || route.path.startsWith("/admin-workspace/"));
		const b2bSession = useB2BSession();
		const isB2B = computed(() => route.path === "/b2b" || route.path.startsWith("/b2b/"));
		computed(() => isB2B.value && Boolean(b2bSession.token.value));
		const isBusiness = computed(() => isB2B.value || ["/b2b-login", "/b2b-invite"].includes(route.path));
		useHead(() => isCrm.value ? {
			htmlAttrs: {
				lang: "ru",
				"data-crm-ui": "true",
				"data-crm-theme": theme.value,
				"data-crm-density": density.value,
				"data-business-ui": null,
				"data-business-theme": null
			},
			link: [
				{
					rel: "manifest",
					href: "/crm/manifest.webmanifest"
				},
				{
					rel: "apple-touch-icon",
					href: "/crm/pwa/icon-180.png?v=brand2"
				},
				{
					rel: "icon",
					type: "image/svg+xml",
					href: "/crm/pwa/icon.svg?v=brand2"
				}
			],
			meta: [
				{
					name: "theme-color",
					content: theme.value === "dark" ? "#252629" : "#ffffff"
				},
				{
					name: "apple-mobile-web-app-capable",
					content: "yes"
				},
				{
					name: "apple-mobile-web-app-title",
					content: "SARKISIAN CRM"
				},
				{
					name: "robots",
					content: "noindex, nofollow"
				}
			]
		} : { htmlAttrs: {
			lang: "ru",
			"data-crm-ui": null,
			"data-crm-theme": null,
			"data-crm-density": null,
			"data-business-ui": isBusiness.value ? "true" : null,
			"data-business-theme": isBusiness.value ? theme.value : null
		} });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_ClientOnly = ClientOnly;
			const _component_NuxtPage = page_default;
			const _component_WorkspaceLoading = WorkspaceLoading_default;
			if (unref(isCrm)) _push(ssrRenderComponent(_component_ClientOnly, _attrs, { fallback: withCtx((_, _push, _parent, _scopeId) => {
				if (_push) _push(ssrRenderComponent(_component_WorkspaceLoading, { label: "Открываем CRM" }, null, _parent, _scopeId));
				else return [createVNode(_component_WorkspaceLoading, { label: "Открываем CRM" })];
			}) }, _parent));
			else if (unref(isInternal)) _push(ssrRenderComponent(_component_ClientOnly, _attrs, { fallback: withCtx((_, _push, _parent, _scopeId) => {
				if (_push) _push(ssrRenderComponent(_component_WorkspaceLoading, null, null, _parent, _scopeId));
				else return [createVNode(_component_WorkspaceLoading)];
			}) }, _parent));
			else if (unref(isB2B)) _push(ssrRenderComponent(_component_ClientOnly, _attrs, { fallback: withCtx((_, _push, _parent, _scopeId) => {
				if (_push) _push(ssrRenderComponent(_component_WorkspaceLoading, null, null, _parent, _scopeId));
				else return [createVNode(_component_WorkspaceLoading)];
			}) }, _parent));
			else _push(ssrRenderComponent(_component_NuxtPage, _attrs, null, _parent));
		};
	}
});
// app.vue
var _sfc_setup$24 = app_vue_vue_type_script_setup_true_lang_default.setup;
app_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
	return _sfc_setup$24 ? _sfc_setup$24(props, ctx) : void 0;
};
var app_default = app_vue_vue_type_script_setup_true_lang_default;
// components/storefront/SiteHomeEffects.vue?vue&type=script&setup=true&lang.ts
var SiteHomeEffects_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHomeEffects",
	__ssrInlineRender: true,
	props: { about: { type: Boolean } },
	setup(__props) {
		ref(null);
		ref(null);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<!--[--><div class="sh-ambience" aria-hidden="true"><div class="sh-lava"><span></span><span></span><span></span></div><div class="sh-concrete">`);
			if (__props.about) {
				_push(`<!--[-->`);
				ssrRenderList(3, (band) => {
					_push(`<span class="sa-texture"></span>`);
				});
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`</div><div class="sh-cursor-light"></div></div>`);
			ssrRenderTeleport(_push, (_push) => {
				_push(`<div class="sh-cursor-dot" aria-hidden="true"></div>`);
			}, "body", false, _parent);
			_push(`<!--]-->`);
		};
	}
});
// components/storefront/SiteHomeEffects.vue
var _sfc_setup$23 = SiteHomeEffects_vue_vue_type_script_setup_true_lang_default.setup;
SiteHomeEffects_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHomeEffects.vue");
	return _sfc_setup$23 ? _sfc_setup$23(props, ctx) : void 0;
};
var SiteHomeEffects_default = Object.assign(SiteHomeEffects_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHomeEffects" });
// node_modules/nuxt/dist/app/components/nuxt-link.js
var firstNonUndefined = (...args) => args.find((arg) => arg !== void 0);
/* @__NO_SIDE_EFFECTS__ */
function defineNuxtLink(options) {
	const componentName = options.componentName || "NuxtLink";
	function isHashLinkWithoutHashMode(link) {
		return typeof link === "string" && link.startsWith("#");
	}
	function resolveTrailingSlashBehavior(to, resolve, trailingSlash) {
		const effectiveTrailingSlash = trailingSlash ?? options.trailingSlash;
		if (!to || effectiveTrailingSlash !== "append" && effectiveTrailingSlash !== "remove") return to;
		if (typeof to === "string") return applyTrailingSlashBehavior(to, effectiveTrailingSlash);
		const path = "path" in to && to.path !== void 0 ? to.path : resolve(to).path;
		return {
			...to,
			name: void 0,
			path: applyTrailingSlashBehavior(path, effectiveTrailingSlash)
		};
	}
	/**
	* The link state `<NuxtLink>` renders with. Kept separate from `useNuxtLink` so the component
	* does not resolve the `<RouterLink>` link state backing `route`/`isActive`/`isExactActive`,
	* which it never reads.
	*/
	function useLinkTarget(props) {
		const router = useRouter();
		const config = /* @__PURE__ */ useRuntimeConfig();
		const rootedHref = router.options?.history?.createHref ?? ((path) => joinURL(config.app.baseURL, path));
		const hasTarget = computed(() => !!unref(props.target) && unref(props.target) !== "_self");
		const isAbsoluteUrl = computed(() => {
			const path = unref(props.to) || unref(props.href) || "";
			return typeof path === "string" && isAbsoluteHref(path);
		});
		const isExternal = computed(() => {
			if (unref(props.external)) return true;
			const path = unref(props.to) || unref(props.href) || "";
			if (typeof path === "object") return false;
			return path === "" || isAbsoluteUrl.value;
		});
		const to = computed(() => {
			const path = unref(props.to) || unref(props.href) || "";
			if (isExternal.value) return path;
			return resolveTrailingSlashBehavior(path, router.resolve, unref(props.trailingSlash));
		});
		const href = computed(() => {
			const effectiveTrailingSlash = unref(props.trailingSlash) ?? options.trailingSlash;
			if (!to.value || isAbsoluteUrl.value || isHashLinkWithoutHashMode(to.value)) {
				const raw = to.value;
				return typeof raw === "string" ? sanitizeAnchorHref(raw) : raw;
			}
			if (isExternal.value) {
				const path = typeof to.value === "object" && "path" in to.value ? resolveRouteObject(to.value) : to.value;
				const href = typeof path === "object" ? router.resolve(path).href : path;
				const safe = typeof href === "string" ? sanitizeAnchorHref(href) : href;
				return safe === null ? null : applyTrailingSlashBehavior(safe, effectiveTrailingSlash);
			}
			if (typeof to.value === "object") return router.resolve(to.value)?.href ?? null;
			return applyTrailingSlashBehavior(isRootedPath(to.value) ? rootedHref(to.value) : router.resolve(to.value).href, effectiveTrailingSlash);
		});
		return {
			to,
			hasTarget,
			isAbsoluteUrl,
			isExternal,
			href,
			async navigate(_e) {
				if (href.value === null) return;
				await navigateTo(href.value, {
					replace: unref(props.replace),
					external: isExternal.value || hasTarget.value
				});
			}
		};
	}
	function useNuxtLink(props) {
		const router = useRouter();
		const target = useLinkTarget(props);
		const builtinRouterLink = resolveComponent("RouterLink");
		const useBuiltinLink = builtinRouterLink && typeof builtinRouterLink !== "string" ? builtinRouterLink.useLink : void 0;
		const link = target.isExternal.value ? void 0 : useBuiltinLink?.({
			...props,
			to: target.to,
			viewTransition: unref(props.viewTransition)
		});
		return {
			...target,
			isActive: link?.isActive ?? computed(() => target.to.value === router.currentRoute.value.path),
			isExactActive: link?.isExactActive ?? computed(() => target.to.value === router.currentRoute.value.path),
			route: link?.route ?? computed(() => router.resolve(target.to.value))
		};
	}
	/**
	* Render an internal link as a plain anchor, matching the markup `<RouterLink>` produces
	* for the same location.
	*/
	function renderStaticInternalLink(props, slots, router, rawTo) {
		const route = router.resolve(resolveTrailingSlashBehavior(rawTo, router.resolve, props.trailingSlash));
		const currentRoute = router.currentRoute.value;
		const index = activeRecordIndex(route, currentRoute);
		const isActive = index > -1 && includesParams(currentRoute.params, route.params);
		const isExactActive = index > -1 && index === currentRoute.matched.length - 1 && isSameRouteLocationParams(currentRoute.params, route.params);
		let dataInternal;
		const routerOptions = router.options;
		const href = sanitizeAnchorHref(route.href);
		return h("a", {
			"aria-current": isExactActive ? props.ariaCurrentValue ?? "page" : null,
			href,
			"class": {
				[getLinkClass(props.activeClass || options.activeClass, routerOptions.linkActiveClass, "router-link-active")]: isActive,
				[getLinkClass(props.exactActiveClass || options.exactActiveClass, routerOptions.linkExactActiveClass, "router-link-exact-active")]: isExactActive
			},
			"rel": props.rel || void 0,
			"data-internal": dataInternal
		}, slots.default?.({
			route,
			href,
			isActive,
			isExactActive,
			navigate: () => navigateTo(route.href, { replace: props.replace })
		}));
	}
	return defineComponent({
		name: componentName,
		props: {
			to: {
				type: [String, Object],
				required: false
			},
			href: {
				type: [String, Object],
				required: false
			},
			target: {
				type: String,
				required: false
			},
			rel: {
				type: String,
				required: false
			},
			noRel: {
				type: Boolean,
				default: void 0,
				required: false
			},
			prefetch: {
				type: Boolean,
				default: void 0,
				required: false
			},
			prefetchOn: {
				type: [String, Object],
				required: false
			},
			noPrefetch: {
				type: Boolean,
				default: void 0,
				required: false
			},
			activeClass: {
				type: String,
				required: false
			},
			exactActiveClass: {
				type: String,
				required: false
			},
			prefetchedClass: {
				type: String,
				required: false
			},
			replace: {
				type: Boolean,
				default: void 0,
				required: false
			},
			ariaCurrentValue: {
				type: String,
				required: false
			},
			external: {
				type: Boolean,
				default: void 0,
				required: false
			},
			custom: {
				type: Boolean,
				default: void 0,
				required: false
			},
			trailingSlash: {
				type: String,
				required: false
			}
		},
		useLink: useNuxtLink,
		setup(props, { slots }) {
			const router = useRouter();
			if (!props.custom) {
				const rawTo = props.to || props.href || "";
				if (!(props.external || typeof rawTo === "string" && (rawTo === "" || isAbsoluteHref(rawTo))) && !isHashLinkWithoutHashMode(rawTo) && (!props.target || props.target === "_self")) return () => renderStaticInternalLink(props, slots, router, rawTo);
			}
			const routerLinkComponent = resolveComponent("RouterLink");
			const { to, href, navigate, isExternal, hasTarget, isAbsoluteUrl } = useLinkTarget(props);
			const prefetched = shallowRef(false);
			const el = void 0;
			const elRef = void 0;
			function shouldPrefetch(mode) {
				return false;
			}
			async function prefetch(nuxtApp = useNuxtApp()) {}
			return () => {
				const target = props.target || null;
				const rel = firstNonUndefined(props.noRel ? "" : props.rel, options.externalRelAttribute, isAbsoluteUrl.value || hasTarget.value ? "noopener noreferrer" : "") || null;
				const getCustomSlotProps = (routerLinkSlotProps) => ({
					navigate,
					get route() {
						if (!href.value) return;
						const url = new URL(href.value, "http://localhost");
						return {
							path: url.pathname,
							fullPath: url.pathname,
							get query() {
								return parseQuery(url.search);
							},
							hash: url.hash,
							params: {},
							name: void 0,
							matched: [],
							redirectedFrom: void 0,
							meta: {},
							href: href.value
						};
					},
					rel,
					target,
					isExternal: isExternal.value || hasTarget.value,
					isActive: false,
					isExactActive: false,
					...routerLinkSlotProps,
					href: typeof routerLinkSlotProps?.href === "string" ? sanitizeAnchorHref(routerLinkSlotProps.href) : href.value,
					prefetch,
					prefetched: prefetched.value,
					shouldPrefetch
				});
				if (!isExternal.value && !hasTarget.value && !isHashLinkWithoutHashMode(to.value)) {
					const routerLinkProps = {
						ref: elRef,
						to: to.value,
						activeClass: props.activeClass || options.activeClass,
						exactActiveClass: props.exactActiveClass || options.exactActiveClass,
						replace: props.replace,
						ariaCurrentValue: props.ariaCurrentValue,
						custom: props.custom
					};
					if (!props.custom) routerLinkProps.rel = props.rel || void 0;
					return h(routerLinkComponent, routerLinkProps, props.custom && slots.default ? { default: (slotProps) => slots.default(getCustomSlotProps(slotProps)) } : slots.default);
				}
				if (props.custom) {
					if (!slots.default) return null;
					return slots.default(getCustomSlotProps());
				}
				return h("a", {
					ref: el,
					href: href.value || null,
					rel,
					target,
					onClick: async (event) => {
						if (isExternal.value || hasTarget.value) return;
						event.preventDefault();
						try {
							const encodedHref = encodeRoutePath(href.value ?? "");
							return await (props.replace ? router.replace(encodedHref) : router.push(encodedHref));
						} finally {}
					}
				}, slots.default?.());
			};
		}
	});
}
var NuxtLink = /* @__PURE__ */ defineNuxtLink(nuxtLinkDefaults);
function isSameRouteRecord(a, b) {
	return (a.aliasOf || a) === (b.aliasOf || b);
}
function getOriginalPath(record) {
	return record ? record.aliasOf ? record.aliasOf.path : record.path : "";
}
function isEquivalentArray(a, b) {
	return Array.isArray(b) ? a.length === b.length && a.every((value, i) => value === b[i]) : a.length === 1 && a[0] === b;
}
function isSameParamValue(a, b) {
	return Array.isArray(a) ? isEquivalentArray(a, b) : Array.isArray(b) ? isEquivalentArray(b, a) : (a && a.valueOf()) === (b && b.valueOf());
}
function isSameRouteLocationParams(a, b) {
	if (Object.keys(a).length !== Object.keys(b).length) return false;
	for (const key in a) if (!isSameParamValue(a[key], b[key])) return false;
	return true;
}
function includesParams(outer, inner) {
	for (const key in inner) {
		const innerValue = inner[key];
		const outerValue = outer[key];
		if (typeof innerValue === "string") {
			if (innerValue !== outerValue) return false;
		} else if (!Array.isArray(outerValue) || outerValue.length !== innerValue.length || innerValue.some((value, i) => value.valueOf() !== outerValue[i].valueOf())) return false;
	}
	return true;
}
function activeRecordIndex(route, currentRoute) {
	const { matched } = route;
	const { length } = matched;
	const routeMatched = matched[length - 1];
	const currentMatched = currentRoute.matched;
	if (!routeMatched || !currentMatched.length) return -1;
	const index = currentMatched.findIndex(isSameRouteRecord.bind(null, routeMatched));
	if (index > -1) return index;
	const parentRecordPath = getOriginalPath(matched[length - 2]);
	return length > 1 && getOriginalPath(routeMatched) === parentRecordPath && currentMatched[currentMatched.length - 1].path !== parentRecordPath ? currentMatched.findIndex(isSameRouteRecord.bind(null, matched[length - 2])) : index;
}
/** Resolve an active-link class, falling back from the per-link value to the router-wide one. */
function getLinkClass(propClass, globalClass, defaultClass) {
	return propClass ?? globalClass ?? defaultClass;
}
function applyTrailingSlashBehavior(to, trailingSlash) {
	if (trailingSlash !== "append" && trailingSlash !== "remove") return to;
	const normalizeFn = trailingSlash === "append" ? withTrailingSlash : withoutTrailingSlash;
	if (hasProtocol(to) && !to.startsWith("http")) return to;
	return normalizeFn(to, true);
}
// composables/useHomeLocale.ts
var homeRegions = [
	{
		id: "ru",
		label: "Россия · ₽",
		currency: "RUB",
		language: "ru",
		flag: "ru"
	},
	{
		id: "en",
		label: "English · $",
		currency: "USD",
		language: "en",
		flag: "gb"
	},
	{
		id: "ae",
		label: "UAE · AED",
		currency: "AED",
		language: "en",
		flag: "ae"
	},
	{
		id: "eu",
		label: "Europe · €",
		currency: "EUR",
		language: "en",
		flag: "eu"
	}
];
function useHomeLocale() {
	const preference = useCookie("sb-home-region", {
		default: () => "ru",
		sameSite: "lax",
		maxAge: 31536e3
	});
	const region = computed(() => homeRegions.find((item) => item.id === preference.value) || homeRegions[0]);
	const english = computed(() => region.value.language === "en");
	const rates = useState("home-exchange-rates", () => null);
	const ratesLoading = useState("home-exchange-loading", () => false);
	const ratesError = useState("home-exchange-error", () => false);
	const t = (text) => english.value ? homeEnglish[text] || text : text;
	async function loadRates() {
		if (region.value.currency === "RUB" || rates.value || ratesLoading.value) return;
		ratesLoading.value = true;
		ratesError.value = false;
		try {
			rates.value = await $fetch$1$1("/api/storefront/exchange-rates");
		} catch {
			ratesError.value = true;
		} finally {
			ratesLoading.value = false;
		}
	}
	function selectRegion(id) {
		if (!homeRegions.some((item) => item.id === id)) return;
		preference.value = id;
		loadRates();
	}
	function formatPrice(value, sourceCurrency = "RUB") {
		const rate = sourceCurrency === "RUB" ? rates.value?.rates[region.value.currency] : void 0;
		const converted = region.value.currency !== "RUB" && !!rate;
		const currency = converted ? region.value.currency : sourceCurrency;
		return `${converted ? "≈ " : ""}${new Intl.NumberFormat(english.value ? "en-US" : "ru-RU", {
			style: "currency",
			currency,
			minimumFractionDigits: converted ? 2 : 0,
			maximumFractionDigits: 2
		}).format(converted ? value / rate : value)}`;
	}
	return {
		region,
		english,
		t,
		rates,
		ratesLoading,
		ratesError,
		loadRates,
		selectRegion,
		formatPrice
	};
}
// components/storefront/SiteHomeCourses.vue?vue&type=script&setup=true&lang.ts
var SiteHomeCourses_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHomeCourses",
	__ssrInlineRender: true,
	setup(__props) {
		const { t } = useHomeLocale();
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(NuxtLink, mergeProps({ to: "/courses" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Курсы"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Курсы")), 1)];
				}),
				_: 1
			}, _parent));
		};
	}
});
// components/storefront/SiteHomeCourses.vue
var _sfc_setup$22 = SiteHomeCourses_vue_vue_type_script_setup_true_lang_default.setup;
SiteHomeCourses_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHomeCourses.vue");
	return _sfc_setup$22 ? _sfc_setup$22(props, ctx) : void 0;
};
var SiteHomeCourses_default = Object.assign(SiteHomeCourses_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHomeCourses" });
// components/storefront/SiteHomeRegion.vue?vue&type=script&setup=true&lang.ts
var SiteHomeRegion_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHomeRegion",
	__ssrInlineRender: true,
	setup(__props) {
		const { region, t} = useHomeLocale();
		const open = ref(false);
		const root = ref(null);
		ref(null);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				ref_key: "root",
				ref: root,
				class: "sh-region"
			}, _attrs))}><button class="sh-language"${ssrRenderAttr("aria-label", `${unref(t)("Язык и валюта")}: ${unref(region).label}`)} aria-haspopup="menu"${ssrRenderAttr("aria-expanded", unref(open))} aria-controls="home-region-menu"><span class="${ssrRenderClass([`sh-flag-${unref(region).flag}`, "sh-flag"])}" aria-hidden="true">`);
			if (unref(region).flag === "eu") _push(`<span>✦</span>`);
			else _push(`<!---->`);
			_push(`</span></button>`);
			if (unref(open)) {
				_push(`<div id="home-region-menu" class="sh-region-popover" role="menu"${ssrRenderAttr("aria-label", unref(t)("Язык и валюта"))}><!--[-->`);
				ssrRenderList(unref(homeRegions), (item) => {
					_push(`<button role="menuitemradio"${ssrRenderAttr("aria-checked", unref(region).id === item.id)}><span class="${ssrRenderClass([`sh-flag-${item.flag}`, "sh-flag"])}" aria-hidden="true">`);
					if (item.flag === "eu") _push(`<span>✦</span>`);
					else _push(`<!---->`);
					_push(`</span>${ssrInterpolate(item.label)}</button>`);
				});
				_push(`<!--]--><p>${ssrInterpolate(unref(t)("Курсы валют примерные"))}</p></div>`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/storefront/SiteHomeRegion.vue
var _sfc_setup$21 = SiteHomeRegion_vue_vue_type_script_setup_true_lang_default.setup;
SiteHomeRegion_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHomeRegion.vue");
	return _sfc_setup$21 ? _sfc_setup$21(props, ctx) : void 0;
};
var SiteHomeRegion_default = Object.assign(SiteHomeRegion_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHomeRegion" });
// components/storefront/SiteHomeNavigation.vue?vue&type=script&setup=true&lang.ts
var SiteHomeNavigation_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHomeNavigation",
	__ssrInlineRender: true,
	emits: ["account", "cart"],
	setup(__props) {
		const { t } = useHomeLocale();
		const menuOpen = ref(false);
		const route = useRoute();
		watch(() => route.fullPath, () => {
			menuOpen.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteHomeCourses = SiteHomeCourses_default;
			const _component_SiteHomeRegion = SiteHomeRegion_default;
			_push(`<header${ssrRenderAttrs(mergeProps({ class: "sh-navigation sh-container" }, _attrs))}>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/",
				class: "sh-mobile-brand",
				"aria-label": "SARKISIAN"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`SARKISIAN`);
					else return [createTextVNode("SARKISIAN")];
				}),
				_: 1
			}, _parent));
			_push(`<button class="sh-menu-toggle"${ssrRenderAttr("aria-expanded", unref(menuOpen))} aria-controls="home-navigation"${ssrRenderAttr("aria-label", unref(t)(unref(menuOpen) ? "Закрыть меню" : "Открыть меню"))}>`);
			if (unref(menuOpen)) _push(ssrRenderComponent(unref(X), { size: 24 }, null, _parent));
			else _push(ssrRenderComponent(unref(Menu), { size: 24 }, null, _parent));
			_push(`</button><nav id="home-navigation" class="${ssrRenderClass([{ "is-open": unref(menuOpen) }, "sh-navigation-links"])}" aria-label="SARKISIAN"><div class="sh-navigation-pair">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/partnerships" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Сотрудничество"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Сотрудничество")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/about",
				onClick: ($event) => menuOpen.value = false
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("О бренде"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("О бренде")), 1)];
				}),
				_: 1
			}, _parent));
			_push(`</div>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/catalog" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Каталог"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Каталог")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/business" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Онлайн"))}<br${_scopeId}>${ssrInterpolate(unref(t)("запись"))}`);
					else return [
						createTextVNode(toDisplayString(unref(t)("Онлайн")), 1),
						createVNode("br"),
						createTextVNode(toDisplayString(unref(t)("запись")), 1)
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_SiteHomeCourses, null, null, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/club/referrals" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Реферальная"))}<br${_scopeId}>${ssrInterpolate(unref(t)("программа"))}`);
					else return [
						createTextVNode(toDisplayString(unref(t)("Реферальная")), 1),
						createVNode("br"),
						createTextVNode(toDisplayString(unref(t)("программа")), 1)
					];
				}),
				_: 1
			}, _parent));
			_push(`<button class="sh-navigation-cart">${ssrInterpolate(unref(t)("Корзина"))}</button><button><span>${ssrInterpolate(unref(t)("Личный"))}<br>${ssrInterpolate(unref(t)("кабинет"))}</span></button></nav>`);
			_push(ssrRenderComponent(_component_SiteHomeRegion, null, null, _parent));
			_push(`</header>`);
		};
	}
});
// components/storefront/SiteHomeNavigation.vue
var _sfc_setup$20 = SiteHomeNavigation_vue_vue_type_script_setup_true_lang_default.setup;
SiteHomeNavigation_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHomeNavigation.vue");
	return _sfc_setup$20 ? _sfc_setup$20(props, ctx) : void 0;
};
var SiteHomeNavigation_default = Object.assign(SiteHomeNavigation_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHomeNavigation" });
// components/storefront/SiteMenuLink.vue?vue&type=script&setup=true&lang.ts
var SiteMenuLink_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteMenuLink",
	__ssrInlineRender: true,
	props: {
		item: {},
		arrow: { type: Boolean }
	},
	emits: ["activate"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const pressed = ref(false);
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(NuxtLink, mergeProps({
				class: ["sb-menu-link", { "is-pressed": unref(pressed) }],
				to: __props.item.url,
				external: /^https?:\/\//i.test(__props.item.url),
				target: __props.item.newTab ? "_blank" : void 0,
				rel: __props.item.newTab ? "noopener noreferrer" : void 0,
				onPointerdown: ($event) => pressed.value = $event.pointerType === "touch",
				onPointerup: ($event) => pressed.value = false,
				onPointercancel: ($event) => pressed.value = false,
				onPointerleave: ($event) => pressed.value = false,
				onBlur: ($event) => pressed.value = false,
				onClick: ($event) => {
					pressed.value = false;
					emit("activate");
				}
			}, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<span${_scopeId}>${ssrInterpolate(__props.item.label)}</span>`);
						if (__props.arrow) _push(ssrRenderComponent(unref(ArrowRight), {
							class: "sb-menu-link__arrow",
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
						else _push(`<!---->`);
					} else return [createVNode("span", null, toDisplayString(__props.item.label), 1), __props.arrow ? (openBlock(), createBlock(unref(ArrowRight), {
						key: 0,
						class: "sb-menu-link__arrow",
						size: 18,
						"aria-hidden": "true"
					})) : createCommentVNode("", true)];
				}),
				_: 1
			}, _parent));
		};
	}
});
// components/storefront/SiteMenuLink.vue
var _sfc_setup$19 = SiteMenuLink_vue_vue_type_script_setup_true_lang_default.setup;
SiteMenuLink_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteMenuLink.vue");
	return _sfc_setup$19 ? _sfc_setup$19(props, ctx) : void 0;
};
var SiteMenuLink_default = Object.assign(SiteMenuLink_vue_vue_type_script_setup_true_lang_default, { __name: "SiteMenuLink" });
// composables/useStorefrontMotion.ts
function useStorefrontMotion() {
	const reducedMotion = ref(false);
	return computed(() => reducedMotion.value ? 0 : {
		enter: 720,
		leave: 520
	});
}
// composables/useStorefrontContent.ts
var defaultAnnouncement = "SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян";
function useStorefrontContent() {
	const config = useRuntimeConfig();
	const content = useState("storefront-content", () => ({
		settings: { announcementText: defaultAnnouncement },
		banners: [],
		categories: [],
		socialLinks: [],
		menuItems: []
	}));
	const contentLoaded = useState("storefront-content-loaded", () => false);
	async function loadStorefrontContent(force = false) {
		if (contentLoaded.value && !force) return content.value;
		try {
			content.value = await $fetch$1$1("/products/storefront-content", { baseURL: config.public.apiBase });
			contentLoaded.value = true;
		} catch {
			content.value.settings.announcementText ||= defaultAnnouncement;
		}
		return content.value;
	}
	function storefrontMediaUrl(url) {
		if (!url) return "";
		if (/^https?:\/\//i.test(url) || !url.startsWith("/api/")) return url;
		if (String(config.public.apiBase).startsWith("/")) return url;
		return new URL(url, config.public.apiBase).toString();
	}
	return {
		content,
		siteContent: computed(() => mergeSiteContent(content.value.settings?.siteContent)),
		loadStorefrontContent,
		storefrontMediaUrl
	};
}
// composables/useStorefrontCatalog.ts
var storefrontProductLink = (product) => catalogProductPath(product);
function storefrontProductImage(product) {
	const config = useRuntimeConfig();
	const resolve = (url) => resolveProductImageUrl(url, config.public.apiBase, config.public.siteUrl);
	const sorted = product?.images?.slice().sort((a, b) => a.sortOrder - b.sortOrder) || [];
	const apiImage = sorted.filter((image) => !image.url?.startsWith("/catalog/")).map((image) => resolve(image.url)).find(Boolean) || sorted.map((image) => resolve(image.url)).find(Boolean);
	const categoryImage = product?.categories?.find((item) => item?.isPrimary)?.category?.imageUrl || product?.categories?.find((item) => item?.category?.imageUrl)?.category?.imageUrl;
	return apiImage || resolve(`/catalog/${product?.slug}.jpg`) || resolve(categoryImage) || null;
}
function storefrontActiveCategories(categories = []) {
	const slugs = /* @__PURE__ */ new Set();
	return categories.filter((category) => {
		if (!category || category.isActive === false || !category.id || typeof category.slug !== "string" || !category.slug.trim() || category.slug.includes(",") || !category.nameRu || slugs.has(category.slug)) return false;
		slugs.add(category.slug);
		return true;
	});
}
function storefrontCategoryGroups(values = [], menu) {
	const overrides = /* @__PURE__ */ new Map();
	const positions = /* @__PURE__ */ new Map();
	const allById = new Map(values.filter((category) => category?.id).map((category) => [category.id, category]));
	for (const entry of Array.isArray(menu?.entries) ? menu.entries : []) {
		if (!entry || !allById.has(entry.categoryId) || overrides.has(entry.categoryId)) continue;
		positions.set(entry.categoryId, positions.size);
		overrides.set(entry.categoryId, {
			label: typeof entry.label === "string" ? entry.label.trim() : void 0,
			isVisible: entry.isVisible
		});
	}
	function visible(category) {
		const ancestors = /* @__PURE__ */ new Set();
		let current = category;
		while (current && !ancestors.has(current.id)) {
			if (current.isActive === false || overrides.get(current.id)?.isVisible === false) return false;
			ancestors.add(current.id);
			current = current.parentId ? allById.get(current.parentId) : void 0;
		}
		return true;
	}
	const categories = storefrontActiveCategories(values).filter(visible).sort((a, b) => (positions.get(a.id) ?? positions.size) - (positions.get(b.id) ?? positions.size));
	const label = (category) => overrides.get(category.id)?.label || category.nameRu;
	const byId = new Map(categories.map((category) => [category.id, category]));
	const visited = /* @__PURE__ */ new Set();
	function group(root) {
		visited.add(root.id);
		const items = [];
		function children(parent, path) {
			for (const child of categories.filter((category) => category.parentId === parent.id)) {
				if (visited.has(child.id)) continue;
				visited.add(child.id);
				const labels = [...path, label(child)];
				items.push({
					...child,
					label: labels.join(" / ")
				});
				children(child, labels);
			}
		}
		children(root, []);
		return {
			...root,
			label: label(root),
			items
		};
	}
	const groups = categories.filter((category) => !category.parentId || !byId.has(category.parentId)).map(group);
	for (const category of categories) if (!visited.has(category.id)) groups.push(group(category));
	return groups;
}
function storefrontCatalogQuickLinks(menu) {
	const defaults = [
		{
			key: "new",
			label: "Новинки",
			description: "Свежие продукты бренда",
			url: "/catalog?sort=new"
		},
		{
			key: "popular",
			label: "Бестселлеры",
			description: "Выбор мастеров",
			url: "/catalog?sort=popular"
		},
		{
			key: "gift-card",
			label: "Подарочная карта",
			description: "Подарок без ошибки",
			url: "/catalog/gift-card"
		}
	];
	const byKey = new Map(defaults.map((link) => [link.key, link]));
	const seen = /* @__PURE__ */ new Set();
	const links = [];
	for (const entry of Array.isArray(menu?.quickLinks) ? menu.quickLinks : []) {
		const base = entry && byKey.get(entry.key);
		if (!base || seen.has(entry.key)) continue;
		seen.add(entry.key);
		if (entry.isVisible !== false) links.push({
			...base,
			label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : base.label
		});
	}
	return [...links, ...defaults.filter((link) => !seen.has(link.key))];
}
function storefrontCatalogMenu(categories = [], menu) {
	return {
		groups: storefrontCategoryGroups(categories, menu),
		quickLinks: storefrontCatalogQuickLinks(menu)
	};
}
function storefrontCatalogLink(category) {
	const slug = typeof category === "string" ? category.trim() : category?.slug?.trim();
	return slug ? catalogCategoryPath(slug) : "/catalog";
}
// components/storefront/SiteCatalogDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteCatalogDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCatalogDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useStorefrontMotion();
		const search = ref("");
		const { content, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
		const menu = computed(() => storefrontCatalogMenu(content.value.categories || [], content.value.settings.catalogMenu));
		const groups = computed(() => menu.value.groups);
		const groupsWithImages = computed(() => groups.value.filter((group) => Boolean(group.imageUrl || group.items?.some((item) => item.imageUrl))));
		watch(() => props.open, (open) => {
			if (open) loadStorefrontContent(true);
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sb-catalog-layer"><aside class="sb-catalog-drawer" aria-label="Каталог товаров"><div class="sb-catalog-drawer__head"><div><h2>Всё для мастера</h2></div><button aria-label="Закрыть каталог">`);
					_push(ssrRenderComponent(unref(X), { size: 21 }, null, _parent));
					_push(`</button></div><form class="sb-catalog-search" role="search">`);
					_push(ssrRenderComponent(unref(Search), { size: 19 }, null, _parent));
					_push(`<input${ssrRenderAttr("value", unref(search))} type="search" aria-label="Поиск товаров" placeholder="Найти материалы и инструменты"><button type="submit" aria-label="Найти товары">`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 19 }, null, _parent));
					_push(`</button></form>`);
					if (unref(menu).quickLinks.length) {
						_push(`<div class="sb-catalog-quick"><!--[-->`);
						ssrRenderList(unref(menu).quickLinks, (link) => {
							_push(ssrRenderComponent(_component_NuxtLink, {
								key: link.key,
								to: link.url,
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										_push(`<b${_scopeId}>${ssrInterpolate(link.label)}</b><small${_scopeId}>${ssrInterpolate(link.description)}</small>`);
										_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
									} else return [
										createVNode("b", null, toDisplayString(link.label), 1),
										createVNode("small", null, toDisplayString(link.description), 1),
										createVNode(unref(ArrowRight), { size: 17 })
									];
								}),
								_: 2
							}, _parent));
						});
						_push(`<!--]--></div>`);
					} else _push(`<!---->`);
					_push(`<div class="sb-catalog-menu"><!--[-->`);
					ssrRenderList(unref(groupsWithImages), (group) => {
						_push(`<section>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(group),
							class: "sb-catalog-group-link",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									if (group.imageUrl || group.items?.find((item) => item.imageUrl)?.imageUrl) _push(`<span class="sb-catalog-group-link__image"${_scopeId}><img${ssrRenderAttr("src", unref(storefrontMediaUrl)(group.imageUrl || group.items?.find((item) => item.imageUrl)?.imageUrl))}${ssrRenderAttr("alt", group.label)} loading="lazy"${_scopeId}></span>`);
									else _push(`<!---->`);
									_push(`<span class="sb-catalog-group-link__copy"${_scopeId}><h3${_scopeId}>${ssrInterpolate(group.label)}</h3></span>`);
									_push(ssrRenderComponent(unref(ChevronRight), { size: 16 }, null, _parent, _scopeId));
								} else return [
									group.imageUrl || group.items?.find((item) => item.imageUrl)?.imageUrl ? (openBlock(), createBlock("span", {
										key: 0,
										class: "sb-catalog-group-link__image"
									}, [createVNode("img", {
										src: unref(storefrontMediaUrl)(group.imageUrl || group.items?.find((item) => item.imageUrl)?.imageUrl),
										alt: group.label,
										loading: "lazy"
									}, null, 8, ["src", "alt"])])) : createCommentVNode("", true),
									createVNode("span", { class: "sb-catalog-group-link__copy" }, [createVNode("h3", null, toDisplayString(group.label), 1)]),
									createVNode(unref(ChevronRight), { size: 16 })
								];
							}),
							_: 2
						}, _parent));
						_push(`<!--[-->`);
						ssrRenderList(group.items, (item) => {
							_push(ssrRenderComponent(_component_NuxtLink, {
								key: item.id,
								to: ("storefrontCatalogLink" in _ctx ? _ctx.storefrontCatalogLink : unref(storefrontCatalogLink))(item),
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(item.label)}`);
									else return [createTextVNode(toDisplayString(item.label), 1)];
								}),
								_: 2
							}, _parent));
						});
						_push(`<!--]--></section>`);
					});
					_push(`<!--]--></div>`);
					if (!unref(groupsWithImages).length) _push(`<p>Категории пока недоступны. Откройте весь каталог или попробуйте позже.</p>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/catalog",
						class: "sb-catalog-all sb-liquid-primary",
						onClick: ($event) => emit("close")
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(` Смотреть весь каталог `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
							} else return [createTextVNode(" Смотреть весь каталог "), createVNode(unref(ArrowRight), { size: 17 })];
						}),
						_: 1
					}, _parent));
					_push(`</aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteCatalogDrawer.vue
var _sfc_setup$18 = SiteCatalogDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteCatalogDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCatalogDrawer.vue");
	return _sfc_setup$18 ? _sfc_setup$18(props, ctx) : void 0;
};
var SiteCatalogDrawer_default = Object.assign(SiteCatalogDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCatalogDrawer" });
// \0virtual:public?%2Fstorefront%2Ficons%2Fyandex-id.svg
var _virtual_public__2Fstorefront_2Ficons_2Fyandex_id_default = publicAssetsURL("/storefront/icons/yandex-id.svg");
// \0virtual:public?%2Fstorefront%2Ficons%2Fvk-id.svg
var _virtual_public__2Fstorefront_2Ficons_2Fvk_id_default = publicAssetsURL("/storefront/icons/vk-id.svg");
// components/storefront/SiteSocialLoginButtons.vue?vue&type=script&setup=true&lang.ts
var SiteSocialLoginButtons_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteSocialLoginButtons",
	__ssrInlineRender: true,
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "sb-social-buttons" }, _attrs))}><button type="button"><i class="sb-yandex-icon"><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Ficons_2Fyandex_id_default)} alt=""></i> Яндекс ID</button><button type="button"><i class="sb-social-icon sb-social-icon--vk"><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Ficons_2Fvk_id_default)} alt=""></i> VK ID</button></div>`);
		};
	}
});
// components/storefront/SiteSocialLoginButtons.vue
var _sfc_setup$17 = SiteSocialLoginButtons_vue_vue_type_script_setup_true_lang_default.setup;
SiteSocialLoginButtons_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteSocialLoginButtons.vue");
	return _sfc_setup$17 ? _sfc_setup$17(props, ctx) : void 0;
};
var SiteSocialLoginButtons_default = Object.assign(SiteSocialLoginButtons_vue_vue_type_script_setup_true_lang_default, { __name: "SiteSocialLoginButtons" });
// composables/useStorefrontPanels.ts
function useStorefrontPanels() {
	const catalogOpen = useState("storefront-catalog-open", () => false);
	const authOpen = useState("storefront-auth-open", () => false);
	const authMode = useState("storefront-auth-mode", () => "login");
	const cartOpen = useState("storefront-cart-open", () => false);
	const favoritesOpen = useState("storefront-favorites-open", () => false);
	const menuOpen = useState("storefront-menu-open", () => false);
	const businessRegistrationOpen = useState("storefront-business-registration-open", () => false);
	function closeAll() {
		catalogOpen.value = false;
		authOpen.value = false;
		cartOpen.value = false;
		favoritesOpen.value = false;
		menuOpen.value = false;
		businessRegistrationOpen.value = false;
	}
	function openCatalog() {
		closeAll();
		catalogOpen.value = true;
	}
	function openAuth(requestedMode = "login") {
		closeAll();
		authMode.value = requestedMode === "register" ? "register" : "login";
		authOpen.value = true;
	}
	function openCart() {
		closeAll();
		cartOpen.value = true;
	}
	function openFavorites() {
		closeAll();
		favoritesOpen.value = true;
	}
	function openMenu() {
		closeAll();
		menuOpen.value = true;
	}
	function openBusinessRegistration() {
		closeAll();
		businessRegistrationOpen.value = true;
	}
	return {
		catalogOpen,
		authOpen,
		authMode,
		cartOpen,
		favoritesOpen,
		menuOpen,
		businessRegistrationOpen,
		closeAll,
		openCatalog,
		openAuth,
		openCart,
		openFavorites,
		openMenu,
		openBusinessRegistration
	};
}
// composables/useStorefront.ts
var favoriteSyncFlights = /* @__PURE__ */ new WeakMap();
var favoriteWrites = /* @__PURE__ */ new WeakMap();
function favoriteIntents(ownerId) {
	return {};
}
function setFavoriteIntent(ownerId, productId, method) {
	if (!/^[A-Za-z0-9-]{1,80}$/.test(productId)) throw new Error("Некорректный товар");
	const intents = favoriteIntents(), id = crypto.randomUUID();
	intents[productId] = {
		method,
		id
	};
	return id;
}
function useStorefront() {
	const config = useRuntimeConfig();
	const app = useNuxtApp();
	const accessToken = useCookie("sb-customer-token", {
		sameSite: "lax",
		default: () => null
	});
	const refreshToken = useCookie("sb-customer-refresh", {
		sameSite: "lax",
		default: () => null
	});
	const initialCartSession = useState("storefront-cart-session-id", () => `web-${crypto.randomUUID()}`);
	const cartSession = useCookie("sb-cart-session", {
		sameSite: "lax",
		default: () => initialCartSession.value
	});
	const user = useState("storefront-user", () => null);
	const cart = useState("storefront-cart", () => null);
	const authReady = useState("storefront-auth-ready", () => false);
	const favoriteIds = useState("storefront-favorites", () => []);
	const favoriteSyncError = useState("storefront-favorites-sync-error", () => false);
	const authHeaders = computed(() => accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {});
	const cartCount = computed(() => (cart.value?.items || []).reduce((sum, item) => sum + item.quantity, 0));
	async function loadCart() {
		cart.value = await $fetch$1$1("/cart", {
			baseURL: config.public.apiBase,
			headers: {
				...authHeaders.value,
				"x-cart-session": cartSession.value
			}
		});
		return cart.value;
	}
	async function addToCart(product, quantity = 1, variantId) {
		const variant = variantId ? product?.variants?.find((item) => item.id === variantId && item.isActive !== false) : product?.variants?.find((item) => item.isActive !== false && (product.productType === "GIFT_CARD" || Number(item.stock) - Number(item.reserved || 0) >= quantity));
		if (!variant) throw new Error("У товара нет доступного варианта");
		cart.value = await $fetch$1$1("/cart/items", {
			baseURL: config.public.apiBase,
			method: "POST",
			headers: {
				...authHeaders.value,
				"x-cart-session": cartSession.value
			},
			body: {
				variantId: variant.id,
				quantity
			}
		});
		return cart.value;
	}
	async function loadMe() {
		if (!accessToken.value) {
			user.value = null;
			authReady.value = true;
			return null;
		}
		try {
			user.value = await $fetch$1$1("/auth/me", {
				baseURL: config.public.apiBase,
				headers: authHeaders.value
			});
		} catch (exception) {
			if (![401, 403].includes(Number(exception?.statusCode || exception?.status))) return user.value;
			if (!refreshToken.value) return logout();
			try {
				const session = await $fetch$1$1("/auth/refresh", {
					baseURL: config.public.apiBase,
					method: "POST",
					body: { refreshToken: refreshToken.value }
				});
				accessToken.value = session.accessToken;
				refreshToken.value = session.refreshToken;
				user.value = await $fetch$1$1("/auth/me", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${session.accessToken}` }
				});
			} catch (exception) {
				if ([
					400,
					401,
					403
				].includes(Number(exception?.statusCode || exception?.status))) logout();
			}
		} finally {
			authReady.value = true;
		}
		return user.value;
	}
	function saveSession(session) {
		accessToken.value = session.accessToken;
		refreshToken.value = session.refreshToken;
		user.value = session.user;
		authReady.value = true;
	}
	async function login(email, password) {
		const session = await $fetch$1$1("/auth/login", {
			baseURL: config.public.apiBase,
			method: "POST",
			body: {
				email,
				password
			}
		});
		saveSession(session);
		await bindCart();
		return session;
	}
	async function register(payload) {
		const session = await $fetch$1$1("/auth/register", {
			baseURL: config.public.apiBase,
			method: "POST",
			body: payload
		});
		saveSession(session);
		await bindCart();
		return session;
	}
	async function bindCart() {
		if (!accessToken.value) return;
		try {
			cart.value = await $fetch$1$1("/storefront/cart/bind", {
				baseURL: config.public.apiBase,
				method: "POST",
				headers: {
					...authHeaders.value,
					"x-cart-session": cartSession.value
				}
			});
		} catch (exception) {
			throw exception;
		}
	}
	function logout() {
		const headers = { ...authHeaders.value };
		if (accessToken.value) $fetch$1$1("/auth/logout", {
			baseURL: config.public.apiBase,
			method: "POST",
			headers
		}).catch(() => void 0);
		accessToken.value = null;
		refreshToken.value = null;
		user.value = null;
		cartSession.value = `web-${crypto.randomUUID()}`;
		cart.value = null;
		favoriteIds.value = [];
		favoriteSyncError.value = false;
		authReady.value = true;
		return null;
	}
	function loadLocalFavorites() {}
	function favoriteWrite(productId, method, token, ownerId, intentId) {
		let queue = favoriteWrites.get(app);
		if (!queue) {
			queue = /* @__PURE__ */ new Map();
			favoriteWrites.set(app, queue);
		}
		const key = `${ownerId}:${productId}`;
		const operation = (queue.get(key) || Promise.resolve()).catch(() => void 0).then(async () => {
			if (accessToken.value !== token || user.value?.id !== ownerId) return;
			if (favoriteIntents()[productId]?.id !== intentId) return;
			await $fetch$1$1(`/storefront/favorites/${encodeURIComponent(productId)}`, {
				baseURL: config.public.apiBase,
				method,
				headers: { Authorization: `Bearer ${token}` }
			});
			if (accessToken.value !== token || user.value?.id !== ownerId) return;
			const pending = favoriteIntents();
			if (pending[productId]?.id === intentId) delete pending[productId];
		});
		queue.set(key, operation);
		operation.finally(() => {
			if (queue.get(key) === operation) queue.delete(key);
		}).catch(() => void 0);
		return operation;
	}
	async function syncFavorites() {
		const token = accessToken.value, ownerId = user.value?.id;
		if (token && !ownerId) {
			favoriteIds.value = [];
			favoriteSyncError.value = true;
			return favoriteIds.value;
		}
		if (!token) {
			favoriteSyncError.value = false;
			return favoriteIds.value;
		}
		const existing = favoriteSyncFlights.get(app);
		if (existing && existing.token === token && existing.ownerId === ownerId) return existing.promise;
		const promise = (async () => {
			favoriteSyncError.value = false;
			try {
				const pending = Object.entries(favoriteIntents(ownerId));
				const local = new Set(favoriteIds.value);
				for (const [id, intent] of pending) if (intent.method === "DELETE") local.delete(id);
				else local.add(id);
				favoriteIds.value = [...local];
				const initial = [...favoriteIds.value];
				for (let offset = 0; offset < pending.length; offset += 4) {
					if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
					await Promise.all(pending.slice(offset, offset + 4).map(([id, intent]) => favoriteWrite(id, intent.method, token, ownerId, intent.id)));
				}
				if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
				const pendingAtRead = favoriteIntents(ownerId);
				const remote = await $fetch$1$1("/storefront/favorites", {
					baseURL: config.public.apiBase,
					headers: { Authorization: `Bearer ${token}` }
				});
				if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
				const remoteIds = remote.map((item) => item.productId);
				const remoteSet = new Set(remoteIds);
				const missing = favoriteIds.value.filter((id) => !remoteSet.has(id));
				for (let offset = 0; offset < missing.length; offset += 4) {
					if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
					const batch = missing.slice(offset, offset + 4).filter((id) => favoriteIds.value.includes(id));
					await Promise.all(batch.map((id) => {
						const existing = favoriteIntents(ownerId)[id];
						if (existing?.method === "DELETE") return Promise.resolve();
						const intentId = existing?.id || setFavoriteIntent(ownerId, id, "POST");
						return favoriteWrite(id, "POST", token, ownerId, intentId);
					}));
				}
				if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
				const current = [...favoriteIds.value], currentSet = new Set(current);
				const removed = new Set(initial.filter((id) => !currentSet.has(id)));
				const pendingNow = favoriteIntents(ownerId);
				for (const [id, intent] of [...Object.entries(pendingAtRead), ...Object.entries(pendingNow)]) if (intent.method === "DELETE" && !currentSet.has(id)) removed.add(id);
				favoriteIds.value = [.../* @__PURE__ */ new Set([...remoteIds.filter((id) => !removed.has(id)), ...current])];
			} catch {
				if (accessToken.value === token && user.value?.id === ownerId) favoriteSyncError.value = true;
			}
			return favoriteIds.value;
		})();
		favoriteSyncFlights.set(app, {
			token,
			ownerId,
			promise
		});
		try {
			return await promise;
		} finally {
			if (favoriteSyncFlights.get(app)?.promise === promise) favoriteSyncFlights.delete(app);
		}
	}
	function toggleFavorite(productId) {
		const removing = favoriteIds.value.includes(productId);
		const token = accessToken.value, ownerId = user.value?.id;
		let intentId;
		if (token && !ownerId) {
			favoriteSyncError.value = true;
			return;
		}
		if (token && ownerId) try {
			intentId = setFavoriteIntent(ownerId, productId, removing ? "DELETE" : "POST");
		} catch {
			favoriteSyncError.value = true;
			return;
		}
		favoriteIds.value = removing ? favoriteIds.value.filter((id) => id !== productId) : [...favoriteIds.value, productId];
		if (token && ownerId && intentId) favoriteWrite(productId, removing ? "DELETE" : "POST", token, ownerId, intentId).catch(() => {
			if (accessToken.value === token && user.value?.id === ownerId) favoriteSyncError.value = true;
		});
	}
	return {
		accessToken,
		refreshToken,
		cartSession,
		user,
		cart,
		authReady,
		favoriteIds,
		favoriteSyncError,
		authHeaders,
		cartCount,
		loadCart,
		addToCart,
		loadMe,
		login,
		register,
		logout,
		bindCart,
		loadLocalFavorites,
		syncFavorites,
		toggleFavorite
	};
}
// components/storefront/SiteAuthDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteAuthDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAuthDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useStorefrontMotion();
		const config = useRuntimeConfig();
		const { authMode: mode } = useStorefrontPanels();
		const route = useRoute();
		const showPassword = ref(false);
		const busy = ref(false);
		const error = ref("");
		const socialNotice = ref("");
		const resetting = ref(false);
		const resetSent = ref(false);
		const consent = ref(false);
		const form = reactive({
			email: "",
			password: "",
			firstName: "",
			lastName: "",
			phone: ""
		});
		useStorefront();
		watch(() => props.open, (open) => {
			if (open) {
				resetting.value = false;
				resetSent.value = false;
				error.value = "";
				socialNotice.value = "";
			} else form.password = "";
		});
		watch(mode, () => {
			resetting.value = false;
			error.value = "";
			socialNotice.value = "";
		});
		async function social(provider) {
			socialNotice.value = "";
			try {
				const result = await $fetch$1$1(`/auth/social/${provider}/start`, {
					baseURL: config.public.apiBase,
					query: { returnUrl: ["/cart", "/account"].includes(route.path) ? route.fullPath : "/account" }
				});
				if (result.authorizationUrl) (void 0).location.href = result.authorizationUrl;
			} catch (exception) {
				socialNotice.value = exception?.data?.message || "Социальный вход ещё не настроен администратором.";
			}
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteSocialLoginButtons = SiteSocialLoginButtons_default;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sd-layer"><aside class="sb-side-drawer sb-auth-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="auth-drawer-title"><div class="sd-toolbar"><button type="button"${ssrRenderAttr("aria-label", unref(resetting) || unref(mode) === "register" ? "Вернуться ко входу" : "Вернуться к покупкам")}>`);
					_push(ssrRenderComponent(unref(ChevronLeft), {
						size: 32,
						"stroke-width": 1
					}, null, _parent));
					_push(`</button><button type="button" aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), {
						size: 32,
						"stroke-width": 1.5
					}, null, _parent));
					_push(`</button></div><div class="sd-content sd-auth-content"><header class="sd-heading sd-auth-heading"><span>Личный кабинет</span><h2 id="auth-drawer-title">${ssrInterpolate(unref(resetting) ? "Восстановить пароль" : unref(mode) === "login" ? "Вход" : "Регистрация")}</h2><p>${ssrInterpolate(unref(resetting) ? "Отправим ссылку для смены пароля на ваш email." : unref(mode) === "login" ? "Войдите, чтобы продолжить покупки." : "Бонусы и история заказов — в одном месте.")}</p></header>`);
					if (!unref(resetting)) _push(`<div class="sb-drawer-tabs"><button type="button" class="${ssrRenderClass({ active: unref(mode) === "login" })}"${ssrRenderAttr("aria-pressed", unref(mode) === "login")}>Вход</button><button type="button" class="${ssrRenderClass({ active: unref(mode) === "register" })}"${ssrRenderAttr("aria-pressed", unref(mode) === "register")}>Регистрация</button></div>`);
					else _push(`<!---->`);
					if (unref(resetting)) {
						_push(`<form class="sb-drawer-form"><label>Email<input${ssrRenderAttr("value", unref(form).email)} type="email" autocomplete="email" required maxlength="254" placeholder="name@example.ru"></label>`);
						if (unref(resetSent)) _push(`<p class="sb-social-notice" role="status">${ssrInterpolate(unref(socialNotice))}</p>`);
						else _push(`<!---->`);
						if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<button class="sb-liquid-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Отправляем…" : "Отправить ссылку")}`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button><button type="button" class="sb-drawer-secondary">Вернуться ко входу</button></form>`);
					} else {
						_push(`<form class="sb-drawer-form">`);
						if (unref(mode) === "register") _push(`<div class="sb-auth-row"><label>Имя<input${ssrRenderAttr("value", unref(form).firstName)} autocomplete="given-name" required placeholder="Ваше имя"></label><label>Фамилия<input${ssrRenderAttr("value", unref(form).lastName)} autocomplete="family-name" placeholder="Фамилия"></label></div>`);
						else _push(`<!---->`);
						_push(`<label>Email<input${ssrRenderAttr("value", unref(form).email)} type="email" autocomplete="email" required placeholder="name@example.ru"></label>`);
						if (unref(mode) === "register") _push(`<label>Телефон<input${ssrRenderAttr("value", unref(form).phone)} type="tel" autocomplete="tel" placeholder="+7 999 000-00-00"></label>`);
						else _push(`<!---->`);
						_push(`<label>Пароль <div class="sb-password"><input${ssrRenderDynamicModel(unref(showPassword) ? "text" : "password", unref(form).password, null)}${ssrRenderAttr("type", unref(showPassword) ? "text" : "password")}${ssrRenderAttr("autocomplete", unref(mode) === "login" ? "current-password" : "new-password")}${ssrRenderAttr("minlength", unref(mode) === "register" ? 10 : void 0)} required${ssrRenderAttr("placeholder", unref(mode) === "register" ? "Не менее 10 символов" : "Ваш пароль")}><button type="button"${ssrRenderAttr("aria-label", unref(showPassword) ? "Скрыть пароль" : "Показать пароль")}>`);
						if (unref(showPassword)) _push(ssrRenderComponent(unref(EyeOff), { size: 18 }, null, _parent));
						else _push(ssrRenderComponent(unref(Eye), { size: 18 }, null, _parent));
						_push(`</button></div></label>`);
						if (unref(mode) === "login") _push(`<button type="button" class="sb-forgot">Забыли пароль?</button>`);
						else _push(`<!---->`);
						if (unref(mode) === "register") {
							_push(`<label class="sb-auth-consent"><input${ssrIncludeBooleanAttr(Array.isArray(unref(consent)) ? ssrLooseContain(unref(consent), null) : unref(consent)) ? " checked" : ""} type="checkbox" required><span>Принимаю `);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/privacy",
								target: "_blank"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`политику конфиденциальности`);
									else return [createTextVNode("политику конфиденциальности")];
								}),
								_: 1
							}, _parent));
							_push(` и `);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: "/oferta",
								target: "_blank"
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`публичную оферту`);
									else return [createTextVNode("публичную оферту")];
								}),
								_: 1
							}, _parent));
							_push(`.</span></label>`);
						} else _push(`<!---->`);
						if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<button class="sb-liquid-primary"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Подождите…" : unref(mode) === "login" ? "Войти" : "Создать аккаунт")}</button></form>`);
					}
					if (!unref(resetting)) _push(`<div class="sb-social-divider"><span>или продолжить через</span></div>`);
					else _push(`<!---->`);
					if (!unref(resetting)) _push(ssrRenderComponent(_component_SiteSocialLoginButtons, { onSelect: social }, null, _parent));
					else _push(`<!---->`);
					if (unref(socialNotice) && !unref(resetting)) _push(`<p class="sb-social-notice">${ssrInterpolate(unref(socialNotice))}</p>`);
					else _push(`<!---->`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						to: "/b2b-login",
						class: "sb-b2b-entry",
						onClick: ($event) => emit("close")
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(ssrRenderComponent(unref(BriefcaseBusiness), { size: 20 }, null, _parent, _scopeId));
								_push(`<span${_scopeId}><b${_scopeId}>Профессиональный кабинет</b><small${_scopeId}>Вход для салонов и B2B-клиентов</small></span>`);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
							} else return [
								createVNode(unref(BriefcaseBusiness), { size: 20 }),
								createVNode("span", null, [createVNode("b", null, "Профессиональный кабинет"), createVNode("small", null, "Вход для салонов и B2B-клиентов")]),
								createVNode(unref(ArrowRight), { size: 18 })
							];
						}),
						_: 1
					}, _parent));
					_push(`</div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteAuthDrawer.vue
var _sfc_setup$16 = SiteAuthDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteAuthDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAuthDrawer.vue");
	return _sfc_setup$16 ? _sfc_setup$16(props, ctx) : void 0;
};
var SiteAuthDrawer_default = Object.assign(SiteAuthDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAuthDrawer" });
// components/storefront/SiteQuantityControl.vue?vue&type=script&setup=true&lang.ts
var SiteQuantityControl_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteQuantityControl",
	__ssrInlineRender: true,
	props: {
		quantity: {},
		min: { default: 1 },
		max: { default: Number.MAX_SAFE_INTEGER },
		disabled: {
			type: Boolean,
			default: false
		},
		compact: {
			type: Boolean,
			default: false
		}
	},
	emits: ["change"],
	setup(__props, { emit: __emit }) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				class: ["sb-quantity", { "sb-quantity--compact": __props.compact }],
				role: "group",
				"aria-label": "Количество товара"
			}, _attrs))}><button type="button"${ssrIncludeBooleanAttr(__props.disabled || __props.quantity <= __props.min) ? " disabled" : ""} aria-label="Уменьшить количество">`);
			_push(ssrRenderComponent(unref(Minus), { size: 18 }, null, _parent));
			_push(`</button><b aria-live="polite" aria-atomic="true">${ssrInterpolate(__props.quantity)}</b><button type="button"${ssrIncludeBooleanAttr(__props.disabled || __props.quantity >= __props.max) ? " disabled" : ""} aria-label="Увеличить количество">`);
			_push(ssrRenderComponent(unref(Plus), { size: 18 }, null, _parent));
			_push(`</button></div>`);
		};
	}
});
// components/storefront/SiteQuantityControl.vue
var _sfc_setup$15 = SiteQuantityControl_vue_vue_type_script_setup_true_lang_default.setup;
SiteQuantityControl_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteQuantityControl.vue");
	return _sfc_setup$15 ? _sfc_setup$15(props, ctx) : void 0;
};
var SiteQuantityControl_default = Object.assign(SiteQuantityControl_vue_vue_type_script_setup_true_lang_default, { __name: "SiteQuantityControl" });
// components/storefront/SiteCartSuggestion.vue?vue&type=script&setup=true&lang.ts
var SiteCartSuggestion_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCartSuggestion",
	__ssrInlineRender: true,
	props: { product: {} },
	setup(__props) {
		const props = __props;
		const { favoriteIds} = useStorefront();
		const imageFailed = ref(false);
		const image = computed(() => storefrontProductImage(props.product));
		const gift = computed(() => props.product.productType === "GIFT_CARD");
		const variants = computed(() => (props.product.variants || []).filter((v) => v.isActive !== false && (gift.value || Number(v.stock) - Number(v.reserved || 0) > 0)));
		const variant = computed(() => variants.value[0]);
		watch(image, () => {
			imageFailed.value = false;
		});
		const favorite = computed(() => favoriteIds.value.includes(props.product.id));
		const price = computed(() => new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: props.product.currency || "RUB",
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(storefrontVariantPrice(variant.value, gift.value)));
		const variantLabel = (v) => v?.name && v.name !== "Основной вариант" ? v.name : v?.sku || "Основной вариант";
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sd-suggestion" }, _attrs))}>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
				class: "sd-suggestion-image",
				"aria-label": __props.product.nameRu
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						if (unref(image) && !unref(imageFailed)) _push(`<img${ssrRenderAttr("src", unref(image))}${ssrRenderAttr("alt", __props.product.nameRu)} loading="lazy"${_scopeId}>`);
						else _push(`<span class="sd-image-placeholder"${_scopeId}>SARKISIAN</span>`);
					} else return [unref(image) && !unref(imageFailed) ? (openBlock(), createBlock("img", {
						key: 0,
						src: unref(image),
						alt: __props.product.nameRu,
						loading: "lazy",
						onError: ($event) => imageFailed.value = true
					}, null, 40, [
						"src",
						"alt",
						"onError"
					])) : (openBlock(), createBlock("span", {
						key: 1,
						class: "sd-image-placeholder"
					}, "SARKISIAN"))];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
				class: "sd-suggestion-name"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(__props.product.nameRu)}`);
					else return [createTextVNode(toDisplayString(__props.product.nameRu), 1)];
				}),
				_: 1
			}, _parent));
			_push(`<button type="button" class="sd-suggestion-favorite"${ssrRenderAttr("aria-label", unref(favorite) ? "Убрать из избранного" : "Добавить в избранное")}${ssrRenderAttr("aria-pressed", unref(favorite))}>`);
			_push(ssrRenderComponent(unref(Heart), {
				size: 18,
				fill: unref(favorite) ? "currentColor" : "none"
			}, null, _parent));
			_push(`</button><div class="sd-suggestion-bottom"><small>${ssrInterpolate(variantLabel(unref(variant)))}</small><strong>${ssrInterpolate(unref(price))}</strong></div></article>`);
		};
	}
});
// components/storefront/SiteCartSuggestion.vue
var _sfc_setup$14 = SiteCartSuggestion_vue_vue_type_script_setup_true_lang_default.setup;
SiteCartSuggestion_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCartSuggestion.vue");
	return _sfc_setup$14 ? _sfc_setup$14(props, ctx) : void 0;
};
var SiteCartSuggestion_default = Object.assign(SiteCartSuggestion_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCartSuggestion" });
// components/storefront/ProductCard.vue?vue&type=script&setup=true&lang.ts
var ProductCard_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "ProductCard",
	__ssrInlineRender: true,
	props: {
		product: {},
		badge: {},
		editorial: { type: Boolean },
		catalog: { type: Boolean },
		volumes: {}
	},
	setup(__props) {
		const props = __props;
		const { t, english, formatPrice } = useHomeLocale();
		const editorialName = computed(() => english.value && props.product.nameEn ? props.product.nameEn : props.product.nameRu);
		const { content: storefrontContent } = useStorefrontContent();
		const configuredBadges = computed(() => storefrontBadges(props.product, storefrontContent.value.settings.productBadges ?? DEFAULT_PRODUCT_BADGES));
		const { favoriteIds} = useStorefront();
		const added = ref(false);
		const busy = ref(false);
		const error = ref("");
		const imageFailed = ref(false);
		const image = computed(() => storefrontProductImage(props.product));
		watch(image, () => {
			imageFailed.value = false;
		});
		const variants = computed(() => (props.product.variants || []).filter((item) => item.isActive !== false && (!props.volumes?.length || props.volumes.includes(catalogVolume(item, props.product).split(" ")[0]))));
		const isGiftCard = computed(() => props.product.productType === "GIFT_CARD");
		const variant = computed(() => isGiftCard.value ? [...variants.value].sort((a, b) => Number(a.price) - Number(b.price))[0] : variants.value.find((item) => Number(item.stock) - Number(item.reserved || 0) > 0) || variants.value[0]);
		const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
		const price = computed(() => variant.value ? storefrontVariantPrice(variant.value, isGiftCard.value) : Number(props.product.basePrice ?? 0));
		const regularPrice = computed(() => Number(variant.value?.regularPrice ?? variant.value?.price ?? props.product.basePrice ?? 0));
		const inFavorite = computed(() => favoriteIds.value.includes(props.product.id));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			if (__props.catalog) {
				_push(`<article${ssrRenderAttrs(mergeProps({ class: "sc-product" }, _attrs))}><div class="sc-product-frame">`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
					class: "sc-product-link"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`<h3${_scopeId}>${ssrInterpolate(unref(editorialName))}</h3><div class="sc-product-image"${_scopeId}>`);
							if (unref(image) && !unref(imageFailed)) _push(`<img${ssrRenderAttr("src", unref(image))}${ssrRenderAttr("alt", unref(editorialName))} loading="lazy"${_scopeId}>`);
							else _push(`<span class="sc-product-placeholder"${_scopeId}>SARKISIAN<small${_scopeId}>${ssrInterpolate(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже"))}</small></span>`);
							_push(`</div><div class="sc-product-meta"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(catalogVolume)(unref(variant), __props.product) || (unref(variant)?.name !== "Основной вариант" ? unref(variant)?.name : ""))}</span><span class="sc-product-price"${_scopeId}>`);
							if (unref(regularPrice) > unref(price)) _push(`<del${_scopeId}>${ssrInterpolate(unref(formatPrice)(unref(regularPrice), __props.product.currency))}</del>`);
							else _push(`<!---->`);
							_push(`<strong${_scopeId}>${ssrInterpolate(unref(isGiftCard) && unref(variants).length > 1 ? unref(t)("от ") : "")}${ssrInterpolate(unref(formatPrice)(unref(price), __props.product.currency))}</strong></span></div>`);
						} else return [
							createVNode("h3", null, toDisplayString(unref(editorialName)), 1),
							createVNode("div", { class: "sc-product-image" }, [unref(image) && !unref(imageFailed) ? (openBlock(), createBlock("img", {
								key: 0,
								src: unref(image),
								alt: unref(editorialName),
								loading: "lazy",
								onError: ($event) => imageFailed.value = true
							}, null, 40, [
								"src",
								"alt",
								"onError"
							])) : (openBlock(), createBlock("span", {
								key: 1,
								class: "sc-product-placeholder"
							}, [createTextVNode("SARKISIAN"), createVNode("small", null, toDisplayString(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже")), 1)]))]),
							createVNode("div", { class: "sc-product-meta" }, [createVNode("span", null, toDisplayString(unref(catalogVolume)(unref(variant), __props.product) || (unref(variant)?.name !== "Основной вариант" ? unref(variant)?.name : "")), 1), createVNode("span", { class: "sc-product-price" }, [unref(regularPrice) > unref(price) ? (openBlock(), createBlock("del", { key: 0 }, toDisplayString(unref(formatPrice)(unref(regularPrice), __props.product.currency)), 1)) : createCommentVNode("", true), createVNode("strong", null, toDisplayString(unref(isGiftCard) && unref(variants).length > 1 ? unref(t)("от ") : "") + toDisplayString(unref(formatPrice)(unref(price), __props.product.currency)), 1)])])
						];
					}),
					_: 1
				}, _parent));
				_push(`<button type="button" class="${ssrRenderClass([{ "is-active": unref(inFavorite) }, "sc-product-favorite"])}"${ssrRenderAttr("aria-pressed", unref(inFavorite))}${ssrRenderAttr("aria-label", unref(t)(unref(inFavorite) ? "Убрать из избранного" : "Добавить в избранное"))}>`);
				_push(ssrRenderComponent(unref(Heart), {
					fill: unref(inFavorite) ? "currentColor" : "none",
					"stroke-width": 1.5
				}, null, _parent));
				_push(`</button></div><div class="sc-product-actions"><button type="button" class="sb-design-button"${ssrIncludeBooleanAttr(unref(busy) || !unref(available)) ? " disabled" : ""}>`);
				if (unref(added)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				else _push(ssrRenderComponent(unref(ShoppingBag), { size: 16 }, null, _parent));
				_push(`${ssrInterpolate(unref(t)(unref(busy) ? "Добавляем…" : unref(isGiftCard) && unref(available) ? "Выбрать номинал" : unref(added) ? "Добавлено" : unref(available) ? "В корзину" : "Нет в наличии"))}</button>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "sc-product-arrow",
					to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
					"aria-label": `${unref(t)("Подробнее")}: ${unref(editorialName)}`
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(ssrRenderComponent(unref(ArrowRight), { "stroke-width": 1 }, null, _parent, _scopeId));
						else return [createVNode(unref(ArrowRight), { "stroke-width": 1 })];
					}),
					_: 1
				}, _parent));
				_push(`</div>`);
				if (unref(error)) _push(`<p class="sc-product-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<span class="sb-visually-hidden" role="status">${ssrInterpolate(unref(added) ? unref(t)("Добавлено в корзину") : "")}</span></article>`);
			} else if (__props.editorial) {
				_push(`<article${ssrRenderAttrs(mergeProps({ class: "sh-product" }, _attrs))}>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
					class: "sh-product-image",
					"aria-label": unref(editorialName)
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							if (unref(image) && !unref(imageFailed)) _push(`<img${ssrRenderAttr("src", unref(image))}${ssrRenderAttr("alt", unref(editorialName))} loading="lazy"${_scopeId}>`);
							else _push(`<span class="sh-product-placeholder"${_scopeId}>SARKISIAN<small${_scopeId}>${ssrInterpolate(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже"))}</small></span>`);
						} else return [unref(image) && !unref(imageFailed) ? (openBlock(), createBlock("img", {
							key: 0,
							src: unref(image),
							alt: unref(editorialName),
							loading: "lazy",
							onError: ($event) => imageFailed.value = true
						}, null, 40, [
							"src",
							"alt",
							"onError"
						])) : (openBlock(), createBlock("span", {
							key: 1,
							class: "sh-product-placeholder"
						}, [createTextVNode("SARKISIAN"), createVNode("small", null, toDisplayString(unref(t)(unref(isGiftCard) ? "Подарочная карта" : "Фото появится позже")), 1)]))];
					}),
					_: 1
				}, _parent));
				_push(`<div class="sh-product-copy"><span class="sh-product-label">${ssrInterpolate(unref(configuredBadges)[0]?.label || (__props.product.categories?.find((item) => item.isPrimary) || __props.product.categories?.[0])?.category?.nameRu || "SARKISIAN")}</span><h3>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product) }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${ssrInterpolate(unref(editorialName))}`);
						else return [createTextVNode(toDisplayString(unref(editorialName)), 1)];
					}),
					_: 1
				}, _parent));
				_push(`</h3><span class="sh-product-variant">${ssrInterpolate(unref(variant)?.name && unref(variant).name !== "Основной вариант" ? unref(variant).name : unref(t)(unref(available) ? "В наличии" : "Нет в наличии"))}</span><div class="sh-product-bottom"><span>${ssrInterpolate(unref(variants).length > 1 ? `${unref(variants).length} ${unref(english) ? "variants" : "варианта"}` : "SARKISIAN")}</span><span class="sh-product-price">`);
				if (unref(regularPrice) > unref(price)) _push(`<del>${ssrInterpolate(unref(formatPrice)(unref(regularPrice), __props.product.currency))}</del>`);
				else _push(`<!---->`);
				_push(`${ssrInterpolate(unref(isGiftCard) && unref(variants).length > 1 ? unref(t)("от ") : "")}${ssrInterpolate(unref(formatPrice)(unref(price), __props.product.currency))}</span></div><button class="sh-product-buy"${ssrIncludeBooleanAttr(unref(busy) || !unref(available)) ? " disabled" : ""}>`);
				if (unref(added)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				else _push(ssrRenderComponent(unref(ShoppingBag), { size: 16 }, null, _parent));
				_push(`${ssrInterpolate(unref(t)(unref(busy) ? "Добавляем…" : unref(isGiftCard) && unref(available) ? "Выбрать номинал" : unref(added) ? "Добавлено" : unref(available) ? "В корзину" : "Нет в наличии"))}</button>`);
				if (unref(error)) _push(`<p class="sh-product-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`</div></article>`);
			} else {
				_push(`<article${ssrRenderAttrs(mergeProps({ class: "sb-product-card" }, _attrs))}><div class="sb-product-card__frame">`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product),
					class: "sb-product-card__visual",
					"aria-label": `${unref(t)("Подробнее")}: ${unref(editorialName)}`
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							if (unref(image) && !unref(imageFailed)) _push(`<img${ssrRenderAttr("src", unref(image))}${ssrRenderAttr("alt", unref(editorialName))} loading="lazy"${_scopeId}>`);
							else _push(`<div class="${ssrRenderClass([{ "sb-gift-product-art": unref(isGiftCard) }, "sb-product-placeholder"])}"${_scopeId}><span${_scopeId}>${ssrInterpolate(unref(isGiftCard) ? "Подарочная карта" : "S")}</span><small${_scopeId}>SARKISIAN</small></div>`);
						} else return [unref(image) && !unref(imageFailed) ? (openBlock(), createBlock("img", {
							key: 0,
							src: unref(image),
							alt: unref(editorialName),
							loading: "lazy",
							onError: ($event) => imageFailed.value = true
						}, null, 40, [
							"src",
							"alt",
							"onError"
						])) : (openBlock(), createBlock("div", {
							key: 1,
							class: ["sb-product-placeholder", { "sb-gift-product-art": unref(isGiftCard) }]
						}, [createVNode("span", null, toDisplayString(unref(isGiftCard) ? "Подарочная карта" : "S"), 1), createVNode("small", null, "SARKISIAN")], 2))];
					}),
					_: 1
				}, _parent));
				_push(`<div class="sb-product-badges"><!--[-->`);
				ssrRenderList(unref(configuredBadges), (item) => {
					_push(`<span class="sb-product-badge" style="${ssrRenderStyle({
						background: item.color,
						color: item.textColor
					})}">${ssrInterpolate(item.label)}</span>`);
				});
				_push(`<!--]--></div><button type="button" class="${ssrRenderClass([{ active: unref(inFavorite) }, "sb-favorite"])}"${ssrRenderAttr("aria-pressed", unref(inFavorite))}${ssrRenderAttr("aria-label", unref(t)(unref(inFavorite) ? "Убрать из избранного" : "Добавить в избранное"))}>`);
				_push(ssrRenderComponent(unref(Heart), {
					size: 19,
					fill: unref(inFavorite) ? "currentColor" : "none",
					"aria-hidden": "true"
				}, null, _parent));
				_push(`</button><button type="button" class="sb-quick-add sb-card-add-overlay"${ssrIncludeBooleanAttr(unref(busy) || !unref(available)) ? " disabled" : ""}>`);
				if (unref(added)) _push(ssrRenderComponent(unref(Check), {
					size: 17,
					"aria-hidden": "true"
				}, null, _parent));
				else _push(ssrRenderComponent(unref(ShoppingBag), {
					size: 17,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`${ssrInterpolate(unref(t)(unref(busy) ? "Добавляем…" : unref(isGiftCard) && unref(available) ? "Подробнее" : unref(added) ? "Добавлено" : unref(available) ? "В корзину" : "Нет в наличии"))}</button></div><div class="sb-product-card__meta">`);
				if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<span>${ssrInterpolate((__props.product.categories?.find((item) => item.isPrimary) || __props.product.categories?.[0])?.category?.nameRu || "SARKISIAN BRAND")}</span><h3>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(__props.product) }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${ssrInterpolate(__props.product.nameRu)}`);
						else return [createTextVNode(toDisplayString(__props.product.nameRu), 1)];
					}),
					_: 1
				}, _parent));
				_push(`</h3><div class="sb-product-card__price-row"><div class="sb-product-prices">`);
				if (unref(regularPrice) > unref(price)) _push(`<del>${ssrInterpolate(unref(regularPrice).toLocaleString("ru-RU"))} ₽</del>`);
				else _push(`<!---->`);
				_push(`<strong>${ssrInterpolate(unref(isGiftCard) && unref(variants).length > 1 ? "от " : "")}${ssrInterpolate(unref(price).toLocaleString("ru-RU"))} ₽</strong></div>`);
				if (!unref(isGiftCard)) _push(`<small>${ssrInterpolate(unref(available) ? "В наличии" : "Нет в наличии")}</small>`);
				else _push(`<!---->`);
				_push(`</div><button type="button" class="sb-quick-add sb-card-add-mobile"${ssrIncludeBooleanAttr(unref(busy) || !unref(available)) ? " disabled" : ""}>`);
				if (unref(added)) _push(ssrRenderComponent(unref(Check), {
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				else _push(ssrRenderComponent(unref(ShoppingBag), {
					size: 18,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`${ssrInterpolate(unref(t)(unref(busy) ? "Добавляем…" : unref(isGiftCard) && unref(available) ? "Подробнее" : unref(added) ? "Добавлено" : unref(available) ? "В корзину" : "Нет в наличии"))}</button><span class="sb-visually-hidden" role="status">${ssrInterpolate(unref(added) ? unref(t)("Добавлено в корзину") : "")}</span></div></article>`);
			}
		};
	}
});
// components/storefront/ProductCard.vue
var _sfc_setup$13 = ProductCard_vue_vue_type_script_setup_true_lang_default.setup;
ProductCard_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/ProductCard.vue");
	return _sfc_setup$13 ? _sfc_setup$13(props, ctx) : void 0;
};
var ProductCard_default = Object.assign(ProductCard_vue_vue_type_script_setup_true_lang_default, { __name: "ProductCard" });
// components/storefront/SiteCartRecommendations.vue?vue&type=script&setup=true&lang.ts
var SiteCartRecommendations_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCartRecommendations",
	__ssrInlineRender: true,
	props: { drawer: { type: Boolean } },
	setup(__props) {
		const config = useRuntimeConfig();
		const { cart } = useStorefront();
		const items = ref([]);
		const loading = ref(false);
		const failed = ref(false);
		const track = ref();
		const atStart = ref(true);
		const atEnd = ref(false);
		const excluded = computed(() => [...new Set((cart.value?.items || []).map((item) => item.variant.product.id))].sort().join(","));
		let request = 0;
		function updateEdges() {
			if (!track.value) return;
			atStart.value = track.value.scrollLeft < 2;
			atEnd.value = track.value.scrollLeft + track.value.clientWidth >= track.value.scrollWidth - 2;
		}
		async function load() {
			const current = ++request;
			loading.value = true;
			failed.value = false;
			try {
				const result = await $fetch$1$1("/products/recommendations/cart", {
					baseURL: config.public.apiBase,
					query: { exclude: excluded.value }
				});
				if (current === request) items.value = result.items.slice(0, 8);
			} catch {
				if (current === request) {
					items.value = [];
					failed.value = true;
				}
			} finally {
				if (current === request) {
					loading.value = false;
					await nextTick();
					updateEdges();
				}
			}
		}
		let observer;
		watch(excluded, load);
		watch(track, (element) => {
			observer?.disconnect();
			if (element) {
				observer = new ResizeObserver(updateEdges);
				observer.observe(element);
				updateEdges();
			}
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteCartSuggestion = SiteCartSuggestion_default;
			const _component_ProductCard = ProductCard_default;
			if (__props.drawer && (unref(loading) || unref(failed) || unref(items).length)) {
				_push(`<div${ssrRenderAttrs(mergeProps({
					class: "sd-recommendations",
					"aria-busy": unref(loading)
				}, _attrs))}>`);
				if (unref(failed)) _push(`<p class="sd-recommendations-note" role="status">Не удалось загрузить рекомендации. <button type="button">Повторить</button></p>`);
				else if (unref(loading) && !unref(items).length) _push(`<p class="sd-recommendations-note" role="status">Подбираем товары…</p>`);
				else _push(`<!---->`);
				if (unref(items).length) {
					_push(`<section class="sd-recommendations-more" aria-label="Вам может понравиться"><h3>Вам может понравиться</h3><div class="sd-recommendations-grid"><!--[-->`);
					ssrRenderList(unref(items).slice(0, 3), (item) => {
						_push(ssrRenderComponent(_component_SiteCartSuggestion, {
							key: item.id,
							product: item
						}, null, _parent));
					});
					_push(`<!--]--></div></section>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else if (!__props.drawer && (unref(loading) || unref(failed) || unref(items).length)) {
				_push(`<section${ssrRenderAttrs(mergeProps({
					class: "sb-cart-recommendations",
					"aria-label": "Вам может понравиться",
					"aria-busy": unref(loading)
				}, _attrs))}><header><h2>Вам может понравиться</h2>`);
				if (unref(items).length) {
					_push(`<div class="sb-carousel-controls"><button type="button" aria-label="Предыдущие товары"${ssrIncludeBooleanAttr(unref(atStart)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowLeft), { size: 18 }, null, _parent));
					_push(`</button><button type="button" aria-label="Следующие товары"${ssrIncludeBooleanAttr(unref(atEnd)) ? " disabled" : ""}>`);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button></div>`);
				} else _push(`<!---->`);
				_push(`</header>`);
				if (unref(failed)) _push(`<p class="sb-cart-recommendations-note">Не удалось загрузить рекомендации. <button type="button" class="sb-checkout-text">Повторить</button></p>`);
				else if (unref(loading) && !unref(items).length) _push(`<p class="sb-cart-recommendations-note" role="status">Подбираем товары…</p>`);
				else _push(`<!---->`);
				if (unref(items).length) {
					_push(`<div class="sb-cart-recommendations-track" role="region" aria-label="Рекомендованные товары" tabindex="0"><!--[-->`);
					ssrRenderList(unref(items), (item) => {
						_push(ssrRenderComponent(_component_ProductCard, {
							key: item.id,
							product: item
						}, null, _parent));
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`</section>`);
			} else _push(`<!---->`);
		};
	}
});
// components/storefront/SiteCartRecommendations.vue
var _sfc_setup$12 = SiteCartRecommendations_vue_vue_type_script_setup_true_lang_default.setup;
SiteCartRecommendations_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCartRecommendations.vue");
	return _sfc_setup$12 ? _sfc_setup$12(props, ctx) : void 0;
};
var SiteCartRecommendations_default = Object.assign(SiteCartRecommendations_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCartRecommendations" });
// components/storefront/SiteCartDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteCartDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCartDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useStorefrontMotion();
		const config = useRuntimeConfig();
		const { cartSession, cart, cartCount, loadCart, authHeaders } = useStorefront();
		const loading = ref(false);
		const busy = ref("");
		const error = ref("");
		function message(exception) {
			return Array.isArray(exception?.data?.message) ? exception.data.message.join(". ") : exception?.data?.message || "Не удалось обновить корзину. Попробуйте ещё раз.";
		}
		const total = computed(() => Number(cart.value?.total || 0));
		const countLabel = computed(() => {
			const count = cartCount.value, last = count % 10, lastTwo = count % 100;
			return `${count} ${last === 1 && lastTwo !== 11 ? "товар" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "товара" : "товаров"}`;
		});
		async function change(item, quantity) {
			if (busy.value) return;
			busy.value = item.id;
			error.value = "";
			try {
				cart.value = await $fetch$1$1(`/cart/items/${item.id}`, {
					baseURL: config.public.apiBase,
					method: "PATCH",
					headers: {
						...authHeaders.value,
						"x-cart-session": cartSession.value
					},
					body: { quantity: Math.max(1, quantity) }
				});
			} catch (exception) {
				error.value = message(exception);
			} finally {
				busy.value = "";
			}
		}
		watch(() => props.open, async (value) => {
			if (!value) return;
			loading.value = true;
			error.value = "";
			await loadCart().catch((exception) => {
				error.value = message(exception);
			});
			loading.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteQuantityControl = SiteQuantityControl_default;
			const _component_SiteCartRecommendations = SiteCartRecommendations_default;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sd-layer"><aside class="sb-side-drawer sb-cart-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"><div class="sd-toolbar"><button type="button" aria-label="Вернуться к покупкам">`);
					_push(ssrRenderComponent(unref(ChevronLeft), {
						size: 32,
						"stroke-width": 1
					}, null, _parent));
					_push(`</button><button type="button" aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), {
						size: 32,
						"stroke-width": 1.5
					}, null, _parent));
					_push(`</button></div><div class="sd-content"><header class="sd-heading sd-cart-heading"><h2 id="cart-drawer-title">Корзина</h2><span aria-live="polite">${ssrInterpolate(unref(countLabel))}</span></header>`);
					if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
					else _push(`<!---->`);
					if (unref(loading)) _push(`<div class="sb-drawer-state">Загружаем корзину…</div>`);
					else if (unref(cart)?.items?.length) {
						_push(`<div class="sd-cart"><div class="sd-cart-list"${ssrRenderAttr("aria-busy", !!unref(busy))}><!--[-->`);
						ssrRenderList(unref(cart).items, (item) => {
							_push(`<article class="sd-cart-item"><div class="sd-cart-media">`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.variant.product),
								class: "sd-cart-image",
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product)) _push(`<img${ssrRenderAttr("src", ("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product))}${ssrRenderAttr("alt", item.variant.product.nameRu)}${_scopeId}>`);
										else _push(`<span class="sd-image-placeholder"${_scopeId}>SARKISIAN<small${_scopeId}>Фото появится позже</small></span>`);
									} else return [("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product) ? (openBlock(), createBlock("img", {
										key: 0,
										src: ("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(item.variant.product),
										alt: item.variant.product.nameRu
									}, null, 8, ["src", "alt"])) : (openBlock(), createBlock("span", {
										key: 1,
										class: "sd-image-placeholder"
									}, [createTextVNode("SARKISIAN"), createVNode("small", null, "Фото появится позже")]))];
								}),
								_: 2
							}, _parent));
							_push(ssrRenderComponent(_component_SiteQuantityControl, {
								quantity: item.quantity,
								max: Math.max(item.quantity, item.variant.stock - item.variant.reserved),
								disabled: !!unref(busy),
								compact: "",
								onChange: ($event) => change(item, $event)
							}, null, _parent));
							_push(`</div><div class="sd-cart-info">`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.variant.product),
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(item.variant.product.nameRu)}`);
									else return [createTextVNode(toDisplayString(item.variant.product.nameRu), 1)];
								}),
								_: 2
							}, _parent));
							_push(`<small>${ssrInterpolate(item.variant.name && item.variant.name !== "Основной вариант" ? item.variant.name : item.variant.sku)}</small><div class="sd-cart-item-bottom"><button class="sd-remove" type="button"${ssrRenderAttr("aria-label", `Удалить товар ${item.variant.product.nameRu}`)}${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>`);
							_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
							_push(`<span>Удалить</span></button><strong>${ssrInterpolate((Number(item.variant.price) * item.quantity).toLocaleString("ru-RU"))} ₽</strong></div></div></article>`);
						});
						_push(`<!--]--></div>`);
						_push(ssrRenderComponent(_component_SiteCartRecommendations, { drawer: "" }, null, _parent));
						_push(`<div class="sd-cart-footer"><div class="sd-cart-total"><span>Итого</span><strong>${ssrInterpolate(unref(total).toLocaleString("ru-RU"))} ₽</strong></div><small>Доставка рассчитывается при оформлении</small>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/cart",
							class: "sb-liquid-primary",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`Перейти к оформлению`);
								else return [createTextVNode("Перейти к оформлению")];
							}),
							_: 1
						}, _parent));
						_push(`<button class="sb-drawer-secondary">Продолжить покупки</button></div></div>`);
					} else {
						_push(`<div class="sb-drawer-empty"><i>`);
						_push(ssrRenderComponent(unref(ShoppingBag), { size: 30 }, null, _parent));
						_push(`</i><h3>Здесь пока пусто</h3><p>Добавьте профессиональные материалы из каталога.</p>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/catalog",
							class: "sb-liquid-primary",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Открыть каталог `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
								} else return [createTextVNode("Открыть каталог "), createVNode(unref(ArrowRight), { size: 17 })];
							}),
							_: 1
						}, _parent));
						_push(`</div>`);
					}
					_push(`</div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteCartDrawer.vue
var _sfc_setup$11 = SiteCartDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteCartDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCartDrawer.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
var SiteCartDrawer_default = Object.assign(SiteCartDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCartDrawer" });
// components/storefront/SiteFavoritesDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteFavoritesDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteFavoritesDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useStorefrontMotion();
		const config = useRuntimeConfig();
		const { favoriteIds, favoriteSyncError, syncFavorites, accessToken, user, loadMe } = useStorefront();
		const products = ref([]);
		const loading = ref(false);
		const loadError = ref("");
		const busyId = ref("");
		const addedId = ref("");
		const errorId = ref("");
		const addError = ref("");
		const failedImages = ref([]);
		let loadRevision = 0;
		const favorites = computed(() => products.value.filter((product) => favoriteIds.value.includes(product.id)).map((product) => {
			const variants = (product.variants || []).filter((item) => item.isActive !== false);
			const gift = product.productType === "GIFT_CARD";
			const variant = gift ? [...variants].sort((a, b) => Number(a.price) - Number(b.price))[0] : variants.find((item) => Number(item.stock) > Number(item.reserved || 0)) || variants[0];
			return {
				product,
				variant,
				gift,
				image: storefrontProductImage(product),
				available: gift ? Boolean(variant) : Number(variant?.stock || 0) > Number(variant?.reserved || 0),
				price: variant ? storefrontVariantPrice(variant, gift) : Number(product.basePrice || 0),
				regularPrice: Number(variant?.regularPrice ?? variant?.price ?? product.basePrice ?? 0),
				category: (product.categories?.find((item) => item.isPrimary) || product.categories?.[0])?.category?.nameRu || "SARKISIAN BRAND"
			};
		}));
		const countLabel = computed(() => {
			const count = favoriteIds.value.length, last = count % 10, lastTwo = count % 100;
			return count + " " + (last === 1 && lastTwo !== 11 ? "товар" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "товара" : "товаров");
		});
		const unavailable = computed(() => Math.max(0, new Set(favoriteIds.value).size - favorites.value.length));
		async function load() {
			const revision = ++loadRevision;
			loading.value = true;
			loadError.value = "";
			products.value = [];
			try {
				if (accessToken.value && !user.value) await loadMe();
				if (accessToken.value && !user.value) throw new Error("Сессия недоступна");
				const token = accessToken.value, owner = user.value?.id;
				await syncFavorites();
				if (revision !== loadRevision || token !== accessToken.value || owner !== user.value?.id) return;
				const result = await fetchFavoriteProducts([...favoriteIds.value], (batch) => $fetch$1$1("/products", {
					baseURL: config.public.apiBase,
					query: {
						limit: 8,
						ids: batch.join(",")
					}
				}));
				if (revision === loadRevision && token === accessToken.value && owner === user.value?.id) products.value = result;
			} catch {
				if (revision === loadRevision) loadError.value = "Не удалось загрузить избранное. Попробуйте ещё раз.";
			} finally {
				if (revision === loadRevision) loading.value = false;
			}
		}
		watch([
			() => props.open,
			accessToken,
			() => user.value?.id
		], ([value]) => {
			if (value) {
				errorId.value = "";
				addError.value = "";
				load();
			} else {
				loadRevision++;
				products.value = [];
			}
		}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sd-layer"><aside class="sb-side-drawer sb-favorites-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="favorites-drawer-title"><div class="sd-toolbar"><button type="button" aria-label="Вернуться к покупкам">`);
					_push(ssrRenderComponent(unref(ChevronLeft), {
						size: 32,
						"stroke-width": 1
					}, null, _parent));
					_push(`</button><button type="button" aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), {
						size: 32,
						"stroke-width": 1.5
					}, null, _parent));
					_push(`</button></div><div class="sd-content"><header class="sd-heading sd-cart-heading"><h2 id="favorites-drawer-title">Избранное</h2><span aria-live="polite">${ssrInterpolate(unref(countLabel))}</span></header>`);
					if (unref(loading)) _push(`<div class="sb-drawer-state" role="status">Загружаем избранное…</div>`);
					else if (unref(loadError)) _push(`<div class="sd-favorites-error"><p class="sb-form-error" role="alert">${ssrInterpolate(unref(loadError))}</p><button type="button" class="sb-liquid-primary">Повторить загрузку</button></div>`);
					else if (unref(favoriteSyncError) && !unref(favorites).length) _push(`<div class="sd-favorites-error"><p class="sb-form-error" role="alert">Не удалось синхронизировать избранное с аккаунтом. Попробуйте ещё раз.</p><button type="button" class="sb-liquid-primary">Повторить загрузку</button></div>`);
					else if (unref(favorites).length) {
						_push(`<!--[-->`);
						if (unref(favoriteSyncError)) _push(`<p class="sb-form-error" role="status">Не удалось синхронизировать избранное с аккаунтом. Показаны товары, сохранённые на этом устройстве. <button type="button">Повторить</button></p>`);
						else if (unref(unavailable)) _push(`<p class="sb-form-error" role="status">Некоторые сохранённые товары сейчас недоступны.</p>`);
						else _push(`<!---->`);
						_push(`<div class="sd-cart-list sd-favorite-list"${ssrRenderAttr("aria-busy", Boolean(unref(busyId)))}><!--[-->`);
						ssrRenderList(unref(favorites), (item) => {
							_push(`<article class="sd-cart-item"><div class="sd-cart-media">`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.product),
								class: "sd-cart-image",
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) {
										if (item.image && !unref(failedImages).includes(item.product.id)) _push(`<img${ssrRenderAttr("src", item.image)}${ssrRenderAttr("alt", item.product.nameRu)} loading="lazy"${_scopeId}>`);
										else _push(`<span class="sd-image-placeholder"${_scopeId}>SARKISIAN<small${_scopeId}>Фото появится позже</small></span>`);
									} else return [item.image && !unref(failedImages).includes(item.product.id) ? (openBlock(), createBlock("img", {
										key: 0,
										src: item.image,
										alt: item.product.nameRu,
										loading: "lazy",
										onError: ($event) => unref(failedImages).push(item.product.id)
									}, null, 40, [
										"src",
										"alt",
										"onError"
									])) : (openBlock(), createBlock("span", {
										key: 1,
										class: "sd-image-placeholder"
									}, [createTextVNode("SARKISIAN"), createVNode("small", null, "Фото появится позже")]))];
								}),
								_: 2
							}, _parent));
							_push(`</div><div class="sd-cart-info"><small>${ssrInterpolate(item.category)}</small>`);
							_push(ssrRenderComponent(_component_NuxtLink, {
								to: ("storefrontProductLink" in _ctx ? _ctx.storefrontProductLink : unref(storefrontProductLink))(item.product),
								onClick: ($event) => emit("close")
							}, {
								default: withCtx((_, _push, _parent, _scopeId) => {
									if (_push) _push(`${ssrInterpolate(item.product.nameRu)}`);
									else return [createTextVNode(toDisplayString(item.product.nameRu), 1)];
								}),
								_: 2
							}, _parent));
							if (item.variant?.name && item.variant.name !== "Основной вариант") _push(`<small>${ssrInterpolate(item.variant.name)}</small>`);
							else _push(`<!---->`);
							_push(`<div class="sd-favorite-price">`);
							if (item.regularPrice > item.price) _push(`<del>${ssrInterpolate(item.regularPrice.toLocaleString("ru-RU"))} ₽</del>`);
							else _push(`<!---->`);
							_push(`<strong>${ssrInterpolate(item.price.toLocaleString("ru-RU"))} ₽</strong></div><div class="sd-favorite-actions"><button type="button" class="sb-liquid-primary"${ssrIncludeBooleanAttr(Boolean(unref(busyId)) || !item.available) ? " disabled" : ""}>`);
							if (unref(addedId) === item.product.id) _push(ssrRenderComponent(unref(Check), { size: 17 }, null, _parent));
							else _push(ssrRenderComponent(unref(ShoppingBag), {
								size: 17,
								"stroke-width": 1.5
							}, null, _parent));
							_push(`${ssrInterpolate(unref(busyId) === item.product.id ? "Добавляем…" : unref(addedId) === item.product.id ? "Добавлено" : !item.available ? "Нет в наличии" : item.gift ? "Выбрать номинал" : "В корзину")}</button><button type="button" class="sd-remove"${ssrRenderAttr("aria-label", "Убрать из избранного: " + item.product.nameRu)}>`);
							_push(ssrRenderComponent(unref(Trash2), { size: 16 }, null, _parent));
							_push(`<span>Убрать</span></button></div>`);
							if (unref(errorId) === item.product.id && unref(addError)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(addError))}</p>`);
							else _push(`<!---->`);
							_push(`</div></article>`);
						});
						_push(`<!--]--></div><span class="sb-visually-hidden" role="status">${ssrInterpolate(unref(addedId) ? "Добавлено в корзину" : "")}</span><div class="sd-favorites-footer">`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/catalog",
							class: "sb-liquid-primary",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Продолжить покупки `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
								} else return [createTextVNode("Продолжить покупки "), createVNode(unref(ArrowRight), { size: 17 })];
							}),
							_: 1
						}, _parent));
						_push(`</div><!--]-->`);
					} else if (unref(favoriteIds).length) {
						_push(`<div class="sb-drawer-empty"><i>`);
						_push(ssrRenderComponent(unref(Heart), {
							size: 30,
							"stroke-width": 1.5
						}, null, _parent));
						_push(`</i><h3>Сохранённые товары сейчас недоступны</h3><p>Они могут появиться позже.</p>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/catalog",
							class: "sb-liquid-primary",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Открыть каталог `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
								} else return [createTextVNode("Открыть каталог "), createVNode(unref(ArrowRight), { size: 17 })];
							}),
							_: 1
						}, _parent));
						_push(`</div>`);
					} else {
						_push(`<div class="sb-drawer-empty"><i>`);
						_push(ssrRenderComponent(unref(Heart), {
							size: 30,
							"stroke-width": 1.5
						}, null, _parent));
						_push(`</i><h3>Сохраняйте любимое</h3><p>Нажимайте на сердце в карточке товара — он появится здесь.</p>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/catalog",
							class: "sb-liquid-primary",
							onClick: ($event) => emit("close")
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Открыть каталог `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
								} else return [createTextVNode("Открыть каталог "), createVNode(unref(ArrowRight), { size: 17 })];
							}),
							_: 1
						}, _parent));
						_push(`</div>`);
					}
					_push(`</div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteFavoritesDrawer.vue
var _sfc_setup$10 = SiteFavoritesDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteFavoritesDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteFavoritesDrawer.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var SiteFavoritesDrawer_default = Object.assign(SiteFavoritesDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteFavoritesDrawer" });
// components/storefront/SiteMenuDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteMenuDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteMenuDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		useStorefrontMotion();
		const { content, siteContent } = useStorefrontContent();
		const socialIcon = (key) => ({
			vk: "/storefront/icons/vk.svg",
			telegram: "/storefront/icons/telegram.svg",
			max: "/storefront/icons/max.svg"
		})[String(key).toLowerCase()];
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteMenuLink = SiteMenuLink_default;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer"><aside class="sb-side-drawer sb-menu-drawer" role="dialog" aria-modal="true" aria-label="Меню магазина"><header class="sb-drawer-head"><div><h2>Меню</h2></div><button aria-label="Закрыть меню">`);
					_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
					_push(`</button></header><nav class="sb-menu-links" aria-label="Информация о магазине"><!--[-->`);
					ssrRenderList(unref(content).menuItems, (item) => {
						_push(ssrRenderComponent(_component_SiteMenuLink, {
							key: item.id,
							item,
							arrow: "",
							onActivate: ($event) => emit("close")
						}, null, _parent));
					});
					_push(`<!--]-->`);
					if (!unref(content).menuItems.some((item) => item.url === "/b2b-login")) _push(ssrRenderComponent(_component_SiteMenuLink, {
						item: {
							label: "Кабинет B2B",
							url: "/b2b-login"
						},
						arrow: "",
						onActivate: ($event) => emit("close")
					}, null, _parent));
					else _push(`<!---->`);
					_push(`</nav><div class="sb-menu-contact"><h3>Мы на связи</h3><a${ssrRenderAttr("href", unref(siteContentPhoneHref)(unref(siteContent).contacts.phone))}>${ssrInterpolate(unref(siteContent).contacts.phone)}</a><a${ssrRenderAttr("href", `mailto:${unref(siteContent).contacts.email}`)}>${ssrInterpolate(unref(siteContent).contacts.email)}</a><div class="sb-menu-socials"><!--[-->`);
					ssrRenderList(unref(content).socialLinks, (social) => {
						_push(`<a${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer"${ssrRenderAttr("aria-label", social.name)}>`);
						if (socialIcon(social.iconKey)) _push(`<img${ssrRenderAttr("src", socialIcon(social.iconKey))} alt="">`);
						else _push(`<span>${ssrInterpolate(social.name)}</span>`);
						_push(`</a>`);
					});
					_push(`<!--]--></div></div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteMenuDrawer.vue
var _sfc_setup$9 = SiteMenuDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteMenuDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteMenuDrawer.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
var SiteMenuDrawer_default = Object.assign(SiteMenuDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteMenuDrawer" });
// components/storefront/SiteBusinessRegistrationDrawer.vue?vue&type=script&setup=true&lang.ts
var SiteBusinessRegistrationDrawer_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteBusinessRegistrationDrawer",
	__ssrInlineRender: true,
	props: { open: { type: Boolean } },
	emits: ["close", "after-leave"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useStorefrontMotion();
		const config = useRuntimeConfig();
		useB2BSession();
		useCookie("sb-partner-attribution");
		const form = reactive({
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			password: "",
			companyName: "",
			inn: "",
			kpp: "",
			legalAddress: ""
		});
		const busy = ref(false), error = ref(""), created = ref(null), consent = ref(false), terms = ref(null), termsLoading = ref(false);
		const activeTab = ref("register");
		async function loadTerms() {
			termsLoading.value = true;
			terms.value = null;
			try {
				terms.value = await $fetch$1$1("/business-registration/terms", {
					baseURL: config.public.apiBase,
					timeout: 15e3,
					retry: 0
				});
			} catch {
				error.value = "Не удалось загрузить условия регистрации. Попробуйте ещё раз.";
			} finally {
				termsLoading.value = false;
			}
		}
		watch(() => props.open, (open) => {
			if (open) {
				error.value = "";
				created.value = null;
				consent.value = false;
				activeTab.value = "register";
				loadTerms();
			}
		}, { immediate: true });
		function close() {
			if (!busy.value) emit("close");
		}
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			ssrRenderTeleport(_push, (_push) => {
				if (__props.open) {
					_push(`<div class="sb-glass-layer sd-layer"><aside class="sb-side-drawer sb-business-registration-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="business-registration-title"${ssrRenderAttr("aria-busy", unref(busy))}><div class="sd-toolbar"><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть панель">`);
					_push(ssrRenderComponent(unref(ChevronLeft), {
						size: 32,
						"stroke-width": 1
					}, null, _parent));
					_push(`</button><button type="button"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""} aria-label="Закрыть">`);
					_push(ssrRenderComponent(unref(X), {
						size: 32,
						"stroke-width": 1.5
					}, null, _parent));
					_push(`</button></div><div class="sd-content"><header class="sd-heading"><h2 id="business-registration-title">${ssrInterpolate(unref(created) ? "Заявка принята" : "Регистрация бизнеса")}</h2>`);
					if (unref(created)) _push(`<p>${ssrInterpolate(unref(created).name)} — доступ владельца создан. Команда SARKISIAN проверит данные компании.</p>`);
					else _push(`<p>Создайте отдельный бизнес-аккаунт владельца для салона, онлайн-записи и закупок SARKISIAN.</p>`);
					_push(`</header>`);
					if (!unref(created)) _push(`<div class="sb-business-registration-tabs" role="tablist" aria-label="Регистрация бизнеса или вход в CRM"><button type="button" role="tab"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-selected", unref(activeTab) === "register")} class="${ssrRenderClass({ active: unref(activeTab) === "register" })}">Регистрация</button><button type="button" role="tab"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}${ssrRenderAttr("aria-selected", unref(activeTab) === "login")} class="${ssrRenderClass({ active: unref(activeTab) === "login" })}">Войти</button></div>`);
					else _push(`<!---->`);
					if (unref(created)) {
						_push(`<div class="sb-business-registration-success"><p>Откройте кабинет для настройки салона. После проверки компании подключим закупки и публичную онлайн-запись.</p>`);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: `/b2b?organization=${unref(created).id}`,
							class: "sb-liquid-primary",
							onClick: close
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`Открыть бизнес-кабинет`);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
								} else return [createTextVNode("Открыть бизнес-кабинет"), createVNode(unref(ArrowRight), { size: 18 })];
							}),
							_: 1
						}, _parent));
						_push(`</div>`);
					} else {
						_push(`<form class="sb-drawer-form sb-business-registration-form"${ssrRenderAttr("aria-busy", unref(busy))}><div class="sb-auth-row"><label>Имя<input${ssrRenderAttr("value", unref(form).firstName)} autocomplete="given-name" maxlength="80" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Фамилия<input${ssrRenderAttr("value", unref(form).lastName)} autocomplete="family-name" maxlength="80"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label></div><label>Email для бизнес-кабинета<input${ssrRenderAttr("value", unref(form).email)} type="email" autocomplete="email" maxlength="254" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Телефон<input${ssrRenderAttr("value", unref(form).phone)} type="tel" autocomplete="tel" maxlength="24" placeholder="+7 999 000-00-00"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Пароль для бизнес-кабинета<input${ssrRenderAttr("value", unref(form).password)} type="password" autocomplete="new-password" minlength="10" maxlength="128" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>Название салона или компании<input${ssrRenderAttr("value", unref(form).companyName)} minlength="2" maxlength="160" autocomplete="organization" required${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><div class="sb-auth-row"><label>ИНН<input${ssrRenderAttr("value", unref(form).inn)} inputmode="numeric" pattern="[0-9]{10}|[0-9]{12}" maxlength="12" autocomplete="off"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label><label>КПП<input${ssrRenderAttr("value", unref(form).kpp)} inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="off"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label></div><label>Юридический адрес<input${ssrRenderAttr("value", unref(form).legalAddress)} maxlength="500" autocomplete="street-address"${ssrIncludeBooleanAttr(unref(busy)) ? " disabled" : ""}></label>`);
						if (unref(termsLoading)) _push(`<p role="status">Загружаем условия регистрации…</p>`);
						else if (!unref(terms)) _push(`<button type="button">Повторить загрузку условий</button>`);
						else _push(`<!---->`);
						_push(`<label class="sb-auth-consent"><input${ssrIncludeBooleanAttr(Array.isArray(unref(consent)) ? ssrLooseContain(unref(consent), null) : unref(consent)) ? " checked" : ""} type="checkbox" required${ssrIncludeBooleanAttr(unref(busy) || !unref(terms)) ? " disabled" : ""}><span>Принимаю `);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/privacy",
							target: "_blank"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`политику конфиденциальности`);
								else return [createTextVNode("политику конфиденциальности")];
							}),
							_: 1
						}, _parent));
						_push(` и `);
						_push(ssrRenderComponent(_component_NuxtLink, {
							to: "/oferta",
							target: "_blank"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) _push(`публичную оферту`);
								else return [createTextVNode("публичную оферту")];
							}),
							_: 1
						}, _parent));
						_push(`.</span></label><p class="sb-business-registration-note">Данные компании проверит команда SARKISIAN. Для бизнес-аккаунта используйте отдельные email и телефон.</p>`);
						if (unref(error)) _push(`<p class="sb-form-error" role="alert">${ssrInterpolate(unref(error))}</p>`);
						else _push(`<!---->`);
						_push(`<button class="sb-liquid-primary" type="submit"${ssrIncludeBooleanAttr(unref(busy) || !unref(consent) || !unref(terms)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Отправляем…" : "Зарегистрировать бизнес")}`);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
						_push(`</button></form>`);
					}
					_push(`</div></aside></div>`);
				} else _push(`<!---->`);
			}, "body", false, _parent);
		};
	}
});
// components/storefront/SiteBusinessRegistrationDrawer.vue
var _sfc_setup$8 = SiteBusinessRegistrationDrawer_vue_vue_type_script_setup_true_lang_default.setup;
SiteBusinessRegistrationDrawer_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteBusinessRegistrationDrawer.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var SiteBusinessRegistrationDrawer_default = Object.assign(SiteBusinessRegistrationDrawer_vue_vue_type_script_setup_true_lang_default, { __name: "SiteBusinessRegistrationDrawer" });
// components/storefront/SiteHeader.vue?vue&type=script&setup=true&lang.ts
var SiteHeader_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHeader",
	__ssrInlineRender: true,
	props: { editorial: { type: Boolean } },
	async setup(__props) {
		let __temp, __restore;
		const route = useRoute();
		const scrolled = ref(false);
		const { user, favoriteIds} = useStorefront();
		const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
		[__temp, __restore] = withAsyncContext(() => loadStorefrontContent()), await __temp, __restore();
		const clubMenuOpen = ref(false);
		const primaryMenuItems = computed(() => content.value.menuItems.filter((item) => ![
			"/club",
			"/business",
			"/partnerships"
		].includes(item.url)));
		const clubMenuItem = computed(() => content.value.menuItems.find((item) => item.url === "/club") || {
			id: "club",
			label: "О клубе",
			url: "/club"
		});
		const clubMenuDirections = [
			{
				label: "Для покупателей",
				description: "Бонусы и история покупок",
				url: "/club/referrals"
			},
			{
				label: "Для бизнеса",
				description: "Закупки, команда и запись",
				url: "/business"
			},
			{
				label: "Для блогеров",
				description: "Контент и вознаграждение",
				url: "/partnerships"
			}
		];
		const { catalogOpen, authOpen, cartOpen, favoritesOpen, menuOpen, businessRegistrationOpen, closeAll, openAuth, openCart} = useStorefrontPanels();
		const panelOpen = computed(() => catalogOpen.value || authOpen.value || cartOpen.value || favoritesOpen.value || menuOpen.value || businessRegistrationOpen.value);
		function afterPanelLeave() {
			if (panelOpen.value || true) return;
		}
		watch([
			catalogOpen,
			authOpen,
			cartOpen,
			favoritesOpen,
			menuOpen,
			businessRegistrationOpen
		], async () => {});
		function accountAction() {
			closeAll();
			if (user.value) navigateTo("/account");
			else openAuth();
		}
		function closeAuth() {
			authOpen.value = false;
		}
		watch(panelOpen, (open) => {});
		watch(() => route.fullPath, closeAll);
		watch(() => route.fullPath, () => {
			clubMenuOpen.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteHomeNavigation = SiteHomeNavigation_default;
			const _component_NuxtLink = NuxtLink;
			const _component_SiteMenuLink = SiteMenuLink_default;
			const _component_SiteCatalogDrawer = SiteCatalogDrawer_default;
			const _component_SiteAuthDrawer = SiteAuthDrawer_default;
			const _component_SiteCartDrawer = SiteCartDrawer_default;
			const _component_SiteFavoritesDrawer = SiteFavoritesDrawer_default;
			const _component_SiteMenuDrawer = SiteMenuDrawer_default;
			const _component_SiteBusinessRegistrationDrawer = SiteBusinessRegistrationDrawer_default;
			_push(`<!--[--><div class="${ssrRenderClass([{
				"is-scrolled": unref(scrolled),
				"sb-home-head": __props.editorial
			}, "sb-site-head"])}">`);
			if (__props.editorial) _push(ssrRenderComponent(_component_SiteHomeNavigation, {
				onAccount: accountAction,
				onCart: unref(openCart)
			}, null, _parent));
			else _push(`<!---->`);
			if (!__props.editorial) _push(`<div class="sb-announcement"><span>${ssrInterpolate(unref(content).settings.announcementText)}</span></div>`);
			else _push(`<!---->`);
			if (!__props.editorial) {
				_push(`<div class="sb-header-wrap"><header class="sb-header sb-glass-surface">`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/",
					class: "sb-logo",
					"aria-label": `${unref(siteContent).brand.name} — на главную`
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(siteContent).brand.logoUrl))}${ssrRenderAttr("alt", unref(siteContent).brand.name)}${_scopeId}>`);
						else return [createVNode("img", {
							src: unref(storefrontMediaUrl)(unref(siteContent).brand.logoUrl),
							alt: unref(siteContent).brand.name
						}, null, 8, ["src", "alt"])];
					}),
					_: 1
				}, _parent));
				_push(`<button class="sb-catalog-button">`);
				_push(ssrRenderComponent(unref(Menu), { size: 17 }, null, _parent));
				_push(`<span>Каталог</span></button><nav class="sb-page-menu" aria-label="Страницы сайта"><div class="${ssrRenderClass([{ "is-open": unref(clubMenuOpen) }, "sb-club-menu"])}"><button type="button" class="sb-menu-link sb-club-menu__trigger"${ssrRenderAttr("aria-expanded", unref(clubMenuOpen))} aria-haspopup="true"><span>${ssrInterpolate(unref(clubMenuItem).label)}</span>`);
				_push(ssrRenderComponent(unref(ChevronDown), {
					size: 15,
					"aria-hidden": "true"
				}, null, _parent));
				_push(`</button><div class="sb-club-menu__dropdown" role="menu" style="${ssrRenderStyle(unref(clubMenuOpen) ? null : { display: "none" })}">`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "sb-club-menu__home",
					to: "/club",
					role: "menuitem",
					onClick: ($event) => clubMenuOpen.value = false
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`<strong${_scopeId}>О клубе</strong>`);
						else return [createVNode("strong", null, "О клубе")];
					}),
					_: 1
				}, _parent));
				_push(`<!--[-->`);
				ssrRenderList(clubMenuDirections, (direction) => {
					_push(ssrRenderComponent(_component_NuxtLink, {
						key: direction.url,
						to: direction.url,
						role: "menuitem",
						onClick: ($event) => clubMenuOpen.value = false
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`<span${_scopeId}><strong${_scopeId}>${ssrInterpolate(direction.label)}</strong><small${_scopeId}>${ssrInterpolate(direction.description)}</small></span>`);
								_push(ssrRenderComponent(unref(ArrowRight), {
									size: 15,
									"aria-hidden": "true"
								}, null, _parent, _scopeId));
							} else return [createVNode("span", null, [createVNode("strong", null, toDisplayString(direction.label), 1), createVNode("small", null, toDisplayString(direction.description), 1)]), createVNode(unref(ArrowRight), {
								size: 15,
								"aria-hidden": "true"
							})];
						}),
						_: 2
					}, _parent));
				});
				_push(`<!--]--></div></div><!--[-->`);
				ssrRenderList(unref(primaryMenuItems), (item) => {
					_push(ssrRenderComponent(_component_SiteMenuLink, {
						key: item.id,
						item
					}, null, _parent));
				});
				_push(`<!--]--></nav><nav class="sb-header-actions" aria-label="Покупки и аккаунт"><button aria-label="Избранное" title="Избранное">`);
				_push(ssrRenderComponent(unref(Heart), { size: 22 }, null, _parent));
				if (unref(favoriteIds).length) _push(`<b>${ssrInterpolate(unref(favoriteIds).length)}</b>`);
				else _push(`<!---->`);
				_push(`</button></nav></header></div>`);
			} else _push(`<!---->`);
			_push(ssrRenderComponent(_component_SiteCatalogDrawer, {
				open: unref(catalogOpen),
				onClose: unref(closeAll),
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(ssrRenderComponent(_component_SiteAuthDrawer, {
				open: unref(authOpen),
				onClose: closeAuth,
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(ssrRenderComponent(_component_SiteCartDrawer, {
				open: unref(cartOpen),
				onClose: unref(closeAll),
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(ssrRenderComponent(_component_SiteFavoritesDrawer, {
				open: unref(favoritesOpen),
				onClose: unref(closeAll),
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(ssrRenderComponent(_component_SiteMenuDrawer, {
				open: unref(menuOpen),
				onClose: unref(closeAll),
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(ssrRenderComponent(_component_SiteBusinessRegistrationDrawer, {
				open: unref(businessRegistrationOpen),
				onClose: unref(closeAll),
				onAfterLeave: afterPanelLeave
			}, null, _parent));
			_push(`</div>`);
			if (!__props.editorial) {
				_push(`<nav class="sb-mobile-nav sb-glass-surface" aria-label="Основная навигация"><button aria-label="Каталог"${ssrRenderAttr("aria-expanded", unref(catalogOpen))} class="${ssrRenderClass({ active: unref(catalogOpen) || !unref(panelOpen) && unref(route).path === "/catalog" })}">`);
				_push(ssrRenderComponent(unref(Grid2X2), { size: 23 }, null, _parent));
				_push(`</button><button aria-label="Избранное"${ssrRenderAttr("aria-expanded", unref(favoritesOpen))} class="${ssrRenderClass({ active: unref(favoritesOpen) })}">`);
				_push(ssrRenderComponent(unref(Heart), { size: 23 }, null, _parent));
				if (unref(favoriteIds).length) _push(`<b>${ssrInterpolate(unref(favoriteIds).length > 99 ? "99+" : unref(favoriteIds).length)}</b>`);
				else _push(`<!---->`);
				_push(`</button><button aria-label="Меню"${ssrRenderAttr("aria-expanded", unref(menuOpen))} class="${ssrRenderClass([{ active: unref(menuOpen) }, "sb-mobile-nav__menu"])}">`);
				_push(ssrRenderComponent(unref(Menu), { size: 23 }, null, _parent));
				_push(`</button></nav>`);
			} else _push(`<!---->`);
			_push(`<!--]-->`);
		};
	}
});
// components/storefront/SiteHeader.vue
var _sfc_setup$7 = SiteHeader_vue_vue_type_script_setup_true_lang_default.setup;
SiteHeader_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHeader.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SiteHeader_default = Object.assign(SiteHeader_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHeader" });
// \0virtual:public?%2Fstorefront%2Fhome%2Ffooter-signature.png
var _virtual_public__2Fstorefront_2Fhome_2Ffooter_signature_default = publicAssetsURL("/storefront/home/footer-signature.png");
// \0virtual:public?%2Fstorefront%2Fhome%2Ffooter-wordmark.svg
var _virtual_public__2Fstorefront_2Fhome_2Ffooter_wordmark_default = publicAssetsURL("/storefront/home/footer-wordmark.svg");
// components/storefront/SiteHomeFooter.vue?vue&type=script&setup=true&lang.ts
var SiteHomeFooter_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteHomeFooter",
	__ssrInlineRender: true,
	setup(__props) {
		const { siteContent } = useStorefrontContent();
		const { t } = useHomeLocale();
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteHomeCourses = SiteHomeCourses_default;
			_push(`<footer${ssrRenderAttrs(mergeProps({
				id: "contacts",
				class: "sh-footer sh-container"
			}, _attrs))}><div class="sh-footer-marks">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/",
				class: "sh-signature",
				"aria-label": "SARKISIAN BRAND"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Ffooter_signature_default)} alt="SARKISIAN BRAND" loading="lazy"${_scopeId}>`);
					else return [createVNode("img", {
						src: _virtual_public__2Fstorefront_2Fhome_2Ffooter_signature_default,
						alt: "SARKISIAN BRAND",
						loading: "lazy"
					})];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/",
				class: "sh-footer-wordmark"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Ffooter_wordmark_default)} alt="SARKISIAN" loading="lazy"${_scopeId}>`);
					else return [createVNode("img", {
						src: _virtual_public__2Fstorefront_2Fhome_2Ffooter_wordmark_default,
						alt: "SARKISIAN",
						loading: "lazy"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="sh-footer-links"><nav${ssrRenderAttr("aria-label", unref(t)("О бренде"))}>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/club/referrals" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Реферальная"))}<br${_scopeId}>${ssrInterpolate(unref(t)("программа"))}`);
					else return [
						createTextVNode(toDisplayString(unref(t)("Реферальная")), 1),
						createVNode("br"),
						createTextVNode(toDisplayString(unref(t)("программа")), 1)
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/about" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("О бренде"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("О бренде")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/partnerships" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Сотрудничество"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Сотрудничество")), 1)];
				}),
				_: 1
			}, _parent));
			_push(`</nav><nav${ssrRenderAttr("aria-label", unref(t)("Каталог"))}>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/business" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Онлайн"))}<br${_scopeId}>${ssrInterpolate(unref(t)("запись"))}`);
					else return [
						createTextVNode(toDisplayString(unref(t)("Онлайн")), 1),
						createVNode("br"),
						createTextVNode(toDisplayString(unref(t)("запись")), 1)
					];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/catalog" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Каталог"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Каталог")), 1)];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_SiteHomeCourses, null, null, _parent));
			_push(`</nav><div class="sh-footer-contacts"><span>${ssrInterpolate(unref(t)("Связаться"))}</span><a${ssrRenderAttr("href", unref(siteContentPhoneHref)(unref(siteContent).contacts.phone))}>${ssrInterpolate(unref(siteContent).contacts.phone)}</a><a${ssrRenderAttr("href", `mailto:${unref(siteContent).contacts.email}`)}>${ssrInterpolate(unref(siteContent).contacts.email)}</a></div></div><div class="sh-footer-legal"><span>© ${ssrInterpolate((/* @__PURE__ */ new Date()).getFullYear())} ${ssrInterpolate(unref(siteContent).brand.name)}</span><!--[-->`);
			ssrRenderList(unref(siteContent).footer.legalLinks, (link) => {
				_push(ssrRenderComponent(_component_NuxtLink, {
					key: link.id,
					to: link.url,
					target: link.newTab ? "_blank" : void 0,
					rel: link.newTab ? "noopener noreferrer" : void 0
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${ssrInterpolate(unref(t)(link.label))}`);
						else return [createTextVNode(toDisplayString(unref(t)(link.label)), 1)];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]--></div></footer>`);
		};
	}
});
// components/storefront/SiteHomeFooter.vue
var _sfc_setup$6 = SiteHomeFooter_vue_vue_type_script_setup_true_lang_default.setup;
SiteHomeFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteHomeFooter.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var SiteHomeFooter_default = Object.assign(SiteHomeFooter_vue_vue_type_script_setup_true_lang_default, { __name: "SiteHomeFooter" });
// components/storefront/SiteFooter.vue?vue&type=script&setup=true&lang.ts
var SiteFooter_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteFooter",
	__ssrInlineRender: true,
	async setup(__props) {
		let __temp, __restore;
		const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
		[__temp, __restore] = withAsyncContext(() => loadStorefrontContent()), await __temp, __restore();
		useStorefrontPanels();
		useStorefront();
		const socialIcon = (key) => ({
			vk: "/storefront/icons/vk.svg",
			telegram: "/storefront/icons/telegram.svg",
			max: "/storefront/icons/max.svg"
		})[String(key).toLowerCase()];
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<footer${ssrRenderAttrs(mergeProps({
				"data-v-ui-f6ad9abec0e4": "",
				id: "contacts",
				class: ["sb-footer", {
					"has-custom-columns": unref(siteContent).footer.columns.length !== 2,
					"has-no-columns": unref(siteContent).footer.columns.length === 0
				}],
				style: { "--site-footer-count": unref(siteContent).footer.columns.length }
			}, _attrs))}><div data-v-ui-f6ad9abec0e4 class="sb-footer__brand">`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				"data-v-ui-f6ad9abec0e4": "",
				to: "/",
				class: "sb-logo"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`<img data-v-ui-f6ad9abec0e4${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(siteContent).brand.logoUrl))}${ssrRenderAttr("alt", unref(siteContent).brand.name)}${_scopeId}>`);
					else return [createVNode("img", {
						"data-v-ui-f6ad9abec0e4": "",
						src: unref(storefrontMediaUrl)(unref(siteContent).brand.logoUrl),
						alt: unref(siteContent).brand.name
					}, null, 8, ["src", "alt"])];
				}),
				_: 1
			}, _parent));
			_push(`<p data-v-ui-f6ad9abec0e4>${ssrInterpolate(unref(siteContent).brand.footerText)}</p><div data-v-ui-f6ad9abec0e4 class="sb-footer__socials"><!--[-->`);
			ssrRenderList(unref(content).socialLinks, (social) => {
				_push(`<a data-v-ui-f6ad9abec0e4${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer"${ssrRenderAttr("aria-label", social.name)}>`);
				if (socialIcon(social.iconKey)) _push(`<img data-v-ui-f6ad9abec0e4${ssrRenderAttr("src", socialIcon(social.iconKey))} alt="">`);
				else _push(ssrRenderComponent(unref(ArrowUpRight), {
					"data-v-ui-f6ad9abec0e4": "",
					size: 18
				}, null, _parent));
				_push(`</a>`);
			});
			_push(`<!--]--></div></div><!--[-->`);
			ssrRenderList(unref(siteContent).footer.columns, (column) => {
				_push(`<div data-v-ui-f6ad9abec0e4><h3 data-v-ui-f6ad9abec0e4>${ssrInterpolate(column.title)}</h3><!--[-->`);
				ssrRenderList(column.items, (item) => {
					_push(`<!--[-->`);
					if (item.action !== "none") _push(`<button data-v-ui-f6ad9abec0e4 type="button" class="sb-footer-link"><span data-v-ui-f6ad9abec0e4>${ssrInterpolate(item.label)}</span></button>`);
					else _push(ssrRenderComponent(_component_NuxtLink, {
						"data-v-ui-f6ad9abec0e4": "",
						to: item.url,
						target: item.newTab ? "_blank" : void 0,
						rel: item.newTab ? "noopener noreferrer" : void 0,
						class: "sb-footer-link"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`<span data-v-ui-f6ad9abec0e4${_scopeId}>${ssrInterpolate(item.label)}</span>`);
							else return [createVNode("span", { "data-v-ui-f6ad9abec0e4": "" }, toDisplayString(item.label), 1)];
						}),
						_: 2
					}, _parent));
					_push(`<!--]-->`);
				});
				_push(`<!--]--></div>`);
			});
			_push(`<!--]--><div data-v-ui-f6ad9abec0e4><h3 data-v-ui-f6ad9abec0e4>Связаться</h3><a data-v-ui-f6ad9abec0e4${ssrRenderAttr("href", unref(siteContentPhoneHref)(unref(siteContent).contacts.phone))} class="sb-footer-link">`);
			_push(ssrRenderComponent(unref(Phone), {
				"data-v-ui-f6ad9abec0e4": "",
				size: 15
			}, null, _parent));
			_push(`<span data-v-ui-f6ad9abec0e4>${ssrInterpolate(unref(siteContent).contacts.phone)}</span></a><a data-v-ui-f6ad9abec0e4${ssrRenderAttr("href", `mailto:${unref(siteContent).contacts.email}`)} class="sb-footer-link">`);
			_push(ssrRenderComponent(unref(Mail), {
				"data-v-ui-f6ad9abec0e4": "",
				size: 15
			}, null, _parent));
			_push(`<span data-v-ui-f6ad9abec0e4>${ssrInterpolate(unref(siteContent).contacts.email)}</span></a><span data-v-ui-f6ad9abec0e4>`);
			_push(ssrRenderComponent(unref(MapPin), {
				"data-v-ui-f6ad9abec0e4": "",
				size: 15
			}, null, _parent));
			_push(` ${ssrInterpolate(unref(siteContent).contacts.country)}</span></div><div data-v-ui-f6ad9abec0e4 class="sb-footer__bottom"><span data-v-ui-f6ad9abec0e4>© ${ssrInterpolate((/* @__PURE__ */ new Date()).getFullYear())} ${ssrInterpolate(unref(siteContent).brand.name)}</span><!--[-->`);
			ssrRenderList(unref(siteContent).footer.legalLinks, (item) => {
				_push(ssrRenderComponent(_component_NuxtLink, {
					"data-v-ui-f6ad9abec0e4": "",
					key: item.id,
					to: item.url,
					target: item.newTab ? "_blank" : void 0,
					rel: item.newTab ? "noopener noreferrer" : void 0,
					class: "sb-footer-link"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`<span data-v-ui-f6ad9abec0e4${_scopeId}>${ssrInterpolate(item.label)}</span>`);
						else return [createVNode("span", { "data-v-ui-f6ad9abec0e4": "" }, toDisplayString(item.label), 1)];
					}),
					_: 2
				}, _parent));
			});
			_push(`<!--]--></div></footer>`);
		};
	}
});
// components/storefront/SiteFooter.vue
var _sfc_setup$5 = SiteFooter_vue_vue_type_script_setup_true_lang_default.setup;
SiteFooter_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteFooter.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var SiteFooter_default = Object.assign(SiteFooter_vue_vue_type_script_setup_true_lang_default, { __name: "SiteFooter" });
// components/storefront/SiteCartBadge.vue?vue&type=script&setup=true&lang.ts
var SiteCartBadge_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteCartBadge",
	__ssrInlineRender: true,
	setup(__props) {
		const { cartCount } = useStorefront();
		return (_ctx, _push, _parent, _attrs) => {
			if (unref(cartCount) > 0) _push(`<b${ssrRenderAttrs(mergeProps({
				class: "sb-cart-badge",
				"aria-hidden": "true"
			}, _attrs))}>${ssrInterpolate(unref(cartCount) > 99 ? "99+" : unref(cartCount))}</b>`);
			else _push(`<!---->`);
		};
	}
});
// components/storefront/SiteCartBadge.vue
var _sfc_setup$4 = SiteCartBadge_vue_vue_type_script_setup_true_lang_default.setup;
SiteCartBadge_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteCartBadge.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var SiteCartBadge_default = Object.assign(SiteCartBadge_vue_vue_type_script_setup_true_lang_default, { __name: "SiteCartBadge" });
// \0virtual:public?%2Fstorefront%2Fhome%2Faccount.svg
var _virtual_public__2Fstorefront_2Fhome_2Faccount_default = publicAssetsURL("/storefront/home/account.svg");
// \0virtual:public?%2Fstorefront%2Fhome%2Fcart.svg
var _virtual_public__2Fstorefront_2Fhome_2Fcart_default = publicAssetsURL("/storefront/home/cart.svg");
// components/storefront/SiteFloatingActions.vue?vue&type=script&setup=true&lang.ts
var SiteFloatingActions_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteFloatingActions",
	__ssrInlineRender: true,
	setup(__props) {
		useStorefront();
		useStorefrontPanels();
		const { t } = useHomeLocale();
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteCartBadge = SiteCartBadge_default;
			_push(`<nav${ssrRenderAttrs(mergeProps({
				class: "sh-dock sh-icon-actions",
				"aria-label": unref(t)("Быстрый доступ")
			}, _attrs))}><button type="button"${ssrRenderAttr("aria-label", unref(t)("Личный кабинет"))}${ssrRenderAttr("title", unref(t)("Личный кабинет"))}><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Faccount_default)} alt=""></button><button type="button"${ssrRenderAttr("aria-label", unref(t)("Корзина"))}${ssrRenderAttr("title", unref(t)("Корзина"))}><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fcart_default)} alt="">`);
			_push(ssrRenderComponent(_component_SiteCartBadge, null, null, _parent));
			_push(`</button></nav>`);
		};
	}
});
// components/storefront/SiteFloatingActions.vue
var _sfc_setup$3 = SiteFloatingActions_vue_vue_type_script_setup_true_lang_default.setup;
SiteFloatingActions_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteFloatingActions.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var SiteFloatingActions_default = Object.assign(SiteFloatingActions_vue_vue_type_script_setup_true_lang_default, { __name: "SiteFloatingActions" });
// components/storefront/SiteShell.vue?vue&type=script&setup=true&lang.ts
var SiteShell_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteShell",
	__ssrInlineRender: true,
	props: {
		editorial: { type: Boolean },
		about: { type: Boolean },
		account: { type: Boolean },
		catalog: { type: Boolean },
		product: { type: Boolean }
	},
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteHomeEffects = SiteHomeEffects_default;
			const _component_SiteHeader = SiteHeader_default;
			const _component_SiteHomeFooter = SiteHomeFooter_default;
			const _component_SiteFooter = SiteFooter_default;
			const _component_SiteFloatingActions = SiteFloatingActions_default;
			_push(`<div${ssrRenderAttrs(mergeProps({ class: ["sb-storefront", {
				"sb-home": __props.editorial,
				"sb-about": __props.about,
				"sb-account-editorial": __props.account,
				"sb-catalog-editorial": __props.catalog,
				"sb-product-editorial": __props.product
			}] }, _attrs))}>`);
			if (__props.editorial) _push(ssrRenderComponent(_component_SiteHomeEffects, { about: __props.about || __props.catalog || __props.product }, null, _parent));
			else _push(`<!---->`);
			_push(ssrRenderComponent(_component_SiteHeader, { editorial: __props.editorial }, null, _parent));
			_push(`<main>`);
			ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</main>`);
			if (__props.editorial) _push(ssrRenderComponent(_component_SiteHomeFooter, null, null, _parent));
			else _push(ssrRenderComponent(_component_SiteFooter, null, null, _parent));
			_push(ssrRenderComponent(_component_SiteFloatingActions, null, null, _parent));
			_push(`</div>`);
		};
	}
});
// components/storefront/SiteShell.vue
var _sfc_setup$2 = SiteShell_vue_vue_type_script_setup_true_lang_default.setup;
SiteShell_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteShell.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var SiteShell_default = Object.assign(SiteShell_vue_vue_type_script_setup_true_lang_default, { __name: "SiteShell" });
// error.vue?vue&type=script&setup=true&lang.ts
var error_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "error",
	__ssrInlineRender: true,
	props: { error: {} },
	setup(__props) {
		const props = __props;
		const missing = computed(() => props.error.statusCode === 404);
		useHead({
			title: () => `${missing.value ? "Страница не найдена" : "Временно недоступно"} — SARKISIAN BRAND`,
			meta: [{
				name: "robots",
				content: "noindex, nofollow"
			}]
		});
		function home() {
			clearError({ redirect: "/" });
		}
		function retry() {
			(void 0).location.reload();
		}
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(SiteShell_default, _attrs, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<section class="sb-site-error"${_scopeId}><span class="sb-kicker"${_scopeId}>${ssrInterpolate(unref(missing) ? "404" : "ВРЕМЕННО НЕДОСТУПНО")}</span><h1${_scopeId}>${ssrInterpolate(unref(missing) ? "Страница не найдена" : "Не удалось загрузить страницу")}</h1><p${_scopeId}>${ssrInterpolate(unref(missing) ? "Возможно, ссылка изменилась или страница больше не опубликована. В каталоге можно найти нужные товары." : "Пожалуйста, попробуйте ещё раз через некоторое время. Если заказ уже оформлен, не создавайте его повторно — сначала проверьте статус.")}</p><div${_scopeId}>`);
						if (!unref(missing)) {
							_push(`<button class="sb-primary"${_scopeId}>Попробовать снова `);
							_push(ssrRenderComponent(unref(RotateCcw), { size: 18 }, null, _parent, _scopeId));
							_push(`</button>`);
						} else _push(`<!---->`);
						_push(`<button class="sb-primary"${_scopeId}>На главную `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						_push(`</button></div></section>`);
					} else return [createVNode("section", { class: "sb-site-error" }, [
						createVNode("span", { class: "sb-kicker" }, toDisplayString(unref(missing) ? "404" : "ВРЕМЕННО НЕДОСТУПНО"), 1),
						createVNode("h1", null, toDisplayString(unref(missing) ? "Страница не найдена" : "Не удалось загрузить страницу"), 1),
						createVNode("p", null, toDisplayString(unref(missing) ? "Возможно, ссылка изменилась или страница больше не опубликована. В каталоге можно найти нужные товары." : "Пожалуйста, попробуйте ещё раз через некоторое время. Если заказ уже оформлен, не создавайте его повторно — сначала проверьте статус."), 1),
						createVNode("div", null, [!unref(missing) ? (openBlock(), createBlock("button", {
							key: 0,
							class: "sb-primary",
							onClick: retry
						}, [createTextVNode("Попробовать снова "), createVNode(unref(RotateCcw), { size: 18 })])) : createCommentVNode("", true), createVNode("button", {
							class: "sb-primary",
							onClick: home
						}, [createTextVNode("На главную "), createVNode(unref(ArrowRight), { size: 18 })])])
					])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// error.vue
var _sfc_setup$1 = error_vue_vue_type_script_setup_true_lang_default.setup;
error_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("error.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var error_default = error_vue_vue_type_script_setup_true_lang_default;
// virtual:nuxt:node_modules%2F.cache%2Fnuxt%2F.nuxt%2Fisland-renderer.mjs
var IslandRenderer = () => null;
// node_modules/nuxt/dist/app/components/nuxt-root.vue
var _sfc_main = {
	__name: "nuxt-root",
	__ssrInlineRender: true,
	setup(__props) {
		const nuxtApp = useNuxtApp();
		nuxtApp.deferHydration();
		nuxtApp.ssrContext.url;
		const SingleRenderer = false;
		provide(PageRouteSymbol, useRoute());
		nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup", []);
		const error = useError();
		const abortRender = error.value && !nuxtApp.ssrContext.error;
		function invokeAppErrorHandler(err, target, info) {
			const errorHandler = nuxtApp.vueApp.config.errorHandler;
			if (errorHandler && !errorHandler.__nuxt_default) try {
				errorHandler(err, target, info);
			} catch (handlerError) {
				console.error("[nuxt] Error in `app.config.errorHandler`", handlerError);
			}
		}
		onErrorCaptured((err, target, info) => {
			nuxtApp.hooks.callHook("vue:error", err, target, info)?.catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
			{
				const p = nuxtApp.runWithContext(() => showError(err));
				onServerPrefetch(() => p);
				invokeAppErrorHandler(err, target, info);
				return false;
			}
		});
		const islandContext = nuxtApp.ssrContext.islandContext;
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderSuspense(_push, {
				default: () => {
					if (unref(abortRender)) _push(`<div></div>`);
					else if (unref(error)) _push(ssrRenderComponent(unref(error_default), { error: unref(error) }, null, _parent));
					else if (unref(islandContext)) _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
					else if (unref(SingleRenderer)) ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
					else _push(ssrRenderComponent(unref(app_default), null, null, _parent));
				},
				_: 1
			});
		};
	}
};
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-root.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
// node_modules/nuxt/dist/app/entry.js
var entry$1 = async function createNuxtAppServer(ssrContext) {
	const vueApp = createApp(_sfc_main);
	const nuxt = createNuxtApp({
		vueApp,
		ssrContext
	});
	try {
		await applyPlugins(nuxt, virtual_nuxt_node_modules_2F_cache_2Fnuxt_2F_nuxt_2Fplugins_server_default);
		await nuxt.hooks.callHook("app:created", vueApp);
	} catch (error) {
		await nuxt.hooks.callHook("app:error", error);
		nuxt.payload.error ||= createError$2(error);
	}
	if (ssrContext && (ssrContext["~renderResponse"] || ssrContext._renderResponse)) throw new Error("skipping render");
	return vueApp;
};
var entry_default = ((ssrContext) => entry$1(ssrContext));

const entry = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: entry_default
}, Symbol.toStringTag, { value: 'Module' }));

export { $fetch$1$1 as $, useHomeLocale as A, defaultBusinessPreview as B, useNuxtApp as C, asyncDataDefaults as D, prodReporters as E, docsBase as F, useRouter as G, resolveProductImageUrl as H, useCrmTheme as I, useCookie as J, useStorefrontMotion as K, useB2BSession as L, storefrontProductLink as M, NuxtLink as N, SiteQuantityControl_default as O, SiteCartRecommendations_default as P, ProductCard_default as Q, catalogProductPath as R, SiteShell_default as S, catalogProductCategory as T, storefrontVariantPrice as U, catalogVolume as V, WorkspaceLoading_default as W, fetchFavoriteProducts as X, SiteSocialLoginButtons_default as Y, ClientOnly as Z, defaultSiteContent as _, useWorkspaceSession as a, storefrontActiveCategories as a0, entry as a1, useWorkspaceAccess as b, useRoute as c, defineNuxtRouteMiddleware as d, crmDestination as e, useRuntimeConfig as f, useWorkspaceNavigation as g, crmNavigationItems as h, crmNavigationGroups as i, useState as j, storefrontProductImage as k, storefrontCategoryGroups as l, mergeSiteContent as m, navigateTo as n, storefrontCatalogLink as o, useStorefront as p, useStorefrontPanels as q, useSeoMeta as r, searchCrmNavigation as s, createError$2 as t, useHead as u, fetchDefaults as v, useRequestFetch as w, useStorefrontContent as x, siteContentPhoneHref as y, safeSiteContentUrl as z };;globalThis.__timing__.logEnd('Load chunks/virtual/entry');
//# sourceMappingURL=entry.mjs.map
