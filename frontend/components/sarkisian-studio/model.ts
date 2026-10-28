import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from './character/appearance.ts'
import { DEFAULT_KERI_LOOK, parseKeriLook, type KeriLook } from './keri/look.ts'
import { freshProgression, restoreProgression, recordVisit, loyaltyTip, type Progression } from './atelier/progression.ts'
import { freshSupplies, restoreSupplies, supplyById, supplyBonus, STOCK_LIMIT, type Supplies, type SupplyId } from './atelier/supplies.ts'
import { COLORS, PATTERNS, FINISHES, NAIL_SHAPES, NAIL_LENGTHS, colorHex, isColor, isPattern, isFinish, type ColorId, type PatternId, type FinishId } from './manicure-catalog.ts'
import { freshPreparation, parsePreparation, preparedNails, type Preparation } from './atelier/preparation.ts'
export { COLORS, PATTERNS, FINISHES, NAIL_SHAPES, NAIL_LENGTHS, colorHex }
export type { ColorId, PatternId, FinishId }
export type Nail = { color: ColorId | null; pattern: PatternId; accentColor?: ColorId; finish?: FinishId }
export function parseNail(raw: Partial<Nail> | null | undefined): Nail {
  return { color: isColor(raw?.color) ? raw.color : null, pattern: isPattern(raw?.pattern) ? raw.pattern : 'plain',
    accentColor: isColor(raw?.accentColor) ? raw.accentColor : 'porcelain', finish: isFinish(raw?.finish) ? raw.finish : 'glossy' }
}
export type NailShape = typeof NAIL_SHAPES[number]['id']
export type NailLength = typeof NAIL_LENGTHS[number]['id']
export type Design = { kind: 'manicure' | 'pedicure'; nails: Nail[]; shape?: NailShape; length?: NailLength }
export type SavedDesign = Design & { id: string; name: string; createdAt: string; material?: SupplyId }
export type StudioState = {
  version: 1; designs: SavedDesign[]; completed: string[]; activeQuest: string | null;
  volume: number; track: number; playerName: string; career: Career; appearance: Appearance; keriLook:KeriLook; work: WorkSession | null; supplies: Supplies
}
export interface StorageAdapter { load(): StudioState | null | Promise<StudioState | null>; save(state: StudioState): void | Promise<void> }
export type Quest = { id: string; title: string; brief: string; reward: number; kind: Design['kind']; steps: string[] }
export const QUESTS: Quest[] = [
  { id: 'first-french', title: 'Твой первый френч', brief: 'Начнём с классики. Выбери пудровый нюд и добавь тонкую белую улыбку на каждый ноготь. Дизайн, который всегда к месту.', reward: 150, kind: 'manicure', steps: ['Выбери «Пудровый нюд»', 'Добавь френч на все 5 ногтей', 'Сохрани работу в портфолио'] },
  { id: 'cherry-evening', title: 'Вишнёвый вечер', brief: 'Создадим вечерний образ: вишнёвое покрытие на всех ногтях и золотой акцент хотя бы на одном.', reward: 200, kind: 'manicure', steps: ['Выбери «Вишнёвый вечер»', 'Добавь золотой акцент', 'Сохрани готовый маникюр'] },
  { id: 'pedicure-milk', title: 'Лёгкость в каждом шаге', brief: 'Время для педикюра. Молочное однотонное покрытие подчеркнёт любой летний образ.', reward: 200, kind: 'pedicure', steps: ['Открой педикюр', 'Нанеси «Молочную вуаль» на 5 ногтей', 'Выбери однотонный дизайн и сохрани'] },
]
export const STORAGE_KEY = 'sarkisian.studio.v1'
export function blankDesign(kind: Design['kind'] = 'manicure'): Design {
  return { kind, nails: Array.from({ length: 5 }, () => ({ color: null, pattern: 'plain' })) }
}
export function freshState(): StudioState {
  return { version: 1, designs: [], completed: [], activeQuest: null, volume: 0.3, track: 0, playerName: 'Моя студия', career: freshCareer(), appearance: { ...DEFAULT_APPEARANCE },keriLook:{...DEFAULT_KERI_LOOK}, work: null, supplies: freshSupplies() }
}
export function isComplete(design: Design): boolean { return design.nails.length === 5 && design.nails.every(n => n.color !== null) }
export function questMatches(id: string, design: Design): boolean {
  if (!isComplete(design)) return false
  if (id === 'first-french') return design.kind === 'manicure' && design.nails.every(n => n.color === 'rose' && n.pattern === 'french')
  if (id === 'cherry-evening') return design.kind === 'manicure' && design.nails.every(n => n.color === 'wine') && design.nails.some(n => n.pattern === 'gold')
  if (id === 'pedicure-milk') return design.kind === 'pedicure' && design.nails.every(n => n.color === 'milk' && n.pattern === 'plain')
  return false
}
export function coinBalance(state: StudioState): number { return 1250 + QUESTS.filter(q => state.completed.includes(q.id)).reduce((sum, q) => sum + q.reward, 0) + state.career.earnings - UPGRADES.filter(u => state.career.upgrades.includes(u.id)).reduce((sum, u) => sum + u.price, 0) - state.supplies.spent }
export function nextQuest(state: StudioState): Quest | undefined { return QUESTS.find(q => !state.completed.includes(q.id)) }
export function commitDesign(state: StudioState, design: Design, name: string, id: string, createdAt: string) {
  if (!isComplete(design)) throw new Error('Сначала нанеси покрытие на все пять ногтей.')
  const saved: SavedDesign = { ...structuredClone(design), id, name: name.trim().slice(0, 60) || 'Мой дизайн', createdAt }
  const quest = QUESTS.find(q => q.id === state.activeQuest)
  const earned = quest && !state.completed.includes(quest.id) && questMatches(quest.id, design) ? quest : null
  const next = { ...state, designs: [saved, ...state.designs.filter(d => d.id !== id)].slice(0, 24), completed: earned ? [...state.completed, earned.id] : [...state.completed], activeQuest: earned ? null : state.activeQuest }
  return { state: next, earned, saved }
}
export function parseState(raw: unknown): StudioState {
  const fallback = freshState()
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1) return fallback
  const data = raw as Partial<StudioState>
  const validNail = (n: any): n is Nail => n && COLORS.some(c => c.id === n.color) && PATTERNS.some(p => p.id === n.pattern)
  const designs = Array.isArray(data.designs) ? data.designs.filter((d): d is SavedDesign => !!d && typeof d.id === 'string' && typeof d.name === 'string' && typeof d.createdAt === 'string' && Number.isFinite(Date.parse(d.createdAt)) && ['manicure', 'pedicure'].includes(d.kind) && Array.isArray(d.nails) && d.nails.length === 5 && d.nails.every(validNail)).slice(0, 24).map(d => ({ ...d, nails: d.nails.map(parseNail), ...parseNailFit(d), name: d.name.slice(0, 60) })) : []
  const completed = Array.isArray(data.completed) ? [...new Set(data.completed.filter(id => QUESTS.some(q => q.id === id)))] : []
  const career = parseCareer(data.career)
  const supplies = restoreSupplies(data.supplies, coinBalance({ ...fallback, career, completed }))
  const work = parseWork(data.work, career)
  if (work?.supply && supplies.stock[work.supply] === 0) work.supply = null
  return { ...fallback, designs, completed, career, supplies, work, appearance: parseAppearance(data.appearance),keriLook:parseKeriLook(data.keriLook), activeQuest: QUESTS.some(q => q.id === data.activeQuest) && !completed.includes(data.activeQuest!) ? data.activeQuest! : null,
    volume: typeof data.volume === 'number' && Number.isFinite(data.volume) ? Math.min(1, Math.max(0, data.volume)) : fallback.volume,
    track: data.track === 1 ? 1 : 0, playerName: typeof data.playerName === 'string' ? data.playerName.trim().slice(0, 24) || fallback.playerName : fallback.playerName }
}
export function localStorageAdapter(): StorageAdapter {
  return { load() { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; try { return parseState(JSON.parse(raw)) } catch { return freshState() } }, save(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } }
}

