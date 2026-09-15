import { BotAudience, IntegrationCategory } from '@prisma/client';

export type IntegrationFieldType = 'text' | 'url' | 'number' | 'secret';

export interface IntegrationFieldDefinition {
  key: string;
  label: string;
  type: IntegrationFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}

export interface IntegrationDefinition {
  key: string;
  provider: string;
  name: string;
  category: IntegrationCategory;
  audience?: BotAudience;
  description: string;
  documentationUrl: string;
  fields: IntegrationFieldDefinition[];
}

const botAudienceLabels: Record<BotAudience, string> = {
  EMPLOYEE: 'для сотрудников',
  B2C: 'для B2C-клиентов',
  B2B: 'для B2B-клиентов',
};

function botDefinitions(
  provider: 'TELEGRAM' | 'MAX' | 'VK',
  name: string,
  documentationUrl: string,
  fields: IntegrationFieldDefinition[],
): IntegrationDefinition[] {
  return (Object.values(BotAudience) as BotAudience[]).map((audience) => ({
    key: `BOT_${provider}_${audience}`,
    provider,
    name: `${name} ${botAudienceLabels[audience]}`,
    category: IntegrationCategory.BOT,
    audience,
    description: `Отдельный бот ${botAudienceLabels[audience]} с независимым токеном и webhook.`,
    documentationUrl,
    fields,
  }));
}

const webhookField: IntegrationFieldDefinition = {
  key: 'webhookUrl',
  label: 'Адрес webhook',
  type: 'url',
  placeholder: 'https://api.sarkisianbrand.ru/webhooks/...',
};

