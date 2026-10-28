import { colorHex, type Design, type Nail } from './model'
import { nailMarks } from './nail-effects'
import { nailFrame,anatomyNails } from './anatomy'
import {paintPhotoLighting} from './photo-lighting'
export type { AnatomyNail as NailGeometry } from './anatomy'
import type { AnatomyNail as NailGeometry } from './anatomy'
export { PHOTO_HAND as HAND, PHOTO_FOOT as FOOT } from './anatomy'
export { fittedNails as geometry } from './nail-shapes'
import { fittedNails as geometry } from './nail-shapes'
export function paintCanvasNail(ctx: CanvasRenderingContext2D, geo: NailGeometry, nail: Nail, photo?:HTMLImageElement, native?:NailGeometry) {
  if (!nail.color) return
  ctx.save(); const path = new Path2D(geo.path); ctx.clip(path)
  ctx.fillStyle = colorHex(nail.color)
  if (nail.pattern === 'ombre' || nail.pattern === 'aura' || nail.finish === 'chrome') {
    const gradient = nail.pattern === 'aura' ? ctx.createRadialGradient(geo.x + geo.w / 2, geo.y + geo.h / 2, 0, geo.x + geo.w / 2, geo.y + geo.h / 2, geo.h / 2)
      : ctx.createLinearGradient(geo.x, geo.y, nail.finish === 'chrome' ? geo.x + geo.w : geo.x, nail.finish === 'chrome' ? geo.y : geo.y + geo.h)
    gradient.addColorStop(0, nail.pattern === 'aura' ? colorHex(nail.accentColor ?? 'porcelain') : colorHex(nail.color))
    if (nail.finish === 'chrome') gradient.addColorStop(.4, '#fff3dc')
    gradient.addColorStop(1, nail.finish === 'chrome' || nail.pattern === 'aura' ? colorHex(nail.color) : colorHex(nail.accentColor ?? 'porcelain'))
    ctx.fillStyle = gradient
  }
  ctx.globalAlpha=.98;ctx.fill(path);ctx.globalAlpha=1
  const f = nailFrame(geo)
  ctx.save(); ctx.translate(f.cx, f.cy); ctx.rotate(f.angle * Math.PI / 180); ctx.translate(-f.w / 2, -f.h); ctx.scale(f.w / 100, f.h / 100)
  for (const mark of nailMarks(nail)) {
    ctx.save(); const a = mark.attrs
    if (typeof a.transform === 'string') {
      const translate = a.transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/), scale = a.transform.match(/scale\(([-\d.]+)\)/), rotate = a.transform.match(/rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/)
      if (translate) ctx.translate(Number(translate[1]), Number(translate[2]))
      if (scale) ctx.scale(Number(scale[1]), Number(scale[1]))
      if (rotate) { ctx.translate(Number(rotate[2]), Number(rotate[3])); ctx.rotate(Number(rotate[1]) * Math.PI / 180); ctx.translate(-Number(rotate[2]), -Number(rotate[3])) }
    }
    const drawing = new Path2D(mark.tag === 'path' ? String(a.d) : undefined)
    if (mark.tag === 'circle') drawing.arc(Number(a.cx), Number(a.cy), Number(a.r), 0, Math.PI * 2)
    if (mark.tag === 'ellipse') drawing.ellipse(Number(a.cx), Number(a.cy), Number(a.rx), Number(a.ry), 0, 0, Math.PI * 2)
    if (mark.tag === 'rect') drawing.rect(Number(a.x), Number(a.y), Number(a.width), Number(a.height))
    if (a.fill && a.fill !== 'none') { ctx.fillStyle = String(a.fill); ctx.fill(drawing) }
    if (a.stroke && a.stroke !== 'none') { ctx.strokeStyle = String(a.stroke); ctx.lineWidth = Number(a['stroke-width'] ?? 1); ctx.lineCap = 'round'; ctx.stroke(drawing) }
    ctx.restore()
  }
  const curvature=ctx.createRadialGradient(50,45,0,50,45,75);curvature.addColorStop(0,'#ffffff0c');curvature.addColorStop(.6,'#0000');curvature.addColorStop(1,'#0005');ctx.fillStyle=curvature;ctx.fillRect(0,0,100,100)
  if(nail.finish!=='matte'&&!photo){ctx.lineCap='round';ctx.strokeStyle='#ffffff61';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(27,20);ctx.bezierCurveTo(20,32,20,54,24,68);ctx.stroke();ctx.strokeStyle='#ffffff8c';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(27,22);ctx.quadraticCurveTo(23,31,23,42);ctx.stroke()}
  ctx.restore()
  if(photo&&native)paintPhotoLighting(ctx,photo,native,nail.finish==='matte')
  ctx.restore()
}
export async function exportDesign(design: Design, imageUrl: string, name: string) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = imageUrl; await img.decode()
  const canvas = document.createElement('canvas'); canvas.width = 1448; canvas.height = 1186
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Не удалось создать изображение')
  ctx.drawImage(img, 0, 0, 1448, 1086)
  geometry(design.kind, design.shape, design.length).forEach((geo, i) => paintCanvasNail(ctx, geo, design.nails[i]!,img,anatomyNails(design.kind)[i]))
  ctx.fillStyle = '#f8f6f1'; ctx.fillRect(0, 1086, 1448, 100)
  ctx.fillStyle = '#242321'; ctx.font = '24px sans-serif'; ctx.fillText('S A R K I S I A N   S T U D I O', 44, 1145)
  ctx.textAlign = 'right'; ctx.font = '21px sans-serif'; ctx.fillText(name.slice(0, 40), 1404, 1145)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Не удалось сохранить изображение')
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sarkisian-design.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000)
}
