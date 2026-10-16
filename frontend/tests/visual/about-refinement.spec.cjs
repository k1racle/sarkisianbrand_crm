/* About page uses the shared editorial design; CMS checks use isolated fixtures. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
const { checkAbout } = require('../../scripts/storefront-about-smoke.cjs');
for (const width of [1512,390,320]) test(`About page design and interactions ${width}`, async ({ browser }, info) => {
  test.setTimeout(120000);
  const output = info.outputPath('about');
  await checkAbout(browser, width, { base: 'http://127.0.0.1:3001', api: 'http://127.0.0.1:3000/api/v1', output });
  await info.attach('about', { path: `${output}/${width}-about.png`, contentType: 'image/png' });
});
test('CMS biography text and gallery survive save without live writes',async({browser})=>{
 const bio={id:'founder',kind:'biography',title:'Светлана Саркисян',body:'Исходная биография',images:['/storefront/svetlana-portrait.png','/storefront/hero.jpg']};
 const about={slug:'about',title:'О бренде',eyebrow:'SARKISIAN',lead:'От мастера — мастерам.',blocks:[bio],revision:1,isActive:true,reviewRequired:false};
 const f=await isolatedContext(browser,1440,false,false,{allowFixtureForms:true,fixtures:new Map([['/admin/storefront/pages',[about]]])}),writes=[];
 await f.context.route('**/api/v1/admin/storefront/pages/about',async route=>{const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Methods':'PATCH,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});const body=route.request().postDataJSON();writes.push(body);return route.fulfill({headers,json:{...about,...body,revision:2}});});
 try{
  await f.page.goto('/admin-workspace/pages');const block=f.page.locator('.sb-cms-block-editor').first();
  await expect(block.getByRole('heading',{name:'Фотографии слайдера'})).toBeVisible();
  await block.locator('textarea').first().fill('Биография — обновлённый текст');
  await block.getByRole('button',{name:'Удалить фотографию 2'}).click();
  await f.page.getByLabel('Личная страница: Telegram',{exact:true}).fill('https://t.me/fixture_founder');
  await f.page.getByRole('button',{name:'Сохранить страницу',exact:true}).click();
  await expect(f.page.getByText('Страница сохранена.',{exact:false})).toBeVisible();
  expect(writes).toHaveLength(1);expect(writes[0].blocks[0]).toMatchObject({kind:'biography',body:'Биография — обновлённый текст',images:['/storefront/svetlana-portrait.png'],socials:{telegram:'https://t.me/fixture_founder'}});
  expect(f.errors).toEqual([]);expect(f.traffic.prohibitedWrites).toEqual([]);
 }finally{await f.context.close();}
});
