/* Synthetic browser/LiveKit test. Only loopback host ports and disposable Docker
 * containers are used; this does not connect to the site's users or services. */
const { execFileSync } = require('node:child_process');
const { randomBytes, createHmac } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const http = require('node:http');
const net = require('node:net');
const dgram = require('node:dgram');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('../frontend/node_modules/playwright-core');

const prefix = `sb-webrtc-${randomBytes(5).toString('hex')}`;
const network = `${prefix}-net`, auth = `${prefix}-auth`, live = `${prefix}-live`, gateway = `${prefix}-gateway`;
const image = 'livekit/livekit-server:v1.13.11@sha256:25cd902de7cacbd5f1f779f6a6ac1eae20ba8f56b0935934ce6b0ab80d1e3d20';
const key = 'fixture-key', secret = 'fixture-only-livekit-secret-0123456789abcdef', gatewayKey = 'c'.repeat(64);
// Reserve ephemeral loopback ports, then release them immediately before the
// corresponding Docker bind. No fixed ports or publicly reachable sockets.
async function tcpPort() { return new Promise((resolve,reject)=>{const socket=net.createServer();socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});}); }
async function udpPort() { return new Promise((resolve,reject)=>{const socket=dgram.createSocket('udp4');socket.on('error',reject);socket.bind(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});}); }
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(sub, video) {
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: key, sub, nbf: now - 1, exp: now + 600, video })}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
const roomName = 'lms-fixture';
const partition = process.argv.includes('--partition');
const hostToken = jwt('fixture-host', { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: false });
const viewerToken = jwt('fixture-viewer', { roomJoin: true, room: roomName, canPublish: false, canSubscribe: true, canPublishData: false });
const adminToken = jwt('fixture-admin', { roomAdmin: true, room: roomName });
const run = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const authCode = `const h=require('http');let viewer=true;h.createServer((q,r)=>{if(q.method==='POST'&&q.url==='/fixture/revoke'){viewer=false;return r.writeHead(204).end()}if(q.method==='POST'&&q.url==='/fixture/allow'){viewer=true;return r.writeHead(204).end()}if(q.headers['x-lms-gateway-key']!==process.env.KEY)return r.writeHead(403).end();if(q.url==='/api/v1/lms-live-gateway/health')return r.writeHead(204).end();if(q.url==='/api/v1/lms-live-gateway/authorize'&&(q.headers['x-lms-media-token']===process.env.HOST||(viewer&&q.headers['x-lms-media-token']===process.env.VIEWER)))return r.writeHead(204).end();r.writeHead(403).end()}).listen(3000,'0.0.0.0')`;
function control(code, extra = []) { return run('exec', ...extra, auth, 'node', '-e', code); }
function toggle(action) { control(`fetch('http://localhost:3000/fixture/${action}',{method:'POST'}).then(r=>{if(r.status!==204)process.exit(1)}).catch(()=>process.exit(1))`); }
async function until(test, timeout = 20000) { const end = Date.now()+timeout; let last; while(Date.now()<end) { try { if(await test()) return; } catch(e) { last=e; } await delay(250); } throw last || new Error('Fixture timed out'); }