export type UpgradeId = 'organizer' | 'lamp' | 'pastel'
export type OrderTicket = { serial: number; briefId: string; fitted?: boolean }
export type Career = Progression & { served: number; earnings: number; stars: number; upgrades: UpgradeId[]; active: OrderTicket | null }
export type OrderBrief = {
  id: string; customer: string; title: string; wish: string; kind: Design['kind']
  color: ColorId; pattern: PatternId; accent: number | null; reward: number; requires?: UpgradeId
  shape?: NailShape; length?: NailLength; reputation?: number
}
export const UPGRADES: { id: UpgradeId; name: string; price: number; benefit: string; icon: string }[] = [
  { id: 'organizer', name: 'Органайзер мастера', price: 350, benefit: 'Подготовка всех пяти ногтей одной кнопкой. Меньше рутины — больше дизайна.', icon: '01' },
  { id: 'lamp', name: 'Рабочая лампа', price: 550, benefit: 'Более широкая зона точности на финальном штрихе. Легче получить бонус за аккуратность.', icon: '02' },
  { id: 'pastel', name: 'Коллекция Pastel', price: 600, benefit: 'Два новых оттенка: лавандовый и небесный. Открывает новые запросы посетителей.', icon: '03' },
]
export const ORDERS: OrderBrief[] = [
  { id: 'anna-french', customer: 'Анна', title: 'На важную встречу', wish: 'Хочу спокойный пудровый френч на всех ногтях.', kind: 'manicure', color: 'rose', pattern: 'french', accent: null, reward: 180, shape: 'almond', length: 'natural' },
  { id: 'mila-evening', customer: 'Мила', title: 'Вечер в городе', wish: 'Вишнёвый маникюр. Золото — только на ногте № 4, остальные однотонные.', kind: 'manicure', color: 'wine', pattern: 'gold', accent: 3, reward: 240, shape: 'square', length: 'extended' },
  { id: 'lera-holiday', customer: 'Лера', title: 'Чемодан собран', wish: 'Молочный педикюр, однотонный и без акцентов.', kind: 'pedicure', color: 'milk', pattern: 'plain', accent: null, reward: 200 },
  { id: 'sonya-sage', customer: 'Соня', title: 'Ближе к природе', wish: 'Шалфей на всех ногтях и жемчуг только на ногте № 3.', kind: 'manicure', color: 'sage', pattern: 'dots', accent: 2, reward: 230, shape: 'oval', length: 'natural' },
  { id: 'eva-black', customer: 'Ева', title: 'Маленькое чёрное', wish: 'Чёрное покрытие, тонкий золотой акцент на каждом ногте.', kind: 'manicure', color: 'black', pattern: 'gold', accent: null, reward: 250, shape: 'almond', length: 'extended' },
  { id: 'ira-peach', customer: 'Ира', title: 'Персиковое утро', wish: 'Однотонный персиковый педикюр — под новые босоножки.', kind: 'pedicure', color: 'peach', pattern: 'plain', accent: null, reward: 190 },
  { id: 'asya-lavender', customer: 'Ася', title: 'Лавандовое настроение', wish: 'Лавандовый оттенок и жемчуг на всех ногтях.', kind: 'manicure', color: 'lavender', pattern: 'dots', accent: null, reward: 290, requires: 'pastel', shape: 'oval', length: 'extended' },
  { id: 'nina-blue', customer: 'Нина', title: 'Выше облаков', wish: 'Небесный педикюр с френчем на каждом ногте.', kind: 'pedicure', color: 'blue', pattern: 'french', accent: null, reward: 280, requires: 'pastel' },
  { id: 'dasha-shoot', customer: 'Даша', title: 'Съёмка новой коллекции', wish: 'Для съёмки нужен красный маникюр. Один золотой акцент — на ногте № 3.', kind: 'manicure', color: 'red', pattern: 'gold', accent: 2, reward: 340, shape: 'square', length: 'extended', reputation: 20 },
  { id: 'olga-wedding', customer: 'Ольга', title: 'Тот самый день', wish: 'Нежный молочный маникюр с жемчугом на каждом ногте. Хочу сохранить его на свадебных фотографиях.', kind: 'manicure', color: 'milk', pattern: 'dots', accent: null, reward: 360, shape: 'oval', length: 'extended', reputation: 50 },
  { id: 'vika-marble', customer: 'Вика', title: 'Камень и шёлк', wish: 'Латте и мрамор на каждом ногте. Форма — балерина, удлинённая.', kind: 'manicure', color: 'latte', pattern: 'marble', accent: null, reward: 310, shape: 'coffin', length: 'extended' },
  { id: 'alice-flowers', customer: 'Алиса', title: 'Цветочное настроение', wish: 'Балетная роза и цветы на каждом ногте. Короткий круг.', kind: 'manicure', color: 'ballet', pattern: 'flowers', accent: null, reward: 300, shape: 'round', length: 'short' },
  { id: 'polina-sky', customer: 'Полина', title: 'Переход цвета', wish: 'Барвинок с градиентом на всех ногтях. Удлинённый овал.', kind: 'manicure', color: 'periwinkle', pattern: 'ombre', accent: null, reward: 320, shape: 'oval', length: 'extended' },
  { id: 'rita-swirl', customer: 'Рита', title: 'Ритм города', wish: 'Яркая фуксия и волны на каждом ногте. Длинный стилет.', kind: 'manicure', color: 'fuchsia', pattern: 'swirl', accent: null, reward: 350, shape: 'stiletto', length: 'long' },
  { id: 'zoya-moon', customer: 'Зоя', title: 'Лунная дорожка', wish: 'Изумрудный лунный маникюр. Миндаль естественной длины.', kind: 'manicure', color: 'emerald', pattern: 'moon', accent: null, reward: 300, shape: 'almond', length: 'natural' },
  { id: 'lisa-hearts', customer: 'Лиза', title: 'Тёплые чувства', wish: 'Малиновый цвет и сердца только на ногте № 4. Короткий квадрат.', kind: 'manicure', color: 'raspberry', pattern: 'hearts', accent: 3, reward: 310, shape: 'square', length: 'short' },
  { id: 'taya-geometric', customer: 'Тая', title: 'Чистая геометрия', wish: 'Графит и геометрия на всех ногтях. Балерина, экстра-длина.', kind: 'manicure', color: 'graphite', pattern: 'diagonal', accent: null, reward: 350, shape: 'coffin', length: 'long' },
  { id: 'masha-summer', customer: 'Маша', title: 'Лето близко', wish: 'Коралловый педикюр с цветным френчем на всех ногтях.', kind: 'pedicure', color: 'coral', pattern: 'colored-french', accent: null, reward: 290 },
  { id: 'yana-leopard', customer: 'Яна', title: 'Дикий акцент', wish: 'Песочный цвет, леопард только на ногте № 3. Длинный миндаль.', kind: 'manicure', color: 'sand', pattern: 'leopard', accent: 2, reward: 330, shape: 'almond', length: 'long' },
  { id: 'kira-stars', customer: 'Кира', title: 'Звёздная ночь', wish: 'Полночь и звёзды на всех ногтях. Длинный стилет.', kind: 'manicure', color: 'midnight', pattern: 'stars', accent: null, reward: 380, shape: 'stiletto', length: 'long', reputation: 20 },
  { id: 'nelli-checker', customer: 'Нелли', title: 'Смелые сочетания', wish: 'Лайм и шахматный рисунок на всех ногтях. Короткий квадрат.', kind: 'manicure', color: 'lime', pattern: 'checker', accent: null, reward: 340, shape: 'square', length: 'short' },
  { id: 'dina-aura', customer: 'Дина', title: 'Мягкое свечение', wish: 'Сиреневая дымка с аурой на каждом ногте. Естественный овал.', kind: 'manicure', color: 'lilac', pattern: 'aura', accent: null, reward: 330, shape: 'oval', length: 'natural' },
]
export function freshCareer(): Career { return { ...freshProgression(), served: 0, earnings: 0, stars: 0, upgrades: [], active: null } }
export function studioLevel(state: StudioState) { return 1 + Math.floor(state.career.served / 3) }
export function availableColors(state: StudioState) { return COLORS.filter(c => !['lavender', 'blue'].includes(c.id) || state.career.upgrades.includes('pastel')) }
export function availableOrders(state: StudioState) {
  const seen = new Set(state.career.shift.visits.map(v => v.briefId))
  const unlocked = ORDERS.filter(o => !seen.has(o.id) && (!o.requires || state.career.upgrades.includes(o.requires)) && (!o.reputation || state.career.reputation >= o.reputation))
  const returning = unlocked.filter(o => state.career.clients[o.id]).sort((a, b) => state.career.clients[a.id]!.lastVisit - state.career.clients[b.id]!.lastVisit)[0]
  const special = unlocked.filter(o => o.reputation && !state.career.clients[o.id])[0]
  const base = ORDERS.filter(o => !o.requires && !o.reputation)
  const rotated = Array.from({ length: base.length }, (_, i) => base[(state.career.served + i) % base.length]!).filter(o => !seen.has(o.id))
  const candidates: OrderBrief[] = []
  if (special) candidates.push(special)
  // Show the benefit immediately, irrespective of the number already served.
  if (state.career.upgrades.includes('pastel')) {
    const premium = unlocked.filter(o => o.requires === 'pastel')
    if (premium.length) candidates.push(premium[state.career.served % premium.length]!)
  }
  candidates.push(candidates.length >= 2 && returning ? returning : rotated[0]!)
  if (returning) candidates.push(returning)
  candidates.push(...rotated)
  return candidates.filter((o, i) => candidates.findIndex(c => c.id === o.id) === i).slice(0, 3)
}
export function acceptOrder(state: StudioState, briefId: string): StudioState {
  if (state.career.shift.visits.length >= 3) throw new Error('Смена завершена. Заберите награду и откройте следующую.')
  if (state.career.active) throw new Error('Сначала закончи текущую работу.')
  if (!availableOrders(state).some(o => o.id === briefId)) throw new Error('Этот запрос сейчас недоступен.')
  return { ...state, career: { ...state.career, active: { serial: state.career.served + 1, briefId, fitted: true } } }
}
export function buyUpgrade(state: StudioState, id: UpgradeId, balance = coinBalance(state)): StudioState {
  const upgrade = UPGRADES.find(u => u.id === id)
  if (!upgrade) throw new Error('Улучшение не найдено.')
  if (state.career.upgrades.includes(id)) throw new Error('Улучшение уже установлено.')
  if (balance < upgrade.price) throw new Error('Пока не хватает монет. Выполни ещё один запрос.')
  return { ...state, career: { ...state.career, upgrades: [...state.career.upgrades, id] } }
}
export function buySupply(state: StudioState, id: SupplyId, balance = coinBalance(state)): StudioState {
  const item = supplyById(id)
  if (!item) throw new Error('Материал не найден.')
  if (state.supplies.stock[id] + item.pack > STOCK_LIMIT) throw new Error('На полке уже достаточно этого материала.')
  if (balance < item.price) throw new Error('Не хватает игровых монет. Базовый набор всегда доступен бесплатно.')
  return { ...state, supplies: { spent: state.supplies.spent + item.price, stock: { ...state.supplies.stock, [id]: state.supplies.stock[id] + item.pack } } }
}
export function chooseSupply(state: StudioState, id: SupplyId | null): StudioState {
  const work = state.work
  if (!work || work.serial === null || work.serial !== state.career.active?.serial) throw new Error('Материалы с полки выбираются для приёма клиента.')
  if (work.stage === 'finish') throw new Error('Материал нужно выбрать до финального штриха.')
  if (id !== null && (!supplyById(id) || !state.supplies.stock[id])) throw new Error('Материал закончился. Пополните полку или выберите базовый набор.')
  return { ...state, work: { ...work, supply: id } }
}
export function evaluateOrder(brief: OrderBrief, design: Design) {
  const shapeMatch = brief.shape ? (design.shape ?? 'almond') === brief.shape : null
  const lengthMatch = brief.length ? (design.length ?? 'natural') === brief.length : null
  const details = Number(shapeMatch === true) + Number(lengthMatch === true)
  const maximum = 10 + Number(shapeMatch !== null) + Number(lengthMatch !== null)
  if (design.kind !== brief.kind) return { colors: 0, patterns: 0, matches: 0, details: 0, maximum, shapeMatch, lengthMatch }
  const colors = design.nails.filter(n => n.color === brief.color).length
  const patterns = design.nails.filter((n, i) => n.color && n.pattern === (brief.accent === null || i === brief.accent ? brief.pattern : 'plain')).length
  return { colors, patterns, matches: colors + patterns, details, maximum, shapeMatch, lengthMatch }
}
export function activeBrief(state: StudioState): OrderBrief | undefined {
  const order = ORDERS.find(o => o.id === state.career.active?.briefId)
  return order && !state.career.active?.fitted ? { ...order, shape: undefined, length: undefined } : order
}
export type OrderResult = { brief: OrderBrief; stars: number; reward: number; bonus: number; colors: number; patterns: number; accuracy: number; saved: SavedDesign; shapeMatch: boolean | null; lengthMatch: boolean | null; tip: number; reputationDelta: number; trust: number; visits: number; material: { id: SupplyId; bonus: number; remaining: number } | null }
export function completeOrder(state: StudioState, serial: number, design: Design, prepared: number[], accuracy: number, id: string, createdAt: string): { state: StudioState; result: OrderResult } {
  const ticket = state.career.active
  const brief = activeBrief(state)
  if (!ticket || ticket.serial !== serial || serial !== state.career.served + 1 || !brief) throw new Error('Этот запрос уже завершён или больше не активен.')
  if (design.kind !== brief.kind || !isComplete(design) || new Set(prepared.filter(i => Number.isInteger(i) && i >= 0 && i < 5)).size !== 5) throw new Error('Сначала подготовь все ногти и закончи дизайн.')
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) throw new Error('Заверши финальный штрих.')
  const score = evaluateOrder(brief, design)
  const satisfaction = (score.matches + score.details) / score.maximum
  const stars = Math.max(1, Math.min(5, Math.round(satisfaction * 4 + accuracy / 100)))
  const bonus = Math.round(accuracy / 100 * 30)
  const tip = loyaltyTip(state.career, brief.id, stars)
  const supply = state.work?.serial === serial ? state.work.supply : null
  if (supply && (!supplyById(supply) || state.supplies.stock[supply] < 1)) throw new Error('Материал закончился. Пополните полку перед завершением приёма.')
  const material = supply ? { id: supply, bonus: supplyBonus(supply, design, stars, accuracy), remaining: state.supplies.stock[supply] - 1 } : null
  const supplies = material ? { ...state.supplies, stock: { ...state.supplies.stock, [material.id]: material.remaining } } : state.supplies
  const reward = Math.round(brief.reward * (.3 + .7 * satisfaction)) + bonus + tip + (material?.bonus ?? 0)
  const progression = recordVisit(state.career, { briefId: brief.id, customer: brief.customer, kind: brief.kind, color: design.nails[0]?.color ?? '', accent: brief.accent !== null, stars, accuracy: Math.round(accuracy), reward }, state.career.served + 1)
  const saved: SavedDesign = { ...structuredClone(design), id, name: brief.customer + ' · ' + brief.title, createdAt, ...(material ? { material: material.id } : {}) }
  const next: StudioState = { ...state, supplies, work: null, designs: [saved, ...state.designs.filter(d => d.id !== id)].slice(0, 24), career: { ...state.career, ...progression.progression, served: state.career.served + 1, earnings: state.career.earnings + reward, stars: state.career.stars + stars, active: null } }
  return { state: next, result: { brief, stars, reward, bonus, colors: score.colors, patterns: score.patterns, accuracy, saved, shapeMatch: score.shapeMatch, lengthMatch: score.lengthMatch, tip, reputationDelta: progression.reputationDelta, trust: progression.client.trust, visits: progression.client.visits, material } }
}

