const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const out=path.resolve(__dirname,'../.screenshots/keri-art');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true});try{const p=await b.newPage({viewport:{width:1500,height:1080}});await p.route('**/__keri_review__',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#e7e1d8"></body></html>'}));await p.goto('http://localhost:3001/__keri_review__');
const source=esbuild.buildSync({stdin:{contents:`export * from './components/sarkisian-studio/keri/look.ts'; export * from './components/sarkisian-studio/keri/render.ts'; export * from './components/sarkisian-studio/keri/clothing.ts'; export * from './components/sarkisian-studio/keri/makeup.ts'`,resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,format:'iife',globalName:'Keri',write:false});await p.addScriptTag({content:source.outputFiles[0].text});
await p.evaluate(async()=>{document.body.style.cssText+=';display:flex;flex-wrap:wrap;gap:12px;padding:20px;';for(let n=1;n<=8;n++){const look={...Keri.DEFAULT_KERI_LOOK,top:n,topColor:6,bottom:3,bottomColor:3,hair:3};const c=await Keri.renderKeriLook(look,'/studio-assets/keri/',420);const d=document.createElement('div');d.style.cssText='width:170px;background:#faf8f3;text-align:center;font:14px Arial';d.textContent=Keri.TOP_NAMES[n-1];c.style.width='170px';d.append(c);document.body.append(d)}for(let n=1;n<=5;n++){const look={...Keri.DEFAULT_KERI_LOOK,top:4,bottom:n,bottomColor:3,hair:3};const c=await Keri.renderKeriLook(look,'/studio-assets/keri/',420);const d=document.createElement('div');d.style.cssText='width:170px;background:#faf8f3;text-align:center;font:14px Arial';d.textContent=Keri.BOTTOM_NAMES[n-1];c.style.width='170px';d.append(c);document.body.append(d)}});await p.screenshot({path:path.join(out,'garments.png'),fullPage:true});
await p.evaluate(async()=>{document.body.innerHTML='';for(let eyes=1;eyes<=3;eyes++)for(let type=0;type<=1;type++){const look={...Keri.DEFAULT_KERI_LOOK,skin:2,eyes,hair:4,hairColor:1,lipstick:type?6:1,blush:type?3:1,eyeshadow:type?6:1,eyeliner:type?3:1};const full=await Keri.renderKeriLook(look,'/studio-assets/keri/',948),c=document.createElement('canvas');c.width=400;c.height=430;c.getContext('2d').drawImage(full,220,120,400,430,0,0,400,430);const d=document.createElement('div');d.style.cssText='width:400px;background:#faf8f3;text-align:center;font:14px Arial';d.textContent=`eyes ${eyes} · ${type?'makeup':'base'}`;d.append(c);document.body.append(d)}});await p.screenshot({path:path.join(out,'makeup.png'),fullPage:true});
const checks=await p.evaluate(async()=>{
  const result={garments:0,lips:0,heads:0};
  for(const top of [6,7,8])for(const topColor of [1,3,6]){
    const look={...Keri.DEFAULT_KERI_LOOK,top,topColor};const img=new Image();img.src=Keri.keriLayers(look,'/studio-assets/keri/')[2];await img.decode();
    const before=document.createElement('canvas');before.width=948;before.height=1920;before.getContext('2d').drawImage(img,0,0);
    const full=await Keri.renderKeriLook(look,'/studio-assets/keri/',948);if(!full.width)throw Error('No render');
    const derived=Keri.garment(img,look),after=document.createElement('canvas');after.width=948;after.height=1920;after.getContext('2d').drawImage(derived,0,0);
    const a=before.getContext('2d').getImageData(0,0,948,1920).data,b=after.getContext('2d').getImageData(0,0,948,1920).data;
    for(let i=3;i<a.length;i+=4)if(Math.abs(a[i]-b[i])>1)throw Error(`Garment outside original silhouette: ${top}/${topColor}`);result.garments++;
  }
  for(const skin of [1,2,3,4,5])for(const lipstick of [2,4,6]){
    const img=new Image();img.src=`/studio-assets/keri/Mouth/mouth${skin}_1.png`;await img.decode();
    const a=document.createElement('canvas'),b=document.createElement('canvas');for(const c of [a,b]){c.width=948;c.height=1920}a.getContext('2d').drawImage(img,0,0);Keri.drawLips(b.getContext('2d'),img,{...Keri.DEFAULT_KERI_LOOK,skin,lipstick});
    const x=a.getContext('2d').getImageData(0,0,948,1920).data,y=b.getContext('2d').getImageData(0,0,948,1920).data;for(let i=3;i<x.length;i+=4)if(x[i]!==y[i])throw Error(`Lip shape changed: ${skin}/${lipstick}`);result.lips++;
  }
  for(const faceShape of [1,2,3])for(const eyes of [1,2,3]){await Keri.renderKeriLook({...Keri.DEFAULT_KERI_LOOK,faceShape,eyes,blush:5,eyeshadow:6,lipstick:5},'/studio-assets/keri/',300);result.heads++}return result;
});console.log('PASS:',JSON.stringify(checks),'original garment silhouettes and lip contours preserved');console.log(out);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
