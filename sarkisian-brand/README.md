# Sarkisian Brand - Экосистема для бьюти-бизнеса

## 📋 Описание
Единая цифровая коммерческая экосистема для Sarkisian Brand, включающая:
- B2C/B2B интернет-магазин
- Интеграцию с 1С:КА
- Маркетплейсы (Ozon, Wildberries, Яндекс.Маркет)
- Платежи (YooKassa) и доставку (CDEK)
- Личные кабинеты клиентов
- Программу лояльности
- Telegram-боты (B2C, B2B, Staff, Max)
- LMS (курсы и обучение)
- Календарь записи
- Внутреннюю CRM-систему

## 🏗️ Архитектура

### Backend
- **Framework:** NestJS (модульный монолит)
- **Database:** PostgreSQL + Prisma ORM
- **Cache/Queues:** Redis + BullMQ
- **Storage:** S3-compatible (Yandex Cloud)
- **API:** REST + Swagger/OpenAPI

### Frontend (в разработке)
- **Framework:** Nuxt 3
- **SSR:** Да
- **i18n:** @nuxtjs/i18n
- **PWA:** Поддержка офлайн-режима

### Инфраструктура
- Docker Compose для MVP
- CI/CD пайплайны
- Окружения: dev / stage / prod
- Мониторинг: Sentry, uptime, логи

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 20+
- Docker и Docker Compose
- Git

### Установка

1. **Клонирование репозитория**
```bash
git clone <repository-url>
cd sarkisian-brand/backend
```

2. **Настройка окружения**
```bash
cp .env.example .env
# Отредактируйте .env с вашими значениями
```

3. **Запуск инфраструктуры (Docker)**
```bash
docker-compose up -d db redis
```

4. **Установка зависимостей**
```bash
npm install
```

5. **Генерация Prisma Client**
```bash
npm run prisma:generate
```

6. **Применение миграций БД**
```bash
npm run prisma:migrate
```

7. **Запуск в режиме разработки**
```bash
npm run start:dev
```

Приложение будет доступно по адресу: http://localhost:3000

## 📁 Структура проекта

```
backend/
├── src/
│   ├── auth/           # Аутентификация и авторизация
│   ├── products/       # Каталог товаров
│   ├── cart/           # Корзины
│   ├── orders/         # Заказы
│   ├── shipping/       # Доставка
│   ├── 1c-sync/        # Интеграция с 1С:КА
│   ├── admin/          # Админка
│   ├── seo/            # SEO-оптимизация
│   ├── channels/       # Маркетплейсы
│   ├── b2b/            # B2B-функционал
│   ├── bots/           # Telegram-боты
│   ├── loyalty/        # Программа лояльности
│   ├── booking/        # Календарь записи
│   ├── lms/            # Обучение
│   ├── crm/            # CRM-система
│   └── common/         # Общие утилиты
├── prisma/
│   ├── schema.prisma   # Схема БД
│   ├── migrations/     # Миграции
│   └── seed.ts         # Сид-данные
├── test/               # Тесты
├── docker-compose.yml
├── .env.example
└── package.json
```

## 🔑 Основные модули

### P0 — Обязательно (MVP)
- ✅ Каталог товаров с категориями
- ✅ Авторизация и регистрация
- ✅ Корзина и оформление заказа
- ✅ Оплата (YooKassa)
- ✅ Доставка (CDEK)
- ✅ Интеграция с 1С:КА
- ✅ Админка заказов и товаров
- ✅ SEO-переезд
- ✅ Мониторинг и резервное копирование
- ✅ Базовая CRM (карточка клиента)

### P1 — Коммерческое усиление
- ⏳ Маркетплейсы (Ozon, WB, ЯМ)
- ⏳ B2B-кабинет
- ⏳ Telegram-боты (B2C/B2B)
- ⏳ Программа лояльности

### P2 — Экосистема
- ⏳ Календарь записи
- ⏳ LMS (курсы)
- ⏳ Staff-бот
- ⏳ Max-бот
- ⏳ Расширенная аналитика

### P3 — Международный контур
- ⏳ Мультиязычность (en)
- ⏳ Мультивалютность
- ⏳ Зарубежные платежи/доставка

## 🔧 Доступные команды

```bash
# Разработка
npm run start:dev      # Запуск в режиме разработки
npm run start:debug    # Запуск с отладкой

# Сборка
npm run build          # Сборка проекта

# Тестирование
npm run test           # Запуск тестов
npm run test:watch     # Тесты в режиме наблюдения
npm run test:cov       # Тесты с покрытием
npm run test:e2e       # E2E тесты

# Prisma
npm run prisma:generate    # Генерация клиента
npm run prisma:migrate     # Применение миграций (dev)
npm run prisma:migrate:prod # Применение миграций (prod)
npm run prisma:seed        # Сидирование БД
npm run prisma:studio      # Prisma Studio GUI

# Линтинг и форматирование
npm run lint           # ESLint
npm run format         # Prettier
```

## 🔐 Безопасность

- HTTPS везде
- JWT access/refresh токены
- RBAC (ролевая модель доступа)
- Rate limiting для API
- Идемпотентность критических операций
- Audit log для важных действий
- Регулярные backup БД
- Соответствие 152-ФЗ

## 📊 План разработки (12 недель)

| Неделя | Фокус | Результат |
|--------|-------|-----------|
| 1 | Фундамент + каталог | Dev-контур, каталог |
| 2 | E-commerce ядро | Заказ от корзины до оплаты |
| 3 | 1С:КА + SEO | Стабильный обмен |
| 4 | **MVP Release** | Рабочий B2C магазин |
| 5 | Маркетплейсы + TG | Дополнительные каналы |
| 6 | B2B | Пилот с группой клиентов |
| 7 | Лояльность | Cashback, промокоды |
| 8 | Календарь | Пилот бронирования |
| 9 | LMS — ядро | Пилот курса |
| 10 | LMS + Staff | Операционный контур |
| 11 | Оптимизация + i18n | Release candidate |
| 12 | **Финальный релиз** | Production release |

## 🎯 Контрольные точки (Gates)

1. **Gate 1 — Catalog:** Каталог и админка работают
2. **Gate 2 — Commerce:** Сквозной заказ работает
3. **Gate 3 — 1С:** Обмен идемпотентен, данные сверены
4. **Gate 4 — MVP:** Backup, мониторинг, SEO, mobile QA
5. **Gate 5 — Expansion:** После стабильной недели P0
6. **Gate 6 — Final:** Все функции с тестами и документацией

## 📝 Лицензия
UNLICENSED — частный проект Sarkisian Brand

## 📞 Контакты
Разработчик: Sarkisian Brand Dev Team
Документация: [ссылка на Confluence/Notion]
