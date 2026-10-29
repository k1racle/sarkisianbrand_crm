globalThis.__timing__.logStart('Load chunks/build/useStorefrontSeo-DvgEOsDg');import { c as useRoute, u as useHead, r as useSeoMeta, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { computed, toValue } from 'vue';

// composables/useStorefrontSeo.ts
var privatePrefixes = [
	"/api",
	"/docs",
	"/admin",
	"/media-library",
	"/account",
	"/cart",
	"/checkout",
	"/favorites",
	"/login",
	"/password-reset",
	"/auth",
	"/workspace",
	"/system-settings",
	"/crm",
	"/marketplaces",
	"/b2b",
	"/leadership",
	"/helpdesk",
	"/preview",
	"/drafts"
];
function storefrontSiteOrigin(value) {
	const url = new URL(value);
	if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Некорректный публичный домен сайта");
	return url.origin;
}
/** Category and pagination are meaningful; sorting, tracking and filters are not canonical. */
function storefrontCanonicalUrl(base, path, query = {}) {
	const origin = storefrontSiteOrigin(base);
	if (!path.startsWith("/") || path.startsWith("//") || /[\\\r\n]/.test(path)) throw new Error("Ожидается внутренний путь сайта");
	const url = new URL(path, origin);
	url.search = "";
	url.hash = "";
	url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
	if (/^\/catalog(?:\/[^/]+)?$/.test(url.pathname)) {
		if (url.pathname === "/catalog" && typeof query.category === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.category)) url.pathname = "/catalog/" + encodeURIComponent(query.category);
		if (typeof query.page === "string" || typeof query.page === "number") {
			const page = Number(query.page);
			if (Number.isInteger(page) && page > 1 && page <= 1e5) url.searchParams.set("page", String(page));
		}
	}
	return url.toString();
}
function storefrontRobotsPolicy(path, query = {}, reviewRequired = false, indexing = false) {
	const privatePage = privatePrefixes.some((prefix) => path.startsWith(prefix));
	const preview = Object.prototype.hasOwnProperty.call(query, "preview") || Object.prototype.hasOwnProperty.call(query, "draft");
	const filtered = (path.replace(/\/+$/, "") === "/catalog" || path.startsWith("/catalog/")) && ([
		"search",
		"purpose",
		"feature",
		"volume",
		"minPrice",
		"maxPrice",
		"inStock"
	].some((key) => query[key] !== void 0 && query[key] !== "") || query.sort !== void 0 && query.sort !== "new" || query.category !== void 0 && !(typeof query.category === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.category)));
	return !indexing || privatePage || preview || reviewRequired || filtered ? "noindex, follow" : "index, follow";
}
/** Editorial canonical must stay on this storefront's configured origin. */
function storefrontEditorialCanonical(origin, value, fallback) {
	if (typeof value !== "string" || !value || value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(value) || !value.startsWith("/") && !/^https?:\/\//i.test(value)) return fallback;
	try {
		const url = new URL(value, origin);
		if (!["http:", "https:"].includes(url.protocol) || url.origin !== storefrontSiteOrigin(origin) || url.username || url.password) return fallback;
		url.hash = "";
		return url.toString();
	} catch {
		return fallback;
	}
}
/** Call once in each public page, replacing its old meta hook. */
function useStorefrontSeo(options = {}) {
	const route = useRoute();
	const config = useRuntimeConfig();
	const indexing = String(config.public.seoIndexingEnabled || "false") === "true";
	if (indexing && !config.public.siteUrl) throw new Error("Для индексации необходимо задать публичный домен сайта");
	const origin = storefrontSiteOrigin(String(config.public.siteUrl || "http://localhost:3001"));
	const canonical = computed(() => storefrontEditorialCanonical(origin, toValue(options.canonical), storefrontCanonicalUrl(origin, route.path, route.query)));
	const robots = computed(() => toValue(options.noindex) ? "noindex, follow" : storefrontRobotsPolicy(route.path, route.query, Boolean(toValue(options.reviewRequired)), indexing));
	const image = computed(() => {
		const value = toValue(options.image);
		if (!value) return void 0;
		try {
			const url = new URL(value, origin);
			return ["http:", "https:"].includes(url.protocol) ? url.toString() : void 0;
		} catch {
			return;
		}
	});
	useHead(() => ({ link: [{
		key: "storefront-canonical",
		rel: "canonical",
		href: canonical.value
	}] }));
	useSeoMeta({
		title: () => toValue(options.title),
		description: () => toValue(options.description),
		robots: () => robots.value,
		ogTitle: () => toValue(options.title),
		ogDescription: () => toValue(options.description),
		ogUrl: () => canonical.value,
		ogType: "website",
		ogImage: () => image.value,
		twitterCard: () => image.value ? "summary_large_image" : "summary",
		twitterTitle: () => toValue(options.title),
		twitterDescription: () => toValue(options.description),
		twitterImage: () => image.value
	});
	return {
		canonical,
		robots
	};
}

export { useStorefrontSeo as u };;globalThis.__timing__.logEnd('Load chunks/build/useStorefrontSeo-DvgEOsDg');
//# sourceMappingURL=useStorefrontSeo-DvgEOsDg.mjs.map
