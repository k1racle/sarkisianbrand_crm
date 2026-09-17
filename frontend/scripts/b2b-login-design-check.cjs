/* Readonly Vue/CSS checks and isolated B2B auth mocks. No browser/network/writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc');
const {safeInternalRedirect}=require('./internal-redirect-check.cjs');

async function main() {
  const filename = path.join(__dirname, '..', 'pages', 'b2b-login.vue');
  const css=require('./component-css.cjs')('pages/b2b-login.vue');
  const source = fs.readFileSync(filename, 'utf8')+'\n'+css;
  const parsed = parse(source, { filename }); assert.deepEqual(parsed.errors, []);
  const descriptor = parsed.descriptor, script = compileScript(descriptor, { id: 'b2b-login' });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'b2b-login', compilerOptions: { bindingMetadata: script.bindings } }); assert.deepEqual(template.errors, []);
  const style = compileStyle({ source: css, filename, id: 'data-v-b2b-login', scoped: false }); assert.deepEqual(style.errors, []);
  for (const hook of ['autocomplete="username"', 'autocomplete="current-password"', 'role="alert"', ':aria-busy="loading"', 'aria-controls="b2b-password"', ':aria-label="show', 'prefers-reduced-motion', '#f7f5f2', 'var(--sb-font-editorial)', 'var(--sf-radius-control)']) assert.ok(source.includes(hook), hook);
  assert.ok(!/var\(--sb-coral\)|#(?:fff1ee|fff0ed|b34c3d)/i.test(css));
  assert.ok(!/font-size\s*:\s*(?:\d|clamp\()/i.test(css));
  for (const id of ['b2b-email', 'b2b-password']) assert.ok(source.includes(`for="${id}"`) && source.includes(`id="${id}"`));
  const javascript = stripTypeScriptTypes(descriptor.scriptSetup.content.replace(/^import[^\n]*\n/gm, ''), { mode: 'strip' });
  function fixture({ redirect, reject = false, existingToken = '' } = {}) {
    const calls = [], navigation = [], mounted = []; let hydrations = 0;
    const state = vm.runInNewContext(javascript + '\n({ submit, email, password, loading, error });', {
      ref: value => ({ value }), safeInternalRedirect, useRoute: () => ({ query: redirect === undefined ? {} : { redirect } }),
      onMounted: callback => mounted.push(callback), navigateTo: target => { navigation.push(target); return Promise.resolve(); },
      useB2BSession: () => ({ token: { value: existingToken }, hydrate: () => { hydrations++; }, login: async (email, password) => { calls.push({ email, password }); if (reject) throw { data: { message: 'Mock access denied' } }; } }),
    });
    state.email.value = 'readonly-b2b@example.test'; state.password.value = 'local-mock-only';
    return { state, calls, navigation, mount: () => mounted.forEach(callback => callback()), hydrations: () => hydrations };
  }
  for (const [redirect, expected] of [[undefined, '/b2b'], ['/b2b/calendar', '/b2b/calendar']]) {
    const test = fixture({ redirect }); test.mount(); assert.equal(test.hydrations(), 1); assert.equal(test.navigation.length, 0);
    const pending = test.state.submit(); assert.equal(test.state.loading.value, true); await pending;
    assert.equal(test.calls.length, 1); assert.deepEqual(test.navigation, [expected]); assert.equal(test.state.loading.value, false); assert.equal(test.state.error.value, '');
  }
  const failure = fixture({ reject: true }); await failure.state.submit(); assert.equal(failure.calls.length, 1); assert.equal(failure.navigation.length, 0); assert.equal(failure.state.error.value, 'Mock access denied'); assert.equal(failure.state.loading.value, false);
  const existing = fixture({ existingToken: 'local-token-fixture' }); existing.mount(); assert.equal(existing.hydrations(), 1); assert.deepEqual(existing.navigation, ['/b2b']); assert.equal(existing.calls.length, 0);
  console.log('PASS: B2B login Vue/template/scoped CSS, shared tokens/a11y, isolated hydrate/login/redirect/failure mocks. No browser/server/network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
