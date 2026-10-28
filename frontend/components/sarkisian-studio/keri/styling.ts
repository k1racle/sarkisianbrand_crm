import { HAIR_COLORS, type KeriLook } from './look'
import { garment } from './clothing'
import { complexion, drawEyes, drawLips } from './makeup'

type Bounds = { x: number; y: number; w: number; h: number }
function path(ctx:CanvasRenderingContext2D,d:string,fill:string,stroke?:string,width=2){const p=new Path2D(d);if(fill!=='none'){ctx.fillStyle=fill;ctx.fill(p)}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(p)}}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,stroke?:string,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(color!=='none'){ctx.fillStyle=color;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function accessories(ctx:CanvasRenderingContext2D,look:KeriLook){
  if(look.glasses>1){
    const stroke=look.glasses===3?'#866759':'#38313b'
    if(look.glasses===2){ellipse(ctx,344,310,43,35,'#d9eced12',stroke,3.5);ellipse(ctx,486,300,52,36,'#d9eced12',stroke,3.5)}
    else {path(ctx,look.glasses===3?'M297 283L388 295L382 331Q335 350 309 322Z':'M300 289L386 292L382 336L307 333Z','#d9eced12',stroke,3.5);path(ctx,look.glasses===3?'M433 286L545 270L530 320Q488 340 440 331Z':'M435 284L541 277L535 326L440 333Z','#d9eced12',stroke,3.5)}
    path(ctx,'M388 304Q410 292 433 302M542 284L584 310','none',stroke,3)
  }
  if(look.earrings>1){
    ellipse(ctx,585,389,5,6,'#e4c889','#a3854b',1.5)
    if(look.earrings===3)ellipse(ctx,586,413,14,21,'none','#d5b575',3)
    if(look.earrings===4){path(ctx,'M586 396V420','none','#d8be81',2);path(ctx,'M586 418Q601 438 586 450Q571 438 586 418Z','#e5eaeb','#b69a64',2)}
  }
  if(look.necklace>1){
    path(ctx,look.necklace===4?'M411 525Q474 560 548 503':'M383 573Q458 687 570 554','none',look.necklace===4?'#393039':'#d6b97d',look.necklace===4?7:2)
    if(look.necklace===2)path(ctx,'M472 631L479 643L468 653L461 641Z','#dfc489','#9c8152',1)
    if(look.necklace===3)for(let k=0;k<17;k++){const t=k/16;ellipse(ctx,383+187*t,573-19*t+Math.sin(t*Math.PI)*58,4,4.5,'#f5ecdd','#c4b6a2',.8)}
  }
  if(look.hairAccessory===2){path(ctx,'M568 133Q531 99 530 129Q535 159 568 142Q606 168 611 135Q612 107 568 133Z','#c58aa0','#885469',2);ellipse(ctx,568,139,5,8,'#dfb0bf')}
  if(look.hairAccessory===3)path(ctx,'M302 241Q286 58 468 54Q656 49 655 251','none','#d0ab88',9)
  if(look.hairAccessory===4)path(ctx,'M570 223L622 198L626 204L574 230Z','#e6c47f','#a1844c',1.5)
}
function drawNatural(ctx:CanvasRenderingContext2D,layers:HTMLImageElement[],look:KeriLook,closed:boolean,eyeBounds?:Bounds){
  ctx.drawImage(layers[0]!,0,0)
  ctx.drawImage(garment(layers[1]!,look,true),0,0)
  ctx.drawImage(garment(layers[2]!,look),0,0)
  complexion(ctx,look)
  if(look.brow===2){ctx.save();ctx.translate(0,74);ctx.scale(1,.7);ctx.drawImage(layers[3]!,0,0);ctx.restore()}
  else {if(look.brow===3){ctx.save();ctx.shadowColor='#43382c88';ctx.shadowBlur=1.3;ctx.drawImage(layers[3]!,0,0);ctx.restore()}ctx.drawImage(layers[3]!,0,0)}
  if(closed&&eyeBounds){const b=eyeBounds;ctx.drawImage(layers[4]!,b.x,b.y,b.w,b.h,b.x,b.y+b.h*.49,b.w,Math.max(2,b.h*.035))}
  else drawEyes(ctx,layers[4]!,look)
  drawLips(ctx,layers[5]!,look)
  if(look.hair>5){
    const color=HAIR_COLORS[look.hairColor-1]![1]
    if(look.hair===6){ellipse(ctx,307,76,64,67,color,'#44333466',4);ellipse(ctx,645,64,64,67,color,'#44333466',4)}
    if(look.hair===7)for(let j=0;j<9;j++)ellipse(ctx,657+Math.sin(j*.7)*8,343+j*37,33-j*2.3,29,color,'#44333477',3)
    if(look.hair===8)ellipse(ctx,604,63,66,61,color,'#44333466',4)
  }
  ctx.drawImage(layers[6]!,0,0)
  accessories(ctx,look)
}
export function drawStyledKeri(ctx:CanvasRenderingContext2D,layers:HTMLImageElement[],look:KeriLook,closed=false,eyeBounds?:Bounds){
  if(look.faceShape===1){drawNatural(ctx,layers,look,closed,eyeBounds);return}
  // Transform the complete head so its eyes, hair and makeup stay registered.
  // The gradual transition at the neck prevents a visible seam with the body.
  const head=document.createElement('canvas');head.width=948;head.height=1920
  drawNatural(head.getContext('2d')!,layers,look,closed,eyeBounds)
  for(let y=0;y<660;y+=12){const t=Math.max(0,Math.min(1,(y-450)/210)),ease=t*t*(3-2*t),scale=1+(look.faceShape===2?.035:-.035)*(1-ease);ctx.drawImage(head,0,y,948,Math.min(12,660-y),446*(1-scale),y,948*scale,Math.min(12,660-y))}
  ctx.drawImage(head,0,660,948,1260,0,660,948,1260)
}
