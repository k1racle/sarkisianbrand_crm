const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(require('path').resolve(__dirname,'../shared/internal-redirect.ts'),'utf8')).replace(/^export /gm,'');
const safeInternalRedirect=vm.runInNewContext(source+'\nsafeInternalRedirect',{URL});
for(const input of [undefined,null,[],['/b2b'],'https://evil.invalid','//evil.invalid','/\\evil.invalid','/%2f%2fevil.invalid','/%5cevil.invalid','/\n/evil.invalid'])assert.equal(safeInternalRedirect(input,'/workspace'),'/workspace');
for(const input of ['/b2b?section=clients','/admin-workspace/orders?status=NEW','/crm-tasks#today'])assert.equal(safeInternalRedirect(input,'/workspace'),input);
console.log('13 internal auth redirect cases PASS; no browser/network/auth.');
module.exports={safeInternalRedirect};
