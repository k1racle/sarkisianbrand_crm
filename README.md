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

Предыдущие документы сохранены одним проверенным архивом: `backups/docs-before-reset-20261005-112940.zip`. В `docs/` оставлены только исполняемые проверки и пример настроек; это не дополнительный план.
