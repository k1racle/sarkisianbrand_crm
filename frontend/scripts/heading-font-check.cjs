const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), css = fs.readFileSync(path.join(root, 'assets/css/heading-typography.css'), 'utf8');
const font = fs.readFileSync(path.join(root, 'public/fonts/mont/Mont-HeavyDEMO.otf'));
assert.equal(font.toString('ascii', 0, 4), 'OTTO');
const tables = {};
for (let i = 0; i < font.readUInt16BE(4); i++) {
  const pos = 12 + 16 * i;
  tables[font.toString('ascii', pos, pos + 4)] = font.readUInt32BE(pos + 8);
}
assert.equal(font.readUInt16BE(tables['OS/2'] + 4), 900, 'Face weight must match @font-face; no fake variable range');
const cmap = tables.cmap, subtables = [];
for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
  const pos = cmap + 4 + 8 * i, platform = font.readUInt16BE(pos);
  const offset = cmap + font.readUInt32BE(pos + 4);
  if ((platform === 0 || platform === 3) && font.readUInt16BE(offset) === 4) subtables.push(offset);
}
function hasGlyph(code) {
  return subtables.some(offset => {
    const count = font.readUInt16BE(offset + 6) / 2, end = offset + 14, start = end + count * 2 + 2;
    const delta = start + count * 2, ranges = delta + count * 2;
    for (let i = 0; i < count; i++) {
      if (code < font.readUInt16BE(start + i * 2) || code > font.readUInt16BE(end + i * 2)) continue;
      const range = font.readUInt16BE(ranges + i * 2), change = font.readInt16BE(delta + i * 2);
      let glyph = range ? font.readUInt16BE(ranges + i * 2 + range + 2 * (code - font.readUInt16BE(start + i * 2))) : code;
      if (glyph) glyph = (glyph + change) & 65535;
      return glyph !== 0;
    }
    return false;
  });
}
for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789') assert.ok(hasGlyph(char.codePointAt(0)), 'Missing glyph: ' + char);
assert.match(css, /font-weight: 900;/);
assert.doesNotMatch(css, /font-size:|line-height:|letter-spacing:|padding:|margin:/, 'Heading font change must not resize the UI');
assert.match(css, /html\[data-crm-ui\]/);
assert.match(css, /\.sb-storefront/);
assert.match(css, /font-family: var\(--sb-font\) !important;/, 'Embedded controls retain body family');
assert.ok(fs.existsSync(path.join(root, 'public/fonts/mont/LICENSE.pdf')));
assert.ok(fs.readFileSync(path.join(root, 'assets/css/foundation.css'), 'utf8').startsWith('@import "./heading-typography.css";'));
console.log('PASS: local Mont Heavy 900, Latin/Cyrillic glyphs, license, heading-only scope, unchanged size tokens');
