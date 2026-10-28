# SARKISIAN

CRM сотрудников, сайт с админкой и B2B-кабинет. Единственный актуальный список работ — [PLAN.md](PLAN.md). Пользовательская документация будет написана после завершения и проверки функций.

## Локальный запуск

Для уже настроенного окружения, из корня проекта:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml up -d
```

- Сайт: http://localhost:3001
- CRM: http://localhost:3001/crm/login
- B2B: http://localhost:3001/b2b
- API: http://localhost:3000/docs

Настройки и локальные учётные записи находятся в `.env.local`, который не хранится в Git. Внешние операции в локальном окружении отключены.

После изменения кода или схемы:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml build
docker compose --env-file .env.local -f docker-compose.local.yml run --rm backend npx prisma migrate deploy
docker compose --env-file .env.local -f docker-compose.local.yml up -d
```

Остановка с сохранением данных: `docker compose --env-file .env.local -f docker-compose.local.yml stop`.

Резервирование: [scripts/backup-local.ps1](scripts/backup-local.ps1). Проверка восстановления: [scripts/test-local-restore.ps1](scripts/test-local-restore.ps1). Архивы в `backups/` содержат служебные данные и исключены из Git.

## Сборка и установка рабочего окружения

Для отдельного сервера подготовлены [Dockerfile.production](Dockerfile.production), [docker-compose.production.yml](docker-compose.production.yml) и [deploy/Caddyfile](deploy/Caddyfile). Локальное окружение запускается своим прежним Compose-файлом. Требуются Docker Engine с Compose v2, Node.js 22.23.3+ для служебных команд и доменное имя, направленное на сервер. Для HTTPS должны быть доступны порты 80 и 443.

Создать `.env.production` с независимыми случайными ключами:

```sh
node scripts/init-production-env.cjs your-domain.ru admin@your-domain.ru
node scripts/production-preflight.cjs .env.production
docker compose --env-file .env.production -f docker-compose.production.yml --profile tools --profile edge config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml --profile tools --profile edge build
```

Генератор не перезаписывает существующий файл. В [образце настроек](.env.production.example) указаны обязательные переменные. Секреты и `.env.production` не входят в Git или Docker-образы. `INTEGRATION_ENCRYPTION_KEY` нужно сохранять при обновлении: им зашифрованы уже сохранённые интеграционные данные.

Первичная установка без демонстрационных данных:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml up -d --wait postgres redis
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrations
docker compose --env-file .env.production -f docker-compose.production.yml up -d --wait backend frontend
```

Миграции создают системные права доступа. Первый администратор создаётся отдельной командой `node scripts/bootstrap-admin.cjs` внутри backend-контейнера. На stdin передаётся JSON с полями `email` и `password`; используйте пароль из 16–72 латинских символов с буквой и цифрой. Пример для Linux-сервера с подготовленным защищённым файлом:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml exec -T backend node scripts/bootstrap-admin.cjs < /secure/first-admin.json
```

