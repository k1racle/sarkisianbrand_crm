# SEO-контур витрины

## Что реализовано

- Backend: `GET /api/v1/seo/sitemap` → XML, `GET /api/v1/seo/robots` → текст.
- Nitro: публичные `/sitemap.xml` и `/robots.txt`; ответ берётся из backend, домен не выводится из клиентского `Host`.
- Sitemap: главная, `/catalog`, активные категории `/catalog?category=slug`, активные товары `/products/slug`, активные CMS-страницы без `reviewRequired`. Черновики, кабинеты и конфликтующие со статическими маршрутами CMS-slug не публикуются.
- Экранирование XML, URL-кодирование, дедупликация, стабильный порядок; `lastmod` — реальные `updatedAt`, а не время генерации карты. Для главной и категорий достоверная дата изменения не хранится, поэтому `lastmod` отсутствует.
- Успешные ответы: `Cache-Control: public, max-age=60, must-revalidate`. Backend кеширует единый снимок БД на 60 секунд и объединяет конкурентные запросы. С учётом HTTP-кеша изменение может появиться через 120 секунд. Сбой не подменяется пустым успешным ответом: Nitro возвращает `503`, `no-store`, без внутренних сообщений.
- Robots закрывает API, документацию, админку, CRM, B2B и прочие кабинеты, авторизацию, корзину, избранное, preview/drafts, неактивные и требующие проверки CMS-страницы (в том числе URL с параметрами). Публичные категории не закрыты.
- `useStorefrontSeo`: SSR/реактивные canonical, robots meta, Open Graph и Twitter. Canonical сохраняет одиночную категорию и страницу пагинации > 1; удаляет сортировку, прикладные фильтры, tracking и hash. Фильтрованные/поисковые страницы — `noindex, follow`; обычная категория и пагинация индексируемы при включённой индексации.
- Ограничения протокола: не больше 50 000 URL, 50 MiB и URL короче 2048 символов; при превышении — ошибка, не тихое обрезание. До достижения лимита требуется отдельно реализовать sitemap index/shards.

## Настройки и обязательные подключения parent

Конфигурация и страницы не редактировались в рамках этого блока. Parent должен добавить в `frontend/nuxt.config.ts`:

```ts
runtimeConfig: {
  seoApiBase: 'http://localhost:3000/api/v1',
  public: {
    // Сохранить существующий apiBase и другие настройки.
    siteUrl: '',
    seoIndexingEnabled: false,
  },
},
```

Переменные процесса backend:

```dotenv
SITE_URL=https://sarkisianbrand.ru
SEO_INDEXING_ENABLED=false
```

Переменные процесса frontend (после объявления ключей runtimeConfig):

```dotenv
NUXT_SEO_API_BASE=http://127.0.0.1:3000/api/v1
NUXT_PUBLIC_SITE_URL=https://sarkisianbrand.ru
NUXT_PUBLIC_SEO_INDEXING_ENABLED=false
```

В Docker использовать имя backend-сервиса вместо `127.0.0.1`. `seoApiBase` — серверная настройка без секретов, не публичная. Без неё маршрут использует текущий `public.apiBase`. Не допускать циклической прокси-маршрутизации через `/sitemap.xml`.

`SITE_URL`/`siteUrl` — только `http(s)` origin, без пути, параметров, fragment, логина/пароля. Backend в production требует явный `SITE_URL`; включённая production-индексация требует HTTPS. Без настроек в разработке используется `http://localhost:3001`, индексация закрыта. Для индексируемого frontend отсутствующий `siteUrl` вызывает явную ошибку.

Заменить старый `useSeoMeta` на единственный `useStorefrontSeo` в `index.vue`, `catalog.vue`, `products/[slug].vue`, `[page].vue`, `account.vue`, `cart.vue`, `favorites.vue`, `login.vue`, `password-reset.vue`, `auth/callback.vue` (не дублировать competing robots/canonical hooks):

```ts
// CMS: после SSR useFetch; текущий 404/503 оставить.
useStorefrontSeo({
  title: () => `${page.value?.title || 'Страница'} — SARKISIAN BRAND`,
  description: () => page.value?.seoDescription || page.value?.lead,
  reviewRequired: () => Boolean(page.value?.reviewRequired),
});

// Товар: существующий SSR useFetch оставить, добавить SEO реального товара.
useStorefrontSeo({
  title: () => `${product.value?.nameRu || 'Товар'} — SARKISIAN BRAND`,
  description: () => product.value?.descriptionRu,
  image: () => image.value,
  noindex: () => !product.value,
});

// Кабинет/корзина: noindex определяется путём; можно явно noindex: true.
useStorefrontSeo({ title: 'Личный кабинет — SARKISIAN BRAND', noindex: true });
```

