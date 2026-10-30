<script setup lang="ts">
type QuizQuestion = { text: string; options: string[] };
type Quiz = { revision: number; passingPercent: number; questions: QuizQuestion[]; hasPassed: boolean };
type Result = { passed: boolean; score: number; correctCount: number; total: number; progress: number; isCompleted: boolean };
const props = defineProps<{ courseId: string; lessonId: string; token: string }>();
const emit = defineEmits<{ availability: [value: boolean | null]; passed: [value: { progress: number; isCompleted: boolean }] }>();
const config = useRuntimeConfig();
const quiz = ref<Quiz | null>(null), answers = ref<(number | null)[]>([]), result = ref<Result | null>(null);
const loading = ref(true), sending = ref(false), error = ref('');
let generation = 0;
const endpoint = () => `/lms/my/${encodeURIComponent(props.courseId)}/lessons/${encodeURIComponent(props.lessonId)}/quiz`;
async function load() {
  const current = ++generation; loading.value = true; sending.value = false; error.value = ''; quiz.value = null; result.value = null; emit('availability', null);
  try {
    const data = await $fetch<Quiz | null>(endpoint(), { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${props.token}` } });
    if (current !== generation) return;
    if (data === null) { emit('availability', false); return; }
    if (!Number.isInteger(data.revision) || !Number.isInteger(data.passingPercent) || !Array.isArray(data.questions) || typeof data.hasPassed !== 'boolean') throw new Error('Invalid response');
    quiz.value = data; answers.value = data.questions.map(() => null); emit('availability', true);
  } catch { if (current === generation) error.value = 'Не удалось загрузить тест. Проверьте соединение и попробуйте снова.'; }
  finally { if (current === generation) loading.value = false; }
}
async function submit() {
  if (!quiz.value || sending.value || quiz.value.hasPassed) return;
  if (answers.value.some(answer => answer === null)) { error.value = 'Ответьте на все вопросы.'; return; }
  const current = generation; sending.value = true; error.value = '';
  try {
    const response = await $fetch<Result>(`${endpoint()}/attempts`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${props.token}` }, body: { revision: quiz.value.revision, answers: answers.value } });
    if (current !== generation || !quiz.value) return;
    if (typeof response.passed !== 'boolean' || !Number.isFinite(response.score) || !Number.isFinite(response.correctCount) || !Number.isFinite(response.total) || !Number.isFinite(response.progress) || typeof response.isCompleted !== 'boolean') throw new Error('Invalid response');
    result.value = response;
    if (response.passed) { quiz.value.hasPassed = true; emit('passed', { progress: response.progress, isCompleted: response.isCompleted }); }
  } catch (reason: any) {
    if (current !== generation) return;
    error.value = Number(reason?.statusCode || reason?.status || reason?.response?.status) === 409 ? 'Тест изменился. Обновите его и ответьте на вопросы заново.' : 'Не удалось проверить ответы. Попробуйте ещё раз.';
  } finally { if (current === generation) sending.value = false; }
}
function retry() { result.value = null; error.value = ''; answers.value = quiz.value?.questions.map(() => null) || []; }
onMounted(load);
watch(() => [props.courseId, props.lessonId, props.token], () => { if (import.meta.client) void load(); });
onBeforeUnmount(() => { generation++; emit('availability', null); });
</script>

<template>
  <section v-if="loading || error || quiz" class="site-course-quiz" aria-label="Тест урока">
    <p v-if="loading" role="status">Загружаем тест…</p>
    <template v-else-if="quiz">
      <header><h3>Проверка знаний</h3><p>Для прохождения нужно набрать {{quiz.passingPercent}}%. Количество попыток не ограничено.</p></header>
      <div v-if="quiz.hasPassed" class="site-course-quiz-result" role="status"><strong>Тест пройден</strong><p v-if="result">Верно {{result.correctCount}} из {{result.total}} · {{result.score}}%</p><p>Урок отмечен как пройденный.</p></div>
      <template v-else-if="result"><div class="site-course-quiz-result" role="status"><strong>Пока не пройдено</strong><p>Верно {{result.correctCount}} из {{result.total}} · {{result.score}}%. Попробуйте ещё раз.</p></div><button type="button" class="site-courses-button" @click="retry">Пройти ещё раз</button></template>
      <template v-else>
        <fieldset v-for="(question, qi) in quiz.questions" :key="qi" class="site-course-quiz-question" :disabled="sending">
          <legend>{{qi + 1}}. {{question.text}}</legend>
          <label v-for="(option, oi) in question.options" :key="oi"><input v-model="answers[qi]" type="radio" :name="`course-quiz-${lessonId}-${qi}`" :value="oi"/><span>{{option}}</span></label>
        </fieldset>
        <button type="button" class="site-courses-button" :disabled="sending" @click="submit">{{sending ? 'Проверяем…' : 'Проверить ответы'}}</button>
      </template>
    </template>
    <p v-if="error" role="alert">{{error}} <button type="button" class="site-courses-link" @click="load">Обновить тест</button></p>
  </section>
</template>
