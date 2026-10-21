import type { Design } from '../model.ts'

export const SUPPLIES = [
  { id: 'mousse', name: 'Гель-мусс', label: 'GEL MOUSSE', use: 'Удлинённый маникюр', price: 100, pack: 5, bonus: 45, shade: '#cba898', bottle: false },
  { id: 'speed', name: 'Скоростной гель', label: 'SPEED GEL', use: 'Маникюр естественной длины', price: 90, pack: 5, bonus: 40, shade: '#e5cebd', bottle: false },
  { id: 'polish', name: 'Гель-лак', label: 'GEL POLISH', use: 'Педикюр', price: 75, pack: 5, bonus: 35, shade: '#b3575d', bottle: true },
] as const
export type SupplyId = typeof SUPPLIES[number]['id']
export type Supplies = { stock: Record<SupplyId, number>; spent: number }
export const STOCK_LIMIT = 30
export function supplyById(id: unknown) { return SUPPLIES.find(s => s.id === id) }
export function freshSupplies(): Supplies { return { stock: { mousse: 2, speed: 2, polish: 2 }, spent: 0 } }
export function supplyFits(id: SupplyId, design: Pick<Design, 'kind' | 'length'>) {
  if (id === 'polish') return design.kind === 'pedicure'
  return design.kind === 'manicure' && (id === 'mousse' ? design.length === 'extended' : design.length !== 'extended')
}
export function supplyBonus(id: SupplyId, design: Design, stars: number, accuracy: number) {
  return supplyFits(id, design) && stars >= 4 && accuracy >= 85 ? supplyById(id)!.bonus : 0
}
export function restoreSupplies(raw: unknown, budget: number): Supplies {
  if (!raw || typeof raw !== 'object') return freshSupplies()
  const value = raw as Partial<Supplies>
  const stock = { mousse: 0, speed: 0, polish: 0 }
  for (const product of SUPPLIES) {
    const quantity = value.stock?.[product.id]
    if (typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity >= 0) stock[product.id] = Math.min(STOCK_LIMIT, quantity)
  }
  const spent = typeof value.spent === 'number' && Number.isSafeInteger(value.spent) && value.spent >= 0 ? Math.min(Math.max(0, budget), value.spent) : 0
  return { stock, spent }
}
