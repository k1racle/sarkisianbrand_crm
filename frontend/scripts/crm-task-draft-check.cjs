// Pure contract: no network, credentials or business data.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const root = path.resolve(__dirname, '..'), context = {};
vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync(path.join(root, 'shared/crm-task-draft.ts'), 'utf8')).replace(/^export /gm, '') + '\nthis.clone = crmTaskDraft;', context);
const source = { status: 'OVERDUE', workflowStatus: 'IN_PROGRESS', dueDate: '2020-01-01T10:00:00Z', labels: ['one'], children: [{ title: 'child' }] };
const copy = context.clone(source);
assert.equal(copy.status, 'IN_PROGRESS'); assert.equal(copy.dueDate, '2020-01-01'); assert.equal(copy.startDate, '');
copy.labels.push('two'); copy.children[0].title = 'changed';
assert.equal(source.labels.length, 1); assert.equal(source.children[0].title, 'child'); assert.equal(source.status, 'OVERDUE');
for (const status of ['TODO', 'IN_PROGRESS', 'OVERDUE', 'DONE', 'CANCELLED']) assert.equal(context.clone({ status }).status, status, 'Legacy responses remain editable');
for (const file of ['pages/crm/tasks.vue', 'pages/crm/deals.vue', 'pages/crm/index.vue']) {
  const { descriptor, errors } = parse(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  assert.equal(errors.length, 0); compileScript(descriptor, { id: file });
  assert.equal(compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { expressionPlugins: ['typescript'] } }).errors.length, 0);
}
console.log('PASS: workflow status, legacy status, isolated nested draft, date fields; 3 Vue screens compile');
