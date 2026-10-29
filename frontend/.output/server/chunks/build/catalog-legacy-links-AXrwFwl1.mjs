globalThis.__timing__.logStart('Load chunks/build/catalog-legacy-links-AXrwFwl1');import { d as defineNuxtRouteMiddleware, n as navigateTo } from '../virtual/entry.mjs';
import 'nostics';
import 'nostics/formatters/ansi';
import 'vue';
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
import 'vue/server-renderer';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import 'unhead/utils';
import 'vue-router';
import '@lucide/vue';

// middleware/catalog-legacy-links.ts
var catalog_legacy_links_default = defineNuxtRouteMiddleware((to) => {
	if (typeof to.query.search === "string" && to.query.search.trim().toLowerCase() === "нов") {
		const { search, page, ...query } = to.query;
		return navigateTo({
			path: "/catalog",
			query: {
				...query,
				sort: "new"
			}
		}, {
			redirectCode: 302,
			replace: true
		});
	}
});

export { catalog_legacy_links_default as default };;globalThis.__timing__.logEnd('Load chunks/build/catalog-legacy-links-AXrwFwl1');
//# sourceMappingURL=catalog-legacy-links-AXrwFwl1.mjs.map
