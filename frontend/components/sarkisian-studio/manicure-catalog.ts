export const COLORS = [
  { id: 'rose', name: 'Пудровый нюд', hex: '#d9a394', family: 'nude' },
  { id: 'milk', name: 'Молочная вуаль', hex: '#eee4d8', family: 'nude' },
  { id: 'peach', name: 'Персиковый шёлк', hex: '#d99b7e', family: 'nude' },
  { id: 'mauve', name: 'Пыльная роза', hex: '#b98089', family: 'nude' },
  { id: 'red', name: 'Красный бархат', hex: '#af3037', family: 'red' },
  { id: 'wine', name: 'Вишнёвый вечер', hex: '#642d3b', family: 'red' },
  { id: 'sage', name: 'Шалфей', hex: '#8f9a84', family: 'nature' },
  { id: 'black', name: 'Чёрный шёлк', hex: '#28282c', family: 'dark' },
  { id: 'lavender', name: 'Лавандовый сон', hex: '#b0a2cf', family: 'pastel' },
  { id: 'blue', name: 'Небесный шёлк', hex: '#9fbec9', family: 'pastel' },
  { id: 'porcelain', name: 'Фарфоровый', hex: '#fff8ee', family: 'nude' },
  { id: 'latte', name: 'Латте', hex: '#c4a18d', family: 'nude' },
  { id: 'sand', name: 'Тёплый песок', hex: '#d9bf9e', family: 'nude' },
  { id: 'cocoa', name: 'Какао', hex: '#8c6756', family: 'nude' },
  { id: 'taupe', name: 'Тауп', hex: '#9d8c86', family: 'nude' },
  { id: 'ballet', name: 'Балетная роза', hex: '#f2c6d2', family: 'pastel' },
  { id: 'lilac', name: 'Сиреневая дымка', hex: '#d6bde6', family: 'pastel' },
  { id: 'mint', name: 'Мятное облако', hex: '#b9ddd0', family: 'pastel' },
  { id: 'lemon', name: 'Лимонный крем', hex: '#f4e9a3', family: 'pastel' },
  { id: 'periwinkle', name: 'Барвинок', hex: '#a0abdb', family: 'pastel' },
  { id: 'coral', name: 'Коралловый риф', hex: '#ee7968', family: 'bright' },
  { id: 'fuchsia', name: 'Фуксия', hex: '#d82b83', family: 'bright' },
  { id: 'tangerine', name: 'Мандариновый', hex: '#f29338', family: 'bright' },
  { id: 'lime', name: 'Лайм', hex: '#b7d949', family: 'bright' },
  { id: 'electric', name: 'Электрик', hex: '#3158d7', family: 'bright' },
  { id: 'raspberry', name: 'Малиновый сорбет', hex: '#be3461', family: 'red' },
  { id: 'scarlet', name: 'Алый закат', hex: '#e0433b', family: 'red' },
  { id: 'burgundy', name: 'Бордо', hex: '#4e1f34', family: 'red' },
  { id: 'terracotta', name: 'Терракота', hex: '#ba6652', family: 'red' },
  { id: 'plum', name: 'Спелая слива', hex: '#724262', family: 'dark' },
  { id: 'emerald', name: 'Изумруд', hex: '#286859', family: 'nature' },
  { id: 'olive', name: 'Оливковый', hex: '#78814c', family: 'nature' },
  { id: 'forest', name: 'Хвойный лес', hex: '#25483e', family: 'nature' },
  { id: 'ocean', name: 'Глубокий океан', hex: '#24687c', family: 'nature' },
  { id: 'denim', name: 'Деним', hex: '#596e9f', family: 'dark' },
  { id: 'midnight', name: 'Полночь', hex: '#202c48', family: 'dark' },
  { id: 'graphite', name: 'Графит', hex: '#626169', family: 'dark' },
  { id: 'silver', name: 'Жидкое серебро', hex: '#c7cbd3', family: 'metal' },
  { id: 'champagne', name: 'Шампань', hex: '#d8bc82', family: 'metal' },
  { id: 'copper', name: 'Розовая медь', hex: '#c28b73', family: 'metal' },
] as const
export type ColorId = typeof COLORS[number]['id']
export const COLOR_FAMILIES = [{ id: 'all', name: 'Все оттенки' }, { id: 'nude', name: 'Нюд' }, { id: 'pastel', name: 'Пастель' }, { id: 'red', name: 'Красные' }, { id: 'bright', name: 'Яркие' }, { id: 'nature', name: 'Природные' }, { id: 'dark', name: 'Глубокие' }, { id: 'metal', name: 'Металлик' }]
export const PATTERNS = [
  { id: 'plain', name: 'Однотонный' }, { id: 'french', name: 'Френч' },
  { id: 'dots', name: 'Жемчуг' }, { id: 'gold', name: 'Золотой акцент' },
  { id: 'colored-french', name: 'Цветной френч' }, { id: 'ombre', name: 'Градиент' },
  { id: 'marble', name: 'Мрамор' }, { id: 'swirl', name: 'Волны' },
  { id: 'diagonal', name: 'Геометрия' }, { id: 'hearts', name: 'Сердца' },
  { id: 'flowers', name: 'Цветы' }, { id: 'stars', name: 'Звёзды' },
  { id: 'leopard', name: 'Леопард' }, { id: 'checker', name: 'Шахматный' },
  { id: 'aura', name: 'Аура' }, { id: 'negative', name: 'Воздушные линии' },
  { id: 'moon', name: 'Лунный' }, { id: 'confetti', name: 'Конфетти' },
] as const
export type PatternId = typeof PATTERNS[number]['id']
export const FINISHES = [{ id: 'glossy', name: 'Глянцевый' }, { id: 'matte', name: 'Матовый' }, { id: 'shimmer', name: 'Шиммер' }, { id: 'cat-eye', name: 'Кошачий глаз' }, { id: 'chrome', name: 'Хром' }] as const
export type FinishId = typeof FINISHES[number]['id']
export const NAIL_SHAPES = [{ id: 'almond', name: 'Миндаль' }, { id: 'oval', name: 'Овал' }, { id: 'square', name: 'Мягкий квадрат' }, { id: 'stiletto', name: 'Стилет' }, { id: 'coffin', name: 'Балерина' }, { id: 'round', name: 'Круг' }] as const
export const NAIL_LENGTHS = [{ id: 'short', name: 'Короткая' }, { id: 'natural', name: 'Естественная' }, { id: 'extended', name: 'Удлинённая' }, { id: 'long', name: 'Экстра-длина' }] as const
export const colorHex = (id: ColorId | null | undefined) => COLORS.find(c => c.id === id)?.hex ?? '#e5bbac'
export const isColor = (id: unknown): id is ColorId => COLORS.some(c => c.id === id)
export const isPattern = (id: unknown): id is PatternId => PATTERNS.some(p => p.id === id)
export const isFinish = (id: unknown): id is FinishId => FINISHES.some(p => p.id === id)
