/* Payment settings fixture. No credentials, provider or real API calls. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const assert = require('node:assert/strict');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3019').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const fields = [
  {key:'merchantLogin',label:'Логин магазина',type:'text',value:'fixture-store'},
  {key:'password1',label:'Рабочий пароль № 1',type:'secret',configured:false},
  {key:'password2',label:'Рабочий пароль № 2',type:'secret',configured:false},
  {key:'testPassword1',label:'Тестовый пароль № 1',type:'secret',configured:false},
  {key:'testPassword2',label:'Тестовый пароль № 2',type:'secret',configured:false},
  {key:'signatureAlgorithm',label:'Алгоритм подписи',type:'text',value:'SHA256'},
  {key:'fiscalMode',label:'Фискализация',type:'text',value:'EXTERNAL'},
];
const integration = {key:'ROBOKASSA',name:'Робокасса',category:'PAYMENT',provider:'ROBOKASSA',description:'Тестовая интеграция',isEnabled:false,environment:'TEST',status:'NOT_CONFIGURED',documentationUrl:'https://example.invalid/docs',fields};
async function main() {
  const browser=await chromium.launch();
  try {
    for (const [width,dark] of [[1440,false],[390,true]]) {
      const f=await isolatedContext(browser,width,false,false,{allowFixtureForms:true,fixtures:new Map([['/system-settings/integrations',[integration]]])});
      let saved=null;
      await f.context.route('**/api/v1/system-settings/integrations/ROBOKASSA',async route=>{if(route.request().method()!=='PUT')return route.fulfill({status:405});saved=route.request().postDataJSON();return route.fulfill({json:integration});});
      try {
        await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
        await f.page.goto(origin+'/crm/settings/integrations'); await f.page.locator('button.integration-card').filter({hasText:'Робокасса'}).click();
        const dialog=f.page.getByRole('dialog',{name:'Настройки интеграции'});
        await dialog.getByText('Укажите рабочие и тестовые пароли',{exact:false}).waitFor();
        for(const [label,value] of [['Рабочий пароль № 1','fixture-production-one'],['Рабочий пароль № 2','fixture-production-two'],['Тестовый пароль № 1','fixture-test-one'],['Тестовый пароль № 2','fixture-test-two']])await dialog.getByLabel(label).fill(value);
        await dialog.getByRole('button',{name:'Сохранить',exact:true}).click(); await dialog.waitFor({state:'hidden'});
        assert.deepEqual(saved.secrets,{password1:'fixture-production-one',password2:'fixture-production-two',testPassword1:'fixture-test-one',testPassword2:'fixture-test-two'});
        assert.equal(saved.environment,'TEST'); assert.deepEqual(f.traffic.externalRequests,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.errors,[]);
        console.log(`${width} ${dark?'dark':'light'}: separate Robokassa test and production secrets PASS`);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
