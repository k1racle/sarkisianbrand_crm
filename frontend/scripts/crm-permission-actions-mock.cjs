// Render actual pages with synthetic grants. All API traffic stays mocked.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {chromium}=require('playwright-core'), {isolatedContext}=require('./admin-design-mock.cjs'), {fixtures:base}=require('./crm-rich-fixtures.cjs');
const origin=new URL(process.env.ADMIN_DESIGN_URL||'http://127.0.0.1:3001').origin;
const output=path.resolve(__dirname,'../.screenshots/permission-actions');
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(require('./crm-test-browser.cjs'));const checks=[];
 try{for(const width of [1440,390]) for(const mode of ['executive','read-only','issued-only','marketing-write']){
  const permissions=mode==='executive'?['crm.read','crm.write']:mode==='issued-only'?['gift_cards.read']:['promotions.read','gift_card_product.read','gift_cards.read',...(mode==='marketing-write'?['promotions.write','gift_card_product.write','gift_cards.write']:[])];
  const fixtures=new Map(base);fixtures.set('/auth/access',{role:mode==='executive'?'EXECUTIVE':'ADMIN',permissions,denied:[]});
  fixtures.set('/staff-notifications',{items:[],fresh:[],unreadCount:0,nextCursor:null,through:new Date().toISOString(),popupsEnabled:false});
  fixtures.set('/crm/drive',{items:[],total:0,crumbs:[],used:0,quota:1024**3});
  fixtures.set('/promotions',{items:[{code:'QA',title:'QA акция',discountType:'PERCENT',amount:10,isActive:true,revision:1}],total:1});
  fixtures.set('/gift-cards/product',{nameRu:'Подарочная карта',descriptionRu:'QA',denominations:[1000],validityDays:365,isActive:true,imageUrl:''});
  const card={id:'qa-card',maskedCode:'•••• 1234',faceValue:1000,balance:1000,reserved:0,issuedAt:'2026-10-01T12:00:00Z',expiresAt:'2027-10-01T12:00:00Z',isActive:true,revision:1};
  fixtures.set('/gift-cards',{items:[card],total:1});fixtures.set('/gift-cards/qa-card/history',{card,items:[],total:0,page:1,limit:30});
  const f=await isolatedContext(browser,width,false,false,{fixtures,actor:{role:mode==='executive'?'EXECUTIVE':'ADMIN'}});
  try{const p=f.page;
   if(mode==='executive'){
    await p.goto(origin+'/crm/files',{waitUntil:'networkidle'});
    assert(await p.getByRole('button',{name:'Загрузить файлы',exact:true}).isEnabled());
    assert(await p.getByRole('button',{name:'Новая папка',exact:true}).isEnabled());
   }else{
    if(mode!=='issued-only'){
     await p.goto(origin+'/crm/promotions',{waitUntil:'networkidle'});
     await p.getByText('QA акция',{exact:true}).waitFor();
     assert.equal(await p.getByRole('button',{name:'Новый промокод',exact:true}).count(),mode==='marketing-write'?1:0);
     assert.equal(await p.locator('.sb-promo-row-actions').count(),mode==='marketing-write'?1:0);
    }
    await p.goto(origin+'/crm/gift-cards',{waitUntil:'networkidle'});
    if(mode!=='issued-only'){
     const field=p.locator('input[name="gift-name"]');await field.waitFor();
     assert.equal(await field.isEnabled(),mode==='marketing-write');
     await p.getByRole('button',{name:'Выданные карты',exact:true}).click();
    }else assert.equal(await p.getByRole('button',{name:'Оформление',exact:true}).count(),0);
    await p.getByText(card.maskedCode,{exact:true}).waitFor();
    assert.equal(await p.getByRole('button',{name:'Выдать карту',exact:true}).count(),mode==='marketing-write'?1:0);
    assert.equal(await p.getByRole('button',{name:/Открыть код карты/}).count(),mode==='marketing-write'?1:0);
    await p.getByRole('button',{name:/История карты/}).click();
    await p.getByRole('dialog').waitFor();
   }
   await p.screenshot({path:path.join(output,`${mode}-${width}.png`)});
   for(const key of ['prohibitedWrites','unknownReads','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   assert.deepEqual(f.errors,[]);checks.push(`${mode} ${width}`);
  }catch(e){console.error(JSON.stringify({mode,width,traffic:f.traffic,errors:f.errors}));throw e;}finally{await f.context.close();}
 }}finally{await browser.close();}
 console.log('Permission actions UI PASS:',checks.join(', '));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
