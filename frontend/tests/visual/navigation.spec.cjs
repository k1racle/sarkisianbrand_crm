/* Fixture-only navigation regression: no real sessions, mutations or provider calls. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
const { auditTypography } = require('../../scripts/workspace-typography-audit.cjs');
const fixtures = new Map([
  ['/b2b/profile', { id: 'qa-company', name: 'Тестовый салон', membership: { role: 'OWNER', canOrder: true, canSeeFinance: true }, members: [] }],
  ['/b2b/dashboard', { clients: 0, bookingsToday: 0, upcoming: 0, serviceRevenueMonth: 0, purchasesMonth: 0, recentOrders: [], nextBookings: [] }],
  ['/b2b/booking-settings', { timeZone:'Europe/Moscow',enabled:false }],
  ...['clients', 'services', 'bookings', 'catalog', 'orders', 'support'].map(id => ['/b2b/' + id, []]),
]);

for(const width of [1440,390])test(`B2B and admin use identical typography for matching interface roles ${width}`,async({browser},info)=>{
  const samples=[];
  const style=el=>{const s=getComputedStyle(el);return {family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,spacing:s.letterSpacing,color:s.color};};
  for(const b2b of [false,true]){
    const f=await isolatedContext(browser,width,false,false,{b2b,fixtures,...(b2b?{actor:{id:'qa-b2b',firstName:'Партнёр',email:'qa@example.invalid',role:'CUSTOMER_B2B'}}:{})});
    try{
      await f.page.goto(b2b?'/b2b?section=calendar':'/admin-workspace/products');
      await f.page.locator(b2b?'.salon-calendar':'.products-table').waitFor();await f.page.evaluate(()=>document.fonts.ready);
      samples.push({heading:await f.page.locator('h1').first().evaluate(style),switcher:await f.page.getByLabel(b2b?'Рабочее пространство бизнеса':'Выбрать рабочее пространство',{exact:true}).evaluate(style),button:await f.page.getByRole('button',{name:'Обновить',exact:true}).evaluate(style),input:await f.page.locator(b2b?'.salon-calendar-tools input':'.cs-product-search input').evaluate(style)});
      if(b2b)expect(await f.page.getByLabel('Рабочее пространство бизнеса',{exact:true}).evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(150);
      if(width<800)await f.page.getByRole('button',{name:b2b?'Открыть меню кабинета':'Открыть разделы',exact:true}).click();
      const rail=f.page.locator(b2b?'.b2b-rail':'.studio-rail');
      samples.at(-1).navigation=await rail.locator('nav a > span').first().evaluate(style);
      samples.at(-1).profileName=await rail.locator(b2b?'.person b':'.rail-user strong').evaluate(style);
      samples.at(-1).profileCaption=await rail.locator(b2b?'.person small':'.rail-user small').evaluate(style);
      const navStyles=await rail.locator('nav a > span,nav .wn-group-toggle > span').evaluateAll(els=>els.map(el=>({text:el.textContent,size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight,expected:el.closest('.wn-group-items')?'400':'600'})));
      for(const label of navStyles){expect(label.size,label.text).toBe('14px');expect(label.weight,label.text).toBe(label.expected);}
      await auditTypography(f.page,'.workspace-frame,.studio-rail,.b2b-frame,.b2b-rail,.ui-mobile-dock');
      await info.attach(b2b?'b2b-shared-typography':'admin-shared-typography',{body:await f.page.screenshot(),contentType:'image/png'});
      expect(f.errors).toEqual([]);
    }finally{await f.context.close();}
  }
  expect(samples[1]).toEqual(samples[0]);
});

test('B2B rail collapses, expands the content and persists without hiding mobile labels',async({browser},info)=>{
  const f=await isolatedContext(browser,1440,false,false,{b2b:true,preserveLayoutPreference:true,fixtures,actor:{id:'qa-b2b',firstName:'Партнёр',email:'qa@example.invalid',role:'CUSTOMER_B2B'}});
  try{
    await f.page.goto('/b2b');const rail=f.page.locator('.b2b-rail'),toolbar=f.page.locator('.business-toolbar');
    await rail.getByRole('button',{name:'Свернуть боковую панель',exact:true}).click();
    await expect(rail).toHaveClass(/b2b-rail--collapsed/);
    expect(await rail.evaluate(el=>el.getBoundingClientRect().width)).toBe(76);
    expect(await toolbar.evaluate(el=>el.getBoundingClientRect().left)).toBe(76);
    await expect(rail.locator('nav a > span').first()).toBeHidden();
    await rail.getByRole('link',{name:'Мои клиенты',exact:true}).click();await expect(f.page.locator('.portal h1')).toHaveText('Мои клиенты');
    await f.page.reload();await expect(rail).toHaveClass(/b2b-rail--collapsed/);
    await info.attach('b2b-collapsed-rail',{body:await f.page.screenshot(),contentType:'image/png'});
    await f.page.setViewportSize({width:390,height:900});await expect(rail).toBeHidden();
    await f.page.getByRole('button',{name:'Открыть меню кабинета',exact:true}).click();await expect(rail).toBeVisible();
    await expect(rail.locator('nav a > span').first()).toBeVisible();await expect(rail.getByRole('button',{name:'Развернуть боковую панель',exact:true})).toBeHidden();
    await f.page.keyboard.press('Escape');await f.page.setViewportSize({width:1440,height:900});
    await rail.getByRole('button',{name:'Развернуть боковую панель',exact:true}).click();
    expect(await rail.evaluate(el=>el.getBoundingClientRect().width)).toBe(250);expect(await toolbar.evaluate(el=>el.getBoundingClientRect().left)).toBe(250);
    await expect(rail.locator('nav a > span').first()).toBeVisible();
    for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])expect(f.traffic[key]).toEqual([]);
    expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

for(const width of [1440,320])for(const b2b of [false,true]){
  test(`Shared profile has no password key and compact notification action ${b2b?'B2B':'admin'} ${width}`,async({browser},info)=>{
    const f=await isolatedContext(browser,width,false,false,{b2b,fixtures,...(b2b?{actor:{id:'qa-b2b',firstName:'Партнёр',email:'qa@example.invalid',role:'CUSTOMER_B2B'}}:{})});
    try{
      await f.page.goto(b2b?'/b2b':'/admin-workspace/dashboard');await f.page.locator(b2b?'.portal .body':'.workspace-frame h1').waitFor();
      if(width<800){
        if(b2b){await f.page.locator('.b2b-mobile-dock').getByRole('button',{name:'Открыть меню кабинета'}).click();await f.page.locator('.b2b-rail .person').click();}
        else await f.page.locator('.ui-mobile-dock').getByRole('button',{name:'Открыть профиль',exact:true}).click();
      }else await f.page.locator(b2b?'.b2b-rail .person':'.studio-rail .rail-user').click();
      const drawer=f.page.locator('.profile-drawer');await expect(drawer.getByRole('heading',{name:'Мой профиль'})).toBeVisible();
      await drawer.getByRole('button',{name:'Безопасность',exact:true}).click();
      const passwordSection=drawer.locator('.profile-section').filter({has:f.page.getByRole('heading',{name:'Смена пароля',exact:true})});
      await expect(passwordSection.locator('.section-title>svg')).toHaveCount(0);await expect(passwordSection.locator('input[type=password]')).toHaveCount(3);
      await drawer.getByRole('button',{name:'Уведомления',exact:true}).click();const save=drawer.getByRole('button',{name:'Сохранить уведомления',exact:true});
      await expect(save).toBeVisible();expect(await save.evaluate(el=>({height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius}))).toEqual({height:44,radius:'8px'});
      const layout=await drawer.locator('.section-title').filter({hasText:'Каналы уведомлений'}).evaluate(el=>({textTop:el.querySelector('div').getBoundingClientRect().top,iconTop:el.querySelector('svg').getBoundingClientRect().top,gap:el.parentElement.querySelector('.notification-list').getBoundingClientRect().top-el.getBoundingClientRect().bottom}));
      expect(Math.abs(layout.textTop-layout.iconTop)).toBeLessThan(6);expect(layout.gap).toBeLessThanOrEqual(40);
      await info.attach('profile-notifications',{body:await f.page.screenshot(),contentType:'image/png'});await auditTypography(f.page,'.profile-drawer');
      for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])expect(f.traffic[key]).toEqual([]);expect(f.errors).toEqual([]);
    }finally{await f.context.close();}
  });
}

for (const width of [1440, 390, 320]) for (const b2b of [false, true]) {
  test(`Application navigation ${b2b ? 'B2B' : 'admin'} ${width}`, async ({ browser }, testInfo) => {
    const f = await isolatedContext(browser, width, false, false, {
      b2b, fixtures, ...(b2b ? { actor: { id: 'qa-b2b', firstName: 'Партнёр', email: 'qa@example.invalid', role: 'CUSTOMER_B2B' } } : {}),
    });
    const rail = f.page.locator(b2b ? '.b2b-rail' : '.studio-rail');
    const dock = f.page.locator('.ui-mobile-dock');
    try {
      await f.page.goto(`http://127.0.0.1:3001/${b2b ? 'b2b' : 'admin-workspace/dashboard'}`);
      await f.page.locator(b2b ? '.portal .body' : '.workspace-frame h1').waitFor();
      await f.page.evaluate(() => document.fonts.ready);
      if (!b2b) {
        const select = f.page.getByLabel('Выбрать рабочее пространство', { exact: true });
        await expect(select).toBeVisible();
        expect(await rail.locator('select').count()).toBe(0);
        expect(await select.evaluate(el => el.closest('.wn-toolbar') !== null)).toBe(true);
        expect(await select.evaluate(el => Boolean(el.closest('.workspace-area-switch').compareDocumentPosition(document.querySelector('.wn-breadcrumbs')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
        expect(await select.locator('option').allTextContents()).toEqual(['CRM', 'Маркетплейсы', 'Сайт', 'Поддержка', 'Управление']);
      }
      if (width <= 800) {
        await expect(rail).toBeHidden();
        await expect(dock).toBeVisible();
        expect(await dock.locator(':scope > a, :scope > button').count()).toBe(5);
        expect(await dock.evaluate(el => {
          const box = el.getBoundingClientRect();
          return getComputedStyle(el).position === 'fixed' && box.bottom < innerHeight && box.top > innerHeight - 110 && box.left >= 8 && box.right <= innerWidth - 8 && [...el.children].every(child => child.scrollWidth <= child.clientWidth + 1);
        })).toBe(true);
        const trigger = f.page.getByRole('button', { name: b2b ? 'Открыть меню кабинета' : 'Открыть разделы', exact: true });
        await trigger.click();
        await expect(rail).toBeVisible();
        expect(await f.page.evaluate(() => document.body.style.overflow)).toBe('hidden');
        expect(await rail.getAttribute('aria-modal')).toBe('true');
        const close = rail.getByRole('button', { name: b2b ? 'Закрыть меню кабинета' : 'Закрыть разделы', exact: true });
        await expect(close).toBeFocused();
        await rail.evaluate(el => [...el.querySelectorAll('a[href],button:not(:disabled)')].filter(child => child.getClientRects().length)[0].focus());
        await f.page.keyboard.press('Shift+Tab');
        expect(await rail.evaluate(el => document.activeElement === [...el.querySelectorAll('a[href],button:not(:disabled)')].filter(child => child.getClientRects().length).at(-1))).toBe(true);
        await f.page.keyboard.press('Escape');
        await expect(rail).toBeHidden();
        await expect(trigger).toBeFocused();
        expect(await f.page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await trigger.click();
      } else await expect(dock).toBeHidden();
      const styles = await rail.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, color: getComputedStyle(el).color }));
      expect(styles.background).toContain('radial-gradient');
      expect(styles.background).toContain('linear-gradient(145deg');
      expect(styles.color).toBe('rgb(255, 255, 255)');
      const logo = rail.locator(b2b ? '.brand img' : '.console-rail-brand img');
      await expect(logo).toBeVisible();
      expect(await logo.evaluate(el => getComputedStyle(el).filter)).toBe('brightness(0) invert(1)');
      for (const link of await rail.locator('nav a').all()) expect(await link.evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
      await auditTypography(f.page, '.workspace-frame,.studio-rail,.b2b-frame,.b2b-rail,.ui-mobile-dock');
      await testInfo.attach('rail', { body: await f.page.screenshot({ fullPage: true }), contentType: 'image/png' });
      if (width <= 800) {
        await rail.locator('nav a').first().click();
        await expect(rail).toBeHidden();
        expect(await f.page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await testInfo.attach('dock', { body: await f.page.screenshot({ fullPage: true }), contentType: 'image/png' });
        if (b2b) {
          for (const section of ['services', 'clients', 'calendar', 'dashboard']) {
            await dock.locator(`a[href="${section === 'dashboard' ? '/b2b' : '/b2b?section=' + section}"]`).click();
            await expect(f.page).toHaveURL(url => (url.searchParams.get('section') || 'dashboard') === section);
            await expect(dock.locator('a.active')).toHaveCount(1);
            expect(new URL(f.page.url()).searchParams.get('section') || 'dashboard').toBe(section);
          }
        } else {
          await dock.getByRole('button', { name: 'Найти раздел', exact: true }).click();
          await expect(f.page.getByRole('dialog', { name: 'Перейти в раздел' })).toBeVisible();
          await f.page.getByRole('button', { name: 'Закрыть поиск разделов', exact: true }).click();
          await expect(dock.getByRole('button', { name: 'Найти раздел', exact: true })).toBeFocused();
        }
      } else if (!b2b) {
        await f.page.getByRole('button', { name: 'Свернуть боковую панель', exact: true }).click();
        await expect(f.page.getByLabel('Выбрать рабочее пространство', { exact: true })).toBeVisible();
        expect(await rail.evaluate(el => getComputedStyle(el).backgroundImage)).toBe(styles.background);
      }
      expect(await f.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
      for (const key of ['unknownReads', 'externalRequests', 'prohibitedWrites', 'credentialLeaks']) expect(f.traffic[key]).toEqual([]);
      expect(f.errors).toEqual([]);
    } finally { await f.context.close(); }
  });
}
