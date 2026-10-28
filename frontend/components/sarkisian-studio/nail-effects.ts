import type { Nail } from './model'
import { colorHex } from './manicure-catalog'
export type NailMark = { tag: 'path' | 'circle' | 'ellipse' | 'rect'; attrs: Record<string, string | number> }
// Normalized marks are shared by the live SVG, palette previews and PNG export.
export function nailMarks(nail: Nail): NailMark[] {
  const out: NailMark[] = [], accent = colorHex(nail.accentColor ?? 'porcelain')
  const circle = (x: number, y: number, r: number, fill = accent) => out.push({ tag: 'circle', attrs: { cx: x, cy: y, r, fill } })
  const path = (d: string, fill = 'none', stroke = accent, width = 3) => out.push({ tag: 'path', attrs: { d, fill, stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } })
  if (nail.finish === 'shimmer' || nail.pattern === 'confetti') for (let i = 0; i < 36; i++) circle(8 + i * 29 % 85, 7 + i * 37 % 86, i % 3 === 0 ? 1.5 : .65, i % 2 ? '#ffffffbb' : '#e6c47e')
  if (nail.finish === 'cat-eye') out.push({ tag: 'ellipse', attrs: { cx: 52, cy: 48, rx: 11, ry: 67, fill: '#fff5dc88', transform: 'rotate(34 50 50)' } })
  if (nail.pattern === 'french' || nail.pattern === 'colored-french') out.push({ tag: 'ellipse', attrs: { cx: 50, cy: -10, rx: 80, ry: 26, fill: nail.pattern === 'french' ? '#fffaf3' : accent } })
  if (nail.pattern === 'dots') [32, 50, 68].forEach(y => circle(50, y, 5, '#fffaf3'))
  if (nail.pattern === 'gold') path('M0 80C100 70 0 35 100 20', 'none', '#d9b15d', 5.5)
  if (nail.pattern === 'marble') { path('M-10 5Q85 22 38 48T110 101', 'none', accent, 2.6); path('M0 17Q90 20 50 50T115 80', 'none', '#ffffff66', 1.2); path('M62 0Q48 21 75 36T85 65', 'none', '#d2af6b', 1.4) }
  if (nail.pattern === 'swirl') { path('M-8 97C100 88 -10 5 110 12', 'none', accent, 7); path('M-10 76C75 66 22 5 90 -10', 'none', '#ffffff88', 2) }
  if (nail.pattern === 'diagonal') { path('M-5 72L105 12V-5H-5Z', accent, accent, 0); path('M-5 88L105 28', 'none', '#d6b06c', 2) }
  if (nail.pattern === 'negative') { path('M15 110Q80 58 24 -10', 'none', accent, 3); path('M78 110Q18 52 81 -10', 'none', accent, 2) }
  if (nail.pattern === 'moon') out.push({ tag: 'ellipse', attrs: { cx: 50, cy: 105, rx: 37, ry: 25, fill: accent } })
  if (nail.pattern === 'hearts') for (const [x, y, s] of [[32, 28, .7], [65, 57, .9], [33, 82, .5]]) { path(`M${x} ${y}c-25 -17 -22 -34 -9 -28q9 2 9 9q0 -7 9 -9c13 -6 16 11 -9 28Z`, accent, 'none', 0); out[out.length - 1]!.attrs.transform = `translate(${x! * (1 - s!)} ${y! * (1 - s!)}) scale(${s})` }
  if (nail.pattern === 'flowers') for (const [x, y] of [[35, 31], [65, 67]]) { for (let k = 0; k < 5; k++) circle(x! + Math.cos(k * Math.PI * .4) * 11, y! + Math.sin(k * Math.PI * .4) * 11, 6); circle(x!, y!, 4, '#d9b15d') }
  if (nail.pattern === 'stars') for (const [x, y, r] of [[30, 28, 13], [68, 58, 16], [36, 82, 8]]) path(`M${x} ${y! - r!}L${x! + 3} ${y! - 3}L${x! + r!} ${y}L${x! + 3} ${y! + 3}L${x} ${y! + r!}L${x! - 3} ${y! + 3}L${x! - r!} ${y}L${x! - 3} ${y! - 3}Z`, accent, 'none', 0)
  if (nail.pattern === 'leopard') for (let i = 0; i < 10; i++) { const x = 15 + i * 31 % 70, y = 15 + i * 23 % 72; circle(x, y, 7, accent); path(`M${x - 7} ${y - 4}q-5 10 5 13m10 -15q8 4 3 11`, 'none', '#382b32', 2.6) }
  if (nail.pattern === 'checker') for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) out.push({ tag: 'rect', attrs: { x: x * 25, y: y * 20, width: 25, height: 20, fill: accent } })
  return out
}
