const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), postcss = require('postcss');
const { parse, compileTemplate } = require('@vue/compiler-sfc');
const { parse: parseTemplate } = require('@vue/compiler-dom');
const root = path.resolve(__dirname, '..');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)]); }

// Centralized application CSS remains the default. These components own isolated
// calendar/widget geometry or game artwork, rather than global workspace styling.
const scopedOwners = new Map([
  ['pages/crm/meetings.vue', 'Calendar page responsive grid'],
  ['pages/studio.vue', 'Game page loading and layout'],
  ['components/crm/CrmMeetingCalendar.vue', 'Reusable calendar grid and event states'],
  ['components/sarkisian-studio/atelier/KeriPortrait.vue', 'SVG portrait dimensions'],
  ['components/sarkisian-studio/atelier/NailPreparation.vue', 'Interactive photographic preparation board'],
  ['components/sarkisian-studio/atelier/StudioClock.vue', 'SVG scene clock positioning'],
  ['components/sarkisian-studio/atelier/StudioScene.vue', 'Layered scene artwork and hit targets'],
  ['components/sarkisian-studio/atelier/StudioTool.vue', 'SVG tool animation'],
  ['components/sarkisian-studio/keri/KeriAvatar.vue', 'Avatar SVG dimensions'],
  ['components/sarkisian-studio/NailArt.vue', 'Nail artwork interaction geometry'],
]);
// SVG compositing is part of rendering the photograph, not a UI theme override.
const svgCompositing = new Map([
  ['components/sarkisian-studio/atelier/NailPreparation.vue', ['isolation:isolate']],
  ['components/sarkisian-studio/NailArt.vue', ['isolation:isolate']],
  ['components/sarkisian-studio/NailPhotoLighting.vue', ['mix-blend-mode:soft-light']],
]);
const seenOwners = new Set();
let count = 0, scriptOnly = 0, localStyles = 0;
for (const f of [path.join(root, 'app.vue'), ...['pages', 'components'].flatMap(d => walk(path.join(root, d)))].filter(f => f.endsWith('.vue'))) {
  const relative = path.relative(root, f).split(path.sep).join('/');
  const { descriptor: d, errors } = parse(fs.readFileSync(f, 'utf8'), { filename: f });
  assert.deepEqual(errors, [], `Invalid SFC: ${relative}`);
  if (d.styles.length) {
    assert.ok(scopedOwners.has(relative), `Unregistered local CSS owner: ${relative}`);
    seenOwners.add(relative);
    for (const style of d.styles) {
      assert.equal(style.scoped, true, `Local CSS must be scoped: ${relative}`);
      assert.ok(!style.src && !style.lang, `Local CSS must be inspectable plain CSS: ${relative}`);
      postcss.parse(style.content, { from: f }); localStyles++;
    }
  }
  function checkBindings(node) {
    for (const prop of node.props || []) {
      if (prop.type === 6 && prop.name === 'style') {
        const value = prop.value?.content || '';
        assert.ok(node.tag === 'g' && svgCompositing.get(relative)?.includes(value), `Static inline design: ${relative}: ${value}`);
        postcss.parse(`g{${value}}`, { from: f });
      }
      if (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'style') {
        assert.doesNotMatch(prop.exp?.content || '', /#[0-9a-f]{3,8}\b|(?:fontFamily|fontSize|borderRadius)\s*:/i, `Hardcoded inline theme: ${relative}`);
      }
    }
    for (const child of node.children || []) checkBindings(child);
  }
  if (d.template) {
    checkBindings(parseTemplate(d.template.content));
    assert.deepEqual(compileTemplate({ source: d.template.content, filename: f, id: 'ownership' }).errors, [], `Invalid template: ${relative}`);
  } else {
    assert.ok(d.script || d.scriptSetup, `Component has neither template nor script: ${relative}`);
    scriptOnly++;
  }
  count++;
}
for (const relative of scopedOwners.keys()) assert.ok(seenOwners.has(relative), `Remove stale scoped CSS exception: ${relative}`);
for (const f of walk(path.join(root, 'assets/css')).filter(f => f.endsWith('.css'))) postcss.parse(fs.readFileSync(f, 'utf8'), { from: f });
assert.match(fs.readFileSync(path.join(root, 'assets/css/admin-components.css'), 'utf8'), /\[data-v-ui-[a-f0-9]{12}\]/);
assert.match(fs.readFileSync(path.join(root, 'nuxt.config.ts'), 'utf8'), /foundation.css.*site.css.*admin.css/);
console.log(`${count} Vue SFCs (${scriptOnly} script-only): centralized CSS and ${localStyles} registered scoped blocks parse; inline theme ownership PASS.`);
