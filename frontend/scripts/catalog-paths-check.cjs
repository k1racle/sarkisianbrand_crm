const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
function moduleFunctions(file, names) {
  const source = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' }).replaceAll('export function', 'function');
  return vm.runInNewContext(source + '\n({' + names.join(',') + '})');
}
for (const file of ['shared/catalog-paths.ts', '../backend/src/common/catalog-paths.ts']) {
  const f = moduleFunctions(path.join(root, file), ['catalogCategoryPath', 'catalogProductPath']);
  assert.equal(f.catalogCategoryPath('gels'), '/catalog/gels');
  assert.equal(f.catalogCategoryPath('гели'), '/catalog/' + encodeURIComponent('гели'));
  assert.equal(f.catalogProductPath({ slug: 'gift-card', categories: [] }), '/catalog/gift-card');
  const categories = [{ isPrimary: false, category: { slug: 'professional-care' } }, { isPrimary: true, category: { slug: 'gels' } }];
  assert.equal(f.catalogProductPath({ slug: 'gel', categories }), '/catalog/gels/gel');
  assert.equal(f.catalogProductPath({ slug: 'gel', categories: [...categories].reverse() }), '/catalog/gels/gel');
  assert.equal(f.catalogProductPath({ slug: 'gel', categories: [{ isPrimary: true, category: { slug: 'hidden', isActive: false } }, ...categories] }), '/catalog/gels/gel');
}
const { inlineProductPrices } = moduleFunctions(path.join(root, 'shared/inline-product-prices.ts'), ['inlineProductPrices']);
assert.equal(JSON.stringify(inlineProductPrices('1000,50', '800.25')), JSON.stringify({ price: 1000.5, salePrice: 800.25 }));
assert.equal(JSON.stringify(inlineProductPrices('0', '')), JSON.stringify({ price: 0, salePrice: null }));
for (const input of ['', '-1', 'NaN', 'Infinity', '1e3', '100000001', '1.234', '100 рублей']) assert.throws(() => inlineProductPrices(input, ''));
for (const input of ['1000', '1200', '-10', '1.234']) assert.throws(() => inlineProductPrices('1000', input));
console.log('Frontend/backend category paths, primary categories, gift cards and inline price validation PASS. Network/DB writes: 0.');