export const integrationDefinitions: IntegrationDefinition[] = [
  {
    key: 'YANDEX_ID', provider: 'YANDEX_ID', name: 'Яндекс ID', category: IntegrationCategory.COMMUNICATION,
    description: 'Вход и регистрация B2C-клиентов через единый аккаунт Яндекса по OAuth 2.0.',
    documentationUrl: 'https://yandex.ru/dev/id/doc/ru/',
    fields: [
      { key: 'clientId', label: 'ID приложения', type: 'text', required: true },
      { key: 'clientSecret', label: 'Секрет приложения', type: 'secret', required: true },
      { key: 'redirectUri', label: 'Redirect URI', type: 'url', required: true, placeholder: 'https://api.sarkisianbrand.ru/api/v1/auth/social/yandex/callback' },
    ],
  },
  {
    key: 'VK_ID', provider: 'VK_ID', name: 'VK ID', category: IntegrationCategory.COMMUNICATION,
    description: 'Вход и регистрация B2C-клиентов через VK ID с защищённым OAuth 2.1 + PKCE.',
    documentationUrl: 'https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/web/overview',
    fields: [
      { key: 'clientId', label: 'ID приложения', type: 'text', required: true },
      { key: 'clientSecret', label: 'Защищённый ключ', type: 'secret', required: true },
      { key: 'redirectUri', label: 'Redirect URI', type: 'url', required: true, placeholder: 'https://api.sarkisianbrand.ru/api/v1/auth/social/vk/callback' },
    ],
  },
  {
    key: 'OZON_SELLER', provider: 'OZON', name: 'Ozon Seller', category: IntegrationCategory.MARKETPLACE,
    description: 'Товары, цены, остатки, заказы, отправления и возвраты Ozon.',
    documentationUrl: 'https://docs.ozon.ru/api/seller/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'warehouseId', label: 'ID склада', type: 'text' },
      webhookField,
    ],
  },
  {
    key: 'WILDBERRIES', provider: 'WILDBERRIES', name: 'Wildberries', category: IntegrationCategory.MARKETPLACE,
    description: 'Контент, цены, остатки, поставки, заказы и аналитика Wildberries.',
    documentationUrl: 'https://dev.wildberries.ru/',
    fields: [
      { key: 'apiToken', label: 'Единый API-токен', type: 'secret', required: true },
      { key: 'warehouseId', label: 'ID склада продавца', type: 'text' },
      { key: 'supplierId', label: 'ID кабинета поставщика', type: 'text' },
    ],
  },
  {
    key: 'YANDEX_MARKET', provider: 'YANDEX_MARKET', name: 'Яндекс Маркет', category: IntegrationCategory.MARKETPLACE,
    description: 'Ассортимент, цены, остатки, заказы и API-уведомления Яндекс Маркета.',
    documentationUrl: 'https://yandex.ru/dev/market/partner-api/doc/ru/',
    fields: [
      { key: 'campaignId', label: 'ID магазина / кампании', type: 'text', required: true },
      { key: 'businessId', label: 'ID кабинета', type: 'text' },
      { key: 'apiKey', label: 'API-Key-токен', type: 'secret', required: true },
      webhookField,
    ],
  },
  {
    key: 'CDEK', provider: 'CDEK', name: 'СДЭК', category: IntegrationCategory.DELIVERY,
    description: 'Расчёт доставки, ПВЗ, создание отправлений, печатные формы и статусы.',
    documentationUrl: 'https://apidoc.cdek.ru/',
    fields: [
      { key: 'clientId', label: 'Account / Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Secure password / Client secret', type: 'secret', required: true },
      { key: 'senderCityCode', label: 'Код города отправителя', type: 'text' },
      webhookField,
    ],
  },
  {
    key: 'OZON_LOGISTICS', provider: 'OZON_LOGISTICS', name: 'Ozon Логистика', category: IntegrationCategory.DELIVERY,
    description: 'Методы Seller API для логистики и доставки отправлений Ozon.',
    documentationUrl: 'https://dev.ozon.ru/start/448-Spravochnik-metodov-Seller-API-dlia-Ozon-logistiki/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'warehouseId', label: 'ID склада', type: 'text' },
    ],
  },
  {
    key: 'YANDEX_DELIVERY', provider: 'YANDEX_DELIVERY', name: 'Яндекс Доставка', category: IntegrationCategory.DELIVERY,
    description: 'Расчёт стоимости, создание заказа доставки и отслеживание статусов.',
    documentationUrl: 'https://dostavka.yandex.ru/integrations/api/',
    fields: [
      { key: 'apiToken', label: 'API-токен', type: 'secret', required: true },
      { key: 'platformStationId', label: 'ID станции / кабинета', type: 'text' },
      webhookField,
    ],
  },
  {
    key: 'ONE_C', provider: 'ONE_C', name: '1С: товары, заказы и клиенты', category: IntegrationCategory.ERP,
    description: 'Двусторонний обмен номенклатурой, ценами, остатками, заказами и клиентами.',
    documentationUrl: 'https://featureit.ru/blog/integraciya-1s-sajt-api-guide/',
    fields: [
      { key: 'baseUrl', label: 'Адрес HTTP-сервиса 1С', type: 'url', required: true },
      { key: 'username', label: 'Пользователь обмена', type: 'text', required: true },
      { key: 'password', label: 'Пароль', type: 'secret', required: true },
      { key: 'exchangeSecret', label: 'Секрет подписи и входящих статусов', type: 'secret', required: true },
      { key: 'healthPath', label: 'Путь проверки соединения', type: 'text', placeholder: '/hs/sarkisian/v1/health' },
      { key: 'productsPath', label: 'Путь получения товаров', type: 'text', placeholder: '/hs/sarkisian/v1/products' },
      { key: 'counterpartiesPath', label: 'Путь получения контрагентов', type: 'text', placeholder: '/hs/sarkisian/v1/counterparties' },
      { key: 'ordersPath', label: 'Путь передачи заказов', type: 'text', placeholder: '/hs/sarkisian/v1/orders' },
      { key: 'orderStatusesPath', label: 'Путь статусов сборки', type: 'text', placeholder: '/hs/sarkisian/v1/order-statuses' },
      { key: 'warehouseId', label: 'ID склада 1С для сборки', type: 'text', required: true },
      { key: 'organizationId', label: 'ID организации 1С', type: 'text', required: true },
      { key: 'orderType', label: 'Вид документа заказа', type: 'text', placeholder: 'Заказ клиента' },
      { key: 'requestTimeoutMs', label: 'Таймаут запроса, мс', type: 'number', placeholder: '15000' },
      { key: 'syncIntervalMinutes', label: 'Интервал синхронизации, минут', type: 'number', placeholder: '15' },
    ],
  },
  {
    key: 'YOOKASSA', provider: 'YOOKASSA', name: 'ЮKassa', category: IntegrationCategory.PAYMENT,
    description: 'Приём платежей, возвраты, уведомления и идемпотентность операций.',
    documentationUrl: 'https://yookassa.ru/developers',
    fields: [
      { key: 'shopId', label: 'shopId', type: 'text', required: true },
      { key: 'secretKey', label: 'Секретный ключ', type: 'secret', required: true },
      { key: 'webhookSecret', label: 'Секрет проверки webhook', type: 'secret' },
      webhookField,
    ],
  },
  {
    key: 'CLOUDKASSIR', provider: 'CLOUDKASSIR', name: 'CloudKassir', category: IntegrationCategory.FISCAL,
    description: 'Фискализация платежей и возвратов, чеки и статусы онлайн-кассы.',
    documentationUrl: 'https://developers.cloudkassir.ru/',
    fields: [
      { key: 'publicId', label: 'Public ID', type: 'text', required: true },
      { key: 'apiSecret', label: 'Пароль API', type: 'secret', required: true },
      { key: 'inn', label: 'ИНН организации', type: 'text', required: true },
      { key: 'taxationSystem', label: 'Система налогообложения', type: 'text' },
    ],
  },
  {
    key: 'SMS_AERO', provider: 'SMS_AERO', name: 'SMS Aero', category: IntegrationCategory.COMMUNICATION,
    description: 'Сервисные SMS: коды, статусы заказов, доставка и уведомления.',
    documentationUrl: 'https://smsaero.ru/integration/documentation/api/',
    fields: [
      { key: 'email', label: 'Email кабинета', type: 'text', required: true },
      { key: 'apiKey', label: 'API-ключ', type: 'secret', required: true },
      { key: 'signature', label: 'Подпись отправителя', type: 'text', required: true },
    ],
  },
  ...botDefinitions('TELEGRAM', 'Telegram', 'https://core.telegram.org/bots/api', [
    { key: 'botUsername', label: 'Имя бота', type: 'text', placeholder: '@sarkisian_bot' },
    { key: 'botToken', label: 'Токен Bot API', type: 'secret', required: true },
    webhookField,
    { key: 'webhookSecret', label: 'Secret token webhook', type: 'secret', required: true },
  ]),
  ...botDefinitions('MAX', 'MAX', 'https://dev.max.ru/docs-api', [
    { key: 'botId', label: 'ID бота', type: 'text' },
    { key: 'accessToken', label: 'Токен авторизации', type: 'secret', required: true },
    webhookField,
    { key: 'webhookSecret', label: 'Секрет webhook', type: 'secret', required: true },
  ]),
  ...botDefinitions('VK', 'VK', 'https://dev.vk.com/ru/api/community-events/getting-started', [
    { key: 'groupId', label: 'ID сообщества', type: 'text', required: true },
    { key: 'apiVersion', label: 'Версия API', type: 'text', placeholder: '5.199' },
    { key: 'accessToken', label: 'Ключ доступа сообщества', type: 'secret', required: true },
    { key: 'confirmationToken', label: 'Строка подтверждения Callback API', type: 'secret' },
    { key: 'webhookSecret', label: 'Секрет Callback API', type: 'secret', required: true },
    webhookField,
  ]),
];

