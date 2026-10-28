const {test,expect}=require('@playwright/test');
const {isolatedContext}=require('../../scripts/admin-design-mock.cjs');
const {auditTypography}=require('../../scripts/workspace-typography-audit.cjs');
for(const width of [1440,320])test(`Admin salon subscription settings and consistent controls ${width}`,async({browser},info)=>{
 const f=await isolatedContext(browser,width,false,false,{fixtures:new Map([['/admin/salon-subscription',{name:'Кабинет салона',monthlyPrice:'1500',annualPrice:'15000',freeAccess:true}]])});try{
  await f.page.goto('/system-settings/salon-subscription');await expect(f.page.getByRole('heading',{name:'Подписка для салонов',exact:true})).toBeVisible();await expect(f.page.getByLabel('Цена за месяц, ₽',{exact:true})).toHaveValue('1500');await expect(f.page.getByLabel('Бесплатный режим тарифа',{exact:true})).toBeChecked();await expect(f.page.getByRole('button',{name:'Сохранить тариф'})).toBeDisabled();await f.page.getByLabel('Цена за месяц, ₽',{exact:true}).fill('1900');await expect(f.page.getByRole('button',{name:'Сохранить тариф'})).toBeEnabled();await expect(f.page.locator('form')).toContainText('блокировка доступа не активированы');
  // CRM uses compact 36px controls on desktop and 44px touch targets on mobile.
  // Inputs and buttons intentionally have their own shared radius tokens.
  const controls=await f.page.locator('.salon-subscription-page input:not([type=checkbox]),.salon-subscription-page button').evaluateAll(els=>els.map(el=>{const css=getComputedStyle(el),button=el.tagName==='BUTTON';return {button,hasSharedClass:el.classList.contains(button?'crm-button':'crm-input'),height:el.getBoundingClientRect().height,radius:css.borderRadius,heightToken:css.getPropertyValue('--crm-control-height').trim(),radiusToken:css.getPropertyValue(button?'--crm-control-radius':'--crm-field-radius').trim()}}));
  expect(controls.some(control=>control.button)).toBe(true);expect(controls.some(control=>!control.button)).toBe(true);
  for(const control of controls){const height=width===320?44:36,radius=control.button?'8px':'7px';expect(control).toMatchObject({hasSharedClass:true,height,heightToken:height+'px',radius,radiusToken:radius});}
  expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);await auditTypography(f.page);await info.attach('salon-subscription',{body:await f.page.screenshot(),contentType:'image/png'});expect(f.errors).toEqual([]);expect(f.traffic.prohibitedWrites).toEqual([]);expect(f.traffic.unknownReads).toEqual([]);
 }finally{await f.context.close();}
});
