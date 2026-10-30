/* The token is synthetic. No network or real users. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(path.join(__dirname, '../shared/lms-live.ts'), 'utf8');
const ctx = { module:{exports:{}}, URL };
vm.runInNewContext(transformSync(source, { loader:'ts', format:'cjs', target:'node22' }).code, ctx);
const { validateLiveJoin } = ctx.module.exports;
const id = '10000000-0000-4000-8000-000000000001';
const good = { url:'wss://media.example.test', token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.YWJj', room:`lms-${id}`, role:'viewer', expiresIn:60 };
assert.equal(validateLiveJoin(good, 'viewer', id, 'wss://media.example.test').url, 'wss://media.example.test');
for (const patch of [
  {url:'wss://media.example.test.evil.test'}, {url:'ws://media.example.test'}, {url:'wss://user@media.example.test'},
  {url:'wss://media.example.test:8443'}, {url:'wss://media.example.test/private'}, {url:'wss://media.example.test/?x=1'},
  {room:'another-room'}, {role:'host'}, {token:'not-a-jwt'}, {expiresIn:0}, {expiresIn:61},
]) assert.throws(() => validateLiveJoin({ ...good, ...patch }, 'viewer', id, 'wss://media.example.test'));
assert.throws(() => validateLiveJoin(good, 'viewer', id, ''));
assert.throws(() => validateLiveJoin(good, 'viewer', id, 'wss://other.example.test'));
console.log('LMS join accepts only configured WSS origin, exact room, role and bounded token PASS');
