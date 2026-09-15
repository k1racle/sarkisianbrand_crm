const fs = require('fs');
const path = require('path');
const roots = ['pages', 'components', 'composables'];
const forbidden = ['avatars.mds.yandex.net', 'get-yastore'];
const failures = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(vue|ts|js)$/.test(entry.name)) {
      const source = fs.readFileSync(full, 'utf8');
      for (const host of forbidden) if (source.includes(host)) failures.push(`${full}: запрещённая внешняя ссылка ${host}`);
    }
  }
}
for (const root of roots) walk(path.resolve(__dirname, '..', root));
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Проверка ассетов магазина пройдена: зависимости от CDN Яндекс Кита отсутствуют.');
