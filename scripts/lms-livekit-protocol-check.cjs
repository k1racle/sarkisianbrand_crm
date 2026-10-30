/* Real LiveKit signal handshake on a disposable Docker network. No external
 * traffic, published host ports, user accounts or production credentials. */
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes, createHmac } = require('node:crypto');
const assert = require('node:assert/strict');
const p = `sb-livekit-check-${randomBytes(5).toString('hex')}`;
const net = `${p}-net`, auth = `${p}-auth`, live = `${p}-live`, gateway = `${p}-gateway`, client = `${p}-client`;
const apiKey = 'fixture-key', apiSecret = 'fixture-only-livekit-secret-0123456789abcdef', gatewayKey = 'b'.repeat(64);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const claims = `${encode({alg:'HS256',typ:'JWT'})}.${encode({iss:apiKey,sub:'10000000-0000-4000-8000-000000000001',nbf:now-1,exp:now+180,video:{roomJoin:true,room:'lms-fixture',canPublish:false,canSubscribe:true,canPublishData:false}})}`;
const token = `${claims}.${createHmac('sha256',apiSecret).update(claims).digest('base64url')}`;
const run = (...args) => execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const authCode = `require('http').createServer((q,r)=>{if(q.url!='/api/v1/lms-live-gateway/authorize'||q.headers['x-lms-gateway-key']!==process.env.KEY||q.headers['x-lms-media-token']!==process.env.TOKEN)return r.writeHead(403).end();r.writeHead(204).end()}).listen(3000,'0.0.0.0')`;
// The join_request below is a static synthetic protobuf produced by SDK 2.23,
// with no identity or credentials; the signed fixture token is supplied separately.
const testCode = `const http=require('http'),assert=require('assert/strict');(async()=>{for(let i=0;i<60;i++){try{let r=await fetch('http://${gateway}:8080/rtc/validate?access_token='+process.env.TOKEN+'&sdk=js&protocol=16');if(r.status!==502&&r.status!==500)break}catch{}await new Promise(r=>setTimeout(r,250))}const path='/rtc/v1?access_token='+process.env.TOKEN+'&join_request=EhYKDggFEgYyLjIzLjAYEGABEgQIARAB';await new Promise((resolve,reject)=>{const q=http.request({hostname:'${gateway}',port:8080,path,headers:{Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':Buffer.alloc(16,7).toString('base64')}});q.setTimeout(5000,()=>q.destroy(Error('signal timeout')));q.on('upgrade',(r,s)=>{assert.equal(r.statusCode,101);s.once('data',data=>{assert.ok(data.length>2,'LiveKit sends a signal frame');s.destroy();resolve()});s.setTimeout(5000,()=>s.destroy(Error('signal frame timeout')));s.on('error',reject)});q.on('response',r=>reject(Error('signal status '+r.statusCode)));q.on('error',reject);q.end()});console.log('PASS real LiveKit v1 WebSocket handshake through authorized gateway')})().catch(e=>{console.error(e.message);process.exit(1)})`;
try {
  run('network','create','--internal',net);
  run('run','-d','--name',auth,'--network',net,'--network-alias','backend','-e',`KEY=${gatewayKey}`,'-e',`TOKEN=${token}`,'--entrypoint','node','node:22.23.3-alpine','-e',authCode);
  run('run','-d','--name',live,'--network',net,'--network-alias','livekit-lms','-e',`LIVEKIT_KEYS=${apiKey}: ${apiSecret}`,'-e','LIVEKIT_CONFIG=port: 7880\nlog_level: warn\nrtc:\n  tcp_port: 7881\n  udp_port: 7882\n  use_external_ip: false\n','livekit/livekit-server:v1.13.11@sha256:25cd902de7cacbd5f1f779f6a6ac1eae20ba8f56b0935934ce6b0ab80d1e3d20');
  run('run','-d','--name',gateway,'--network',net,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,mode=1777,size=32m','--cap-drop','ALL','--security-opt','no-new-privileges:true','-e',`LMS_GATEWAY_KEY=${gatewayKey}`,'codex-lms-media-gateway-check:local');
  run('run','-d','--name',client,'--network',net,'--entrypoint','node','node:22.23.3-alpine','-e','setInterval(()=>{},10000)');
  console.log(run('exec','-e',`TOKEN=${token}`,client,'node','-e',testCode));
  for (const name of [gateway,live]) {
    const output = spawnSync('docker',['logs',name],{encoding:'utf8'});
    assert.equal(output.status,0);
    assert.ok(!((output.stdout || '') + (output.stderr || '')).includes(token),'gateway and LiveKit must not log the access token');
  }
} finally {
  if (!/^sb-livekit-check-[a-f0-9]{10}$/.test(p)) throw new Error('Unexpected fixture name');
  for (const name of [client,gateway,live,auth]) try { run('rm','-f',name); } catch {}
  try { run('network','rm',net); } catch {}
}
