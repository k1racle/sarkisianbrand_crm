/* Isolated UI fixture; no real integration, credentials or provider calls. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const assert = require('node:assert/strict');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3019').origin;
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname));
const payment = key => ({key,name:key === 'ROBOKASSA' ? 'Робокасса' : 'Т-Банк',category:'PAYMENT',provider:key,description:'Тестовое подключение',isEnabled:false,environment:'TEST',status:'NOT_CONFIGURED',documentationUrl:'https://example.invalid',fields:[{key:'courseFiscalMode',label:'Касса для курсов',type:'text'}]});
async function main() {
  const browser = await chromium.launch();
  try {
    for (const [width, dark] of [[1440,false],[390,true]]) {
      const fixtures = new Map([['/auth/access',{role:'ADMIN',permissions:['lms.read','lms.write','system.manage'],denied:[]}],['/lms/catalog',{items:[],purchasingAvailable:false,liveAvailable:false}],['/system-settings/integrations',[payment('TBANK'),payment('ROBOKASSA'),{...payment('OZON'),name:'Постороннее подключение'}]]]);
      const f = await isolatedContext(browser,width,false,false,{fixtures});
      try {
        await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
        await f.page.goto(origin+'/crm/course-settings');
        await f.page.getByRole('heading',{name:'Настройки обучения'}).waitFor();
        await f.page.getByText('Выключена в настройках сервера').waitFor();
        await f.page.getByText('Пока недоступны',{exact:true}).waitFor();
        await f.page.getByRole('button',{name:/Робокасса/}).click();
        const dialog=f.page.getByRole('dialog',{name:'Настройки интеграции'});
        await dialog.getByLabel('Касса для курсов').waitFor();
        assert.equal(await f.page.getByText('Постороннее подключение').count(),0);
        await dialog.getByRole('button',{name:'Закрыть интеграцию'}).click();
        assert.deepEqual(f.traffic.externalRequests,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.errors,[]);
        console.log(`${width}: course settings status and payment provider dialog PASS`);
      } finally { await f.context.close(); }
    }
    const f=await isolatedContext(browser,1440,false,false,{actor:{role:'CONTENT_MANAGER'},fixtures:new Map([['/auth/access',{role:'CONTENT_MANAGER',permissions:['lms.read'],denied:[]}],['/lms/catalog',{items:[],purchasingAvailable:false,liveAvailable:false}]])});
    try {
      await f.page.goto(origin+'/crm/course-settings');
      await f.page.getByText('Настройки оплаты доступны администратору').waitFor();
      assert.equal(f.traffic.mockedReads.some(path=>path.includes('/system-settings/integrations')),false);
      assert.equal(await f.page.getByRole('link',{name:'К трансляциям'}).count(),0);
      assert.deepEqual(f.traffic.externalRequests,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.errors,[]);
      console.log('Course editor cannot access administrative integration settings PASS');
    } finally { await f.context.close(); }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
