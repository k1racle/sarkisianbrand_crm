globalThis.__timing__.logStart('Load chunks/routes/api/v1/_...path_');import { f as defineEventHandler, u as useRuntimeConfig, e as createError, g as getRequestURL, p as proxyRequest, h as setResponseHeader } from '../../../_/nitro.mjs';
import 'unhead/server';
import 'vue';
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

const apiProxyEnabled = (value) => value === true || value === "true";

const ____path_ = defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!apiProxyEnabled(config.public.apiProxyEnabled)) throw createError({ statusCode: 404, statusMessage: "Not found" });
  const upstream = String(config.apiProxyBase || "").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(upstream)) throw createError({ statusCode: 503, statusMessage: "API unavailable" });
  const request = getRequestURL(event);
  const target = `${upstream}${request.pathname.slice("/api/v1".length)}${request.search}`;
  const lessonUpload = event.method === "POST" && /^\/api\/v1\/lms\/admin\/lessons\/[0-9a-f-]{36}\/assets$/i.test(request.pathname);
  const lessonMedia = /^(?:GET|HEAD)$/.test(event.method) && /^\/api\/v1\/lms\/media\/[0-9a-f-]{36}$/i.test(request.pathname);
  return proxyRequest(event, target, {
    streamRequest: true,
    fetchOptions: { redirect: "manual", signal: AbortSignal.timeout(lessonUpload || lessonMedia ? 36e5 : 12e4) },
    onResponse: () => {
      if (event.method !== "GET" || lessonMedia || event.headers.has("authorization") || request.pathname.startsWith("/api/v1/auth/")) setResponseHeader(event, "Cache-Control", "no-store");
    }
  });
});

export { ____path_ as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/v1/_...path_');
//# sourceMappingURL=_...path_.mjs.map
