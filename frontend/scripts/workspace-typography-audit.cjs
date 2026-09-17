const assert=require('node:assert/strict');
async function auditTypography(page,rootSelector='.workspace-frame,.studio-rail,.wn-rail-dock,.admin-dialog,.workspace-context,.reminder-center,.workspace-login'){
  await page.evaluate(()=>document.fonts.ready);
  const styles=await page.evaluate(selector=>{
    const entries=[];
    const inspect=el=>{
      if(!el?.closest(selector)||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')return;
      const s=getComputedStyle(el);
      entries.push({text:(el.textContent||el.getAttribute('placeholder')||el.getAttribute('aria-label')||el.tagName).trim().slice(0,65),family:s.fontFamily.replace(/["\s]/g,''),size:s.fontSize,weight:s.fontWeight,style:s.fontStyle});
    };
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walk.nextNode())if(walk.currentNode.textContent.trim())inspect(walk.currentNode.parentElement);
    document.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(inspect);
    return entries;
  },rootSelector);
  assert.ok(styles.length,'Typography inventory cannot be empty');
  for(const style of styles){
    assert.equal(style.family,'Montserrat,Arial,sans-serif','Font family: '+JSON.stringify(style));
    assert.ok(['12px','14px','20px'].includes(style.size),'Only three text sizes: '+JSON.stringify(style));
    assert.ok(['400','600'].includes(style.weight),'Regular/semibold weights only: '+JSON.stringify(style));
    assert.equal(style.style,'normal','No legacy italic: '+JSON.stringify(style));
  }
  return {count:styles.length,sizes:[...new Set(styles.map(s=>s.size))].sort(),weights:[...new Set(styles.map(s=>s.weight))].sort()};
}
module.exports={auditTypography};
