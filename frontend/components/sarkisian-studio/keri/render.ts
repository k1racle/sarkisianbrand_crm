import { KERI_SIZE, keriLayers, type KeriLook } from './look.ts'

// A look is committed only when every layer is decoded. Rapid switches cannot
// expose an unclothed base or mix old skin/face/clothing with the next look.
const images = new Map<string, Promise<HTMLImageElement>>()
export function loadKeriImage(url: string): Promise<HTMLImageElement> {
  if (!images.has(url)) {
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        try { await img.decode(); resolve(img) } catch (error) { reject(error) }
      }
      img.onerror = () => reject(new Error('Не удалось загрузить детали образа.'))
      img.src = url
    }).catch(error => { images.delete(url); throw error })
    images.set(url, promise)
    if(images.size>36)images.delete(images.keys().next().value!)
    return promise
  }
  const cached=images.get(url)!;images.delete(url);images.set(url,cached)
  return cached
}
export async function renderKeriLook(look: KeriLook, assetBase: string, width = KERI_SIZE.width): Promise<HTMLCanvasElement> {
  const layers = await Promise.all(keriLayers(look, assetBase).map(loadKeriImage))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(width * KERI_SIZE.height / KERI_SIZE.width)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Браузер не поддерживает рисование персонажа.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (const img of layers) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}