export const integrationDefinitionMap = new Map(integrationDefinitions.map((item) => [item.key, item]));

export const defaultBotCommands = [
  { slug: 'start', command: '/start', title: 'Начало работы', description: 'Приветствие и выбор доступного сценария.', audiences: ['EMPLOYEE', 'B2C', 'B2B'], channels: ['TELEGRAM', 'MAX', 'VK'], handlerKey: 'WELCOME', requiresAuth: false, sortOrder: 10 },
  { slug: 'help', command: '/help', title: 'Помощь', description: 'Список доступных команд для текущей аудитории.', audiences: ['EMPLOYEE', 'B2C', 'B2B'], channels: ['TELEGRAM', 'MAX', 'VK'], handlerKey: 'HELP', requiresAuth: false, sortOrder: 20 },
  { slug: 'orders', command: '/orders', title: 'Мои заказы', description: 'Последние заказы и текущие статусы.', audiences: ['B2C', 'B2B'], channels: ['TELEGRAM', 'MAX', 'VK'], handlerKey: 'CUSTOMER_ORDERS', requiresAuth: true, sortOrder: 30 },
  { slug: 'catalog', command: '/catalog', title: 'Каталог', description: 'Поиск товара и переход в каталог.', audiences: ['B2C', 'B2B'], channels: ['TELEGRAM', 'MAX', 'VK'], handlerKey: 'CATALOG', requiresAuth: false, sortOrder: 40 },
  { slug: 'support', command: '/support', title: 'Поддержка', description: 'Создание и просмотр обращения Helpdesk.', audiences: ['EMPLOYEE', 'B2C', 'B2B'], channels: ['TELEGRAM', 'MAX', 'VK'], handlerKey: 'HELPDESK', requiresAuth: true, sortOrder: 50 },
  { slug: 'tasks', command: '/tasks', title: 'Мои задачи', description: 'Задачи сотрудника на сегодня и просрочки.', audiences: ['EMPLOYEE'], channels: ['TELEGRAM', 'MAX'], handlerKey: 'EMPLOYEE_TASKS', requiresAuth: true, sortOrder: 60 },
  { slug: 'results', command: '/results', title: 'Результаты', description: 'Краткая управленческая сводка по доступным показателям.', audiences: ['EMPLOYEE'], channels: ['TELEGRAM', 'MAX'], handlerKey: 'LEADERSHIP_RESULTS', requiresAuth: true, sortOrder: 70 },
] as const;
