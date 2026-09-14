# Sarkisian Brand - Ecosystem Platform

## 📋 Описание проекта

Единая цифровая коммерческая экосистема **Sarkisian Brand** для сферы бьюти-продаж и обучения.

### Основные возможности:
- **B2C/B2B интернет-магазин** с интеграцией 1С:КА
- **CRM-система** для управления клиентами, лидами и задачами
- **LMS** для онлайн-курсов по бьюти-тематике
- **Календарь записи** на услуги
- **Telegram-боты** для клиентов и сотрудников
- **Интеграция с маркетплейсами** (Ozon, WB, Яндекс Маркет)
- **Программа лояльности**
- **PWA** с поддержкой мобильных устройств

---

## 🏗️ Архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend       │     │   PostgreSQL    │
│   (Nuxt 3 PWA)  │────▶│   (NestJS API)   │────▶│   + Prisma ORM  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │       │
                              ▼       ▼
                        ┌──────────┐  ┌──────────┐
                        │  Redis   │  │ 1C:КА    │
                        │  Cache   │  │ Exchange │
                        └──────────┘  └──────────┘
```

### Технологический стек:

**Backend:**
- NestJS (модульный монолит)
- Prisma ORM
- PostgreSQL 15
- Redis 7
- BullMQ (очереди)
- JWT auth

**Frontend:**
- Nuxt 3 (SSR)
- Vue 3 + TypeScript
- PWA support
- Mobile-first дизайн

**Инфраструктура:**
- Docker & Docker Compose
- CI/CD ready

---

## 🚀 Быстрый старт

### Требования:
- Node.js 20+
- Docker & Docker Compose
- Git

### Установка:

```bash
# Клонирование репозитория
git clone <repository-url>
cd sarkisian-brand

# Запуск инфраструктуры
docker-compose up -d postgres redis

# Установка зависимостей backend
cd backend
npm install

# Копирование .env
cp .env.example .env

# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate dev

# Запуск backend в режиме разработки
npm run start:dev
```

API будет доступно по адресу: http://localhost:3000  
Swagger документация: http://localhost:3000/docs

---

## 📁 Структура проекта

```
sarkisian-brand/
├── backend/                 # NestJS API
│   ├── prisma/             # Prisma схема и миграции
│   │   └── schema.prisma
│   ├── src/
│   │   ├── auth/           # Аутентификация
│   │   ├── products/       # Каталог товаров
│   │   ├── cart/           # Корзина
│   │   ├── orders/         # Заказы
│   │   ├── shipping/       # Доставка
│   │   ├── 1c-sync/        # Интеграция с 1С
│   │   ├── admin/          # Админка
│   │   ├── seo/            # SEO модуль
│   │   ├── channels/       # Маркетплейсы
│   │   ├── b2b/            # B2B портал
│   │   ├── bots/           # Telegram/Max боты
│   │   ├── loyalty/        # Программа лояльности
│   │   ├── booking/        # Календарь записи
│   │   ├── lms/            # Обучение
│   │   ├── crm/            # CRM система
│   │   └── common/         # Общие утилиты
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/               # Nuxt 3 PWA (будет создан)
├── admin/                  # Admin panel (будет создан)
├── docker-compose.yml
└── README.md
```

---

## 📅 План разработки (12 недель)

| Неделя | Фокус | Результат |
|--------|-------|-----------|
| 1 | Фундамент + Каталог | Dev окружение, каталог товаров |
| 2 | E-commerce ядро | Заказ от корзины до оплаты |
| 3 | 1С + SEO | Стабильный обмен с 1С, SEO переезд |
| 4 | **MVP Release** | Рабочий B2C магазин РФ |
| 5 | Маркетплейсы + TG Bot | Ozon/WB/ЯМ, B2C бот |
| 6 | B2B | Оптовый кабинет, повтор заказа |
| 7 | Лояльность | Уровни, cashback, промокоды |
| 8 | Календарь | Бронирование услуг |
| 9 | LMS ядро | Курсы, уроки, прогресс |
| 10 | LMS + Staff | ДЗ, сертификаты, Staff бот |
| 11 | Max + Оптимизация | Performance, security, i18n |
| 12 | **Финальный релиз** | Production release |

---

## 🔑 Ключевые контрольные точки (Gates)

- **Gate 1** — Catalog: каталог и админка работают
- **Gate 2** — Commerce: сквозной заказ работает
- **Gate 3** — 1С: обмен идемпотентен, данные сверены
- **Gate 4** — MVP: backup, мониторинг, mobile QA
- **Gate 5** — Expansion: только после стабильной недели P0
- **Gate 6** — Final: все тесты passed, документация готова

---

## 🔒 Безопасность

- HTTPS везде
- JWT access/refresh токены
- RBAC (ролевая модель)
- Rate limiting
- Idempotency для платежей и webhook
- Audit log критических действий
- Backup PostgreSQL ежедневно

---

## 📊 CRM Роли

- **ADMIN** — полный доступ
- **MANAGER_B2B** — работа с B2B клиентами
- **MANAGER_SALES** — продажи и лиды
- **SUPERVISOR** — контроль менеджеров
- **CURATOR** — обучение и LMS
- **WAREHOUSE** — склад и отгрузки
- **CUSTOMER_B2C/B2B** — клиенты

---

## 🌍 Интернационализация

- Мультиязычность: ru (старт), en, kz
- Мультивалютность: RUB, USD, EUR, KZT
- Локализованные даты, телефоны, адреса
- Региональный контекст (страна/город → склад/цены/доставка)

---

## 📞 Контакты

Разработчик: Sarkisian Brand Dev Team  
Документация: http://localhost:3000/docs

---

## 📝 Лицензия

UNLICENSED — Все права защищены Sarkisian Brand
