/* Local source checks only: no network, sessions or business writes. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');
async function main() {
  const source = fs.readFileSync(path.join(root,'shared/crm-workspace.ts'),'utf8');
  const {CRM_DESTINATIONS: destinations} = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
  const lucide = await import('@lucide/vue');
  const component = fs.readFileSync(path.join(root,'components/WorkspaceSectionIcon.vue'),'utf8');
  const registry = component.match(/const icons = \{([^}]+)\}/)[1].split(',').map(name=>name.trim());
  for(const item of destinations) {
    assert.ok(registry.includes(item.icon), `${item.id}: registered icon, not fallback`);
    assert.ok(lucide[item.icon], `${item.icon}: installed Lucide export`);
  }
  assert.equal(new Set(destinations.map(item=>item.icon)).size,destinations.length,'Distinct icons for CRM destinations');
  assert.equal(new Set(destinations.map(item=>lucide[item.icon])).size,destinations.length,'No duplicated Lucide aliases');
  const css = fs.readFileSync(path.join(root,'assets/css/crm-shell.css'),'utf8');
  const workCss = fs.readFileSync(path.join(root,'assets/css/crm-work.css'),'utf8');
  postcss.parse(workCss).walkDecls('font-size',decl=>assert.match(decl.value,/^(var\(--crm-type-(heading|body|caption|input)\)|inherit)$/));
  postcss.parse(workCss).walkRules(rule=>assert.ok(rule.selector.startsWith('html[data-crm-ui]'),'Operational styles must stay in CRM'));
  postcss.parse(css).walkDecls('font-size',decl=>assert.match(decl.value,/^(var\(--crm-type-(heading|body|caption|input)\)|inherit)$/));
  assert.match(css,/--crm-type-heading:20px/); assert.match(css,/--crm-type-body:14px/);
  assert.match(css,/--crm-type-caption:12px/); assert.match(css,/--crm-type-input:16px/);
  assert.match(css,/html\[data-crm-ui\]/); assert.doesNotMatch(css,/\.sb-storefront/);
  console.log(`${destinations.length} distinct registered Lucide icons; CRM typography tokens and route-only theme PASS.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
