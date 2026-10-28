/* Assert that every registered employee screen has reviewed state evidence. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'../.screenshots');
async function main(){
 const source=fs.readFileSync(path.resolve(__dirname,'../shared/crm-workspace.ts'),'utf8');
 const {CRM_DESTINATIONS}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
 const groups=['crm-comfort-shell','crm-comfort-operations','crm-comfort-management','crm-comfort-business'];
 const records=groups.flatMap(group=>{const file=path.join(root,group,'coverage.json');assert.ok(fs.existsSync(file),'Missing review evidence '+file);const data=JSON.parse(fs.readFileSync(file,'utf8'));assert.ok(Array.isArray(data));return data.map(record=>({...record,group}));});
 const routes=new Set(records.filter(r=>r.states?.some(s=>s.reviewed===true&&s.screenshots?.length)).map(r=>r.route));
 const missing=CRM_DESTINATIONS.filter(d=>!routes.has(d.path));
 assert.deepEqual(missing,[],'Every registered CRM screen must have reviewed rendered states');
 for(const record of records){assert.ok(record.states.length,'Empty screen review '+record.route);for(const state of record.states){assert.equal(state.reviewed,true,`${record.route}/${state.id} is not visually reviewed`);assert.ok(state.screenshots.length,'No evidence '+record.route+'/'+state.id);for(const shot of state.screenshots)assert.ok(fs.existsSync(path.resolve(root,record.group,shot)),`Missing screenshot ${record.group}/${shot}`);}}
 const result={crmRoutes:CRM_DESTINATIONS.length,relatedRoutes:[...routes].filter(r=>!CRM_DESTINATIONS.some(d=>d.path===r)),distinctStates:[...new Set(records.flatMap(r=>r.states.map(s=>r.route+'#'+s.id)))].length,screenRecords:records.length,missing:[],routes:CRM_DESTINATIONS.map(d=>({route:d.path,label:d.label,groups:[...new Set(records.filter(r=>r.route===d.path).map(r=>r.group))],states:[...new Set(records.filter(r=>r.route===d.path).flatMap(r=>r.states.map(s=>s.id)))]})),references:[{name:'Attio',url:'https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views',applied:'Compact tables, adjacent record context and saved views'},{name:'Pipedrive',url:'https://support.pipedrive.com/en/article/list-view',applied:'Compact filters, clear primary actions, pipeline focus'},{name:'HubSpot',url:'https://knowledge.hubspot.com/object-settings/customize-records',applied:'Record data, activity and related items in distinct areas'},{name:'Salesforce',url:'https://help.salesforce.com/s/articleView?id=user_overview_lex.htm&language=en_US&type=5',applied:'Employee display density preference'}]};
 fs.writeFileSync(path.join(root,'crm-comfort-coverage.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({crmRoutes:result.crmRoutes,relatedRoutes:result.relatedRoutes.length,distinctStates:result.distinctStates,missing:[]}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
