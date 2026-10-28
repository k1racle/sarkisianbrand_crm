export type DayWidgetId = 'queue' | 'calendar' | 'results' | 'clock' | 'funnel' | 'interactions' | 'shortcuts';
export type DayWidgetWidth = 4 | 6 | 8 | 12;
export type DayWidgetLayout = { id: DayWidgetId; width: DayWidgetWidth; visible: boolean }[];
export const DAY_WIDGETS: ReadonlyArray<{ id: DayWidgetId; title: string; widths: readonly DayWidgetWidth[]; defaultWidth: DayWidgetWidth }> = [
  { id: 'queue', title: 'Требует внимания', widths: [6, 8, 12], defaultWidth: 8 },
  { id: 'calendar', title: 'Календарь на сегодня', widths: [4, 6, 12], defaultWidth: 4 },
  { id: 'results', title: 'Результаты продаж', widths: [6, 12], defaultWidth: 12 },
  { id: 'clock', title: 'Учёт рабочего времени', widths: [6, 12], defaultWidth: 12 },
  { id: 'funnel', title: 'Продажи по этапам', widths: [4, 6, 12], defaultWidth: 6 },
  { id: 'interactions', title: 'Последние контакты', widths: [4, 6, 12], defaultWidth: 6 },
  { id: 'shortcuts', title: 'Рабочие разделы', widths: [6, 12], defaultWidth: 12 },
];
export const DAY_WIDGET_WIDTH_LABELS: Record<DayWidgetWidth, string> = { 4: '⅓ строки', 6: '½ строки', 8: '⅔ строки', 12: 'Вся строка' };
export function createDefaultDayWidgets(): DayWidgetLayout { return DAY_WIDGETS.map(widget => ({ id: widget.id, width: widget.defaultWidth, visible: true })); }
export function sanitizeDayWidgetLayout(value: unknown): DayWidgetLayout {
  const result: DayWidgetLayout = [], seen = new Set<DayWidgetId>();
  for (const item of Array.isArray(value) ? value.slice(0, 100) : []) {
    if (!item || typeof item !== 'object') continue;
    const definition = DAY_WIDGETS.find(widget => widget.id === item.id);
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    result.push({ id: definition.id, width: definition.widths.includes(item.width) ? item.width : definition.defaultWidth, visible: typeof item.visible === 'boolean' ? item.visible : true });
  }
  for (const widget of createDefaultDayWidgets()) if (!seen.has(widget.id)) result.push(widget);
  return result;
}
export function decodeDayWidgetSettings(raw: string | null): { layout: DayWidgetLayout; recovered: boolean } {
  if (raw === null) return { layout: createDefaultDayWidgets(), recovered: false };
  try {
    if (raw.length > 16000) throw new Error('Oversized widget settings');
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.widgets)) throw new Error('Unsupported widget settings');
    const layout = sanitizeDayWidgetLayout(data.widgets);
    const recovered = JSON.stringify(data.widgets) !== JSON.stringify(layout);
    return { layout, recovered };
  } catch { return { layout: createDefaultDayWidgets(), recovered: true }; }
}
export function encodeDayWidgetSettings(layout: DayWidgetLayout): string { return JSON.stringify({ version: 1, widgets: sanitizeDayWidgetLayout(layout) }); }
export function moveDayWidget(layout: DayWidgetLayout, id: DayWidgetId, direction: -1 | 1): DayWidgetLayout {
  const result = sanitizeDayWidgetLayout(layout), index = result.findIndex(widget => widget.id === id), next = index + direction;
  if (index >= 0 && next >= 0 && next < result.length) [result[index], result[next]] = [result[next], result[index]];
  return result;
}
