const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),postcss=require('postcss');
const {parse,compileTemplate}=require('@vue/compiler-sfc');const {parse:parseTemplate}=require('@vue/compiler-dom');const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)])}
let count=0;for(const f of [path.join(root,'app.vue'),...['pages','components'].flatMap(d=>walk(path.join(root,d)))].filter(f=>f.endsWith('.vue'))){
 const source=fs.readFileSync(f,'utf8'),d=parse(source).descriptor;
 assert.equal(d.styles.length,0,'Local style block: '+f);assert.doesNotMatch(d.template?.content||'',/\sstyle\s*=/,'Static inline design: '+f);
 function checkBindings(node){
  for(const prop of node.props||[])if(prop.type===7&&prop.name==='bind'&&prop.arg?.content==='style')
   assert.doesNotMatch(prop.exp?.content||'',/#[0-9a-f]{3,8}\b|(?:fontFamily|fontSize|borderRadius)\s*:/i,'Hardcoded inline theme: '+f);
  for(const child of node.children||[])checkBindings(child);
 }
 checkBindings(parseTemplate(d.template.content));
 assert.deepEqual(compileTemplate({source:d.template.content,filename:f,id:'ownership'}).errors,[]);count++;
}
for(const f of walk(path.join(root,'assets/css')).filter(f=>f.endsWith('.css')))postcss.parse(fs.readFileSync(f,'utf8'),{from:f});
const combined=fs.readFileSync(path.join(root,'assets/css/admin-components.css'),'utf8');assert.match(combined,/\[data-v-ui-[a-f0-9]{12}\]/);
assert.match(fs.readFileSync(path.join(root,'nuxt.config.ts'),'utf8'),/foundation.css.*site.css.*admin.css/);
console.log(count+' Vue components: no local styles/static inline design; centralized CSS parses and retains isolated scopes PASS.');
