import { PHOTO_HAND, PHOTO_FOOT, nailFrame, type AnatomyNail } from './anatomy'
import type { Design, NailLength, NailShape } from './model'
export function fittedNails(kind:Design['kind'],shape:NailShape='almond',length:NailLength='natural'):AnatomyNail[]{
  if(kind==='pedicure')return PHOTO_FOOT
  if(shape==='almond'&&length==='natural')return PHOTO_HAND
  return PHOTO_HAND.map(n=>{
    const base=nailFrame(n),w=base.w,h=base.h+(length==='long'?45:length==='extended'?22:length==='short'?-2:0),angle=base.angle*Math.PI/180
    const points:{x:number;y:number}[]=[]
    const p=(x:number,y:number)=>{const point={x:base.cx+x*Math.cos(angle)-y*Math.sin(angle),y:base.cy+x*Math.sin(angle)+y*Math.cos(angle)};points.push(point);return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`}
    const local=([x,y]:[number,number])=>({x:(x-base.cx)*Math.cos(angle)+(y-base.cy)*Math.sin(angle),y:-(x-base.cx)*Math.sin(angle)+(y-base.cy)*Math.cos(angle)})
    const left=local(n.bed!.left),right=local(n.bed!.right)
    const edge=shape==='coffin'?.29:.43
    // Reuse the photographed sidewalls and cuticle verbatim. Only the cap above
    // the two shoulders changes; a generic root paints over the surrounding skin.
    const tip=shape==='square'||shape==='coffin'
      ?`C${p(right.x,right.y-5)} ${p(w*edge,-h+14)} ${p(w*edge,-h+5)}Q${p(w*edge,-h)} ${p(w*.24,-h)}L${p(-w*.24,-h)}Q${p(-w*edge,-h)} ${p(-w*edge,-h+5)}C${p(-w*edge,-h+14)} ${p(left.x,left.y-5)} ${p(left.x,left.y)}`
      :shape==='oval'||shape==='round'
        ?`C${p(right.x,right.y-12)} ${p(w*.42,-h)} ${p(0,-h)}C${p(-w*.42,-h)} ${p(left.x,left.y-12)} ${p(left.x,left.y)}`
        :shape==='stiletto'
          ?`C${p(right.x,right.y-8)} ${p(w*.16,-h+12)} ${p(0,-h)}C${p(-w*.16,-h+12)} ${p(left.x,left.y-8)} ${p(left.x,left.y)}`
          :`C${p(right.x,right.y-12)} ${p(w*.3,-h+3)} ${p(0,-h)}C${p(-w*.3,-h+3)} ${p(left.x,left.y-12)} ${p(left.x,left.y)}`
    const x=Math.min(n.x,...points.map(p=>p.x)),y=Math.min(n.y,...points.map(p=>p.y))
    return {...n,path:`${n.bed!.path}${tip}Z`,x,y,w:Math.max(n.x+n.w,...points.map(p=>p.x))-x,h:Math.max(n.y+n.h,...points.map(p=>p.y))-y,frame:{...base,w,h}}
  })
}
