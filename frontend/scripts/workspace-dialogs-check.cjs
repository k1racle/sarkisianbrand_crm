/* Scoped dialog contract, without browser/network/API writes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');
const postcss=require('postcss');
const root=path.resolve(__dirname,'..');
const files=["components/AdminProductEditor.vue","components/AdminOrderDrawer.vue","components/AdminNewProduct.vue","components/UserProfileDrawer.vue","components/EcosystemAccounts.vue","components/EcosystemTrash.vue","components/EcosystemIntegrations.vue","components/BotCommandsSettings.vue","components/CrmPipelineSettings.vue","components/CrmTaskAutomation.vue","components/AdminMediaPicker.vue","components/storefront/SitePromoCodesEditor.vue","components/storefront/SiteGiftCardsEditor.vue","components/storefront/SiteCategoriesEditor.vue","pages/crm-customers.vue","pages/crm-organizations.vue","pages/crm-pipeline.vue","pages/crm-tasks.vue","components/workspace/SystemWorkspacePage.vue","components/workspace/SupportWorkspacePage.vue","components/workspace/ChannelsWorkspacePage.vue","components/PlatformChatDrawer.vue","components/WorkspaceToolbar.vue","components/workspace/StoreWorkspacePage.vue"];
for(const file of files){
 const filename=path.join(root,file),source=fs.readFileSync(filename,'utf8'),parsed=parse(source,{filename});
 assert.deepEqual(parsed.errors,[],file);
 const script=compileScript(parsed.descriptor,{id:file});
 assert.deepEqual(compileTemplate({source:parsed.descriptor.template.content,filename,id:file,compilerOptions:{bindingMetadata:script.bindings}}).errors,[],file);
 assert.ok(parsed.descriptor.template.content.includes('admin-dialog-backdrop'),file+' backdrop marker');
 assert.ok(parsed.descriptor.template.content.includes('admin-dialog admin-dialog--'),file+' panel marker');
}
const css=fs.readFileSync(path.join(root,'assets/css/workspace-dialogs.css'),'utf8');
postcss.parse(css).walkRules(rule=>{if(rule.parent.type==='atrule'&&rule.parent.name==='keyframes')return;assert.ok(rule.selectors.every(s=>s.includes('admin-dialog')||s.includes('admin-chat-create-layer')),rule.selector);});
assert.match(css,/overflow:hidden!important/);
assert.match(css,/chat-body--channels/);
assert.ok(fs.readFileSync(path.join(root,'assets/css/admin.css'),'utf8').includes('workspace-dialogs.css'));
console.log(files.length+' dialog SFCs/templates PASS; explicit internal-only theme, CSS and responsive scroll contracts PASS. No HTTP/DB.');
