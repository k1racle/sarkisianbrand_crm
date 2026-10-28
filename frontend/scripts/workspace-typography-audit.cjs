const assert=require('node:assert/strict');
async function auditTypography(page,rootSelector='.workspace-frame,.studio-rail,.wn-rail-dock,.admin-dialog,.workspace-context,.reminder-center,.workspace-login'){
  await page.evaluate(()=>document.fonts.ready);
  const styles=await page.evaluate(selector=>{
    const entries=[];
    const inspect=el=>{
      if(!el?.closest(selector)||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')return;
      const s=getComputedStyle(el);
      const navigation=el.closest('.studio-rail nav a,.studio-rail .wn-group-toggle,.b2b-rail nav a');
      const businessNavigation=el.closest('.b2b-rail nav a');
      const control=!!el.closest('button,input,select,textarea,label,.eyebrow,.kicker,.crm-button,.ui-mobile-dock');
      const heading=!!el.closest('h1,h2,h3,h4,h5,h6')&&!control;
      const pageHeading=heading&&!el.closest('.admin-dialog')&&!!el.closest('h1,.crm-page-header > div:first-child > h2');
      const metric=!!el.closest('.kpis strong,.kpis b,.business-overview-metrics strong,.partner-kpis strong,.hero-kpis strong');
      const pageSize=document.documentElement.hasAttribute('data-crm-ui')?getComputedStyle(document.documentElement).getPropertyValue('--crm-type-page').trim():document.documentElement.hasAttribute('data-business-ui')?getComputedStyle(document.documentElement).getPropertyValue('--ui-type-page').trim():'';
      const emphasis=!!el.closest('strong,b');
      entries.push({heading,pageHeading,metric,pageSize,control,emphasis,input:el.matches('input,select,textarea'),text:(el.textContent||el.getAttribute('placeholder')||el.getAttribute('aria-label')||el.tagName).trim().slice(0,65),family:s.fontFamily.replace(/["\s]/g,''),size:s.fontSize,weight:s.fontWeight,style:s.fontStyle,navigationWeight:businessNavigation?(businessNavigation.classList.contains('active')?'600':'400'):navigation?(el.closest('.wn-group-items')?'400':'600'):null});
    };
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walk.nextNode())if(walk.currentNode.textContent.trim())inspect(walk.currentNode.parentElement);
    document.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(inspect);
    return entries;
  },rootSelector);
  assert.ok(styles.length,'Typography inventory cannot be empty');
  for(const style of styles){
    assert.equal(style.family,style.control?'Montserrat,Arial,sans-serif':'Mont,Montserrat,Arial,sans-serif','Brand font role: '+JSON.stringify(style));
    assert.ok(['12px','14px','20px',...(style.input?['16px']:[]),...(style.pageHeading&&style.pageSize?[style.pageSize]:[]),...(style.metric?['24px','28px']:[])].includes(style.size),'Role-based text scale (16px for form entry): '+JSON.stringify(style));
    if(style.pageHeading&&style.pageSize)assert.equal(style.size,style.pageSize,'Page heading has its own hierarchy: '+JSON.stringify(style));
    assert.ok((style.heading?['700']:style.control?(style.emphasis?['500','700']:['500']):style.emphasis?['700']:['400','600']).includes(style.weight),'Brand weight for text role: '+JSON.stringify(style));
    if(style.navigationWeight)assert.equal(style.weight,style.navigationWeight,'Shared navigation role: '+JSON.stringify(style));
    assert.equal(style.style,'normal','No legacy italic: '+JSON.stringify(style));
  }
  return {count:styles.length,sizes:[...new Set(styles.map(s=>s.size))].sort(),weights:[...new Set(styles.map(s=>s.weight))].sort()};
}
module.exports={auditTypography};
