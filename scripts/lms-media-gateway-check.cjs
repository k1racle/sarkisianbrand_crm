/* Isolated Docker-only signal gateway fixture. No real API, users or media. */
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const prefix = `sb-media-check-${randomBytes(5).toString('hex')}`;
const net = `${prefix}-net`, auth = `${prefix}-auth`, live = `${prefix}-live`, gateway = `${prefix}-gateway`, client = `${prefix}-client`;
const key = 'a'.repeat(64), token = 'fixture-media-token-do-not-log';
const run = (...args) => execFileSync('docker', args, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
const authCode = `const h=require('http');h.createServer((q,r)=>{if(q.url!='/api/v1/lms-live-gateway/authorize'||q.method!=='GET')return r.writeHead(404).end();if(q.headers['x-lms-gateway-key']!==process.env.KEY||q.headers['x-lms-media-token']!==process.env.TOKEN||q.headers.authorization||q.headers['x-attack'])return r.writeHead(403).end();r.writeHead(204).end()}).listen(3000,'0.0.0.0')`;
const liveCode = String.raw`const h=require('http');const s=h.createServer((q,r)=>{r.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({path:q.url,authorization:q.headers.authorization||null}))});s.on('upgrade',(q,c)=>c.end('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n'));s.listen(7880,'0.0.0.0')`;
const checks = `const h=require('http'),a=require('assert/strict');(async()=>{for(let i=0;i<40;i++){try{if((await fetch('http://gateway:8080/not-found')).status===404)break}catch{}await new Promise(r=>setTimeout(r,100))}const t=process.env.TOKEN;for(const p of ['/rtc','/rtc/v1','/rtc/validate','/rtc/v1/validate']){let r=await fetch('http://gateway:8080'+p+'?access_token='+t,{headers:{authorization:'Bearer attacker','x-attack':'attacker','x-lms-gateway-key':'attacker'}});a.equal(r.status,200,p);const j=await r.json();a.equal(j.authorization,null);a.equal(j.path,p+'?access_token='+t);r=await fetch('http://gateway:8080'+p+'?access_token=bad');a.equal(r.status,403,p+' invalid token')}for(const query of ['access_token='+t+'&access_token=bad','ACCESS_TOKEN='+t+'&access_token=bad','access%5Ftoken=bad&access_token='+t,'ACCESS_TOKEN='+t])a.equal((await fetch('http://gateway:8080/rtc?'+query)).status,400,'ambiguous token query');for(const p of ['/twirp/livekit.RoomService/ListRooms','/_lms_authorize','/rtc/v2','/rtc/extra'])a.equal((await fetch('http://gateway:8080'+p+'?access_token='+t)).status,404,p);a.equal((await fetch('http://gateway:8080/rtc?access_token='+t,{method:'POST'})).status,405);await new Promise((resolve,reject)=>{const q=h.request('http://gateway:8080/rtc/v1?access_token='+t,{headers:{Connection:'Upgrade',Upgrade:'websocket'}});q.setTimeout(4000,()=>q.destroy(new Error('upgrade timeout')));q.on('upgrade',(r,s)=>{s.destroy();r.statusCode===101?resolve():reject(new Error('bad upgrade'))});q.on('response',r=>reject(new Error('unexpected status '+r.statusCode)));q.on('error',reject);q.end()});console.log('PASS four authenticated signal routes, rejection, stripped headers and WebSocket upgrade')})().catch(e=>{console.error(e.message);process.exit(1)})`;
try {
  run('network','create','--internal',net);
  run('run','-d','--name',auth,'--network',net,'--network-alias','backend','-e',`KEY=${key}`,'-e',`TOKEN=${token}`,'--entrypoint','node','node:22.23.3-alpine','-e',authCode);
  run('run','-d','--name',live,'--network',net,'--network-alias','livekit-lms','--entrypoint','node','node:22.23.3-alpine','-e',liveCode);
  run('run','-d','--name',gateway,'--network',net,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,mode=1777,size=32m','--cap-drop','ALL','--security-opt','no-new-privileges:true','-e',`LMS_GATEWAY_KEY=${key}`,'codex-lms-media-gateway-check:local');
  // Use Docker's container-name DNS, avoiding any externally published port.
  run('run','-d','--name',client,'--network',net,'--entrypoint','node','node:22.23.3-alpine','-e','setInterval(()=>{},10000)');
  const testCode = checks.replaceAll('gateway:8080', `${gateway}:8080`);
  console.log(run('exec','-e',`TOKEN=${token}`,client,'node','-e',testCode));
  const output = spawnSync('docker', ['logs',gateway], { encoding:'utf8' });
  assert.equal(output.status, 0);
  const log = (output.stdout || '') + (output.stderr || '');
  assert.ok(!log.includes(token) && !log.includes(key), 'gateway logs must not contain credentials');
  run('network','disconnect',net,auth);
  const failClosed = `fetch('http://${gateway}:8080/rtc?access_token='+process.env.TOKEN).then(r=>{if(r.status===200||r.status===101)throw Error('unexpected allow');console.log('PASS authorization failure closes connection')}).catch(e=>{console.error(e.message);process.exit(1)})`;
  console.log(run('exec','-e',`TOKEN=${token}`,client,'node','-e',failClosed));
  const weak = spawnSync('docker',['run','--rm','--network','none','-e','LMS_GATEWAY_KEY=weak','codex-lms-media-gateway-check:local'],{encoding:'utf8'});
  assert.notEqual(weak.status,0,'gateway refuses a missing or malformed key');
} finally {
  if (!/^sb-media-check-[a-f0-9]{10}$/.test(prefix)) throw new Error('Unexpected fixture name');
  for (const name of [client,gateway,live,auth]) try { run('rm','-f',name); } catch {}
  try { run('network','rm',net); } catch {}
}
