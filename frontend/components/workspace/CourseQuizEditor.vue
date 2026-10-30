<script setup lang="ts">
import { Plus, Save, Trash2 } from '@lucide/vue';

type Question = { text: string; options: string[]; correctIndex: number };
type Quiz = { revision: number; enabled: boolean; passingPercent: number; questions: Question[]; isPublished: boolean; hasDraftChanges: boolean };
const props = defineProps<{ lessonId: string; editable: boolean }>();
const emit = defineEmits<{ busyChange: [value: boolean]; dirtyChange: [value: boolean]; changed: [] }>();
const session = useWorkspaceSession();
const loading = ref(true), saving = ref(false), error = ref(''), notice = ref('');
const revision = ref(0), published = ref(false), pending = ref(false), baseline = ref('');
const form = reactive<{ enabled: boolean; passingPercent: number; questions: Question[] }>({ enabled: false, passingPercent: 70, questions: [] });
let generation = 0;
const snapshot = () => JSON.stringify(form);
const dirty = computed(() => !!baseline.value && snapshot() !== baseline.value);
watch(dirty, value => emit('dirtyChange', value), { immediate: true });
watch(saving, value => emit('busyChange', value));
watch(form, () => { if (error.value === 'Укажите проходной балл от 1 до 100%.' || error.value === 'Заполните вопросы и все варианты ответа, выберите правильный ответ.') error.value = ''; }, { deep: true });
const emptyQuestion = (): Question => ({ text: '', options: ['', ''], correctIndex: 0 });
function enable() { form.enabled = true; if (!form.questions.length) form.questions.push(emptyQuestion()); }
function addQuestion() { if (form.questions.length < 50) form.questions.push(emptyQuestion()); }
function addOption(question: Question) { if (question.options.length < 8) question.options.push(''); }
function removeOption(question: Question, index: number) {
  if (question.options.length <= 2) return;
  question.options.splice(index, 1);
  if (question.correctIndex === index) question.correctIndex = 0;
  else if (question.correctIndex > index) question.correctIndex--;
}
function errorMessage(reason: any, fallback: string) { const message = reason?.data?.message; return Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : fallback; }
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try {
    const data = await session.request<Quiz>(`/lms/admin/lessons/${encodeURIComponent(props.lessonId)}/quiz`);
    if (current !== generation) return;
    if (!data || !Number.isInteger(data.revision) || !Array.isArray(data.questions) || typeof data.enabled !== 'boolean') throw new Error('Invalid response');
    revision.value = data.revision; published.value = data.isPublished; pending.value = data.hasDraftChanges;
    form.enabled = data.enabled; form.passingPercent = data.passingPercent; form.questions = data.questions.map(q => ({ text: q.text, options: [...q.options], correctIndex: q.correctIndex }));
    baseline.value = snapshot();
  } catch { if (current === generation) error.value = 'Не удалось загрузить тест. Проверьте соединение и попробуйте снова.'; }
  finally { if (current === generation) loading.value = false; }
}
async function save() {
  if (!props.editable || saving.value || !dirty.value) return;
  const percent = Number(form.passingPercent);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) { error.value = 'Укажите проходной балл от 1 до 100%.'; return; }
  if (form.enabled && (!form.questions.length || form.questions.length > 50 || form.questions.some(q => !q.text.trim() || q.text.length > 1000 || q.options.length < 2 || q.options.length > 8 || q.options.some(option => !option.trim() || option.length > 500) || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length))) {
    error.value = 'Заполните вопросы и все варианты ответа, выберите правильный ответ.'; return;
  }
  const body = { revision: revision.value, enabled: form.enabled, passingPercent: percent, questions: form.enabled ? form.questions.map(q => ({ text: q.text.trim(), options: q.options.map(option => option.trim()), correctIndex: q.correctIndex })) : [] };
  saving.value = true; error.value = ''; notice.value = '';
  try {
    const data = await session.request<Quiz>(`/lms/admin/lessons/${encodeURIComponent(props.lessonId)}/quiz`, { method: 'PUT', body });
    if (!data || !Number.isInteger(data.revision)) throw new Error('Invalid response');
    revision.value = data.revision; published.value = data.isPublished; pending.value = data.hasDraftChanges;
    form.enabled = data.enabled; form.passingPercent = data.passingPercent; form.questions = data.questions.map(q => ({ text: q.text, options: [...q.options], correctIndex: q.correctIndex }));
    baseline.value = snapshot(); notice.value = 'Тест сохранён. Изменения станут доступны ученикам после публикации курса.'; emit('changed');
  } catch (reason: any) {
    error.value = Number(reason?.statusCode || reason?.status || reason?.response?.status) === 409
      ? 'Тест изменён другим сотрудником. Скопируйте свои изменения и откройте урок заново.'
      : errorMessage(reason, 'Не удалось сохранить тест. Попробуйте ещё раз.');
  } finally { saving.value = false; }
}
onMounted(load);
onBeforeUnmount(() => { generation++; emit('dirtyChange', false); emit('busyChange', false); });
</script>

