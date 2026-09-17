const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),postcss=require('postcss');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'assets/css/workspace-typography.css'),'utf8');
const sheet=postcss.parse(css);let sizes=0;
sheet.walkDecls(decl=>{
 if(decl.prop.startsWith('--ws-type-')){assert.ok(['12px','14px','20px'].includes(decl.value));sizes++;}
 if(decl.prop==='font-size')assert.ok(/^var\(--ws-type-(heading|body|caption)\)$|^inherit$/.test(decl.value),decl.toString());
 if(['font-family','font-size','font-weight','font-style'].includes(decl.prop))assert.ok(decl.important,'Typography owns its cascade: '+decl.toString());
});
assert.equal(sizes,3);assert.match(css,/@layer workspace-typography/);
assert.doesNotMatch(css,/\.sb-storefront|\.login-page[),]/);assert.match(css,/\.b2b-frame/);
const config=fs.readFileSync(path.join(root,'nuxt.config.ts'),'utf8');assert.match(config,/css: \['~\/assets\/css\/foundation.css', '~\/assets\/css\/site.css', '~\/assets\/css\/admin.css'\]/);
const owner=fs.readFileSync(path.join(root,'assets/css/admin.css'),'utf8');assert.ok(owner.indexOf('workspace-dialogs.css')<owner.indexOf('workspace-typography.css'));
console.log('Three typography tokens, shared layer, internal-only scope and final stylesheet registration PASS.');
