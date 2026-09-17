/* Actual layout composable, isolated Vue state/storage; no browser, HTTP or DB. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(root,'composables/useWorkspaceLayout.ts'),'utf8'),{mode:'transform'}).replace('export function','function').replaceAll('import.meta.client','true');
function setup(saved,disabled=false){
 const states=new Map(),mounted=[],writes=[];
 const context=vm.createContext({useState:(key,init)=>{if(!states.has(key))states.set(key,{value:init()});return states.get(key);},onMounted:fn=>mounted.push(fn),localStorage:{getItem:()=>{if(disabled)throw Error('disabled');return saved;},setItem:(key,value)=>{if(disabled)throw Error('disabled');writes.push([key,value]);}}});
 vm.runInContext(source+';this.layout=useWorkspaceLayout;',context);
 const app=context.layout(),rail=context.layout();mounted.forEach(fn=>fn());return {app,rail,writes};
}
for(const saved of [null,'false','garbage','TRUE','1'])assert.equal(setup(saved).app.railCollapsed.value,false);
const {app,rail,writes}=setup('true');assert.equal(app.railCollapsed.value,true);assert.equal(app.railCollapsed,rail.railCollapsed);
rail.toggleRail();assert.equal(app.railCollapsed.value,false);app.toggleRail();assert.equal(rail.railCollapsed.value,true);
assert.deepEqual(writes,[['sarkisian-workspace-rail-collapsed','false'],['sarkisian-workspace-rail-collapsed','true']]);
const blocked=setup('true',true);blocked.rail.toggleRail();assert.equal(blocked.app.railCollapsed.value,true);
const css=fs.readFileSync(path.join(root,'assets/css/workspace-layout.css'),'utf8');assert.match(css,/@layer workspace-layout/);assert.match(css,/min-width: 801px/);assert.match(css,/max-width: 800px/);assert.doesNotMatch(css,/\.b2b-frame|\.sb-storefront/);
console.log('Shared rail state, persisted preference, disabled storage fallback and internal-only responsive scope PASS.');
