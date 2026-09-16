globalThis.__timing__.logStart('Load chunks/routes//robots.txt');import { c as defineEventHandler, u as useRuntimeConfig, e as setHeader, f as createError } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const robots_txt = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const baseURL = String(config.seoApiBase || config.public.apiBase);
  let robots;
  try {
    robots = await $fetch("/seo/robots", { baseURL, responseType: "text", timeout: 1e4, retry: 0 });
    if (!robots.startsWith("User-agent: *\n")) throw new Error("Invalid robots");
  } catch {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 503, statusMessage: "Robots temporarily unavailable" });
  }
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=60, must-revalidate");
  return robots;
});

export { robots_txt as default };;globalThis.__timing__.logEnd('Load chunks/routes//robots.txt');
//# sourceMappingURL=robots.txt.mjs.map
