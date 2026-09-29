// Executes the actual composable with isolated Vue state and inert sockets, no network.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { ref } = require('vue');
async function main() {
  const token = ref('first'), states = new Map(), sockets = [], requests = [];
  const context = {
    useRuntimeConfig: () => ({ public: { apiBase: 'http://invalid.test/api/v1' } }),
    useWorkspaceSession: () => ({ token, restoreUser: async () => null }),
    useState: (key, initial) => { if (!states.has(key)) states.set(key, ref(initial())); return states.get(key); },
    $fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    io: () => {
      const events = {}, socket = { on: (key, fn) => events[key] = fn, emit: () => {}, disconnect: () => {}, events };
      sockets.push(socket); return socket;
    },
  };
  const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../composables/usePlatformChat.ts'), 'utf8'))
    .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '').replaceAll('import.meta.client', 'true');
  vm.runInNewContext(source + '\nthis.app = usePlatformChat();', context);
  const app = context.app;
  app.connectRealtime(); const first = sockets[0];
  first.events.connect(); assert.equal(app.connected.value, true);
  first.events['platform-chat:message']({ id: 'allowed' });
  requests.at(-1).resolve({ total: 3 }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.unread.value, 3);
  const pending = app.refreshUnread(), old = requests.at(-1);
  app.disconnectRealtime(); token.value = 'second'; app.connectRealtime();
  const second = sockets[1]; second.events.connect();
  old.resolve({ total: 999 }); await pending;
  assert.equal(app.unread.value, 0, 'A late count never belongs to the new session');
  for (const key of ['platform-chat:message', 'platform-chat:channel', 'crm:reminder']) first.events[key]({ id: 'stale' });
  first.events.disconnect();
  assert.equal(app.connected.value, true, 'Old socket cannot change current connection state');
  for (const key of ['lastMessage', 'lastChannel', 'lastReminder']) assert.equal(app[key].value, null);
  second.events['platform-chat:channel']({ id: 'new' }); assert.equal(app.lastChannel.value.id, 'new');
  const failed = app.refreshUnread(); requests.at(-1).reject(new Error('forbidden')); await failed;
  assert.equal(app.unread.value, 0);
  app.disconnectRealtime();
  console.log('CRM chat session PASS: stale unread/message/channel/reminder events and disconnected socket state cannot cross sessions; no network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
