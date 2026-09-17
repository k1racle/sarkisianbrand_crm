const {test,expect}=require('@playwright/test');
const {isolatedContext}=require('../../scripts/admin-design-mock.cjs');
const {auditTypography}=require('../../scripts/workspace-typography-audit.cjs');
const date='2026-09-17T12:00:00Z';
const member={id:'qa-member',role:'OWNER',canOrder:true,canSeeFinance:true,user:{id:'qa-b2b',firstName:'Партнёр',lastName:'Проверка'}};
const profile={id:'qa-organization',name:'Тестовая организация',status:'ACTIVE',discountTier:10,membership:member,members:[member]};
const client={id:'qa-client',firstName:'Тестовый',lastName:'Клиент',phone:'+70000000000',status:'ACTIVE',tags:[],totalVisits:1,totalSpent:1000};
const service={id:'qa-service',name:'Маникюр',duration:60,price:1000,color:'#77709e',isActive:true};
const order={id:'qa-b2b-order',orderNumber:'SB-B2B-QA',status:'NEW',finalAmount:780,createdAt:date,items:[{id:'qa-line',productName:'Тестовый гель',quantity:1,price:780,total:780}],history:[]};
const fixtures=new Map([
 ['/b2b/profile',profile],['/b2b/dashboard',{clients:1,bookingsToday:1,upcoming:1,serviceRevenueMonth:1000,purchasesMonth:780,purchaseOrdersMonth:1,recentOrders:[order],nextBookings:[],lowStock:0}],
 ['/b2b/clients',[client]],['/b2b/services',[service]],['/b2b/bookings',[{id:'qa-booking',startTime:date,endTime:date,status:'CONFIRMED',client,service,masterMember:member}]],
 ['/b2b/catalog',[{id:'qa-product',sku:'QA-001',nameRu:'Гель-мусс',images:[{url:'/storefront/products/gel-mousse-23.jpg'}],variants:[{id:'qa-variant',b2bPrice:780,retailPrice:850,available:10}]}]],
 ['/b2b/orders',[order]],['/b2b/support',[{id:'qa-ticket',number:'HD-QA',subject:'Вопрос партнёра',status:'WAITING_REQUESTER',priority:'MEDIUM',createdAt:date}]],
]);
async function verify(f,width,testInfo){
 await f.page.evaluate(()=>document.fonts.ready);
 await auditTypography(f.page,'.b2b-frame,.b2b-rail,.admin-dialog,.b2b-login');
 expect(await f.page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
 expect(f.traffic.unknownReads).toEqual([]);expect(f.traffic.prohibitedWrites).toEqual([]);
 expect(f.traffic.externalRequests).toEqual([]);expect(f.traffic.credentialLeaks).toEqual([]);expect(f.errors).toEqual([]);
 await testInfo.attach('visual',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
}
for(const width of [1440,390,320])for(const section of ['dashboard','calendar','clients','services','catalog','orders','team','support']){
 test(`B2B ${section} ${width}`,async({browser},testInfo)=>{
  const f=await isolatedContext(browser,width,false,false,{b2b:true,fixtures,actor:{...member.user,email:'qa-b2b@example.invalid',role:'CUSTOMER_B2B'}});
  try{
   await f.page.goto(`http://127.0.0.1:3001/b2b?section=${section}`);await f.page.locator('.portal .body').waitFor();
   for(const label of await f.page.locator(':is(.hero,.team-head,.support-intro) p').all())expect(await label.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(196, 196, 204)');
   if(section==='catalog')expect(await f.page.locator('.product-image img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   if(section==='calendar'){await f.page.getByRole('button',{name:'Неделя',exact:true}).click();await expect(f.page.getByRole('button',{name:'Неделя',exact:true})).toHaveAttribute('aria-pressed','true');await f.page.locator('.portal .body').waitFor();}
   await verify(f,width,testInfo);
  }finally{await f.context.close();}
 });
}
for(const width of [1440,390])for(const section of ['clients','services','calendar','support']){
 test(`B2B modal ${section} ${width}`,async({browser},testInfo)=>{
  const f=await isolatedContext(browser,width,false,false,{b2b:true,fixtures,actor:{...member.user,email:'qa-b2b@example.invalid',role:'CUSTOMER_B2B'}});
  try{
   await f.page.goto(`http://127.0.0.1:3001/b2b?section=${section}`);await f.page.locator('.portal .body').waitFor();
   await f.page.locator('.top-actions .primary').click();await f.page.getByRole('dialog').waitFor();
   const field=f.page.getByRole('dialog').locator('textarea').first();await field.fill('Несохранённые изменения');
   await f.page.keyboard.press('Escape');await expect(f.page.getByRole('dialog')).toBeVisible(); // dismissed confirmation retains draft
   await verify(f,width,testInfo);
  }finally{await f.context.close();}
 });
}
for(const section of ['clients','services'])test(`B2B edit existing ${section}`,async({browser},testInfo)=>{
 const f=await isolatedContext(browser,390,false,false,{b2b:true,fixtures,actor:{...member.user,email:'qa-b2b@example.invalid',role:'CUSTOMER_B2B'}});
 try{
  await f.page.goto(`http://127.0.0.1:3001/b2b?section=${section}`);await f.page.locator('.portal .body').waitFor();
  await f.page.locator('.b2b-edit-link').first().click();await f.page.getByRole('dialog').waitFor();
  await expect(f.page.getByRole('dialog').locator('input').first()).toHaveValue(section==='clients'?client.firstName:service.name);
  await verify(f,390,testInfo);
 }finally{await f.context.close();}
});
test('B2B procurement without purchasing permission is read-only',async({browser},testInfo)=>{
 const readonly=new Map([...fixtures,['/b2b/profile',{...profile,membership:{...member,canOrder:false}}]]);
 const f=await isolatedContext(browser,390,false,false,{b2b:true,fixtures:readonly,actor:{...member.user,email:'qa-b2b@example.invalid',role:'CUSTOMER_B2B'}});
 try{
  await f.page.goto('http://127.0.0.1:3001/b2b?section=catalog');await f.page.locator('.portal .body').waitFor();
  await expect(f.page.locator('.variant button').last()).toBeDisabled();await expect(f.page.locator('.cart-summary footer button')).toBeDisabled();
  await verify(f,390,testInfo);
 }finally{await f.context.close();}
});
test('B2B only the active section can fail; read retry restores the section',async({browser})=>{
 const failures=['/b2b/clients'];const f=await isolatedContext(browser,390,false,false,{b2b:true,fixtures,failures,actor:{...member.user,email:'qa-b2b@example.invalid',role:'CUSTOMER_B2B'}});
 try{
  await f.page.goto('http://127.0.0.1:3001/b2b?section=catalog');await f.page.locator('.portal .body').waitFor();
  expect(f.traffic.mockedReads).not.toContain('/b2b/clients');
  await f.page.goto('http://127.0.0.1:3001/b2b?section=clients');await f.page.locator('.page-error').waitFor();
  failures.length=0;await f.page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();await f.page.locator('.portal .body').waitFor();
  expect(f.traffic.prohibitedWrites).toEqual([]);expect(f.traffic.unknownReads).toEqual([]);expect(f.errors.filter(e=>e.startsWith('page:'))).toEqual([]);
 }finally{await f.context.close();}
});
