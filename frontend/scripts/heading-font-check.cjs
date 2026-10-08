const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/css/heading-typography.css'), 'utf8');
for (const [name, weight] of [['Regular', 400], ['Bold', 700]]) {
  const font = fs.readFileSync(path.join(root, `public/fonts/mont/Mont-${name}.woff2`));
  assert.equal(font.toString('ascii', 0, 4), 'wOF2', name + ': valid local WOFF2');
  assert.equal(font.readUInt32BE(8), font.length, name + ': complete font file');
  assert.match(css, new RegExp(`font-weight: ${weight};[^}]+Mont-${name}\\.woff2`));
}
assert.doesNotMatch(css, /Mont-HeavyDEMO|Intro|font-weight:\s*400\s+700/, 'Mont static faces must not masquerade as a variable font');
assert.doesNotMatch(css, /font-size:|line-height:|letter-spacing:|padding:|margin:/, 'Font roles do not resize the UI');
for (const scope of ['html[data-crm-ui]', '.sb-storefront', '.sb-glass-layer', '.b2b-frame', '.workspace-frame', '.admin-dialog']) assert.ok(css.includes(scope), scope);
assert.match(css, /font-family: var\(--brand-font-ui\) !important;/, 'Controls use Montserrat');
assert.ok(fs.readFileSync(path.join(root, 'assets/css/foundation.css'), 'utf8').startsWith('@import "./heading-typography.css";'));
console.log('PASS: local Mont Regular/Bold WOFF2; static weights; shared heading/control roles across site, CRM and B2B');