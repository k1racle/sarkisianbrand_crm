/* Pure preference schema checks: no browser, API, sessions or business writes. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, '../shared/crm-day-widgets.ts'), 'utf8');
  const model = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
  const { createDefaultDayWidgets, sanitizeDayWidgetLayout, decodeDayWidgetSettings, encodeDayWidgetSettings, moveDayWidget } = model;
  const defaults = createDefaultDayWidgets();
  assert.equal(defaults.length, 7);
  assert.deepEqual(defaults.map(widget => widget.width), [8, 4, 12, 12, 6, 6, 12]);
  const another = createDefaultDayWidgets(); another[0].visible = false;
  assert.equal(defaults[0].visible, true, 'Default arrays and records are independent');
  const safe = sanitizeDayWidgetLayout([{ id: 'calendar', width: 4, visible: false }, { id: 'queue', width: '12', visible: 'false' }, { id: 'calendar', width: 12 }, { id: '__proto__', width: 12 }, null, { id: 'funnel', width: 900, visible: false }]);
  assert.equal(safe.length, 7); assert.equal(new Set(safe.map(widget => widget.id)).size, 7);
  assert.deepEqual(safe[0], { id: 'calendar', width: 4, visible: false });
  assert.deepEqual(safe[1], { id: 'queue', width: 8, visible: true });
  assert.deepEqual(safe[2], { id: 'funnel', width: 6, visible: false });
  for (const raw of ['{broken', 'null', '[]', '{"version":2,"widgets":[]}', 'x'.repeat(16001)]) {
    const decoded = decodeDayWidgetSettings(raw); assert.equal(decoded.recovered, true); assert.deepEqual(decoded.layout, defaults);
  }
  assert.equal(decodeDayWidgetSettings(null).recovered, false);
  assert.deepEqual(decodeDayWidgetSettings(encodeDayWidgetSettings(safe)), { layout: safe, recovered: false });
  const reordered = moveDayWidget(defaults, 'calendar', -1);
  assert.equal(reordered[0].id, 'calendar'); assert.equal(defaults[0].id, 'queue', 'Moves do not mutate the original');
  assert.deepEqual(moveDayWidget(defaults, 'queue', -1), defaults);
  assert.deepEqual(moveDayWidget(defaults, 'shortcuts', 1), defaults);
  const allHidden = defaults.map(widget => ({ ...widget, visible: false }));
  assert.ok(decodeDayWidgetSettings(encodeDayWidgetSettings(allHidden)).layout.every(widget => !widget.visible), 'An intentionally empty desk remains empty');
  console.log('CRM Day widget schema: defaults, validation, recovery, roundtrip, immutable reorder PASS.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
