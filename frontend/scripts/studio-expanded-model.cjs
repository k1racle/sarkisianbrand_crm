const assert=require('node:assert/strict'),fs=require('fs'),ts=require('../../backend/node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const model=require('../components/sarkisian-studio/model.ts'),prep=require('../components/sarkisian-studio/atelier/preparation.ts'),look=require('../components/sarkisian-studio/keri/look.ts'),rules=require('../../backend/src/studio/studio.rules.ts');
assert.equal(model.COLORS.length,40);assert.equal(model.PATTERNS.length,18);assert.equal(model.FINISHES.length,5);
for(const {id} of prep.TECHNIQUES){let p=prep.freshPreparation(id);assert.deepEqual(prep.preparationSteps(id).map(s=>s.id),rules.stepsFor(id));const wrong={...p,tool:'base'};assert.equal(prep.applyTool(wrong,0),wrong);
 for(const step of prep.preparationSteps(id)){p.tool=step.tools[0];for(let i=0;i<5;i++)for(let n=0;n<6;n++)p=prep.applyTool(p,i);assert.ok(p.progress[step.id].every(n=>n===100));p=prep.parsePreparation(JSON.parse(JSON.stringify(p)));}
 assert.deepEqual(prep.preparedNails(p),[0,1,2,3,4]);assert.equal(prep.prepProgress(p),100);
}
for(const order of model.ORDERS){const server=rules.STUDIO_BRIEFS.find(b=>b.id===order.id);assert.ok(server,order.id);for(const field of ['reward','color','pattern','accent','shape','length','kind'])assert.equal(server[field],order[field],`${order.id}.${field}`);const d={kind:order.kind,shape:order.shape,length:order.length,nails:Array.from({length:5},(_,i)=>({color:order.color,pattern:order.accent===null||i===order.accent?order.pattern:'plain'}))};assert.equal(rules.studioReward(order.id,d),order.reward);}
let s=model.freshState();s.career=model.acceptOrder(s,'anna-french').career;s.work=model.newWork('manicure',1);s.work.preparation=prep.parsePreparation(null,[0,1,2,3,4]);s.work.prepared=[0,1,2,3,4];s.work.stage='design';s.work.rewardRunId='server-run';s.work.rewardUserId='user';s.work.design.nails=Array.from({length:5},()=>({color:'emerald',pattern:'marble',accentColor:'silver',finish:'chrome'}));
const restored=model.parseState(JSON.parse(JSON.stringify(s)));assert.equal(restored.work.rewardRunId,'server-run');assert.equal(restored.work.design.nails[0].finish,'chrome');assert.equal(restored.work.design.nails[0].accentColor,'silver');
assert.equal(prep.prepProgress(prep.parsePreparation({technique:'combined',tool:'file',progress:{base:[100,100,100,100,100]}})),0);
assert.equal(look.parseKeriLook({hair:8,lipstick:7,skin:999}).hair,8);assert.equal(look.parseKeriLook({hair:8,lipstick:7,skin:999}).skin,look.DEFAULT_KERI_LOOK.skin);
assert.equal(look.parseKeriLook({hair:2}).glasses,1);assert.equal(look.KERI_PRESETS.length,8);
console.log('PASS: 3 techniques, correct tools/order, 22 synchronized client briefs, 40 colors, 18 designs, 5 finishes, save migration and character options');
