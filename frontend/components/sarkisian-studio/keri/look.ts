export type KeriLook = {
  skin: number; hair: number; hairColor: number; eyes: number; eyeColor: number;
  top: number; topColor: number; bottom: number; bottomColor: number;
}
export const KERI_STORAGE_KEY = 'sarkisian.keri.look.v1'
export const KERI_SIZE = { width: 948, height: 1920 }
export const LOOK_LIMITS: Record<keyof KeriLook, number> = {
  skin: 5, hair: 5, hairColor: 15, eyes: 3, eyeColor: 10, top: 5, topColor: 6, bottom: 3, bottomColor: 6,
}
export const DEFAULT_KERI_LOOK: KeriLook = {
  skin: 2, hair: 2, hairColor: 6, eyes: 1, eyeColor: 1, top: 4, topColor: 6, bottom: 1, bottomColor: 1,
}
export function parseKeriLook(raw: unknown): KeriLook {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result = { ...DEFAULT_KERI_LOOK }
  for (const key of Object.keys(LOOK_LIMITS) as (keyof KeriLook)[]) {
    const n = value[key]
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= LOOK_LIMITS[key]) result[key] = n
  }
  return result
}
export function keriLayers(look: KeriLook, assetBase: string): string[] {
  const base = assetBase.replace(/\/?$/, '/')
  return [
    `Base/base${look.skin}.png`, `Bottoms/bottom${look.bottom}_${look.bottomColor}.png`,
    `Tops/top${look.top}_${look.topColor}.png`, `Eyebrows/eyebrows${look.skin}_1.png`,
    `Eyes/eyes${look.eyes}_${look.eyeColor}.png`, `Mouth/mouth${look.skin}_1.png`,
    `Hair/hair${look.hair}_${look.hairColor}.png`,
  ].map(file => base + file)
}
export const HAIR_COLORS = [
  ['Платиновый', '#eadbd1'], ['Золотистый', '#e6d495'], ['Песочный', '#cabc8a'],
  ['Карамельный', '#b9874f'], ['Ореховый', '#89623f'], ['Шоколадный', '#43311d'],
  ['Чёрный', '#242020'], ['Красный', '#a62f35'], ['Медный', '#d56d61'], ['Персиковый', '#f2997a'],
  ['Розовый', '#dfabc1'], ['Голубой', '#569dc6'], ['Сиреневый', '#ad8ed0'],
  ['Лавандовый', '#b9b3dc'], ['Мятный', '#97d1b6'],
] as const
export const SKIN_COLORS = [['Фарфоровый', '#ffe5d1'], ['Светлый', '#f6dfa5'], ['Золотистый', '#d0a071'], ['Смуглый', '#b98959'], ['Тёмный', '#956a44']] as const
export const EYE_COLORS = [['Карий', '#765047'], ['Медовый', '#a9763b'], ['Зелёный', '#527953'], ['Бирюзовый', '#4f7d72'], ['Голубой', '#5d98a7'], ['Синий', '#546eae'], ['Фиолетовый', '#9a86ad'], ['Серый', '#9eaca6'], ['Тёмно-серый', '#696e6b'], ['Чёрный', '#333838']] as const
export const HAIR_NAMES = ['Длинные волны', 'Прямые с чёлкой', 'Каре', 'Высокий пучок', 'Боковой хвост']
export const TOP_NAMES = ['Блуза', 'С рубашкой', 'Топ с узлом', 'Футболка', 'Лонгслив']
export const BOTTOM_NAMES = ['Джинсы', 'Шорты', 'Юбка']
export const KERI_PRESETS: { name: string; caption: string; look: KeriLook }[] = [
  { name: 'Каждый день', caption: 'Светлая база и деним', look: { ...DEFAULT_KERI_LOOK } },
  { name: 'Мягкий акцент', caption: 'Тёплые оттенки', look: { ...DEFAULT_KERI_LOOK, hair: 3, hairColor: 4, top: 2, topColor: 2, bottom: 3, bottomColor: 2 } },
  { name: 'После студии', caption: 'Выразительный образ', look: { ...DEFAULT_KERI_LOOK, hair: 5, hairColor: 7, top: 1, topColor: 3, bottom: 2, bottomColor: 1 } },
  { name: 'Новое настроение', caption: 'Попробуй цвет', look: { ...DEFAULT_KERI_LOOK, hair: 4, hairColor: 13, top: 3, topColor: 4, bottom: 1, bottomColor: 2 } },
]
