import { colorHex, type Design, type Nail, type NailShape, type NailLength } from './model'
export type NailGeometry = { path: string; x: number; y: number; w: number; h: number; angle?: number }
export const HAND: NailGeometry[] = [
  { path: 'M399 366 C399 343 402 317 413 307 Q423 296 434 313 C444 333 446 354 446 374 Q446 394 425 395 Q399 399 399 380 Z', x: 399, y: 302, w: 47, h: 94 },
  { path: 'M549 211 C547 181 553 149 565 133 Q580 116 593 136 C605 156 608 184 606 212 Q606 240 578 241 Q550 241 549 219 Z', x: 549, y: 125, w: 58, h: 117 },
  { path: 'M694 143 C690 108 698 70 711 59 Q729 40 744 60 C758 80 762 114 759 145 Q758 174 728 175 Q696 175 694 143 Z', x: 694, y: 52, w: 67, h: 123 },
  { path: 'M835 214 C832 183 838 149 851 135 Q865 122 878 138 C891 157 895 183 893 213 Q893 242 866 242 Q835 242 835 214 Z', x: 834, y: 128, w: 60, h: 115 },
  { path: 'M1050 579 C1056 548 1076 507 1105 487 Q1130 469 1131 502 C1130 537 1112 583 1095 608 Q1087 623 1067 607 Q1043 590 1050 579 Z', x: 1049, y: 483, w: 82, h: 133, angle: 23 },
]
export const FOOT: NailGeometry[] = [
  { path: 'M515 414 L518 400 Q521 388 531 390 Q548 390 546 405 L545 417 Q530 423 515 420 Z', x: 515, y: 390, w: 32, h: 32 },
  { path: 'M574 359 L576 340 Q579 329 594 330 Q610 330 613 342 L612 359 Q596 368 576 363 Z', x: 574, y: 330, w: 40, h: 35 },
  { path: 'M644 309 L644 293 Q648 282 665 282 Q685 281 689 294 L688 314 Q665 322 646 317 Z', x: 644, y: 282, w: 45, h: 37 },
  { path: 'M724 275 L723 256 Q729 244 750 245 Q773 243 778 255 L778 280 Q752 291 727 284 Z', x: 723, y: 245, w: 56, h: 42 },
  { path: 'M833 305 C825 286 827 258 833 244 Q869 227 903 242 C914 260 918 287 916 309 Q912 327 879 327 Q843 329 833 305 Z', x: 827, y: 235, w: 91, h: 94 },
]
export function geometry(kind: Design['kind'], shape: NailShape = 'almond', length: NailLength = 'natural'): NailGeometry[] {
  if (kind === 'pedicure') return FOOT
  if (shape === 'almond' && length === 'natural') return HAND
  return HAND.map((g, i) => {
    // The thumb is oblique and asymmetric. Keep its authored cuticle/body
    // rather than rotating a generic upright nail over the illustration.
    if (i === 4) {
      const dx = length === 'extended' ? 9 : 0, dy = length === 'extended' ? -20 : 0
      const base = 'Q1087 623 1067 607 Q1043 590 1050 579 Z'
      const path = shape === 'square'
        ? `M1050 579 C1056 548 1076 507 ${1099+dx} ${483+dy} Q${1102+dx} ${475+dy} ${1109+dx} ${478+dy} L${1131+dx} ${489+dy} Q${1138+dx} ${492+dy} ${1135+dx} ${499+dy} C1130 548 1112 583 1095 608 ${base}`
        : shape === 'oval'
          ? `M1050 579 C1056 548 1076 507 ${1103+dx} ${483+dy} Q${1126+dx} ${462+dy} ${1137+dx} ${489+dy} C1136 530 1112 583 1095 608 ${base}`
          : `M1050 579 C1056 548 1076 507 ${1105+dx} ${487+dy} Q${1130+dx} ${469+dy} ${1131+dx} ${502+dy} C1130 537 1112 583 1095 608 ${base}`
      return { path, x: 1048, y: 475+dy, w: 92+dx, h: 143-dy }
    }
    const thumb = i === 4, a = thumb ? 25 * Math.PI / 180 : 0
    const cx = thumb ? 1076 : g.x + g.w / 2, cy = thumb ? 612 : g.y + g.h
    const w = thumb ? 55 : g.w + 2, h = (thumb ? 132 : g.h) + (length === 'extended' ? 22 : 0)
    const points: { x: number; y: number }[] = []
    const p = (x: number, y: number) => {
      const point = { x: cx + x * Math.cos(a) - y * Math.sin(a), y: cy + x * Math.sin(a) + y * Math.cos(a) }
      points.push(point); return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    }
    const bottom = `M${p(-w*.47,-10)} Q${p(-w*.5,2)} ${p(0,2)} Q${p(w*.5,2)} ${p(w*.47,-10)}`
    const tip = shape === 'square'
      ? `C${p(w*.53,-h*.42)} ${p(w*.47,-h*.7)} ${p(w*.44,-h+8)} Q${p(w*.44,-h)} ${p(w*.3,-h)} L${p(-w*.3,-h)} Q${p(-w*.44,-h)} ${p(-w*.44,-h+8)} C${p(-w*.47,-h*.7)} ${p(-w*.53,-h*.42)} ${p(-w*.47,-10)}`
      : shape === 'oval'
        ? `C${p(w*.53,-h*.64)} ${p(w*.52,-h*.98)} ${p(0,-h)} C${p(-w*.52,-h*.98)} ${p(-w*.53,-h*.64)} ${p(-w*.47,-10)}`
        : `C${p(w*.53,-h*.6)} ${p(w*.35,-h*.92)} ${p(0,-h)} C${p(-w*.35,-h*.92)} ${p(-w*.53,-h*.6)} ${p(-w*.47,-10)}`
    const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y))
    return { path: `${bottom} ${tip} Z`, x: minX, y: minY, w: Math.max(...points.map(p => p.x)) - minX, h: Math.max(...points.map(p => p.y)) - minY }
  })
}
export function paintCanvasNail(ctx: CanvasRenderingContext2D, geo: NailGeometry, nail: Nail) {
  if (!nail.color) return
  ctx.save(); const path = new Path2D(geo.path); ctx.clip(path)
  ctx.fillStyle = colorHex(nail.color); ctx.fill(path)
  const gloss = ctx.createLinearGradient(geo.x, geo.y, geo.x + geo.w, geo.y)
  gloss.addColorStop(0, '#00000020'); gloss.addColorStop(0.24, '#ffffff80'); gloss.addColorStop(0.4, '#ffffff08'); gloss.addColorStop(1, '#00000018')
  ctx.fillStyle = gloss; ctx.fill(path)
  ctx.fillStyle = '#fffaf3'
  if (nail.pattern === 'french') { ctx.beginPath(); ctx.ellipse(geo.x + geo.w / 2, geo.y - geo.h * .1, geo.w * .8, geo.h * .26, 0, 0, Math.PI * 2); ctx.fill() }
  if (nail.pattern === 'dots') for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(geo.x + geo.w * .5, geo.y + geo.h * (.32 + k * .18), geo.w * .05, 0, Math.PI * 2); ctx.fill() }
  if (nail.pattern === 'gold') { ctx.strokeStyle = '#d9b15d'; ctx.lineWidth = Math.max(2, geo.w * .055); ctx.beginPath(); ctx.moveTo(geo.x, geo.y + geo.h * .8); ctx.bezierCurveTo(geo.x + geo.w, geo.y + geo.h * .7, geo.x, geo.y + geo.h * .35, geo.x + geo.w, geo.y + geo.h * .2); ctx.stroke() }
  ctx.restore()
}
export async function exportDesign(design: Design, imageUrl: string, name: string) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = imageUrl; await img.decode()
  const canvas = document.createElement('canvas'); canvas.width = 1448; canvas.height = 1186
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Не удалось создать изображение')
  ctx.drawImage(img, 0, 0, 1448, 1086)
  geometry(design.kind, design.shape, design.length).forEach((geo, i) => paintCanvasNail(ctx, geo, design.nails[i]!))
  ctx.fillStyle = '#f8f6f1'; ctx.fillRect(0, 1086, 1448, 100)
  ctx.fillStyle = '#242321'; ctx.font = '24px sans-serif'; ctx.fillText('S A R K I S I A N   S T U D I O', 44, 1145)
  ctx.textAlign = 'right'; ctx.font = '21px sans-serif'; ctx.fillText(name.slice(0, 40), 1404, 1145)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Не удалось сохранить изображение')
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sarkisian-design.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000)
}
