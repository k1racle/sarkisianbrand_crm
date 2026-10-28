export type KeriLook = {
  skin: number; hair: number; hairColor: number; eyes: number; eyeColor: number;
  top: number; topColor: number; bottom: number; bottomColor: number;
  faceShape: number; brow: number; lipstick: number; blush: number; eyeshadow: number; eyeliner: number;
  freckles: number; glasses: number; earrings: number; necklace: number; hairAccessory: number; outfitPattern: number;
}
export const KERI_STORAGE_KEY = 'sarkisian.keri.look.v1'
export const KERI_SIZE = { width: 948, height: 1920 }
export const LOOK_LIMITS: Record<keyof KeriLook, number> = {
  skin: 5, hair: 8, hairColor: 15, eyes: 3, eyeColor: 10, top: 8, topColor: 6, bottom: 5, bottomColor: 6,
  faceShape: 3, brow: 3, lipstick: 7, blush: 5, eyeshadow: 7, eyeliner: 3,
  freckles: 2, glasses: 4, earrings: 4, necklace: 4, hairAccessory: 4, outfitPattern: 4,
}
export const DEFAULT_KERI_LOOK: KeriLook = {
  skin: 2, hair: 2, hairColor: 6, eyes: 1, eyeColor: 1, top: 4, topColor: 6, bottom: 1, bottomColor: 1,
  faceShape: 1, brow: 1, lipstick: 1, blush: 1, eyeshadow: 1, eyeliner: 1,
  freckles: 1, glasses: 1, earrings: 1, necklace: 1, hairAccessory: 1, outfitPattern: 1,
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
  const top = look.top > 5 ? [4, 2, 5][look.top - 6] : look.top
  const bottom = look.bottom > 3 ? [1, 3][look.bottom - 4] : look.bottom
  const hair = look.hair > 5 ? [2, 5, 1][look.hair - 6] : look.hair
  return [
    `Base/base${look.skin}.png`, `Bottoms/bottom${bottom}_${look.bottomColor}.png`,
    `Tops/top${top}_${look.topColor}.png`, `Eyebrows/eyebrows${look.skin}_1.png`,
    `Eyes/eyes${look.eyes}_${look.eyeColor}.png`, `Mouth/mouth${look.skin}_1.png`,
    `Hair/hair${hair}_${look.hairColor}.png`,
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
export const HAIR_NAMES = ['Длинные волны', 'Прямые с чёлкой', 'Каре', 'Высокий пучок', 'Боковой хвост', 'Два пучка', 'Боковая коса', 'Мальвинка']
export const TOP_NAMES = ['Блуза', 'С рубашкой', 'Топ с узлом', 'Футболка', 'Лонгслив', 'Фартук мастера', 'Жилет с рубашкой', 'Жакет']
export const BOTTOM_NAMES = ['Джинсы', 'Шорты', 'Юбка', 'Брюки', 'Длинная юбка плиссе']
export const OUTFIT_COLORS = [['Угольный', '#30333b'], ['Бежевый', '#c8b7a0'], ['Бордовый', '#82465b'], ['Лавандовый', '#a99ac0'], ['Шалфей', '#829584'], ['Молочный', '#e5ded3']] as const
export const LIP_COLORS = [['Без помады', 'transparent'], ['Нюд', '#b97775'], ['Роза', '#b94e72'], ['Коралловый', '#d76652'], ['Красный', '#ae243d'], ['Винный', '#6d2547'], ['Сливовый', '#814f84']] as const
export const BLUSH_COLORS = [['Без румян', 'transparent'], ['Персик', '#df9678'], ['Роза', '#df8fa7'], ['Тёплый', '#bd8164'], ['Ягодный', '#bf6487']] as const
export const SHADOW_COLORS = [['Без теней', 'transparent'], ['Шампань', '#c4a176'], ['Тауп', '#8e7a76'], ['Лиловый', '#a078ae'], ['Пыльная роза', '#bf859b'], ['Изумрудный', '#5c8b7c'], ['Смоки', '#514759']] as const
export const ACCESSORIES = {
  glasses: ['Без очков', 'Круглые', 'Кошачьи', 'Прямоугольные'], earrings: ['Без серёг', 'Гвоздики', 'Кольца', 'Подвески'],
  necklace: ['Без украшения', 'Цепочка', 'Жемчуг', 'Чокер'], hairAccessory: ['Без аксессуара', 'Бант', 'Ободок', 'Заколка'],
  outfitPattern: ['Однотонный', 'Полоска', 'Горошек', 'Цветочный'],
} as const
export const KERI_PRESETS: { name: string; caption: string; look: KeriLook }[] = [
  { name: 'Каждый день', caption: 'Светлая база и деним', look: { ...DEFAULT_KERI_LOOK } },
  { name: 'Мягкий акцент', caption: 'Тёплые оттенки', look: { ...DEFAULT_KERI_LOOK, hair: 3, hairColor: 4, top: 2, topColor: 2, bottom: 3, bottomColor: 2 } },
  { name: 'После студии', caption: 'Выразительный образ', look: { ...DEFAULT_KERI_LOOK, hair: 5, hairColor: 7, top: 1, topColor: 3, bottom: 2, bottomColor: 1 } },
  { name: 'Новое настроение', caption: 'Попробуй цвет', look: { ...DEFAULT_KERI_LOOK, hair: 4, hairColor: 13, top: 3, topColor: 4, bottom: 1, bottomColor: 2 } },
  { name: 'В своей студии', caption: 'Любимое дело', look: { ...DEFAULT_KERI_LOOK, hair: 6, top: 6, topColor: 1, lipstick: 2, earrings: 2 } },
  { name: 'Вечерний выход', caption: 'Золото и вино', look: { ...DEFAULT_KERI_LOOK, hair: 8, hairColor: 7, top: 8, topColor: 3, bottom: 5, bottomColor: 1, lipstick: 6, eyeliner: 3, earrings: 4, necklace: 2 } },
  { name: 'Творческий день', caption: 'Яркие детали', look: { ...DEFAULT_KERI_LOOK, hair: 7, hairColor: 11, top: 4, topColor: 2, bottom: 4, bottomColor: 4, glasses: 2, freckles: 2, outfitPattern: 2 } },
  { name: 'Нежность', caption: 'Свет и пастель', look: { ...DEFAULT_KERI_LOOK, hair: 1, hairColor: 1, top: 7, topColor: 6, bottom: 5, bottomColor: 2, blush: 3, eyeshadow: 2, necklace: 3, hairAccessory: 2 } },
]
