import { OUTFIT_COLORS, type KeriLook } from './look'

// Reuse the illustrator's silhouette, folds, hems and antialiased outlines.
// A derived garment replaces its source layer; it is never drawn over an old outfit.
const cache = new Map<string, HTMLCanvasElement>()
function canvas() { const c=document.createElement('canvas');c.width=948;c.height=1920;return c }
function tint(image:HTMLImageElement,color:string,keepBlouse=false) {
  const c=canvas(),ctx=c.getContext('2d')!;ctx.drawImage(image,0,0)
  const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16))
  for(let i=0;i<d.length;i+=4){
    if(!d[i+3])continue
    const r=d[i]!,g=d[i+1]!,b=d[i+2]!,lum=.2126*r+.7152*g+.0722*b
    // The shirt under the vest remains white, including its original sleeve shading.
    if(keepBlouse&&Math.max(r,g,b)-Math.min(r,g,b)<24)continue
    const shade=Math.min(1.3,Math.max(.28,lum/(keepBlouse?112:196))),highlight=Math.max(0,(lum-219)/36)
    const ink=Math.max(0,Math.min(1,(lum-48)/60))
    for(let channel=0;channel<3;channel++){
      const colored=Math.min(255,rgb[channel]!*shade*(1-highlight)+249*highlight)
      const outline=Math.max(r,g,b)-Math.min(r,g,b)>18?lum:d[i+channel]!
      d[i+channel]=Math.round(outline*(1-ink)+colored*ink)
    }
  }
  ctx.putImageData(pixels,0,0);return c
}
function detail(ctx:CanvasRenderingContext2D,d:string,fill:string,stroke?:string,width=2){const p=new Path2D(d);if(fill!=='none'){ctx.fillStyle=fill;ctx.fill(p)}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(p)}}
function pattern(ctx:CanvasRenderingContext2D,id:number){
  if(id===1)return
  ctx.save();ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.28
  if(id===2){ctx.strokeStyle='#fff';ctx.lineWidth=3;for(let y=610;y<1460;y+=30){ctx.beginPath();ctx.moveTo(60,y);ctx.bezierCurveTo(280,y-8,520,y+18,900,y-5);ctx.stroke()}}
  else for(let y=630;y<1450;y+=43)for(let x=100+(Math.round(y/43)%2)*21;x<900;x+=43){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,id===3?2.8:2,0,Math.PI*2);ctx.fill();if(id===4){ctx.strokeStyle='#e7c8d0';ctx.lineWidth=3;for(let a=0;a<5;a++){const theta=a*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(theta)*5,y+Math.sin(theta)*5,3.2,1.5,theta,0,Math.PI*2);ctx.stroke()}}}
  ctx.restore()
}
export function garment(image:HTMLImageElement,look:KeriLook,bottom=false):CanvasImageSource {
  const id=bottom?look.bottom:look.top,colorId=bottom?look.bottomColor:look.topColor
  if(id<=(bottom?3:5)&&(!look.outfitPattern||look.outfitPattern===1||bottom))return image
  const key=`${image.src}|${bottom?'bottom':'top'}:${id}:${colorId}:${bottom?0:look.outfitPattern}`
  const cached=cache.get(key);if(cached){cache.delete(key);cache.set(key,cached);return cached}
  const color=OUTFIT_COLORS[colorId-1]![1]
  const c=id>(bottom?3:5)?tint(image,color,!bottom&&id===7):canvas(),ctx=c.getContext('2d')!
  if(id<=(bottom?3:5))ctx.drawImage(image,0,0)
  if(bottom&&id===5){
    const source=canvas();source.getContext('2d')!.drawImage(c,0,0);ctx.clearRect(0,0,948,1920)
    ctx.drawImage(source,0,0,948,1150,0,0,948,1150);ctx.drawImage(source,0,1150,948,770,0,1150,948,900)
  }
  if(!bottom){
    pattern(ctx,look.outfitPattern)
    ctx.save();ctx.globalCompositeOperation='source-atop'
    if(id===6){
      // Short professional tabard, cut to the existing T-shirt's posture and hem.
      const cloth=ctx.createLinearGradient(280,780,650,1010);cloth.addColorStop(0,'#ffffff20');cloth.addColorStop(.35,'#ffffff05');cloth.addColorStop(1,'#00000018')
      detail(ctx,'M360 627L380 608L407 653L397 759Q464 792 575 770L626 644L648 636L593 799L607 1269Q430 1237 269 1155L312 811Z',color,'#28252a80',2.5)
      ctx.fillStyle=cloth;ctx.fill(new Path2D('M312 811L397 759Q464 792 575 770L593 799L607 1269Q430 1237 269 1155Z'))
      detail(ctx,'M342 963Q436 991 538 994L527 1107Q433 1110 331 1076Z','none','#ffffff60',2)
      detail(ctx,'M365 643L385 675L374 748M621 661L584 763M281 1144Q422 1222 595 1255','none','#ffffff38',2)
      ctx.fillStyle='#ffffffa8';ctx.font='12px Arial';ctx.save();ctx.translate(417,916);ctx.rotate(.07);ctx.fillText('S A R K I S I A N',0,0);ctx.restore()
    }
    if(id===7){
      // The original fitted bodice and white shirt already share the exact pose.
      detail(ctx,'M464 790Q462 967 456 1208','none','#00000028',2)
      for(const [x,y] of [[463,896],[461,1001],[458,1110]]){ctx.beginPath();ctx.ellipse(x!,y!,3.3,4,0,0,Math.PI*2);ctx.fillStyle='#d3b88d';ctx.fill();ctx.strokeStyle='#665747';ctx.lineWidth=.8;ctx.stroke()}
    }
    if(id===8){
      // Lapels follow the same shoulder/chest landmarks as the painted long sleeves.
      const shirt=ctx.createLinearGradient(400,630,510,920);shirt.addColorStop(0,'#f7f4ee');shirt.addColorStop(.5,'#fffdf8');shirt.addColorStop(1,'#e0dcd5')
      ctx.fillStyle=shirt;ctx.fill(new Path2D('M363 613Q467 684 618 605L485 919Z'))
      const lapel=ctx.createLinearGradient(360,640,590,900);lapel.addColorStop(0,'#ffffff22');lapel.addColorStop(.6,'#ffffff0c');lapel.addColorStop(1,'#00000014')
      const left='M363 613Q390 646 439 664L485 919L395 812L418 770L365 741Z'
      const right='M618 605L658 636L603 773L563 797L569 845L485 919L561 667Q591 640 618 605Z'
      for(const d of [left,right]){detail(ctx,d,color);ctx.fillStyle=lapel;ctx.fill(new Path2D(d));detail(ctx,d,'none','#302b3455',2)}
      detail(ctx,'M485 919Q478 1059 484 1248','none','#19191b45',2)
      detail(ctx,'M330 1077L404 1094M542 1121L588 1127','none','#00000045',3)
      detail(ctx,'M331 1081L404 1098M542 1125L588 1131','none','#ffffff35',1.5)
      for(const y of [996,1096,1190]){ctx.beginPath();ctx.ellipse(493,y,4,5,0,0,Math.PI*2);ctx.fillStyle='#d2c3a6';ctx.fill();ctx.strokeStyle='#514d49';ctx.lineWidth=1;ctx.stroke()}
    }
    ctx.restore()
  }
  cache.set(key,c);if(cache.size>8)cache.delete(cache.keys().next().value!)
  return c
}
