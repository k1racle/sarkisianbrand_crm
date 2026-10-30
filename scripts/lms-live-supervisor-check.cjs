/* Isolated Docker fixture for the LiveKit PID 1 watchdog. No real accounts,
 * providers or published ports; only uniquely named temporary resources. */
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path'), assert = require('node:assert/strict');
const prefix=`sb-lms-supervisor-${randomBytes(5).toString('hex')}`, network=`${prefix}-net`, backend=`${prefix}-backend`, client=`${prefix}-client`;
const key='a'.repeat(64), script=path.resolve(__dirname,'lms-live-supervisor.sh');
const livekitImage='livekit/livekit-server:v1.13.11@sha256:25cd902de7cacbd5f1f779f6a6ac1eae20ba8f56b0935934ce6b0ab80d1e3d20';
const run=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const backendScript=`const http=require('http');let good=false;http.createServer((q,r)=>{if(q.method==='POST'&&q.url==='/fixture/on'){good=true;return r.writeHead(204).end()}if(q.method==='POST'&&q.url==='/fixture/off'){good=false;return r.writeHead(204).end()}if(q.method==='GET'&&q.url==='/api/v1/lms-live-gateway/health'&&q.headers['x-lms-gateway-key']===process.env.FIXTURE_KEY&&good)return r.writeHead(204).end();r.writeHead(503).end()}).listen(3000,'0.0.0.0');`;
const clientScript=`setInterval(()=>{},10000)`;
const toggle=mode=>run('exec',client,'node','-e',`fetch('http://backend:3000/fixture/${mode}',{method:'POST'}).then(r=>{if(r.status!==204)process.exit(1)}).catch(()=>process.exit(1))`);
const running=name=>run('inspect','-f','{{.State.Running}}',name)==='true';
async function until(check,timeout=18000) { const end=Date.now()+timeout; while(Date.now()<end){if(check())return;await delay(250);} throw new Error('Fixture timed out'); }
function start(name,fixtureKey=key) { run('run','-d','--name',name,'--network',network,'--entrypoint','/bin/sh','--mount',`type=bind,source=${script},target=/tmp/lms-live-supervisor.sh,readonly`,'-e',`LMS_LIVEKIT_GATEWAY_KEY=${fixtureKey}`,livekitImage,'/tmp/lms-live-supervisor.sh','--dev','--bind','0.0.0.0'); }
async function ready(name) { await until(()=>{try{return running(name)&&run('exec',name,'/bin/sh','-c','nc -z -w 1 127.0.0.1 7880').length===0;}catch{return false;}}); }
const names=[`${prefix}-lost`,`${prefix}-recover`,`${prefix}-killed`,`${prefix}-invalid`];
(async()=>{
  let paused=false;
  try {
    run('network','create','--internal',network);
    run('run','-d','--name',backend,'--network',network,'--network-alias','backend','--entrypoint','node','-e',`FIXTURE_KEY=${key}`,'node:22.23.3-alpine','-e',backendScript);
    run('run','-d','--name',client,'--network',network,'--entrypoint','node','node:22.23.3-alpine','-e',clientScript);
    await until(()=>{try{toggle('on');return true;}catch{return false;}});
    start(names[0]); await ready(names[0]); await delay(2500);
    run('exec',names[0],'/bin/sh','-c',`pid=$(pidof livekit-server); test -n "$pid" && ! tr '\\0' '\\n' < "/proc/$pid/environ" | grep -q '^LMS_LIVEKIT_GATEWAY_KEY='`);
    toggle('off');
    await until(()=>!running(names[0]),12000);
    assert.equal(run('inspect','-f','{{.State.ExitCode}}',names[0]),'1');
    const logs=spawnSync('docker',['logs',names[0]],{encoding:'utf8'});
    assert.equal(logs.status,0);
    assert.ok(!(logs.stdout+logs.stderr).includes(key),'watchdog must never log its key');
    // Transient unavailability during boot is tolerated only during the fixed
    // startup window. Once healthy, a hung control server must stop media.
    start(names[1]); await delay(2200); assert.equal(running(names[1]),true); toggle('on'); await ready(names[1]); await delay(2500);
    run('pause',backend); paused=true; await until(()=>!running(names[1]),12000); run('unpause',backend); paused=false;
    assert.equal(run('inspect','-f','{{.State.ExitCode}}',names[1]),'1');
    toggle('on'); start(names[2]); await ready(names[2]); run('kill','--signal','KILL',names[2]); await until(()=>!running(names[2]),6000);
    assert.equal(run('inspect','-f','{{.State.ExitCode}}',names[2]),'137','PID 1 death kills its container');
    start(names[3],'weak'); await until(()=>!running(names[3]),6000); assert.notEqual(run('inspect','-f','{{.State.ExitCode}}',names[3]),'0');
    console.log('PASS: real LiveKit PID 1 stops on failed or hung private heartbeat; startup grace, SIGKILL and key validation; no public ports');
  } finally {
    if(paused){try{run('unpause',backend)}catch{}}
    if(!/^sb-lms-supervisor-[a-f0-9]{10}$/.test(prefix))throw new Error('Unexpected fixture prefix');
    for(const name of [...names,client,backend]){try{run('rm','-f',name)}catch{}}
    try{run('network','rm',network)}catch{}
  }
})().catch(error=>{console.error(error);process.exitCode=1});
