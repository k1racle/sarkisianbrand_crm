const fs = require('fs');
const path = require('path');
const files = ['storefront.css', 'storefront-glass.css', 'storefront-menu-admin.css', 'storefront-pages.css', 'storefront-system.css', 'storefront-checkout.css', 'storefront-filters.css', 'site-partnerships.css'];
const failures = [];
for (const name of files) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', name), 'utf8');
  if (/font-size\s*:\s*(?:\d+(?:\.\d+)?(?:px|rem|em)|clamp\()/i.test(source)) failures.push(`${name}: размер шрифта должен использовать типографический токен`);
  if (/font-family\s*:\s*(?!var\()[^;}]+/i.test(source)) failures.push(`${name}: семейство шрифта должно использовать общий токен`);
}
const main = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'main.css'), 'utf8');
if (main.includes('fonts.googleapis.com')) failures.push('Основной шрифт не должен загружаться из внешнего CSS');
for (const file of ['montserrat-cyrillic-ext.woff2', 'montserrat-cyrillic.woff2', 'montserrat-latin-ext.woff2', 'montserrat-latin.woff2']) {
  const binary = fs.readFileSync(path.join(__dirname, '..', 'public', 'fonts', file));
  if (binary.subarray(0, 4).toString('ascii') !== 'wOF2') failures.push(`Некорректный локальный шрифт: ${file}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Типографика витрины использует общую шкалу; локальные WOFF2-шрифты проверены.');
