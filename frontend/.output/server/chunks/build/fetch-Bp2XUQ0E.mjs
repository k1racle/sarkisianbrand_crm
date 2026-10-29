globalThis.__timing__.logStart('Load chunks/build/fetch-Bp2XUQ0E');import { v as fetchDefaults, w as useRequestFetch, $ as $fetch$1$1 } from '../virtual/entry.mjs';
import { d as dataDiagnostics, u as useAsyncData } from './addons-CwJPC5tM.mjs';
import { computed, toValue, reactive } from 'vue';
import { p as publicAssetsURL } from '../routes/renderer.mjs';
import { isPlainObject } from '@vue/shared';
import { fnv1a64Base36 } from 'fnv1a-64';
import { identify } from 'object-identity';

// \0virtual:public?%2Fstorefront%2Fhome%2Fhero-wordmark.svg
var _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default = publicAssetsURL("/storefront/home/hero-wordmark.svg");
// node_modules/nuxt/dist/app/utils/hash.js
/**
* Hash an arbitrary value into a short, stable string key.
*
* Values are serialized to a canonical, locale-independent representation
* (equal structures hash equally regardless of key order or runtime locale),
* then digested with a fast non-cryptographic hash. This is what `useFetch` and
* `useAsyncData` use internally to derive their cache keys, so it is safe to use
* for the same purpose in your own code.
*
* The digest is non-cryptographic and must not be used for integrity checks.
*
* @since 4.5.0
*/
function hashKey(value) {
	return fnv1a64Base36(identify(value));
}
// node_modules/nuxt/dist/app/composables/fetch.js
var $fetch$1 = $fetch$1$1;
var MAYBE_REF_OR_GETTER_OPTION_KEYS = [
	"method",
	"baseURL",
	"query",
	"params",
	"body",
	"headers"
];
function generateOptionSegments(opts) {
	const segments = [toValue(opts.method)?.toUpperCase() || "GET", toValue(opts.baseURL)];
	for (const _obj of [opts.query || opts.params]) {
		const obj = toValue(_obj);
		if (!obj) continue;
		const unwrapped = {};
		for (const [key, value] of Object.entries(obj)) unwrapped[toValue(key)] = toValue(value);
		segments.push(unwrapped);
	}
	if (opts.body) {
		const value = toValue(opts.body);
		if (!value) segments.push(hashKey(value));
		else if (value instanceof ArrayBuffer) segments.push(hashKey(Object.fromEntries([...new Uint8Array(value).entries()].map(([k, v]) => [k, v.toString()]))));
		else if (value instanceof FormData) {
			const entries = [];
			for (const entry of value.entries()) {
				const [key, val] = entry;
				entries.push([key, val instanceof File ? `${val.name}:${val.size}:${val.lastModified}` : val]);
			}
			segments.push(hashKey(entries));
		} else if (isPlainObject(value)) segments.push(hashKey(reactive(value)));
		else try {
			segments.push(hashKey(value));
		} catch {
			dataDiagnostics.NUXT_E3002({ cause: value });
		}
	}
	return segments;
}
/** @internal */
function _createUseFetch(options = {}) {
	{
		function useFetch(request, arg1, arg2) {
			const [opts = {}, autoKey] = typeof arg1 === "string" ? [{}, arg1] : [arg1, arg2];
			const factoryOptions = typeof options === "function" ? options(opts) : options;
			const { server, lazy, default: defaultFn, transform, pick, watch: watchSources, immediate, getCachedData, deep, dedupe, timeout, enabled, serialize, middleware, _keySegments: keySegments, ...fetchOptions } = {
				...typeof options === "function" ? {} : factoryOptions,
				...opts,
				...typeof options === "function" ? factoryOptions : {}
			};
			const _request = computed(() => toValue(request));
			const key = computed(() => toValue(fetchOptions.key) || "$f" + hashKey([
				autoKey,
				typeof _request.value === "string" ? _request.value : "",
				...generateOptionSegments(fetchOptions),
				...keySegments ? keySegments.map((segment) => toValue(segment)) : []
			]));
			if (!fetchOptions.baseURL && typeof _request.value === "string" && _request.value[0] === "/" && _request.value[1] === "/") throw dataDiagnostics.NUXT_E3001({ url: _request.value });
			const _fetchOptions = reactive({
				...fetchDefaults,
				...fetchOptions,
				cache: typeof fetchOptions.cache === "boolean" ? void 0 : fetchOptions.cache
			});
			const _asyncDataOptions = {
				server,
				lazy,
				default: defaultFn,
				transform,
				pick,
				immediate,
				getCachedData,
				deep,
				dedupe,
				timeout,
				enabled,
				serialize,
				middleware,
				watch: watchSources === false ? [] : [...watchSources || [], _fetchOptions]
			};
			if (watchSources === false) _asyncDataOptions._keyTriggersExecute = false;
			return useAsyncData(key, (_, { signal }) => {
				let _$fetch = fetchOptions.$fetch || $fetch$1;
				if (!fetchOptions.$fetch) {
					if (typeof _request.value === "string" && _request.value[0] === "/" && (!toValue(fetchOptions.baseURL) || toValue(fetchOptions.baseURL)[0] === "/")) _$fetch = useRequestFetch();
				}
				const resolvedOptions = {
					signal,
					..._fetchOptions
				};
				for (const key of MAYBE_REF_OR_GETTER_OPTION_KEYS) if (typeof resolvedOptions[key] === "function") resolvedOptions[key] = toValue(resolvedOptions[key]);
				return _$fetch(_request.value, resolvedOptions);
			}, _asyncDataOptions);
		}
		return useFetch;
	}
}
var useFetch = _createUseFetch();

export { _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default as _, useFetch as u };;globalThis.__timing__.logEnd('Load chunks/build/fetch-Bp2XUQ0E');
//# sourceMappingURL=fetch-Bp2XUQ0E.mjs.map
