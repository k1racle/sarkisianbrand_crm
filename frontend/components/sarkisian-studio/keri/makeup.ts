import { BLUSH_COLORS, LIP_COLORS, SHADOW_COLORS, type KeriLook } from './look'
function softColor(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,opacity:number){
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16)
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const fade=ctx.createRadialGradient(0,0,0,0,0,1)
  fade.addColorStop(0,`rgba(${r},${g},${b},${opacity})`);fade.addColorStop(.42,`rgba(${r},${g},${b},${opacity*.7})`);fade.addColorStop(1,`rgba(${r},${g},${b},0)`)
  ctx.fillStyle=fade;ctx.fillRect(-1,-1,2,2);ctx.restore()
}
export function complexion(ctx:CanvasRenderingContext2D,look:KeriLook){
  ctx.save()
  // Cheek color stays inside the authored facial contour and fades into the skin.
  const face=new Path2D('M300 266Q289 375 333 430Q369 491 412 500Q504 472 570 388L570 255Z');ctx.clip(face)
  if(look.blush>1){const color=BLUSH_COLORS[look.blush-1]![1];softColor(ctx,339,365,34,18,color,.2);softColor(ctx,518,357,40,18,color,.2)}
  if(look.freckles===2){ctx.fillStyle='#a97a5455';for(const [x,y,r] of [[324,359,1.1],[335,365,.9],[348,357,1.2],[358,367,.8],[337,375,.7],[365,358,.8],[491,355,.9],[505,350,1],[520,357,1.3],[532,349,.7],[511,365,.8],[542,360,.9],[374,361,.7],[385,365,.6]]){ctx.beginPath();ctx.ellipse(x!,y!,r!,r!*.72,0,0,Math.PI*2);ctx.fill()}}
  if(look.eyeshadow>1){const color=SHADOW_COLORS[look.eyeshadow-1]![1],shift=[0,9,23][look.eyes-1]??0;softColor(ctx,340,288+shift,32,11,color,.34);softColor(ctx,486,277+shift,48,12,color,.34)}
  ctx.restore()
}
const lips=new Map<string,{canvas:HTMLCanvasElement;x:number;y:number}>()
export function drawLips(ctx:CanvasRenderingContext2D,image:HTMLImageElement,look:KeriLook){
  if(look.lipstick===1){ctx.drawImage(image,0,0);return}
  const key=`${image.src}:${look.lipstick}`;let item=lips.get(key)
  if(!item){
    const c=document.createElement('canvas');c.width=948;c.height=1920;const m=c.getContext('2d')!;m.drawImage(image,0,0)
    const data=m.getImageData(370,410,90,50),d=data.data,rgb=[1,3,5].map(i=>parseInt(LIP_COLORS[look.lipstick-1]![1].slice(i,i+2),16))
    for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const lum=.2126*d[i]!+.7152*d[i+1]!+.0722*d[i+2]!,highlight=Math.max(0,(lum-205)/50),shade=Math.min(1.2,Math.max(.48,lum/164));for(let j=0;j<3;j++){const target=rgb[j]!*shade*(1-highlight)+d[i+j]!*highlight;d[i+j]=Math.round(d[i+j]!*.18+target*.82)}}
    c.width=90;c.height=50;c.getContext('2d')!.putImageData(data,0,0);item={canvas:c,x:370,y:410};lips.set(key,item);if(lips.size>12)lips.delete(lips.keys().next().value!)
  }
  ctx.drawImage(item.canvas,item.x,item.y)
}
export function drawEyes(ctx:CanvasRenderingContext2D,image:HTMLImageElement,look:KeriLook){
  if(look.eyeliner>1){
    // Emphasize the painted lashes themselves, rather than drawing a second eyelid.
    const shift=[0,9,23][look.eyes-1]??0;ctx.save();ctx.beginPath();ctx.rect(300,275+shift,82,29);ctx.rect(430,263+shift,118,30);ctx.clip();ctx.shadowColor='#35252c';ctx.shadowBlur=look.eyeliner===3?2.4:1.1;ctx.shadowOffsetY=-.5;ctx.drawImage(image,0,0);ctx.restore()
  }
  ctx.drawImage(image,0,0)
}
