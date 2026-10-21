export const TOPS = [{ id: 'tee', name: 'Молочная футболка' }, { id: 'blazer', name: 'Жакет Signature' }] as const
export const BOTTOMS = [{ id: 'wide', name: 'Широкие брюки' }, { id: 'tailored', name: 'Брюки со стрелками' }] as const
export const HAIRSTYLES = [{ id: 'bob', name: 'Волнистое каре' }, { id: 'ponytail', name: 'Высокий хвост' }] as const
export const SHOES = [{ id: 'sneakers', name: 'Белые кеды' }, { id: 'heels', name: 'Лодочки' }] as const
export const HAIR_COLORS = [{ id: 'espresso', name: 'Эспрессо', base: '#382820', light: '#765345' }, { id: 'chestnut', name: 'Каштан', base: '#764631', light: '#b98357' }, { id: 'blonde', name: 'Медовый', base: '#b38d5c', light: '#e3c99b' }] as const
export const SKIN_TONES = [{ id: 'warm', name: 'Тёплый', base: '#e8ae8c', light: '#ffdab8', shade: '#ba795f' }, { id: 'light', name: 'Светлый', base: '#f1c7af', light: '#ffe6d2', shade: '#ce987f' }, { id: 'deep', name: 'Смуглый', base: '#b57550', light: '#d9a079', shade: '#83513e' }] as const
export type Appearance = {
  top: typeof TOPS[number]['id']; bottom: typeof BOTTOMS[number]['id']
  hair: typeof HAIRSTYLES[number]['id']; hairColor: typeof HAIR_COLORS[number]['id']
  shoes: typeof SHOES[number]['id']; skin: typeof SKIN_TONES[number]['id']
}
export const DEFAULT_APPEARANCE: Appearance = { top: 'tee', bottom: 'wide', hair: 'bob', hairColor: 'espresso', shoes: 'sneakers', skin: 'warm' }
export const MENTOR_APPEARANCE: Appearance = { top: 'blazer', bottom: 'tailored', hair: 'ponytail', hairColor: 'chestnut', shoes: 'heels', skin: 'warm' }
export function parseAppearance(raw: unknown): Appearance {
  const data = raw && typeof raw === 'object' ? raw as Partial<Appearance> : {}
  return {
    top: TOPS.some(o => o.id === data.top) ? data.top! : DEFAULT_APPEARANCE.top,
    bottom: BOTTOMS.some(o => o.id === data.bottom) ? data.bottom! : DEFAULT_APPEARANCE.bottom,
    hair: HAIRSTYLES.some(o => o.id === data.hair) ? data.hair! : DEFAULT_APPEARANCE.hair,
    hairColor: HAIR_COLORS.some(o => o.id === data.hairColor) ? data.hairColor! : DEFAULT_APPEARANCE.hairColor,
    shoes: SHOES.some(o => o.id === data.shoes) ? data.shoes! : DEFAULT_APPEARANCE.shoes,
    skin: SKIN_TONES.some(o => o.id === data.skin) ? data.skin! : DEFAULT_APPEARANCE.skin,
  }
}
