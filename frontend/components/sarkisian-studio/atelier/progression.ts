export type ClientRecord = { visits: number; trust: number; lastStars: number; lastVisit: number }
export type ShiftVisit = { briefId: string; customer: string; kind: 'manicure' | 'pedicure'; color: string; accent: boolean; stars: number; accuracy: number; reward: number; returning: boolean }
export type Shift = { number: number; startServed: number; visits: ShiftVisit[] }
export type Progression = { reputation: number; clients: Record<string, ClientRecord>; shift: Shift }
export type ShiftGoal = { id: string; name: string; target: number; reward: number; current: number }
export const REPUTATION_TIERS = [
  { at: 0, name: 'Первые рекомендации' }, { at: 20, name: 'Мастер на слуху' },
  { at: 50, name: 'Любимая студия' }, { at: 80, name: 'Безупречная репутация' },
] as const
export function reputationTitle(points: number) { return [...REPUTATION_TIERS].reverse().find(t => points >= t.at)!.name }
export function freshProgression(served = 0): Progression {
  return { reputation: 0, clients: {}, shift: { number: Math.floor(served / 3) + 1, startServed: served, visits: [] } }
}
export function loyaltyTip(progress: Progression, briefId: string, stars: number) {
  const trust = progress.clients[briefId]?.trust ?? 0
  return stars >= 4 && trust >= 2 ? Math.min(45, trust * 8) : 0
}
export function recordVisit(progress: Progression, visit: Omit<ShiftVisit, 'returning'>, served: number) {
  if (progress.shift.visits.length >= 3) throw new Error('Смена завершена. Подведите итоги, чтобы открыть следующую.')
  const previous = progress.clients[visit.briefId]
  const delta = visit.stars === 5 ? 10 : visit.stars === 4 ? 7 : visit.stars === 3 ? 2 : -4
  const reputation = Math.max(0, Math.min(100, progress.reputation + delta))
  const client: ClientRecord = {
    visits: (previous?.visits ?? 0) + 1,
    trust: Math.max(0, Math.min(5, (previous?.trust ?? 0) + (visit.stars >= 4 ? 1 : visit.stars <= 2 ? -1 : 0))),
    lastStars: visit.stars, lastVisit: served,
  }
  return {
    progression: { reputation, clients: { ...progress.clients, [visit.briefId]: client }, shift: { ...progress.shift, visits: [...progress.shift.visits, { ...visit, returning: !!previous }] } },
    reputationDelta: reputation - progress.reputation, client,
  }
}
export function shiftGoals(shift: Shift): ShiftGoal[] {
  const v = shift.visits
  const sets: ShiftGoal[][] = [
    [
      { id: 'quality', name: 'Два приёма на 4–5 звёзд', target: 2, current: v.filter(x => x.stars >= 4).length, reward: 80 },
      { id: 'variety', name: 'Маникюр и педикюр за смену', target: 2, current: new Set(v.map(x => x.kind)).size, reward: 70 },
      { id: 'precision', name: 'Два финиша с точностью от 85%', target: 2, current: v.filter(x => x.accuracy >= 85).length, reward: 60 },
    ],
    [
      { id: 'return', name: 'Принять знакомого гостя', target: 1, current: v.filter(x => x.returning).length, reward: 90 },
      { id: 'accent', name: 'Выполнить заказ с одним акцентом', target: 1, current: v.filter(x => x.accent && x.stars >= 4).length, reward: 80 },
      { id: 'revenue', name: 'Заработать 600 монет на приёмах', target: 600, current: v.reduce((sum, x) => sum + x.reward, 0), reward: 80 },
    ],
    [
      { id: 'five', name: 'Две работы на 5 звёзд', target: 2, current: v.filter(x => x.stars === 5).length, reward: 100 },
      { id: 'colors', name: 'Три разных основных оттенка', target: 3, current: new Set(v.map(x => x.color)).size, reward: 90 },
      { id: 'steady', name: 'Три финиша с точностью от 70%', target: 3, current: v.filter(x => x.accuracy >= 70).length, reward: 100 },
    ],
  ]
  return sets[(shift.number - 1) % sets.length]!.map(g => ({ ...g, current: Math.min(g.target, g.current) }))
}
export function shiftReward(shift: Shift) { return 50 + shiftGoals(shift).filter(g => g.current >= g.target).reduce((sum, g) => sum + g.reward, 0) }
export function advanceShift<T extends { career: Progression & { served: number; earnings: number; active: unknown } }>(state: T, number: number): T {
  const { career } = state
  if (career.shift.number !== number || career.shift.visits.length !== 3 || career.active) throw new Error('Сначала завершите три приёма этой смены.')
  return { ...state, career: { ...career, earnings: career.earnings + shiftReward(career.shift), shift: { number: number + 1, startServed: career.served, visits: [] } } }
}
const integer = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max
export function restoreProgression(raw: unknown, served: number, validIds: string[]): Progression {
  const base = freshProgression(served)
  if (!raw || typeof raw !== 'object') return base
  const p = raw as Partial<Progression>
  if (integer(p.reputation, 0, 100)) base.reputation = p.reputation!
  if (p.clients && typeof p.clients === 'object') for (const id of validIds) {
    const c = p.clients[id]
    if (c && integer(c.visits, 1, served) && integer(c.trust, 0, 5) && integer(c.lastStars, 1, 5) && integer(c.lastVisit, 1, served)) base.clients[id] = { visits: c.visits, trust: c.trust, lastStars: c.lastStars, lastVisit: c.lastVisit }
  }
  const s = p.shift
  if (s && integer(s.number, 1, served + 1) && integer(s.startServed, 0, served) && Array.isArray(s.visits) && s.visits.length <= 3 && s.visits.length === served - s.startServed) {
    const valid = s.visits.every(v => v && validIds.includes(v.briefId) && typeof v.customer === 'string' && ['manicure', 'pedicure'].includes(v.kind) && typeof v.color === 'string' && typeof v.accent === 'boolean' && integer(v.stars, 1, 5) && integer(v.accuracy, 0, 100) && integer(v.reward, 0, 500) && typeof v.returning === 'boolean')
    if (valid) base.shift = { number: s.number, startServed: s.startServed, visits: s.visits.map(v => ({ ...v, customer: v.customer.slice(0, 30), color: v.color.slice(0, 20) })) }
  }
  return base
}
