const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
const dashboard={orders:12,paidOrders:4,products:12,period:{days:7},sales:{revenue:18000,orders:6,paidOrders:4,averageOrder:4500},queue:{NEW:2,CONFIRMED:1,ASSEMBLING:3,PAYMENT_WAITING:1},issues:{missingImages:2,uncategorized:1,outOfStock:3,lowStock:4,syncErrors:1},recentOrders:[{id:'qa-order',orderNumber:'QA-WEB-001',createdAt:'2026-09-17T09:00:00Z',finalAmount:4500,status:'NEW',paymentStatus:'PENDING'}],trend:Array.from({length:7},(_,i)=>({day:`2026-09-${11+i}`,revenue:i===6?18000:0,orders:i===6?4:0}))};

for(const width of [1440,390])test(`Gift product and denominations are separate cards ${width}`,async({browser},testInfo)=>{
  const f=await isolatedContext(browser,width,false);
  try{
    await f.page.goto('/admin-workspace/gift-cards');
    await expect(f.page.getByRole('heading',{name:'Подарочные карты',exact:true})).toHaveCount(1);
    await expect(f.page.locator('.sb-gift-hero')).toHaveCount(0);
    await expect(f.page.getByRole('button',{name:'Обновить',exact:true})).toHaveCount(1);
    const form=f.page.locator('.sb-gift-product-form');
    await expect(form.locator('.sb-gift-product-block')).toBeVisible();
    await expect(form.locator('.sb-gift-denomination-block')).toBeVisible();
    expect(await form.locator('.sb-gift-denomination-block').evaluate(el=>el.parentElement.classList.contains('sb-gift-product-form'))).toBe(true);
    await expect(form.getByRole('button',{name:'Сохранить настройки',exact:true})).toHaveCount(1);
    const before=f.traffic.mockedReads.filter(x=>x==='/gift-cards/product').length;
    await f.page.getByRole('button',{name:'Обновить',exact:true}).click();
    await expect.poll(()=>f.traffic.mockedReads.filter(x=>x==='/gift-cards/product').length).toBeGreaterThan(before);
    await expect(form.locator('.sb-gift-denomination')).toHaveCount(3);
    await form.getByRole('button',{name:'Добавить номинал',exact:true}).click();
    await expect(form.locator('.sb-gift-denomination')).toHaveCount(4);
    await form.getByLabel('Убрать номинал 4',{exact:true}).click();
    await expect(form.locator('.sb-gift-denomination')).toHaveCount(3);
    await f.page.getByRole('button',{name:'Выданные карты',exact:true}).click();
    await expect(f.page.locator('.sb-gift-table')).toBeVisible();
    await f.page.getByRole('button',{name:'Товар и номиналы',exact:true}).click();
    await expect(form.locator('.sb-gift-denomination-block')).toBeVisible();
    await testInfo.attach('gift-settings',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
    expect(await f.page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
    for(const k of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])expect(f.traffic[k]).toEqual([]);
    expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

for(const width of [1440,390]) test(`Useful store overview and navigation ${width}`,async({browser},testInfo)=>{
  const f=await isolatedContext(browser,width,false,false,{fixtures:new Map([['/admin/dashboard',dashboard]])});
  const requests=[];f.page.on('request',r=>{if(r.url().includes('/api/v1/admin/dashboard'))requests.push(new URL(r.url()).searchParams.get('days'));});
  try{
    await f.page.goto('/admin-workspace/dashboard');
    await expect(f.page.getByRole('heading',{name:'Обзор магазина',exact:true})).toBeVisible();
    await expect(f.page.locator('.studio-rail .wn-group-items')).toHaveCount(0);
    await expect(f.page.locator('.welcome')).toHaveCount(0);
    await expect(f.page.locator('.sd-metric--primary')).toContainText('18');
    await expect(f.page.getByRole('heading',{name:'Последние заказы'})).toBeVisible();
    await expect(f.page.locator('.sd-chart-column')).toHaveCount(7);
    await expect(f.page.locator('.sd-warning')).toContainText('1');
    await f.page.getByLabel('Период обзора').selectOption('7');
    await expect.poll(()=>requests.includes('7')).toBe(true);
    expect(await f.page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
    await testInfo.attach('store-overview',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
    await f.page.locator('.sd-queue').getByRole('button',{name:/Новые/}).click();
    await expect(f.page).toHaveURL(/orders\?status=NEW$/);
    await expect(f.page.getByLabel('Статус заказа')).toHaveValue('NEW');
    await expect(f.page.locator('.studio-rail .wn-group-items')).toHaveCount(1);
    await expect(f.page.locator('#wn-group-sales')).toHaveCount(1);
    await f.page.goto('/admin-workspace/dashboard');
    await f.page.locator('.sd-queue').getByRole('button',{name:/Ожидают оплаты/}).click();
    await expect(f.page.getByLabel('Статус заказа')).toHaveValue('PAYMENT_WAITING');
    await f.page.goto('/admin-workspace/dashboard');
    await f.page.locator('.sd-recent').getByRole('button').click();
    await expect(f.page).toHaveURL(/orders\?q=QA-WEB-001$/);
    await expect(f.page.getByLabel('Поиск заказов')).toHaveValue('QA-WEB-001');
    for(const k of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])expect(f.traffic[k]).toEqual([]);
    expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

for(const section of ['categories','product-badges'])test(`Catalog ${section} actions share header`,async({browser})=>{
  const f=await isolatedContext(browser,1440,false);
  try{
    await f.page.goto(`/admin-workspace/${section}`);
    const name=section==='categories'?'Добавить категорию':'Добавить бейдж';
    const button=f.page.getByRole('button',{name,exact:true});
    await expect(button).toBeEnabled();
    expect(await button.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    expect(await button.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(32, 33, 39)');
    expect(await button.evaluate(el=>!!el.closest('.site-admin-header .header-actions'))).toBe(true);
    await expect(f.page.locator('.catalog-settings-intro')).toHaveCount(0);
    const before=f.traffic.mockedReads.filter(x=>x===`/admin/catalog/${section==='categories'?'categories':'badges'}`).length;
    await f.page.locator('.site-admin-header').getByRole('button',{name:'Обновить',exact:true}).click();
    await expect.poll(()=>f.traffic.mockedReads.filter(x=>x===`/admin/catalog/${section==='categories'?'categories':'badges'}`).length).toBeGreaterThan(before);
    await expect(button).toBeEnabled();await button.click();
    if(section==='categories')await expect(f.page.getByRole('dialog')).toBeVisible();else await expect(f.page.locator('.cs-badge-row')).toHaveCount(4);
    for(const k of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])expect(f.traffic[k]).toEqual([]);
    expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

for(const width of [1440,390])test(`Workspace selector and redesigned section search ${width}`,async({browser},testInfo)=>{
  const f=await isolatedContext(browser,width,false);
  try{
    await f.page.goto('/admin-workspace/products');
    const selector=f.page.getByLabel('Выбрать рабочее пространство');
    expect(await selector.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    expect(await selector.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('gradient');
    const filters=f.page.locator('.cs-product-filters');
    expect(await filters.evaluate(el=>parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThanOrEqual(16);
    if(width===1440){
      const toggle=f.page.locator('.studio-rail').getByRole('button',{name:'Каталог',exact:true});
      await expect(toggle).toHaveAttribute('aria-expanded','true');
      await expect(f.page.locator('.studio-rail .wn-group-items')).toHaveCount(1);
      await expect(f.page.locator('#wn-group-catalog')).toBeVisible();
      await toggle.click();await expect(f.page.locator('#wn-group-catalog')).toHaveCount(0);
      await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
    }
    if(width<=800)await f.page.locator('.ui-mobile-dock').getByRole('button',{name:'Найти раздел',exact:true}).click();else await f.page.locator('.wn-command-trigger').click();
    const dialog=f.page.getByRole('dialog');await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('12px');
    await expect(f.page.getByRole('searchbox',{name:'Поиск разделов',exact:true})).toBeFocused();
    await f.page.getByRole('searchbox',{name:'Поиск разделов',exact:true}).fill('категории');
    expect(await f.page.evaluate(()=>document.documentElement.style.overflow)).toBe('hidden');
    await expect(dialog.locator('a[href="/admin-workspace/categories"]')).toHaveCount(1);
    await testInfo.attach('section-search',{body:await f.page.screenshot(),contentType:'image/png'});
    await f.page.getByRole('searchbox',{name:'Поиск разделов',exact:true}).press('Escape');await expect(dialog).toHaveCount(0);
    expect(await f.page.evaluate(()=>document.documentElement.style.overflow)).not.toBe('hidden');
    expect(await f.page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
    expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});
