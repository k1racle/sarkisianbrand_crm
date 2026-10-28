const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname,'../shared/api-origin.ts'),'utf8'),{mode:'strip'}).replace(/^export /gm,'');
const {browserApiBase,browserRealtimeOrigin}=vm.runInNewContext(source+'\n({browserApiBase,browserRealtimeOrigin})',{URL});
for(const origin of ['http://localhost:3001','http://127.0.0.1:3001','http://192.168.1.111:3001','https://studio.example.test']){
  assert.equal(browserApiBase('http://192.168.1.108:3000/api/v1',origin,'true'),origin+'/api/v1');
  const expected=new URL(origin);expected.port='3000';assert.equal(browserRealtimeOrigin('/api/v1',origin,'true','3000'),expected.origin);
  assert.equal(browserRealtimeOrigin('/api/v1',origin,'true',''),origin);
}
assert.equal(browserApiBase('https://api.example.test/api/v1','https://shop.example.test','false'),'https://api.example.test/api/v1');
assert.equal(browserRealtimeOrigin('https://api.example.test/api/v1','https://shop.example.test',false,''),'https://api.example.test');
console.log('PASS: current page origin replaces stale LAN addresses; media, realtime and non-proxy production addressing preserved');
