/* Runs actual selection logic with isolated Vue state and a fake router. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
const root = path.resolve(__dirname, '..');
const navigation = fs.readFileSync(path.join(root, 'composables/useWorkspaceNavigation.ts'), 'utf8');
const areas = vm.runInNewContext(navigation.match(/export const WORKSPACE_AREAS = (\[[\s\S]*?\]) as const;/)[1]);
const source = stripTypeScriptTypes(fs.readFileSync(path.join(root, 'composables/useWorkspaceAreaSelection.ts'), 'utf8'), { mode: 'transform' }).replace(/^import .*;\s*$/gm, '').replace('export function', 'function');
async function main() {
  const user = vue.ref({ id: 'qa-user' }), active = vue.ref({ id: 'crm', groupId: 'crm' });
  const groups = vue.ref(['crm', 'channels', 'catalog', 'support', 'reports'].map(id => ({ id, items: [{ id, to: '/' + id }] })));
  groups.value.push({ id: 'dashboard', items: [{ id: 'web-dashboard', to: '/admin-workspace/dashboard' }] });
  const states = new Map(), destinations = [];
  let declined = false;
  const context = { ...vue, WORKSPACE_AREAS: areas, useWorkspaceSession: () => ({ user }), useWorkspaceNavigation: () => ({ groups, active }), useState: (key, init) => { if (!states.has(key)) states.set(key, vue.ref(init())); return states.get(key); }, useRouter: () => ({ push: async to => { destinations.push(to); return declined ? { type: 'aborted' } : undefined; } }) };
  vm.runInNewContext(source + '; this.create = useWorkspaceAreaSelection;', context);
  const scope = vue.effectScope();
  const selection = scope.run(() => context.create());
  try {
    assert.deepEqual(Array.from(selection.areas.value, area => area.label), ['CRM', 'Маркетплейсы', 'Сайт', 'Поддержка', 'Управление']);
    assert.equal(selection.selectedArea.value.id, 'crm');
    const event = { target: { value: 'site' } };
    await selection.switchArea(event);
    assert.equal(destinations.at(-1), '/admin-workspace/dashboard');
    assert.equal(selection.selectedArea.value.id, 'site');
    declined = true; event.target.value = 'marketplaces'; await selection.switchArea(event);
    assert.equal(event.target.value, 'site'); assert.equal(selection.selectedArea.value.id, 'site');
    active.value = { id: 'helpdesk', groupId: 'support' }; await vue.nextTick();
    assert.equal(selection.selectedArea.value.id, 'support');
    assert.deepEqual(selection.visibleGroups.value.map(group => group.id), ['support']);
    groups.value = groups.value.filter(group => group.id === 'catalog' || group.id === 'dashboard'); await vue.nextTick();
    assert.deepEqual(Array.from(selection.areas.value, area => area.id), ['site']);
    assert.equal(selection.selectedArea.value.id, 'site');
    const count = destinations.length; event.target.value = 'management'; await selection.switchArea(event);
    assert.equal(destinations.length, count);
    user.value = { id: 'qa-other-user' }; await vue.nextTick();
    assert.equal(states.get('workspace-studio-area').value.owner, 'qa-other-user');
    groups.value = []; await vue.nextTick(); assert.equal(selection.areas.value.length, 0);
    assert.equal(selection.selectedArea.value, undefined);
  } finally { scope.stop(); }
  console.log('Shared area selection: business order, site overview, declined transitions, route synchronization, access filtering and owner isolation PASS. HTTP/DB writes: 0.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