После создания удалите временный файл с паролем. Повторный запуск отказывается изменять существующего администратора. При первом входе требуется сменить пароль. Открыть HTTPS-вход после проверки домена и настроек:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml --profile edge up -d --wait proxy
```

PostgreSQL, Redis, API и Nuxt не публикуют порты на сервере. Приложение подключается к БД отдельной ролью без прав суперпользователя; миграции используют другой пароль владельца БД. HTTPS и Socket.IO проходят через Caddy. Backend доверяет ровно одному прокси в закрытой сети; дополнительные прокси требуют отдельной настройки доверенных адресов. В рабочем образе документация API закрыта. Проверки готовности доступны только внутри Compose-сети: `/api/v1/health/ready` для API и `/__health` для Nuxt. Логи: `docker compose --env-file .env.production -f docker-compose.production.yml logs --tail 100 backend frontend proxy`.

Отправка почты, автоматические фоновые операции, внешние вызовы магазина и индексация по умолчанию выключены. Их включают отдельными переменными после настройки и приёмки соответствующей интеграции. Запуск Compose сам не выполняет миграции или заполнение базы тестовыми данными.

Для Wildberries FBS флаги `WB_FBS_AUTOPOLL_ENABLED` и `WB_FBS_ALLOW_SANDBOX_IMPORT` в серверном Compose по умолчанию выключены. Автоопрос требует также `ECOSYSTEM_AUTOMATION_ENABLED=true` и предварительной проверки контракта API. Песочницу разрешают только в отдельной тестовой базе: идентификаторы её заказов могут совпасть с рабочими. Preflight проверяет, что оба значения заданы как `true` или `false`. Подробнее — [границы обмена WB](docs/WILDBERRIES_FBS_EXCHANGE.md).

## Рабочие резервные копии и проверка восстановления

Передайте отдельный случайный ключ из 32 байтов в hex через переменную `SARKISIAN_BACKUP_KEY`. Сохраните ключ отдельно от каталога резервных копий. Для копирования:

```sh
node scripts/production-backup.cjs backup .env.production
node scripts/production-backup.cjs verify backups/production-ИМЯ-КОПИИ
```

Резервирование временно останавливает API, сохраняет PostgreSQL, снимок Redis, загруженные и закрытые CRM-файлы, настройки окружения, затем возвращает API в исходное состояние. Результат зашифрован AES-256-GCM. Команда `verify` проверяет подлинность и контрольные суммы, восстанавливает БД в отдельный PostgreSQL без сети и опубликованных портов, проверяет Redis и распаковку файлов. Рабочую БД она не изменяет. Результат записывается в `restore-check.json` рядом с копией.

`node scripts/production-backup.cjs unpack backups/production-ИМЯ-КОПИИ` после полной проверки выгружает файлы в новый `backups/recovery-*`. Этот каталог содержит расшифрованные данные и настройки. Он предназначен для восстановления в отдельное пустое окружение: сначала PostgreSQL через `pg_restore --exit-on-error --no-owner`, затем архивы файлов в соответствующие новые тома и проверка миграций/готовности. Подмена работающей БД автоматически не выполняется. Перед переключением домена проверьте вход, файлы и обмены на восстановленном экземпляре.

При обновлении сначала сделайте и проверьте копию, соберите новые образы, остановите API, выполните `migrations`, затем поднимите backend/frontend и дождитесь healthcheck. Используйте отдельный `RELEASE_TAG` для каждой принятой версии. Возврат старого образа допустим только при совместимой схеме БД; иначе требуется восстановление проверенной копии в отдельное окружение.

## Проверка сборки перед выпуском

```sh
node scripts/dependency-audit.cjs
node scripts/release-smoke.cjs --build
```

`release-smoke` создаёт отдельный временный Compose-проект без опубликованных портов, применяет все миграции на пустую БД, проверяет первый вход и системные права, работу API/Nuxt, ограничения файловой системы, зашифрованную копию и восстановление. Его контейнеры и тома удаляются после проверки. Существующее локальное и рабочее окружение не затрагивается. Отчёт находится в `.screenshots/release-packaging.json`.

[GitHub Actions](.github/workflows/release-checks.yml) выполняет серверные тесты, проверки CSS/маршрутов/типографики/зависимостей, браузерные сценарии на собранном frontend и установку с проверкой восстановления. Workflow не публикует образы и не развёртывает приложение. Известные исключения аудита ограничены неиспользуемым Nest SSE и зависимостями инструментов сборки и разработки Nuxt. Для замечания `deepmerge` проверяется, что единственный остающийся потребитель — сборочный плагин Rollup, приложение не импортирует пакет напрямую и пакет с характерным кодом отсутствует в собранном frontend. Изменение цепочки зависимостей или новые advisory останавливают проверку для повторной оценки; это не означает нулевой `npm audit`.

Для PostgreSQL-сценариев склада 1С и Wildberries CI поднимает две отдельные временные базы на localhost:55432 и localhost:55433, применяет к каждой миграции и только затем запускает Jest. Их фиктивные учётные данные предназначены исключительно для этих баз; рабочая база и внешние сервисы не используются. Эти проверки создают и удаляют тестовые записи, поэтому нельзя направлять их в пользовательскую или рабочую БД. Браузерные проверки заказов B2B и обмена маркетплейсов выполняются на собранном frontend с подставными ответами API.

Для повторной проверки интерфейса на запущенной локальной сборке `http://127.0.0.1:3001` выполните из `frontend`: `npm run check:crm-design`, затем `npm run smoke:workspace-design` и `npx playwright test salon-booking.spec.cjs salon-subscription.spec.cjs`. Требуется браузер Playwright Chromium (`npx playwright install chromium`). Браузерные сценарии используют синтетические ответы API, не создают реальные заказы/визиты и блокируют внешние вызовы; они проверяют элементы, сценарии и адаптивность, а не подтверждают внешние интеграции. Снимки сохраняются в `frontend/.screenshots/`.

Предыдущие документы сохранены одним проверенным архивом: `backups/docs-before-reset-20261005-112940.zip`. В `docs/` оставлены только исполняемые проверки и пример настроек; это не дополнительный план.
