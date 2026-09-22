/* Static guard: shared CRM components use the same element recipes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parse}=require('@vue/compiler-sfc'),{baseParse}=require('@vue/compiler-dom');
const root=path.resolve(__dirname,'..');
const files=['pages/crm/tasks.vue','pages/crm/deals.vue','pages/crm/customers.vue','pages/crm/organizations.vue','pages/crm/files.vue','pages/crm/content-plan.vue','components/workspace/ReportsWorkspacePage.vue','components/workspace/SupportWorkspacePage.vue','components/workspace/PartnerWorkspacePage.vue','components/workspace/StoreWorkspacePage.vue','components/workspace/ContactMessagesWorkspace.vue','components/storefront/SitePromoCodesEditor.vue','components/storefront/SiteGiftCardsEditor.vue','components/CrmCardTabs.vue','components/CrmChangeHistory.vue','components/CrmLeadTasks.vue','components/CrmTaskFiles.vue','components/CrmTaskAutomation.vue','components/CrmPipelineSettings.vue','components/CrmDrivePicker.vue','components/CrmFilePreview.vue','components/CrmPdfViewer.vue','components/PlatformChatDrawer.vue','components/UserProfileDrawer.vue','components/AdminOrderDrawer.vue'];
const failures=[];let controls=0;
for(const file of files){const sfc=parse(fs.readFileSync(path.join(root,file),'utf8')).descriptor;assert.equal(sfc.styles.length,0,file+' must not own a visual skin');
 function walk(n){if(n.type===1){const plain=name=>n.props.find(p=>p.type===6&&p.name===name)?.value?.content||'';const cls=plain('class').split(/\s+/);let required='';
 if(n.tag==='button')required='crm-button';
 if(['input','select','textarea'].includes(n.tag)&&!['file','hidden','range','color'].includes(plain('type')))required=['checkbox','radio'].includes(plain('type'))?'crm-check':'crm-input';
 if(required){controls++;if(!cls.includes(required))failures.push(file+':'+n.loc.start.line+' '+n.tag+' missing '+required);}
 }for(const c of n.children||[])walk(c);}
 walk(baseParse(sfc.template.content));
}
assert.deepEqual(failures,[]);
const css=fs.readFileSync(path.join(root,'assets/css/crm-elements.css'),'utf8');
for(const token of ['crm-button','crm-input','crm-input-group','crm-surface','crm-item-card','crm-board-column','crm-card-tabs','crm-badge'])assert.ok(css.includes('.'+token),token);
assert.ok(!/\.tasks-page|\.pipeline-page|\.partner-workspace|data-v-ui/.test(css),'Element recipes must not target a particular screen');
console.log(`CRM element contract PASS: ${files.length} component owners, ${controls} controls; shared recipes, no SFC skins.`);
module.exports={files};
