globalThis.__timing__.logStart('Load chunks/routes//__health.get');import { f as defineEventHandler, h as setResponseHeader } from '../_/nitro.mjs';
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

const __health_get = defineEventHandler((event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return { status: "ok" };
});

export { __health_get as default };;globalThis.__timing__.logEnd('Load chunks/routes//__health.get');
//# sourceMappingURL=__health.get.mjs.map