export type WorkSession = {
  rewardRunId?: string; rewardUserId?: string;
  serial: number | null; design: Design; prepared: number[]; preparation: Preparation;
  stage: 'prepare' | 'design' | 'finish'; accuracy: number | null; supply?: SupplyId | null;
}
export function newWork(kind: Design['kind'], serial: number | null = null): WorkSession {
  return { serial, design: blankDesign(kind), prepared: [], preparation: freshPreparation(), stage: 'prepare', accuracy: null, supply: null }
}
// Restore only a draft belonging to the current appointment. Invalid stages
// regress to the first unfinished step; a reload never fabricates a result.
export function parseWork(raw: unknown, career: Career): WorkSession | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Partial<WorkSession>
  if (w.serial !== null && w.serial !== career.active?.serial) return null
  if (w.serial === null && career.active) return null
  const kind = w.design?.kind
  if (kind !== 'manicure' && kind !== 'pedicure') return null
  if (career.active && ORDERS.find(o => o.id === career.active!.briefId)?.kind !== kind) return null
  if (!Array.isArray(w.design?.nails) || w.design.nails.length !== 5) return null
  const nails = w.design.nails.map(parseNail)
  const legacyPrepared = Array.isArray(w.prepared) ? [...new Set(w.prepared.filter(i => Number.isInteger(i) && i >= 0 && i < 5))] : []
  const preparation = parsePreparation(w.preparation, legacyPrepared)
  const prepared = preparedNails(preparation)
  const stage = prepared.length < 5 ? 'prepare' : w.stage === 'finish' && nails.every(n => n.color) ? 'finish' : w.stage === 'prepare' ? 'prepare' : 'design'
  const accuracy = stage === 'finish' && typeof w.accuracy === 'number' && Number.isFinite(w.accuracy) && w.accuracy >= 0 && w.accuracy <= 100 ? w.accuracy : null
  return { serial: w.serial ?? null, design: { kind, nails, ...parseNailFit(w.design) }, prepared, preparation, stage, accuracy, supply: w.serial !== null ? supplyById(w.supply)?.id ?? null : null, rewardRunId:typeof w.rewardRunId==='string'?w.rewardRunId:undefined, rewardUserId:typeof w.rewardUserId==='string'?w.rewardUserId:undefined }
}
export function parseNailFit(raw: unknown): Pick<Design, 'shape' | 'length'> {
  const d: Partial<Design> = raw && typeof raw === 'object' ? raw as Design : {}
  return { shape: NAIL_SHAPES.some(s => s.id === d.shape) ? d.shape : 'almond', length: NAIL_LENGTHS.some(l => l.id === d.length) ? d.length : 'natural' }
}
function parseCareer(raw: unknown): Career {
  const fallback = freshCareer()
  if (!raw || typeof raw !== 'object') return fallback
  const data = raw as Partial<Career>
  const integer = (n: unknown, max: number) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? Math.min(n, max) : 0
  const served = integer(data.served, 100000)
  const upgrades = Array.isArray(data.upgrades) ? [...new Set(data.upgrades.filter(id => UPGRADES.some(u => u.id === id)))] : []
  const active = data.active && typeof data.active === 'object' && data.active.serial === served + 1 && ORDERS.some(o => o.id === data.active!.briefId && (!o.requires || upgrades.includes(o.requires))) ? { serial: served + 1, briefId: data.active.briefId, fitted: data.active.fitted === true } : null
  const progression = restoreProgression(data, served, ORDERS.map(o => o.id))
  return { ...progression, served, upgrades, active, earnings: integer(data.earnings, served * 700), stars: integer(data.stars, served * 5) }
}
