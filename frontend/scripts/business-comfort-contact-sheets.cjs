const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
async function run(){
 const phase=process.env.BUSINESS_COMFORT_PHASE||'baseline',group=process.env.BUSINESS_COMFORT_CONTACT_GROUP||'';
 const dir=path.resolve(__dirname,'../.screenshots/crm-comfort-business',phase);
 const files=fs.readdirSync(dir).filter(file=>/^\d+x\d+-.*\.png$/.test(file)&&!file.endsWith('-failed.png')&&(!group||file.includes('-'+group+'-'))),groups={};
 for(const file of files){const prefix=file.match(/^\d+x\d+-(?:light|dark)/)[0];(groups[prefix]??=[]).push(file);}
 const browser=await chromium.launch(require('./crm-test-browser.cjs'));
 try{for(const[prefix,all]of Object.entries(groups))for(let offset=0;offset<all.length;offset+=12){
  const selected=all.slice(offset,offset+12),mobile=prefix.startsWith('390'),cols=mobile?4:2,width=mobile?390:683,height=mobile?844:384;
  const page=await browser.newPage({viewport:{width:width*cols,height:(height+26)*Math.ceil(selected.length/cols)}});
  const css='<style>body{margin:0;background:#dbe1e9;display:grid;grid-template-columns:repeat('+cols+',1fr);font:14px Arial}.tile{height:'+(height+26)+'px}p{margin:0;padding:5px 10px;color:#111}img{display:block;width:'+width+'px;height:'+height+'px}</style>';
  const tiles=selected.map(file=>'<div class="tile"><p>'+file.replace(prefix+'-','').replace('.png','')+'</p><img src="data:image/png;base64,'+fs.readFileSync(path.join(dir,file)).toString('base64')+'"></div>').join('');
  await page.setContent(css+tiles);await page.screenshot({path:path.join(dir,'sheet-'+(group?group+'-':'')+prefix+'-'+(offset/12+1)+'.png'),fullPage:true});await page.close();
 }}finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
