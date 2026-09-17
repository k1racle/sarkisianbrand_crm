/* Pure addressing/legacy-photo regression tests, no browser/DB/network. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname,'../shared/product-images.ts'),'utf8'),{mode:'strip'}).replace(/^export /gm,'');
const {normalizeMediaImageUrl:normalize,resolveProductImageUrl:resolve}=vm.runInNewContext(source+'\n({normalizeMediaImageUrl,resolveProductImageUrl});',{URL});
const api='http://localhost:3000/api/v1';
assert.equal(resolve('/catalog/gel-muss-kamufliruyushchiy-23.jpg',api),'/storefront/products/gel-mousse-23.jpg');
assert.equal(resolve('/catalog/gel-muss-prozrachnyi-15-gr.jpg',api),'/storefront/products/gel-mousse-clear.jpg');
assert.equal(resolve('/catalog/gel-skorostnoy-002-30-ml.jpg',api),'/storefront/products/speed-gel-002.jpg');
assert.equal(resolve('/catalog/freza-almaznaya-shar-40-mm.jpg',api),'/storefront/products/cutter-ball.jpg');
assert.equal(resolve('/catalog/nozhnitsy-pro-levsha.jpg',api),'','Unavailable photo must not become a broken image');
assert.equal(normalize('/catalog/nozhnitsy-pro-levsha.jpg',api),'/catalog/nozhnitsy-pro-levsha.jpg','Display fallback never rejects or rewrites a valid saved path');
assert.equal(resolve('/api/v1/media/files/image.png',api),'http://localhost:3000/api/v1/media/files/image.png');
assert.equal(resolve('/storefront/hero.jpg',api),'/storefront/hero.jpg');
assert.equal(resolve('https://images.example.invalid/photo.jpg',api),'https://images.example.invalid/photo.jpg');
for(const value of [null,{},'','//example.invalid/photo.jpg','javascript:alert(1)','data:image/png;base64,abc','https://user:pass@example.invalid/photo.jpg','/bad\\photo.jpg'])assert.equal(resolve(value,api),'');
const editor=fs.readFileSync(path.resolve(__dirname,'../components/AdminProductEditor.vue'),'utf8');assert.match(editor,/resolveProductImageUrl\(value/);assert.match(editor,/!normalizeMediaImageUrl\(image.url/);
const listing=fs.readFileSync(path.resolve(__dirname,'../components/workspace/StoreWorkspacePage.vue'),'utf8');assert.match(listing,/storefrontProductImage\(product\)/);assert.match(listing,/@error="productPreviewFailed\(p\)"/);
console.log('Legacy photo mapping, real media origin, safe URLs and unchanged saved references PASS. No network/DB.');
