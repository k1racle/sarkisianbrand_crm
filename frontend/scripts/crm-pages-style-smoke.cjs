const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures:baseFixtures,assertTypography,assertWidth}=require('./crm-workspace-smoke.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
async function main(){
 const registry=fs.readFileSync(path.resolve(__dirname,'../shared/crm-workspace.ts'),'utf8');
 const {CRM_DESTINATIONS}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(registry)).toString('base64'));
 const fixtures=new Map(baseFixtures);
 fixtures.set('/crm/drive',{items:[],total:0,crumbs:[],used:0,quota:1024**3});
 for(const kind of ['REFERRAL','BLOGGER'])for(const section of ['overview','participants','registrations','rewards','payouts','settings'])fixtures.set(`/partners/admin/${kind}/${section}`,{settings:{name:'Партнёрская программа',rewardPercent:5,attributionDays:30,holdDays:14,minimumOrderAmount:0,minimumPayout:1000,signupRewardAmount:0,signupHoldDays:14,signupRewardUnit:'RUB',termsText:'Условия',isEnabled:false},rows:[],total:0,page:1,pages:1,totals:[],summary:{participants:0,pending:0,uniqueVisitors:0,registrations:0}});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),failures=[];
 const output=path.resolve(__dirname,'../.screenshots/crm-pages');fs.mkdirSync(output,{recursive:true});
 try{for(const width of [390,1440]){
  const f=await isolatedContext(browser,width,false,false,{fixtures});
  try{for(const item of CRM_DESTINATIONS){
   await f.page.goto('http://127.0.0.1:3001'+item.path,{waitUntil:'networkidle'});
   try{await assertWidth(f.page);await assertTypography(f.page);assert.equal(await f.page.locator('.crm-frame h1').count(),1,'One page heading');}
   catch(error){failures.push({width,path:item.path,error:error.message,details:error.actual});}
   if(['tasks','crm-files','organizations','loyalty-settings','bloggers-settings','leadership','tickets','customers'].includes(item.id))await f.page.screenshot({path:path.join(output,`${item.id}-${width}.png`)});
  }
  for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])if(f.traffic[key].length)failures.push({width,key,items:f.traffic[key]});
  if(f.errors.length)failures.push({width,errors:f.errors});
  console.log(width+'px: visited '+CRM_DESTINATIONS.length+' CRM pages');
  }finally{await f.context.close();}
 }}finally{await browser.close();}
 assert.deepEqual(failures,[],'All CRM pages: heading, computed type scale, width, isolated reads');
 console.log('CRM full-route style audit PASS, no business writes.');
}
main().catch(error=>{console.error(JSON.stringify(error.actual||error.message,null,2));process.exitCode=1;});
