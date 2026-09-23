/* Read-only rendered audit. All APIs are intercepted by isolatedContext. */
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures:base}=require('./crm-rich-fixtures.cjs');
const fs=require('node:fs'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
async function main(){
 const source=fs.readFileSync(path.resolve(__dirname,'../shared/crm-workspace.ts'),'utf8');
 const {CRM_DESTINATIONS}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
 const fixtures=new Map(base);
 for(const kind of ['REFERRAL','BLOGGER'])for(const section of ['overview','participants','registrations','rewards','payouts','settings'])fixtures.set(`/partners/admin/${kind}/${section}`,{settings:{name:'Партнёрская программа',rewardPercent:5,attributionDays:30,holdDays:14,minimumOrderAmount:0,minimumPayout:1000,signupRewardAmount:0,signupHoldDays:14,signupRewardUnit:'RUB',termsText:'Условия участия в программе',isEnabled:true},rows:[],total:0,page:1,pages:1,totals:[],summary:{participants:8,pending:2,uniqueVisitors:120,registrations:6}});
 const output=path.resolve(__dirname,'../.screenshots/crm-surface-'+(process.argv.includes('--after')?'after':'before'));fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch(require("./crm-test-browser.cjs"));const report=[];
 try{for(const width of [390,1440]){const f=await isolatedContext(browser,width,false,false,{fixtures});try{for(const item of CRM_DESTINATIONS){
 await f.page.goto('http://127.0.0.1:3001'+item.path,{waitUntil:'networkidle'});
 await f.page.screenshot({path:path.join(output,`${item.id}-${width}.png`),fullPage:true});
 const details=await f.page.evaluate(()=>{
 const root=document.querySelector('.crm-frame'),counts={},surfaces=[];
 for(const el of root?.querySelectorAll('*')||[]){const r=el.getBoundingClientRect(),s=getComputedStyle(el);if(!r.width||!r.height||el.closest('svg'))continue;
 if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){const k=[s.color,s.fontSize,s.fontWeight].join(' / ');(counts[k]??=[]).push({cls:el.className,text:el.textContent.trim().slice(0,45)});}
 if((el.matches('article,section,button,input,select,textarea')||/panel|drawer|card|hero|toolbar|filter/.test(el.className))&&s.backgroundColor!=='rgba(0, 0, 0, 0)')surfaces.push({cls:el.className,bg:s.backgroundColor,image:s.backgroundImage,color:s.color,radius:s.borderRadius,border:s.borderColor,shadow:s.boxShadow});
 }return {type:counts,surfaces,overflow:document.documentElement.scrollWidth-innerWidth};});report.push({width,path:item.path,...details});
 }console.log(width+'px captured '+CRM_DESTINATIONS.length+' routes');}finally{await f.context.close();}}}finally{await browser.close();}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(output);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
