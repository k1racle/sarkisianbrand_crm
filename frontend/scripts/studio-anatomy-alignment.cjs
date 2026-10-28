const {chromium}=require('playwright'),{buildSync}=require('esbuild'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

// Independent landmarks read from the source photographs, not from the masks.
// The first three inner points are on the bed; the fourth is on the free edge.
const landmarks={
 manicure:[
  {inside:[[405,340],[440,350],[420,385],[423,310]],outside:[[397,350],[448,355],[418,392]]},
  {inside:[[554,181],[601,185],[574,225],[580,132]],outside:[[548,184],[608,187],[575,232]]},
  {inside:[[699,122],[754,125],[726,158],[726,57]],outside:[[692,122],[762,126],[725,165]]},
  {inside:[[842,198],[890,194],[865,226],[867,135]],outside:[[835,198],[897,194],[865,233]]},
  {inside:[[1058,575],[1070,541],[1092,607],[1120,499]],outside:[[1051,575],[1066,531],[1138,540],[1082,615]]},
 ],
 pedicure:[
  {inside:[[520,407],[541,402],[531,417],[531,390]],outside:[[513,407],[549,403],[531,424]]},
  {inside:[[578,345],[609,345],[591,362],[592,330]],outside:[[571,345],[616,345],[590,369]]},
  {inside:[[647,298],[686,299],[664,315],[666,282]],outside:[[640,298],[694,299],[664,323]]},
  {inside:[[727,263],[775,264],[751,283],[753,244]],outside:[[719,263],[782,264],[751,291]]},
  {inside:[[833,275],[915,285],[879,324],[870,232]],outside:[[824,275],[924,285],[879,331]]},
 ],
};

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();await page.setContent('<body></body>');
  for(const [entry,globalName]of [['anatomy.ts','Anatomy'],['nail-art-geometry.ts','Rendering']]){
   const code=buildSync({entryPoints:[path.resolve(__dirname,'../components/sarkisian-studio',entry)],bundle:true,format:'iife',globalName,write:false}).outputFiles[0].text;
   await page.addScriptTag({content:code});
  }
  const images=Object.fromEntries(['hand','foot'].map(name=>[name,'data:image/png;base64,'+fs.readFileSync(path.resolve(__dirname,`../public/studio-assets/${name}-realistic-v1.png`)).toString('base64')]));
  const errors=await page.evaluate(async({landmarks,images})=>{
   const errors=[],shapes=['almond','oval','round','square','coffin','stiletto'],lengths=['natural','short','extended','long'];
   const canvas=document.createElement('canvas');canvas.width=1448;canvas.height=1086;
   const ctx=canvas.getContext('2d');
   for(const kind of ['manicure','pedicure']){
    const photo=new Image();photo.src=images[kind==='manicure'?'hand':'foot'];await photo.decode();
    ctx.drawImage(photo,0,0);const original=ctx.getImageData(0,0,1448,1086).data;
    const native=Anatomy.anatomyNails(kind);
    for(const [i,n]of native.entries()){
     const mask=new Path2D(n.path);
     for(const [x,y]of landmarks[kind][i].inside)if(!ctx.isPointInPath(mask,x,y))errors.push(`${kind}/${i}: uncovered nail at ${x},${y}`);
     for(const [x,y]of landmarks[kind][i].outside)if(ctx.isPointInPath(mask,x,y))errors.push(`${kind}/${i}: mask covers skin at ${x},${y}`);
    }
    for(const shape of kind==='manicure'?shapes:['almond'])for(const length of kind==='manicure'?lengths:['natural']){
     const nails=Rendering.geometry(kind,shape,length);
     for(let i=0;i<5;i++){
      const mask=new Path2D(nails[i].path);
      for(const [x,y]of landmarks[kind][i].inside.slice(0,3))if(!ctx.isPointInPath(mask,x,y))errors.push(`${kind}/${shape}/${length}/${i}: shifted bed at ${x},${y}`);
      for(const [x,y]of landmarks[kind][i].outside)if(ctx.isPointInPath(mask,x,y))errors.push(`${kind}/${shape}/${length}/${i}: paints skin at ${x},${y}`);
     }
     // Exercise the actual PNG renderer, including a pattern and photographic lighting.
     ctx.drawImage(photo,0,0);
     nails.forEach((n,i)=>Rendering.paintCanvasNail(ctx,n,{color:'emerald',pattern:'french',accentColor:'porcelain',finish:'glossy'},photo,native[i]));
     const painted=ctx.getImageData(0,0,1448,1086).data;
     for(let i=0;i<5;i++)for(const [x,y]of landmarks[kind][i].outside){
      const offset=(y*1448+x)*4;
      if([0,1,2].some(c=>Math.abs(painted[offset+c]-original[offset+c])>1))errors.push(`${kind}/${shape}/${length}/${i}: exported polish leaks at ${x},${y}`);
     }
    }
   }
   return errors;
  },{landmarks,images});
  assert.deepEqual(errors,[]);
  console.log('PASS: 10 photographed nail contours cover the plate and exclude the surrounding skin');
  console.log('PASS: all 24 hand shape/length combinations keep the bed registered; PNG paint stays off the skin');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
