/* Readonly source check + isolated auth mocks. No browser, network, real login or writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc');
const {safeInternalRedirect}=require('./internal-redirect-check.cjs');

async function main() {
  const filename = path.join(__dirname, '..', 'pages', 'workspace-login.vue');
  const css=require('./component-css.cjs')('pages/workspace-login.vue');
  const source = fs.readFileSync(filename, 'utf8')+'\n'+css;
  const parsed = parse(source, { filename });
  assert.deepEqual(parsed.errors, []);
  const descriptor = parsed.descriptor;
  const script = compileScript(descriptor, { id: 'workspace-login' });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'workspace-login', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  const style = compileStyle({ source: css, filename, id: 'data-v-workspace-login', scoped: false });
  assert.deepEqual(style.errors, []);
  for (const hook of ['autocomplete="username"', 'autocomplete="current-password"', 'role="alert"', ':aria-busy="loading"', 'aria-controls="workspace-password"', 'prefers-reduced-motion', '#f7f5f2', 'var(--sb-font-editorial)', 'var(--sf-radius-control)']) assert.ok(source.includes(hook), hook);
  assert.ok(!/#(?:f8604a|f7aa9d|fff0ed|b64e3d)/i.test(css), 'no legacy coral login palette');
  assert.ok(!/font-size\s*:\s*(?:\d|clamp\()/i.test(css), 'shared font-size tokens');
  assert.ok(source.includes('for="workspace-email"') && source.includes('id="workspace-email"'));
  assert.ok(source.includes('for="workspace-password"') && source.includes('id="workspace-password"'));

  const javascript = stripTypeScriptTypes(descriptor.scriptSetup.content.replace(/^import[^\n]*\n/gm, ''), { mode: 'strip' });
  const fixture = (redirect, reject = false) => {
    const calls = [], navigation = [];
    const state = vm.runInNewContext(javascript + '\n({ submit, email, password, loading, error });', {
      ref: value => ({ value }), safeInternalRedirect,
      useRoute: () => ({ query: redirect === undefined ? {} : { redirect } }),
      useWorkspaceSession: () => ({ login: async (email, password) => { calls.push({ email, password }); if (reject) throw { data: { message: 'Mock access denied' } }; } }),
      navigateTo: async target => { navigation.push(target); },
    });
    state.email.value = 'readonly-fixture@example.test'; state.password.value = 'local-mock-only';
    return { state, calls, navigation };
  };
  for (const [redirect, expected] of [[undefined, '/workspace'], ['/workspace/customers', '/workspace/customers']]) {
    const { state, calls, navigation } = fixture(redirect);
    const pending = state.submit(); assert.equal(state.loading.value, true);
    await pending;
    assert.equal(calls.length, 1); assert.deepEqual(navigation, [expected]); assert.equal(state.loading.value, false); assert.equal(state.error.value, '');
  }
  const failure = fixture(undefined, true); await failure.state.submit();
  assert.equal(failure.calls.length, 1); assert.equal(failure.navigation.length, 0); assert.equal(failure.state.error.value, 'Mock access denied'); assert.equal(failure.state.loading.value, false);
  console.log('PASS: workspace login Vue/template/scoped CSS, shared design/a11y hooks, isolated auth success/redirect/failure mocks. No browser/server/network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
