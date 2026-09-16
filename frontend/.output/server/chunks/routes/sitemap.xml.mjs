globalThis.__timing__.logStart('Load chunks/routes//sitemap.xml');import { c as defineEventHandler, u as useRuntimeConfig, e as setHeader, f as createError } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const sitemap_xml = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const baseURL = String(config.seoApiBase || config.public.apiBase);
  let xml;
  try {
    xml = await $fetch("/seo/sitemap", { baseURL, responseType: "text", timeout: 1e4, retry: 0 });
    if (!xml.startsWith("<?xml") || !xml.includes("<urlset")) throw new Error("Invalid sitemap");
  } catch {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 503, statusMessage: "Sitemap temporarily unavailable" });
  }
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=60, must-revalidate");
  return xml;
});

export { sitemap_xml as default };;globalThis.__timing__.logEnd('Load chunks/routes//sitemap.xml');
//# sourceMappingURL=sitemap.xml.mjs.map
