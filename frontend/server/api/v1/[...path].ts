import { createError, defineEventHandler, getRequestURL, proxyRequest, setResponseHeader } from 'h3';
import { apiProxyEnabled } from '../../../shared/api-origin';

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);
  if (!apiProxyEnabled(config.public.apiProxyEnabled)) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  const upstream = String(config.apiProxyBase || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(upstream)) throw createError({ statusCode: 503, statusMessage: 'API unavailable' });
  const request = getRequestURL(event);
  const target = `${upstream}${request.pathname.slice('/api/v1'.length)}${request.search}`;
  // H3 forwards status codes, authorization, cart headers, cookies and binary
  // bodies without turning a rejected login into a network error.
  return proxyRequest(event, target, {
    streamRequest: true,
    fetchOptions: { redirect: 'manual', signal: AbortSignal.timeout(120000) },
    onResponse: () => {
      if (event.method !== 'GET' || event.headers.has('authorization') || request.pathname.startsWith('/api/v1/auth/')) setResponseHeader(event, 'Cache-Control', 'no-store');
    },
  });
});
