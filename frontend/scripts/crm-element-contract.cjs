/* CRM control contract: all statically reachable employee screen owners. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),postcss=require('postcss');
const{parse}=require('@vue/compiler-sfc');
const root=path.resolve(__dirname,'..'),inventory=require('./crm-interface-inventory.cjs');
const files=inventory.owners.map(owner=>owner.file);
assert.deepEqual(inventory.missing,[],'Every action/field uses a canonical interaction role');
assert.deepEqual(inventory.unlabelled,[],'Visible native fields and icon actions have accessible names');
const scopedGeometry=new Set(['pages/crm/meetings.vue','components/crm/CrmMeetingCalendar.vue']);
for(const file of files){const d=parse(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).descriptor;for(const style of d.styles){assert.ok(scopedGeometry.has(file),'Unexpected CRM SFC style owner: '+file);assert.equal(style.scoped,true,file+' geometry must be scoped');}}
const recipes=fs.readFileSync(path.join(root,'assets/css/crm-controls.css'),'utf8');
for(const token of ['crm-button','crm-input','crm-input-group','crm-field','crm-tabs','crm-card-tabs','crm-badge','crm-button--primary','crm-button--text','crm-button--danger'])assert.ok(recipes.includes('.'+token),token);
postcss.parse(recipes).walkRules(rule=>assert.ok(rule.selector.startsWith('html[data-crm-ui]'),'Control recipes must be CRM-only: '+rule.selector));
assert.doesNotMatch(recipes,/\.tasks-page|\.pipeline-page|\.partner-workspace|data-v-ui/,'Canonical controls are independent of screen layout');
const entry=fs.readFileSync(path.join(root,'assets/css/admin.css'),'utf8');
assert.ok(entry.indexOf('crm-workspace.css')<entry.indexOf('crm-controls.css'));
const config=fs.readFileSync(path.join(root,'nuxt.config.ts'),'utf8');
assert.match(config,/key: 'workspace-layer-order', tagPriority: 'critical', innerHTML: '@layer crm-workspace,/,'Register CRM layer order before deferred styles to avoid a stale first-render cascade');
console.log(`CRM element contract PASS: ${files.length} reachable owners; ${inventory.summary.buttons} actions / ${inventory.summary.fields} fields; canonical roles and accessible names.`);
module.exports={files};
