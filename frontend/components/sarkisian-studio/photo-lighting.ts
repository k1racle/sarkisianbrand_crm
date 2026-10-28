import {nailFrame,type AnatomyNail} from './anatomy'
const cache=new Map<string,{relief:HTMLCanvasElement;glints:HTMLCanvasElement}>()
function lighting(photo:HTMLImageElement){
  const found=cache.get(photo.src);if(found)return found
  const relief=document.createElement('canvas');relief.width=1448;relief.height=1086
  const ctx=relief.getContext('2d')!;ctx.drawImage(photo,0,0,1448,1086)
  const pixels=ctx.getImageData(0,0,1448,1086),r=pixels.data,spec=new ImageData(1448,1086)
  for(let i=0;i<r.length;i+=4){const l=(.2126*r[i]!+.7152*r[i+1]!+.0722*r[i+2]!)/255,value=Math.max(0,Math.min(255,(.828*l-.075)*255));r[i]=r[i+1]=r[i+2]=value;spec.data[i]=spec.data[i+1]=spec.data[i+2]=255;spec.data[i+3]=Math.max(0,Math.min(255,(5*l-4.2)*255))}
  ctx.putImageData(pixels,0,0);const glints=document.createElement('canvas');glints.width=1448;glints.height=1086;glints.getContext('2d')!.putImageData(spec,0,0)
  const value={relief,glints};cache.set(photo.src,value);if(cache.size>2)cache.delete(cache.keys().next().value!);return value
}
export function paintPhotoLighting(ctx:CanvasRenderingContext2D,photo:HTMLImageElement,native:AnatomyNail,matte=false){
  const image=lighting(photo);ctx.save();ctx.clip(new Path2D(native.path));ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.72;ctx.drawImage(image.relief,0,0)
  if(!matte){const f=nailFrame(native),bed=new Path2D(),rect=new Path2D();rect.rect(-f.w/2,-f.h*.78,f.w,f.h*.7);bed.addPath(rect,new DOMMatrix().translate(f.cx,f.cy).rotate(f.angle));ctx.clip(bed);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.52;ctx.drawImage(image.glints,0,0)}
  ctx.restore()
}
