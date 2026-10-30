<script setup lang="ts">
import { ArrowRight, PlayCircle } from '@lucide/vue';
import { courseDescription, coursePrice, type PublicCourse, type CourseMaterial, type CourseTariff, safeCourseLink, safeCourseCover } from '~/shared/course-types';
import { requestKey } from '~/shared/request-key';
const route = useRoute(), config = useRuntimeConfig();
const { accessToken, user, loadMe } = useStorefront();
const { openAuth } = useStorefrontPanels();
const id = computed(() => String(route.params.id));
const { data, status, error, refresh } = await useAsyncData(`course-${id.value}`, () => $fetch<PublicCourse & { purchasingAvailable: boolean; liveAvailable: boolean }>(`/lms/catalog/${encodeURIComponent(id.value)}`, { baseURL: config.public.apiBase }), { watch: [id] });
const preview = ref<CourseMaterial | null>(null), previewError = ref(''), previewLoading = ref(false);
const accepted = reactive<Record<string, boolean>>({}), purchaseBusy = ref(false), purchaseError = ref('');
let previewRevision = 0;
async function openPreview(lessonId:string) { const current = ++previewRevision; previewLoading.value = true; previewError.value = ''; preview.value = null; try { const result = await $fetch<CourseMaterial>(`/lms/catalog/${encodeURIComponent(id.value)}/preview/${encodeURIComponent(lessonId)}`, { baseURL: config.public.apiBase }); if (current === previewRevision) preview.value = result; } catch { if (current === previewRevision) previewError.value = 'Не удалось открыть урок. Попробуйте ещё раз.'; } finally { if (current === previewRevision) previewLoading.value = false; } }
watch(id, () => { previewRevision++; preview.value = null; previewLoading.value = false; previewError.value = ''; });
onBeforeUnmount(() => { previewRevision++; });
async function buy(tariff: CourseTariff) {
  if (purchaseBusy.value) return;
  purchaseError.value = '';
  if (!accessToken.value) { openAuth('login'); return; }
  if (!accepted[tariff.id]) { purchaseError.value = 'Подтвердите условия оформления курса.'; return; }
  purchaseBusy.value = true;
  try {
    if (!user.value) await loadMe();
    const token = accessToken.value, owner = user.value?.id, amount = Number(tariff.price);
    if (!token || !owner) throw new Error('Войдите в аккаунт и повторите оформление.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Этот тариф пока нельзя оформить онлайн.');
    // Keep the same key on a lost response or reload; never create another
    // order merely because the browser did not receive the first response.
    const storageKey = `sb-course-purchase:${owner}:${id.value}:${tariff.id}`;
    let intent: { key: string; amount: number } | null = null;
    try { const raw = sessionStorage.getItem(storageKey); if (raw) intent = JSON.parse(raw); } catch { throw new Error('Не удалось сохранить данные оформления в браузере. Разрешите хранение и повторите попытку.'); }
    if (intent && (typeof intent.key !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(intent.key) || intent.amount !== amount)) throw new Error('Условия тарифа изменились. Проверьте предыдущий заказ в личном кабинете или обратитесь в поддержку.');
    if (!intent) { intent = { key: requestKey(), amount }; try { sessionStorage.setItem(storageKey, JSON.stringify(intent)); } catch { throw new Error('Не удалось сохранить данные оформления в браузере. Разрешите хранение и повторите попытку.'); } }
    const response = await $fetch<{ orderNumber:string }>('/lms/my/purchases', { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': intent.key }, body: { courseId: id.value, tariffId: tariff.id, expectedPrice: amount, acceptedTerms: true }, retry: 0 });
    if (accessToken.value !== token || user.value?.id !== owner) throw new Error('Аккаунт изменился. Войдите в прежний аккаунт, чтобы открыть заказ.');
    if (!response?.orderNumber || !/^SB-C-[a-zA-Z0-9-]+$/.test(response.orderNumber)) throw new Error('Не удалось получить номер заказа. Повторите запрос.');
    // A confirmed response resolves the uncertain request. The backend still
    // prevents a second pending order, but a later renewal needs a fresh key.
    try { sessionStorage.removeItem(storageKey); } catch { /* The order is already safely created. */ }
    await navigateTo(`/orders/${encodeURIComponent(response.orderNumber)}`);
  } catch (e:any) { purchaseError.value = e?.data?.message || e?.message || 'Не удалось оформить курс. Попробуйте ещё раз.'; }
  finally { purchaseBusy.value = false; }
}
useSeoMeta({ title: () => data.value ? `${data.value.titleRu} — SARKISIAN` : 'Курс — SARKISIAN' });
</script>
<template>
  <SiteShell editorial><div class="site-courses">
    <NuxtLink class="site-courses-link site-courses-back" to="/courses">← Все курсы</NuxtLink>
    <p v-if="status==='pending'" class="site-courses-state" role="status">Загружаем курс…</p>
    <div v-else-if="error || !data" class="site-courses-state" role="alert"><h1>Курс недоступен</h1><p>Не удалось загрузить программу. Проверьте соединение и повторите попытку.</p><button type="button" class="site-courses-button" @click="refresh()">Повторить</button></div>
    <template v-else>
      <header class="site-courses-hero"><h1>{{data.titleRu}}</h1><div><img v-if="safeCourseCover(data.coverImageUrl)" class="site-course-cover" :src="safeCourseCover(data.coverImageUrl)!" :alt="`Обложка курса ${data.titleRu}`"/><p v-if="courseDescription(data.description)">{{courseDescription(data.description)}}</p><NuxtLink class="site-courses-link" to="/courses/my">Моё обучение <ArrowRight :size="18"/></NuxtLink></div></header>
      <section class="site-courses-section" aria-labelledby="program"><div class="site-courses-section-head"><h2 id="program">Программа курса</h2><p>Откройте доступные уроки, чтобы познакомиться с форматом.</p></div><div v-if="data.modules.length" class="site-course-modules"><article v-for="module in data.modules" :key="module.id" class="site-course-module"><h3>{{module.title}}</h3><ul><li v-for="lesson in module.lessons" :key="lesson.id"><span>{{lesson.title}}</span><button v-if="lesson.isPreview" type="button" @click="openPreview(lesson.id)"><PlayCircle :size="16"/> Посмотреть</button><span v-else>Доступ после покупки</span></li></ul></article></div><p v-else class="site-courses-state">Программа готовится.</p>
        <div v-if="previewLoading" class="site-courses-state" role="status">Открываем урок…</div><p v-if="previewError" role="alert">{{previewError}}</p><article v-if="preview" class="site-course-material"><h3>{{preview.title}}</h3><p v-if="preview.content" class="site-course-text">{{preview.content}}</p><a v-if="safeCourseLink(preview.videoUrl)" :href="safeCourseLink(preview.videoUrl)!" target="_blank" rel="noopener noreferrer">Открыть видео</a><a v-if="safeCourseLink(preview.presentationUrl)" :href="safeCourseLink(preview.presentationUrl)!" target="_blank" rel="noopener noreferrer">Открыть презентацию</a></article>
      </section>
      <section class="site-courses-section" aria-labelledby="tariffs"><div class="site-courses-section-head"><h2 id="tariffs">Выберите тариф</h2><p>Сравните стоимость и срок доступа.</p></div><p v-if="purchaseError" role="alert" class="site-courses-state">{{purchaseError}}</p><div v-if="data.tariffs.length" class="site-courses-grid"><article v-for="tariff in data.tariffs" :key="tariff.id" class="site-course-card"><h3>{{tariff.title}}</h3><p>{{tariff.accessDays ? `Доступ на ${tariff.accessDays} дней` : 'Без ограничения срока доступа'}}</p><strong>{{coursePrice(tariff.price)}}</strong><template v-if="data.purchasingAvailable && Number(tariff.price)>0"><label class="site-course-consent"><input v-model="accepted[tariff.id]" type="checkbox"/> <span>Принимаю <NuxtLink to="/oferta" target="_blank" rel="noopener noreferrer">условия покупки</NuxtLink> и <NuxtLink to="/privacy" target="_blank" rel="noopener noreferrer">политику конфиденциальности</NuxtLink></span></label><button type="button" class="site-courses-button" :disabled="purchaseBusy" @click="buy(tariff)">{{purchaseBusy ? 'Оформляем…' : 'Оформить курс'}}</button></template><p v-else class="site-course-muted">Покупка пока недоступна</p></article></div><p v-else class="site-courses-state">Тарифы скоро появятся.</p></section>
    </template>
  </div></SiteShell>
</template>
