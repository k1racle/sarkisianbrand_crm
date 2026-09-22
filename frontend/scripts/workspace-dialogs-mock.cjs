/* Rendered internal dialogs: fixture reads only, actual writes/external traffic forbidden. */
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {auditTypography}=require('./workspace-typography-audit.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const now='2026-09-17T10:00:00Z';
const task={id:'qa-task',title:'Проверить заказы',description:'Описание тестовой задачи',status:'TODO',priority:'MEDIUM',progress:0,createdAt:now,startDate:null,dueDate:null,assignedTo:null,comments:[],_count:{comments:0}};
const pipeline={id:'qa-pipeline',name:'Основная воронка',isDefault:true,requiredFields:[],lostReasons:[],stages:[{id:'qa-stage',name:'Новые',color:'#585285',probability:10,isWon:false,isLost:false,sortOrder:0,leads:[]}]};
const channel={id:'qa-chat',name:'Общие вопросы',description:'Рабочие обсуждения команды',type:'TEAM',unread:1,members:[],messages:[]};
const fixtures=new Map([
  ['/crm/team',[]],['/crm/leads',[]],['/crm/tasks',[task]],['/crm/pipelines',[pipeline]],['/crm/pipeline',pipeline],
  ['/crm/task-templates',[]],['/crm/reminders',[]],['/customer-360/organizations',[]],
  ['/system-settings/staff',[]],['/system-settings/access',{roles:['ADMIN'],permissions:[]}],
  ['/system-settings/bot-commands',[]],['/system-settings/bot-events',{items:[],identities:0,unlinked:0,statuses:{}}],
  ['/system-settings/integrations',[{key:'qa-delivery',name:'Служба доставки',provider:'CDEK',description:'Настройки службы доставки',category:'DELIVERY',audience:'EMPLOYEE',isEnabled:false,environment:'TEST',status:'NOT_CONFIGURED',fields:[{key:'account',label:'Аккаунт',type:'text',value:''}]}]],
  ['/helpdesk/tickets',[]],['/helpdesk/agents',[]],
  ['/platform-chat/channels',[channel,{...channel,id:'qa-chat-2',name:'Заказы и доставка',unread:0}]],['/platform-chat/team',[]],
  ['/platform-chat/channels/qa-chat/messages',[
    {id:'qa-message-1',channelId:'qa-chat',authorId:'someone',author:{firstName:'Анна',lastName:'Саркисян'},body:'Проверяем оформление переписки и читаемость сообщений.',createdAt:now,attachments:[]},
    {id:'qa-message-2',channelId:'qa-chat',authorId:'mock-admin',author:{firstName:'Дизайн',lastName:'Проверка'},body:'Длинное сообщение без пробелов: '+('пример'.repeat(16)),createdAt:now,attachments:[]},
  ]],['/platform-chat/channels/qa-chat-2/messages',[]],
]);
const cases=[
  {id:'product',route:'/admin-workspace/products',panel:'.editor-drawer',open:async p=>{await p.locator('.product-open').first().click();}},
  {id:'new-product',route:'/admin-workspace/products',panel:'.new-drawer',open:p=>p.locator('.new-product').click()},
  {id:'media',route:'/admin-workspace/products',panel:'.aml-panel',open:async p=>{await p.locator('.product-open').first().click();await p.getByRole('tab',{name:/Изображения/}).click();await p.getByRole('button',{name:'Выбрать из библиотеки',exact:true}).first().click();}},
  {id:'category',route:'/admin-workspace/categories',panel:'.cs-edit-panel',open:p=>p.getByRole('button',{name:'Добавить категорию',exact:true}).click()},
  {id:'banner',route:'/admin-workspace/appearance',panel:'.banner-editor-drawer',open:p=>p.getByRole('button',{name:'Настройки баннера 1',exact:true}).click()},
  {id:'task',route:'/crm-tasks',panel:'.backdrop .drawer',open:async p=>{await p.locator('.task-card').first().click();}},
  {id:'new-task',route:'/crm-tasks',panel:'.backdrop .drawer',open:p=>p.getByRole('button',{name:'Новая задача',exact:true}).click()},
  {id:'organization',route:'/crm-organizations',panel:'.backdrop .drawer',open:p=>p.getByRole('button',{name:'Новая организация',exact:true}).click()},
  {id:'lead',route:'/crm-pipeline',panel:'.backdrop .drawer',open:p=>p.getByRole('button',{name:'Новая сделка',exact:true}).click()},
  {id:'pipeline',route:'/crm-pipeline',panel:'.pipeline-settings',open:p=>p.getByRole('button',{name:'Настроить',exact:true}).click()},
  {id:'staff',route:'/system-settings/staff',panel:'.drawer-backdrop .drawer',open:p=>p.locator('.head-actions .primary,.panel-head .primary,.actions .primary').first().click()},
  {id:'support',route:'/helpdesk/tickets',panel:'.backdrop .drawer',open:p=>p.getByRole('button',{name:'Новая заявка',exact:true}).click()},
  {id:'bot',route:'/system-settings/bot-commands',panel:'.command-drawer',open:p=>p.getByRole('button',{name:'Новая команда',exact:true}).click()},
  {id:'integration',route:'/system-settings/integrations',panel:'.integration-drawer',open:p=>p.locator('.integration-card').first().click()},
  {id:'profile',route:'/admin-workspace/dashboard',panel:'.profile-drawer',open:async p=>{const dock=p.locator('.wn-rail-dock');if(await dock.isVisible())await dock.getByRole('button',{name:'Открыть профиль',exact:true}).click();else await p.locator('.rail-user').click();}},
  {id:'chat',route:'/admin-workspace/dashboard',panel:'.platform-chat',open:p=>p.locator('.wn-chat-trigger').click()},
];
async function audit(panel,width){
  await panel.waitFor();
  await panel.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{})));});
  const result=await panel.evaluate(el=>{
    const style=getComputedStyle(el),r=el.getBoundingClientRect();
    const fields=[...el.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=color]):not([type=range]),select,textarea')].filter(x=>x.getClientRects().length).map(x=>{const shell=x.closest('.channels>label,.entity-picker>label,.aml-search,.wn-command-search');return {type:x.type,font:getComputedStyle(x).fontSize,radius:getComputedStyle(x).borderRadius,height:x.getBoundingClientRect().height,shellHeight:shell?.getBoundingClientRect().height,shellRadius:shell?getComputedStyle(shell).borderRadius:null};});
    const close=el.querySelector(':scope > header > button:last-child'),closeRect=close?.getBoundingClientRect();
    return {theme:el.classList.contains('admin-dialog'),background:style.backgroundColor,font:style.fontFamily,left:r.left,right:r.right,bottom:r.bottom,overflowX:el.scrollWidth-el.clientWidth,fields,close:closeRect?{left:closeRect.left,right:closeRect.right,top:closeRect.top,bottom:closeRect.bottom}:null};
  });
  assert.ok(result.theme);assert.equal(result.background,'rgb(255, 255, 255)');assert.match(result.font,/Montserrat/);
  assert.ok(result.left>=-2&&result.right<=width+2,'Panel bounds '+JSON.stringify(result));assert.ok(result.overflowX<=2,'No horizontal panel overflow: '+result.overflowX);
  if(result.close)assert.ok(result.close.left>=result.left&&result.close.right<=result.right+2&&result.close.top>=0&&result.close.bottom<=result.bottom,'Close button fits panel: '+JSON.stringify(result.close));
  for(const field of result.fields){assert.equal(field.font,'14px');if(field.shellHeight){assert.equal(field.radius,'0px');assert.ok(field.height>=39&&field.shellHeight>=43);}else{assert.equal(field.radius,'8px');assert.ok(field.height>=43);}}
}
async function main(){
  const output=path.resolve(__dirname,'../.screenshots/workspace-dialogs');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});let total=0;
  try{for(const width of [1440,390,320])for(const item of cases){
    if(width===320&&!['product','chat'].includes(item.id))continue;
    const f=await isolatedContext(browser,width,false,false,{fixtures});
    // Provider artwork is a local fixture too: no CDN request or provider API call.
    await f.context.route('https://static.tildacdn.com/tild3738-3931-4064-a232-376134356330/CDEK_logo.png',route=>{
      assert.equal(route.request().headers().authorization,undefined);
      return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#f1f7f3"/><text x="10" y="27" fill="#27865b" font-size="23">CDEK</text></svg>'});
    });
    try{
      await f.page.goto('http://127.0.0.1:3001'+item.route,{waitUntil:'domcontentloaded'});await f.page.locator('.workspace-frame h1').first().waitFor();
      await item.open(f.page);const panel=f.page.locator(item.panel).first();await audit(panel,width);
      await auditTypography(f.page);
      if(item.id==='category'){
        const body=panel.locator('.cs-category-body');assert.ok(await body.isVisible());
        assert.ok(await body.evaluate(el=>getComputedStyle(el).overflowY==='auto'&&el.clientHeight>100));
        const padding=await body.locator('.cs-category-section').first().evaluate(el=>el.getBoundingClientRect().left-el.closest('.cs-edit-panel').getBoundingClientRect().left);
        assert.ok(padding>=15,'Category cards have horizontal gutters');
        assert.equal(await body.locator('.cs-category-section').count(),3);
        if(width===1440){const names=await body.locator('.cs-category-fields>label').evaluateAll(els=>els.slice(0,2).map(el=>el.getBoundingClientRect().top));assert.ok(Math.abs(names[0]-names[1])<=2,'Name and slug share a row');}
        assert.ok(await panel.locator('footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+2));
      }
      if(item.id==='product'){
        const cards=await panel.locator('.category-box').evaluateAll(elements=>elements.map(el=>{
          const card=el.getBoundingClientRect(),heading=el.querySelector('legend').getBoundingClientRect();
          return {title:el.querySelector('legend').textContent,top:heading.top-card.top,left:heading.left-card.left,right:card.right-heading.right,bottom:card.bottom-heading.bottom};
        }));
        assert.ok(cards.length>=2);
        for(const card of cards)assert.ok(card.top>=10&&card.left>=10&&card.right>=10&&card.bottom>=10,'Heading stays inside card: '+JSON.stringify(card));
        const published=await panel.locator('label.published').evaluate(el=>{
          const input=el.querySelector('input').getBoundingClientRect(),range=document.createRange();
          const text=[...el.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());range.selectNodeContents(text);const label=range.getBoundingClientRect();
          return {delta:Math.abs((input.top+input.bottom-label.top-label.bottom)/2),gap:label.left-input.right};
        });
        assert.ok(published.delta<=3&&published.gap>=5,'Published checkbox and text share one row: '+JSON.stringify(published));
        assert.equal(await panel.evaluate(el=>getComputedStyle(el).overflowY),'hidden');
        assert.ok(await panel.locator('.editor-scroll').evaluate(el=>el.clientHeight>100));
        assert.ok(await panel.locator('.editor-footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+2));
        assert.equal(await panel.getByRole('tab',{name:'Основное',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 237, 247)');
        const save=panel.getByRole('button',{name:'Сохранить',exact:true});await save.hover();await save.evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});assert.equal(await save.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(52, 53, 60)');
      }
      if(item.id==='chat'){
        await panel.locator('.message').first().waitFor();
        assert.equal(await panel.getByLabel('Сообщение',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize),'14px');
        if(width<800){
          await panel.getByRole('button',{name:'Показать каналы',exact:true}).click();assert.ok(await panel.locator('.channels nav b').first().isVisible());assert.equal(await panel.locator('.conversation').isVisible(),false);
          await panel.locator('.channels nav>button').first().click();assert.ok(await panel.locator('.conversation').isVisible());
        }
      }
      await f.page.screenshot({path:path.join(output,width+'-'+item.id+'.png'),fullPage:false});
      if(item.id==='chat'){
        if(width<800)await panel.getByRole('button',{name:'Показать каналы',exact:true}).click();
        await panel.getByRole('button',{name:'Создать канал',exact:true}).click();const create=f.page.getByRole('dialog',{name:'Создать обсуждение',exact:true});await audit(create,width);
        await auditTypography(f.page);
        await create.getByRole('button',{name:'Закрыть создание канала'}).click();await panel.getByRole('button',{name:'Закрыть чат',exact:true}).click();await panel.waitFor({state:'hidden'});
      }
      for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors,[]);
      total++;console.log(width+' '+item.id+': PASS');
    }catch(error){await f.page.screenshot({path:path.join(output,width+'-'+item.id+'-failure.png'),fullPage:false});throw new Error(width+' '+item.id+': '+error.message);}finally{await f.context.close();}
  }}finally{await browser.close();}
  console.log(total+' isolated rendered dialog scenarios PASS. Actual API writes: 0.');
}
module.exports={fixtures,cases};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
