<script setup lang="ts">
import { RefreshCw, UsersRound } from '@lucide/vue';

type Student = {
  id: string; enrolledAt: string; effectiveStatus: string; accessExpiresAt: string | null;
  user: { id: string; firstName: string | null; lastName: string | null; email: string; phone: string | null; isActive: boolean };
  course: { id: string; title: string }; totalLessons: number; completedLessons: number; progress: number;
};
type Result = { items: Student[]; total: number; page: number; pages: number };
const session = useWorkspaceSession();
const query = ref(''), rows = ref<Student[]>([]), loading = ref(false), error = ref('');
const page = ref(1), pages = ref(1), total = ref(0), loaded = ref(false);
let requestVersion = 0, timer: ReturnType<typeof setTimeout> | undefined;
const fullName = (row: Student) => [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || 'Имя не указано';
const statusText = (status: string) => ({ ACTIVE: 'Доступ открыт', EXPIRED: 'Срок доступа истёк', ACCOUNT_DISABLED: 'Учётная запись отключена', SUSPENDED: 'Доступ приостановлен', REVOKED: 'Доступ отозван', REFUNDED: 'Возврат', UNVERIFIED: 'Доступ не подтверждён' } as Record<string, string>)[status] || 'Требует проверки';
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
async function load() {
  const version = ++requestVersion;
  loading.value = true; error.value = '';
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '20' });
    if (query.value.trim()) params.set('search', query.value.trim());
    const data = await session.request<Result>(`/lms/admin/students?${params}`);
    if (version !== requestVersion) return;
    if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || !Number.isInteger(data.page) || !Number.isInteger(data.pages)) throw new Error();
    rows.value = data.items; total.value = data.total; page.value = data.page; pages.value = data.pages; loaded.value = true;
  } catch {
    if (version === requestVersion) { rows.value = []; error.value = 'Не удалось загрузить учеников. Проверьте соединение и попробуйте снова.'; }
  } finally { if (version === requestVersion) loading.value = false; }
}
function move(next: number) { if (loading.value || next < 1 || next > pages.value) return; page.value = next; void load(); }
watch(query, () => { clearTimeout(timer); requestVersion++; page.value = 1; loading.value = true; timer = setTimeout(() => void load(), 300); });
onMounted(load);
onBeforeUnmount(() => { requestVersion++; clearTimeout(timer); });
</script>

<template>
  <section class="crm-management-workspace course-workspace course-students">
    <header class="crm-page-header"><div><h1>Ученики</h1><p>Доступ к курсам и прохождение уроков.</p></div></header>
    <div class="course-toolbar"><label class="course-search"><span>Поиск ученика или курса</span><input v-model="query" class="crm-input" type="search" maxlength="200" placeholder="Имя, телефон, email или курс"/></label><button class="crm-button" type="button" :disabled="loading" @click="load"><RefreshCw :size="16"/> Обновить</button></div>
    <p v-if="error" class="course-error" role="alert">{{error}}</p>
    <p v-if="loading" class="course-state" role="status">Загружаем учеников…</p>
    <template v-else-if="loaded && !error">
      <p class="course-hint course-students-count">Записей на курсы: {{total}}. Если ученик проходит несколько курсов, каждый показан отдельно.</p>
      <div v-if="rows.length" class="course-students-list">
        <article v-for="row in rows" :key="row.id" class="course-student crm-surface">
          <div class="course-student-person"><strong>{{fullName(row)}}</strong><span>{{row.user.email}}</span><span v-if="row.user.phone">{{row.user.phone}}</span><small v-if="!row.user.isActive && row.effectiveStatus !== 'ACCOUNT_DISABLED'">Учётная запись отключена</small></div>
          <div class="course-student-course"><span class="course-student-label">Курс</span><strong>{{row.course.title}}</strong><span>{{row.totalLessons ? `Пройдено ${row.completedLessons} из ${row.totalLessons} · ${row.progress}%` : 'Опубликованных уроков пока нет'}}</span></div>
          <div class="course-student-access"><span class="course-status" :data-status="row.effectiveStatus">{{statusText(row.effectiveStatus)}}</span><span>{{row.accessExpiresAt ? `До ${date(row.accessExpiresAt)}` : 'Без срока окончания'}}</span><span>Записан: {{date(row.enrolledAt)}}</span></div>
        </article>
      </div>
      <div v-else class="course-empty crm-surface"><UsersRound :size="27"/><h2>{{query.trim() ? 'Ничего не найдено' : 'Пока нет учеников'}}</h2><p>{{query.trim() ? 'Попробуйте другое имя, контакт или название курса.' : 'После зачисления ученики и их доступы появятся здесь.'}}</p></div>
      <nav v-if="pages > 1" class="course-pagination" aria-label="Страницы учеников"><button class="crm-button" type="button" :disabled="page <= 1" @click="move(page - 1)">Назад</button><span>Страница {{page}} из {{pages}}</span><button class="crm-button" type="button" :disabled="page >= pages" @click="move(page + 1)">Далее</button></nav>
    </template>
  </section>
</template>