<template>
  <section class="course-quiz-editor" aria-label="Тест урока">
    <header><div><h3>Тест урока</h3><p>Проверка знаний после урока. Для прохождения ученик отвечает на вопросы.</p></div><span v-if="pending" class="course-lesson-state">Не опубликован</span><span v-else-if="published" class="course-lesson-state">Опубликован</span></header>
    <p v-if="loading" class="course-hint" role="status">Загружаем тест…</p>
    <template v-else>
      <p v-if="error" class="course-error" role="alert">{{error}} <button v-if="!baseline" type="button" class="crm-button" @click="load">Повторить</button></p>
      <p v-if="notice" class="course-success" role="status">{{notice}}</p>
      <template v-if="baseline">
        <div v-if="!form.enabled" class="course-quiz-empty"><p>Теста пока нет. Добавьте вопросы, чтобы закрепить материал урока.</p><button v-if="editable" type="button" class="crm-button" @click="enable"><Plus :size="16"/> Добавить тест</button></div>
        <template v-else>
          <div class="course-quiz-controls"><label>Проходной балл, % <input v-model.number="form.passingPercent" class="crm-input" type="number" min="1" max="100" step="1" :disabled="!editable || saving"/></label><button v-if="editable" type="button" class="crm-button" @click="form.enabled = false">Убрать тест</button></div>
          <article v-for="(question, qi) in form.questions" :key="qi" class="course-quiz-question">
            <header><strong>Вопрос {{qi + 1}}</strong><button v-if="editable" type="button" class="crm-button" :disabled="saving" :aria-label="`Удалить вопрос ${qi + 1}`" @click="form.questions.splice(qi, 1)"><Trash2 :size="15"/> Удалить</button></header>
            <label>Текст вопроса<textarea v-model="question.text" class="crm-input" rows="2" maxlength="1000" :disabled="!editable || saving"/></label>
            <p class="course-hint">Выберите один правильный ответ.</p>
            <div v-for="(_, oi) in question.options" :key="oi" class="course-quiz-option">
              <input v-model="question.correctIndex" class="crm-check" type="radio" :name="`quiz-correct-${lessonId}-${qi}`" :value="oi" :aria-label="`Вариант ${oi + 1} — правильный`" :disabled="!editable || saving"/>
              <input v-model="question.options[oi]" class="crm-input" maxlength="500" :aria-label="`Вариант ${oi + 1} вопроса ${qi + 1}`" :disabled="!editable || saving"/>
              <button v-if="editable && question.options.length > 2" type="button" class="crm-button crm-button--icon" :aria-label="`Удалить вариант ${oi + 1}`" :disabled="saving" @click="removeOption(question,oi)"><Trash2 :size="15"/></button>
            </div>
            <button v-if="editable && question.options.length < 8" type="button" class="crm-button" :disabled="saving" @click="addOption(question)"><Plus :size="15"/> Вариант ответа</button>
          </article>
          <button v-if="editable && form.questions.length < 50" type="button" class="crm-button" :disabled="saving" @click="addQuestion"><Plus :size="16"/> Добавить вопрос</button>
        </template>
        <div v-if="editable && dirty" class="course-quiz-save"><span>Изменения теста ещё не сохранены.</span><button type="button" class="crm-button crm-button--primary" :disabled="saving" @click="save"><Save :size="16"/> {{saving ? 'Сохраняем…' : 'Сохранить тест'}}</button></div>
      </template>
    </template>
  </section>
</template>
