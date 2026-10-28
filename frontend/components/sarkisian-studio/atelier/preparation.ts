export const TECHNIQUES = [{ id: 'combined', name: 'Комбинированный' }, { id: 'hardware', name: 'Аппаратный' }, { id: 'classic', name: 'Классический' }] as const
export type Technique = typeof TECHNIQUES[number]['id']
export const TOOLS = [
  { id: 'wipe', name: 'Салфетка', kind: 'wipe' }, { id: 'carbide', name: 'Фреза «Кукуруза»', kind: 'drill' },
  { id: 'remover', name: 'Ремувер', kind: 'bottle' }, { id: 'pusher', name: 'Пушер', kind: 'pusher' },
  { id: 'flame', name: 'Фреза «Пламя»', kind: 'drill' }, { id: 'scissors', name: 'Ножницы', kind: 'scissors' },
  { id: 'nippers', name: 'Кусачки', kind: 'scissors' }, { id: 'ball', name: 'Фреза «Шар»', kind: 'drill' },
  { id: 'file', name: 'Пилка', kind: 'file' }, { id: 'buff', name: 'Баф', kind: 'buff' }, { id: 'base', name: 'База', kind: 'bottle' },
] as const
export type ToolId = typeof TOOLS[number]['id']
export type PrepStep = { id: string; name: string; hint: string; tools: ToolId[]; zone: 'plate' | 'cuticle' | 'sides' | 'tip' }
export const PREP_STEPS: PrepStep[] = [
  { id: 'clean', name: 'Очищение', hint: 'Проведите салфеткой по всей поверхности ногтя.', tools: ['wipe'], zone: 'plate' },
  { id: 'remove', name: 'Снятие покрытия', hint: 'Снимите старый цвет с ногтевой пластины выбранным инструментом.', tools: ['carbide', 'remover'], zone: 'plate' },
  { id: 'push', name: 'Поднятие кутикулы', hint: 'Пройдите по подсвеченной дуге у основания ногтя.', tools: ['pusher'], zone: 'cuticle' },
  { id: 'pocket', name: 'Боковые валики', hint: 'Обработайте подсвеченные края фрезой «Пламя».', tools: ['flame'], zone: 'sides' },
  { id: 'cut', name: 'Удаление кутикулы', hint: 'Ведите инструмент вдоль подсвеченной дуги.', tools: ['scissors', 'nippers', 'ball'], zone: 'cuticle' },
  { id: 'polish', name: 'Полировка кутикулы', hint: 'Завершите обработку дуги фрезой «Шар».', tools: ['ball'], zone: 'cuticle' },
  { id: 'shape', name: 'Опил формы', hint: 'Пройдите пилкой по свободному краю ногтя.', tools: ['file'], zone: 'tip' },
  { id: 'buff', name: 'Шлифовка', hint: 'Уберите неровности бафом по поверхности ногтя.', tools: ['buff'], zone: 'plate' },
  { id: 'base', name: 'Нанесение базы', hint: 'Распределите базу по ногтю перед цветным покрытием.', tools: ['base'], zone: 'plate' },
]
export type Preparation = { technique: Technique; tool: ToolId; progress: Record<string, number[]> }
export function preparationSteps(technique: Technique): PrepStep[] {
  return PREP_STEPS.filter(step => technique !== 'classic' || !['pocket', 'polish'].includes(step.id)).map(step => ({ ...step,
    tools: step.id === 'remove' ? [technique === 'classic' ? 'remover' : 'carbide'] : step.id === 'cut' ? technique === 'hardware' ? ['ball'] : ['scissors', 'nippers'] : step.tools,
  })).filter(step => technique !== 'hardware' || step.id !== 'polish')
}
export function freshPreparation(technique: Technique = 'combined'): Preparation { return { technique, tool: 'wipe', progress: {} } }
export function parsePreparation(raw: unknown, legacyPrepared: number[] = []): Preparation {
  const value = raw && typeof raw === 'object' ? raw as Partial<Preparation> : null
  const result = freshPreparation(TECHNIQUES.some(t => t.id === value?.technique) ? value!.technique! : 'combined')
  if (TOOLS.some(t => t.id === value?.tool)) result.tool = value!.tool!
  for (const step of preparationSteps(result.technique)) {
    const prev = preparationSteps(result.technique).slice(0, preparationSteps(result.technique).findIndex(s => s.id === step.id))
    result.progress[step.id] = Array.from({ length: 5 }, (_, i) => {
      if (!value) return legacyPrepared.includes(i) ? 100 : 0
      if (prev.some(s => result.progress[s.id]?.[i] !== 100)) return 0
      const p = value.progress?.[step.id]?.[i]
      return typeof p === 'number' && Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0
    })
  }
  return result
}
export function currentPrepStep(prep: Preparation): PrepStep | undefined { return preparationSteps(prep.technique).find(s => !prep.progress[s.id]?.every(p => p === 100)) }
export function preparedNails(prep: Preparation): number[] { return [0, 1, 2, 3, 4].filter(i => preparationSteps(prep.technique).every(s => prep.progress[s.id]?.[i] === 100)) }
export function prepProgress(prep: Preparation): number {
  const steps = preparationSteps(prep.technique)
  return Math.round(steps.reduce((total, step) => total + (prep.progress[step.id] ?? []).reduce((sum, p) => sum + p, 0), 0) / (steps.length * 5))
}
export function applyTool(prep: Preparation, nail: number, amount = 18): Preparation {
  const step = currentPrepStep(prep)
  if (!step || !step.tools.includes(prep.tool) || !Number.isInteger(nail) || nail < 0 || nail > 4) return prep
  const values = [...(prep.progress[step.id] ?? [0, 0, 0, 0, 0])]
  values[nail] = Math.min(100, values[nail]! + Math.max(0, Math.min(25, amount)))
  return { ...prep, progress: { ...prep.progress, [step.id]: values } }
}