На остальных приватных интерфейсах нужен глобальный или layout-level `noindex`; SEO-хук витрины не подключён к ним автоматически. Для страниц товара текущая ветка «нет product» не формирует HTTP 404: parent должен выбрасывать `createError` с 404 при отсутствующем товаре и 503 при ошибке сервиса, не маскировать сбой как 404. При неизвестной категории также нужна согласованная политика 404/noindex; canonical-helper не проверяет существование slug в БД.

Текущий SSR: главная/каталог/товар используют `useFetch`; CMS `[page].vue` также загружается на сервере и уже выбрасывает 404/503. Ещё предстоят подключения canonical-хука и приёмка финального HTML. Корзина/аккаунт остаются приватными. `robots.txt` не является авторизацией и не гарантирует удаление URL из индекса; отдельно нужны серверная защита кабинетов и `noindex`. Если ранее публичная CMS уже попала в индекс, robots-disallow мешает роботу прочитать новый noindex: при снятии с публикации обеспечить настоящий 404/410 и согласовать удаление в поисковых кабинетах, а не полагаться лишь на robots.

## Чистые проверки, без интеграций

```powershell
# Рабочая папка backend
npm.cmd test -- --runInBand seo/seo.spec.ts seo/storefront-seo.spec.ts
npx.cmd tsc --noEmit --incremental false
```

Тесты документов, конфигурации, кеша/сбоев используют только mock Prisma. Frontend-файлы транспилируются в изолированный VM: проверяются pure canonical/policy, SSR metadata-hook с mock Nuxt и Nitro handlers с mock upstream. Серверы и провайдеры не запускаются, клиентские/заказные данные не создаются и не изменяются. Это не заменяет production SSR/build QA после подключения parent.

## SEO-приёмка на VPS (после подключения, без оплаты/доставки/1С)

1. Stage: оба indexing-флага `false`, robots содержит `Disallow: /`, sitemap валиден и без URL. Stage дополнительно ограничить сетью/авторизацией; ограничение не переносить на production robots.
2. Production перед открытием индексации: HTTPS, единый `SITE_URL`/`siteUrl`; Nginx отдаёт `/robots.txt` и `/sitemap.xml` именно через Nitro, не старые статические файлы. Успешные ответы — 200 и корректные Content-Type. Проверить backend через внутреннюю сеть.
3. После согласованного включения обоих indexing-флагов `true`: `Sitemap: https://sarkisianbrand.ru/sitemap.xml`, в XML нет localhost, тестового домена, `/api/v1/seo/sitemap`, `/catalog/{slug}`, закрытых/требующих проверки страниц. Все `<loc>` с одного origin, адреса категорий реально открываются.
4. Просмотреть исходный SSR HTML (не только DOM после JavaScript): ровно один абсолютный canonical, русские title/description, корректные og:url и og:image. Повторить для главной, категории, пагинации, товара, CMS. Фильтры/поиск и кабинеты — noindex; preview/reviewRequired не индексировать.
5. 404: несуществующий товар/CMS не должен отдавать пустую страницу с 200. Сбой backend — 503 и `no-store` для sitemap/robots, без ошибочной карты или Allow-all.
6. После изменения CMS/товара проверить обновление карты и достоверность lastmod в пределах 120 секунд; не тестировать через редактирование реальных заказов/клиентов. Проверить масштаб относительно лимитов карты.
7. Получить реальную выгрузку URL старого Яндекс Кит-сайта/статистику поисковых кабинетов. Только по ней составить и согласовать карту 301; сейчас её нет, редиректы не выдумывались. HTTP→HTTPS и www→основной host — конфигурация VPS parent.
8. Проверить sitemap/XML по протоколу, отправить в Яндекс Вебмастер и Google Search Console после открытия production. До отключения старого сайта отдельно закрыть задачу SEO-переезда из PLAN.md; данный блок её полностью не закрывает.

Основания: [Sitemaps protocol](https://www.sitemaps.org/protocol.html), [Google: robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [Google: canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
