globalThis.__timing__.logStart('Load chunks/routes/api/storefront/exchange-rates.get');import { c as defineCachedEventHandler, e as createError } from '../../../_/nitro.mjs';
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

const exchangeRates_get = defineCachedEventHandler(async () => {
  var _a, _b, _c;
  try {
    const xml = await $fetch("https://www.cbr.ru/scripts/XML_daily.asp", { responseType: "text", timeout: 5e3, retry: 0 });
    const date = xml.match(/<ValCurs\b[^>]*Date="(\d{2})\.(\d{2})\.(\d{4})"/);
    if (!date) throw new Error("Missing rate date");
    const isoDate = `${date[3]}-${date[2]}-${date[1]}`;
    const age = Date.now() - Date.parse(isoDate);
    if (!Number.isFinite(age) || age > 8 * 864e5 || age < -2 * 864e5) throw new Error("Stale rate date");
    const rates = { RUB: 1 };
    for (const currency of ["USD", "EUR", "AED"]) {
      const row = (_a = [...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].find((item) => item[1].includes(`<CharCode>${currency}</CharCode>`))) == null ? void 0 : _a[1];
      const nominal = Number((_b = row == null ? void 0 : row.match(/<Nominal>([^<]+)<\/Nominal>/)) == null ? void 0 : _b[1].replace(/\s/g, "").replace(",", "."));
      const value = Number((_c = row == null ? void 0 : row.match(/<Value>([^<]+)<\/Value>/)) == null ? void 0 : _c[1].replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(value) || !Number.isFinite(nominal) || value <= 0 || nominal <= 0) throw new Error("Invalid rate");
      rates[currency] = value / nominal;
    }
    return { date: isoDate, rates };
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Exchange rates temporarily unavailable" });
  }
}, { maxAge: 3600, staleMaxAge: 0, swr: false });

export { exchangeRates_get as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/storefront/exchange-rates.get');
//# sourceMappingURL=exchange-rates.get.mjs.map
