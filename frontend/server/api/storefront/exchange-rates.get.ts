// Public indicative prices only. Orders and payment remain in their original currency.
export default defineCachedEventHandler(async () => {
  try {
    const xml = await $fetch<string>('https://www.cbr.ru/scripts/XML_daily.asp', { responseType: 'text', timeout: 5000, retry: 0 });
    const date = xml.match(/<ValCurs\b[^>]*Date="(\d{2})\.(\d{2})\.(\d{4})"/);
    if (!date) throw new Error('Missing rate date');
    const isoDate = `${date[3]}-${date[2]}-${date[1]}`;
    const age = Date.now() - Date.parse(isoDate);
    if (!Number.isFinite(age) || age > 8 * 86400000 || age < -2 * 86400000) throw new Error('Stale rate date');
    const rates: Record<string, number> = { RUB: 1 };
    for (const currency of ['USD', 'EUR', 'AED']) {
      const row = [...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].find(item => item[1].includes(`<CharCode>${currency}</CharCode>`))?.[1];
      const nominal = Number(row?.match(/<Nominal>([^<]+)<\/Nominal>/)?.[1].replace(/\s/g, '').replace(',', '.'));
      const value = Number(row?.match(/<Value>([^<]+)<\/Value>/)?.[1].replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(value) || !Number.isFinite(nominal) || value <= 0 || nominal <= 0) throw new Error('Invalid rate');
      rates[currency] = value / nominal;
    }
    return { date: isoDate, rates };
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Exchange rates temporarily unavailable' });
  }
}, { maxAge: 3600, staleMaxAge: 0, swr: false });
