const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const {parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');
const root=path.resolve(__dirname,'..');
function middleware(file,session) {
  let handler; const navigations=[];
  vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync(path.join(root,file),'utf8')).replace('import.meta.server','false').replace('export default','const definition ='),{
    defineNuxtRouteMiddleware:fn=>{handler=fn;return fn;},
    useWorkspaceSession:()=>({hydrate(){},token:{value:session.token},user:{value:{role:session.role}}}),
    useState:()=>({value:!!session.signingOut}),
    navigateTo:(to,options)=>{navigations.push(JSON.parse(JSON.stringify({to,options})));return to;},
  });return {handler,navigations};
}
const routes=middleware('middleware/workspace-pages.global.ts',{});
routes.handler({path:'/crm-marketplaces',query:{section:'settings',q:'номер'},hash:'#details'});
assert.deepEqual(routes.navigations.pop().to,{path:'/crm-marketplaces/integrations',query:{q:'номер'},hash:'#details'});
routes.handler({path:'/helpdesk',query:{section:'tickets',queue:'Первая линия'},hash:''});
assert.deepEqual(routes.navigations.pop().to,{path:'/helpdesk/tickets',query:{queue:'Первая линия'},hash:''});
routes.handler({path:'/admin-workspace/orders',query:{section:'products',status:'NEW'},hash:''});
assert.deepEqual(routes.navigations.pop().to,{path:'/admin-workspace/orders',query:{status:'NEW'},hash:''});
const denied=middleware('middleware/workspace-auth.global.ts',{token:'fixture',role:'CONTENT_MANAGER'});
denied.handler({path:'/crm-marketplaces/orders',query:{},fullPath:'/crm-marketplaces/orders'});
assert.equal(denied.navigations.pop().to,'/workspace');
denied.handler({path:'/system-settings/staff',query:{},fullPath:'/system-settings/staff'});
assert.equal(denied.navigations.pop().to,'/workspace');
const guest=middleware('middleware/workspace-auth.global.ts',{token:'',role:'CUSTOMER_B2C'});
guest.handler({path:'/admin-workspace/orders',query:{},fullPath:'/admin-workspace/orders?status=NEW'});
assert.equal(guest.navigations.pop().to.query.redirect,'/admin-workspace/orders?status=NEW');
const allowed=middleware('middleware/workspace-auth.global.ts',{token:'fixture',role:'MARKETPLACE_MANAGER'});
allowed.handler({path:'/crm-marketplaces/orders',query:{},fullPath:'/crm-marketplaces/orders'});assert.equal(allowed.navigations.length,0);
allowed.handler({path:'/workspace-login',query:{},fullPath:'/workspace-login'});assert.equal(allowed.navigations.pop().to,'/workspace');
const signingOut=middleware('middleware/workspace-auth.global.ts',{token:'fixture',role:'ADMIN',signingOut:true});
signingOut.handler({path:'/workspace-login',query:{},fullPath:'/workspace-login'});assert.equal(signingOut.navigations.length,0);
let count=0;
for(const family of ['admin-workspace','crm-marketplaces','helpdesk','leadership','system-settings'])for(const file of fs.readdirSync(path.join(root,'pages',family)).filter(x=>x.endsWith('.vue'))) {
  const filename=path.join(root,'pages',family,file),{descriptor,errors}=parse(fs.readFileSync(filename,'utf8'),{filename});assert.deepEqual(errors,[]);
  const bindings=descriptor.scriptSetup?compileScript(descriptor,{id:'route-check'}).bindings:{};
  assert.deepEqual(compileTemplate({source:descriptor.template.content,filename,id:'route-check',compilerOptions:{bindingMetadata:bindings}}).errors,[]);count++;
}
console.log(`${count} route SFCs PASS; legacy redirects, retained filters/hash, canonical section protection and nested role/guest guards PASS. No HTTP/DB.`);