(async () => {
  let browser, server, paused = false;
  try {
    const rtcUdpPort=await udpPort(), rtcTcpPort=await tcpPort();
    // Docker does not publish ports for an internal network on Docker Desktop.
    // This disposable bridge publishes every browser endpoint to loopback only.
    run('network','create',network);
    run('run','-d','--name',auth,'--network',network,'--network-alias','backend','--entrypoint','node', '-e',`KEY=${gatewayKey}`, '-e',`HOST=${hostToken}`, '-e',`VIEWER=${viewerToken}`, 'node:22.23.3-alpine','-e',authCode);
    const config = `port: 7880\nlog_level: warn\nrtc:\n  tcp_port: ${rtcTcpPort}\n  udp_port: ${rtcUdpPort}\n  use_external_ip: false\n`;
    run('run','-d','--name',live,'--network',network,'--network-alias','livekit-lms', '--entrypoint','/bin/sh', '--mount',`type=bind,source=${path.resolve(__dirname,'lms-live-supervisor.sh')},target=/tmp/supervisor.sh,readonly`, '-e',`LMS_LIVEKIT_GATEWAY_KEY=${gatewayKey}`, '-e',`LIVEKIT_KEYS=${key}: ${secret}`, '-e',`LIVEKIT_CONFIG=${config}`, '-p',`127.0.0.1:${rtcUdpPort}:${rtcUdpPort}/udp`, '-p',`127.0.0.1:${rtcTcpPort}:${rtcTcpPort}/tcp`, image,'/tmp/supervisor.sh','--node-ip','127.0.0.1');
    run('run','-d','--name',gateway,'--network',network,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,mode=1777,size=32m','--cap-drop','ALL','--security-opt','no-new-privileges:true','-e',`LMS_GATEWAY_KEY=${gatewayKey}`,'-p','127.0.0.1::8080','codex-lms-media-gateway-check:local');
    await until(()=>{try{return !!run('port',gateway,'8080/tcp')}catch{return false}},5000);
    const port = Number(run('port',gateway,'8080/tcp').split(':').pop());
    await until(async()=>{ try { return (await fetch(`http://127.0.0.1:${port}/rtc/validate?access_token=${hostToken}`)).status===200; } catch { return false; } });
    server = http.createServer((q,r)=>r.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><html><body></body></html>'));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser = await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
    const host = await browser.newPage(), viewer = await browser.newPage();
    for(const page of [host,viewer]) { await page.goto(`http://127.0.0.1:${server.address().port}/`); await page.addScriptTag({path:require.resolve('../frontend/node_modules/livekit-client/dist/livekit-client.umd.js')}); }
    const url = `ws://127.0.0.1:${port}`;
    await host.evaluate(async ({url,token})=>{
      window.room=new LivekitClient.Room(); await window.room.connect(url,token);
      const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=180;
      const ctx=canvas.getContext('2d'); let n=0; window.painter=setInterval(()=>{ctx.fillStyle=`hsl(${n++%360},80%,50%)`;ctx.fillRect(0,0,320,180)},50);
      const stream=canvas.captureStream(20); window.video=stream.getVideoTracks()[0];
      await window.room.localParticipant.publishTrack(window.video,{source:LivekitClient.Track.Source.Camera});
      window.audioContext=new AudioContext();await window.audioContext.resume();window.oscillator=window.audioContext.createOscillator();const gain=window.audioContext.createGain();gain.gain.value=0.1;const destination=window.audioContext.createMediaStreamDestination();window.oscillator.frequency.value=440;window.oscillator.connect(gain);gain.connect(destination);window.oscillator.start();window.audio=destination.stream.getAudioTracks()[0];await window.room.localParticipant.publishTrack(window.audio,{source:LivekitClient.Track.Source.Microphone});
    },{url,token:hostToken});
    await viewer.evaluate(async ({url,token})=>{
      window.frames=0; window.disconnected=false; window.room=new LivekitClient.Room();
      window.room.on(LivekitClient.RoomEvent.Disconnected,()=>window.disconnected=true);
      window.room.on(LivekitClient.RoomEvent.TrackSubscribed,track=>{if(track.kind==='audio'){window.remoteAudio=track;return}if(track.kind!=='video')return; const el=track.attach();el.muted=true;document.body.appendChild(el); el.play(); const frame=()=>{window.frames++;el.requestVideoFrameCallback(frame)};el.requestVideoFrameCallback(frame)});
      await window.room.connect(url,token);
    },{url,token:viewerToken});
    await until(()=>viewer.evaluate(()=>window.frames>=5));
    await until(()=>viewer.evaluate(async()=>{if(!window.remoteAudio)return false;const stats=await window.remoteAudio.getRTCStatsReport();return !!stats&&[...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='audio'&&s.packetsReceived>10&&s.bytesReceived>1000)}));
    console.log('PASS actual browser-to-browser video frames and audio packets via LiveKit and authenticated gateway');

    toggle('revoke');
    control(`fetch('http://livekit-lms:7880/twirp/livekit.RoomService/RemoveParticipant',{method:'POST',headers:{authorization:'Bearer '+process.env.ADMIN,'content-type':'application/json'},body:JSON.stringify({room:'${roomName}',identity:'fixture-viewer'})}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))`,['-e',`ADMIN=${adminToken}`]);
    await until(()=>viewer.evaluate(()=>window.disconnected));
    const rejected=await viewer.evaluate(async ({url,token})=>{try{const r=new LivekitClient.Room();await r.connect(url,token);await r.disconnect();return false}catch{return true}},{url,token:viewerToken});
    assert.equal(rejected,true,'revoked viewer must not reconnect');
    console.log('PASS revoked viewer disconnected and its existing token cannot reconnect');

    toggle('allow');
    await viewer.evaluate(async ({url,token})=>{window.disconnected=false;window.afterReconnectFrames=0;window.room=new LivekitClient.Room();window.room.on(LivekitClient.RoomEvent.Disconnected,()=>window.disconnected=true);window.room.on(LivekitClient.RoomEvent.TrackSubscribed,track=>{if(track.kind!=='video')return;const el=track.attach();el.muted=true;document.body.appendChild(el);el.play();const frame=()=>{window.afterReconnectFrames++;el.requestVideoFrameCallback(frame)};el.requestVideoFrameCallback(frame)});await window.room.connect(url,token)},{url,token:viewerToken});
    await until(()=>viewer.evaluate(()=>window.afterReconnectFrames>=5));
    if (partition) run('network','disconnect',network,auth);
    else { run('pause',auth); paused=true; }
    await until(()=>run('inspect','-f','{{.State.Running}}',live)==='false',15000);
    assert.equal(run('inspect','-f','{{.State.ExitCode}}',live),'1');
    // A client SDK can remain in "reconnecting" for a while after transport
    // dies; test actual media delivery rather than demanding a UI event.
    await delay(4000);
    const stoppedAt=await viewer.evaluate(()=>window.afterReconnectFrames);
    await delay(2500);
    assert.equal(await viewer.evaluate(()=>window.afterReconnectFrames),stoppedAt,'no new video frames after watchdog stops media');
    console.log(`PASS ${partition?'network partition':'hung backend'} stops LiveKit and ends video delivery`);
  } catch (error) {
    for(const name of [auth,live,gateway]) { try { console.error(`${name}: ${run('inspect','-f','{{.State.Status}} {{.State.ExitCode}}',name)}`); console.error(run('logs','--tail','8',name)); } catch {} }
    throw error;
  } finally {
    if(paused) try {run('unpause',auth)} catch {}
    if(browser) await browser.close();
    if(server) await new Promise(resolve=>server.close(resolve));
    if(!/^sb-webrtc-[a-f0-9]{10}$/.test(prefix)) throw new Error('Unexpected fixture prefix');
    for(const name of [gateway,live,auth]) try {run('rm','-f',name)} catch {}
    try {run('network','rm',network)} catch {}
  }
})().catch(error=>{console.error(error.message);process.exitCode=1});
