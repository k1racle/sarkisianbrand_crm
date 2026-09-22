-- Keep the club hub and the buyer loyalty page as separate editable CMS records.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "StorefrontPage" WHERE "slug" = 'club')
     AND NOT EXISTS (SELECT 1 FROM "StorefrontPage" WHERE "slug" = 'club-referrals') THEN
    UPDATE "StorefrontPage"
    SET "slug" = 'club-referrals', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "slug" = 'club';
  END IF;
END $$;

INSERT INTO "StorefrontPage" (
  "slug", "title", "eyebrow", "lead", "seoDescription", "blocks", "isActive", "reviewRequired", "revision", "createdAt", "updatedAt"
)
SELECT
  'club',
  'Один клуб. Выберите свой формат.',
  'SARKISIAN CLUB',
  'Для мастеров, салонов и авторов: бонусы, удобные закупки и понятное партнёрство — в одном пространстве.',
  'SARKISIAN CLUB для покупателей, бизнеса и блогеров: выберите свой формат участия и откройте подходящие возможности.',
  $$[
    {"id":"buyers","title":"Для покупателей","body":"Бонусы за покупки.\nИстория участия в личном кабинете.\nПерсональные условия для постоянных клиентов.","kind":"feature","icon":"gift","buttonLabel":"Как работает клуб","buttonUrl":"/club/referrals"},
    {"id":"business","title":"Для бизнеса","body":"Профессиональные закупки.\nКоманда, расписание и клиенты.\nОнлайн-запись под брендом салона.","kind":"feature","icon":"business","buttonLabel":"Решения для бизнеса","buttonUrl":"/business"},
    {"id":"bloggers","title":"Для блогеров","body":"Контент с личным опытом.\nВознаграждение за результат.\nСсылка и аналитика в кабинете.","kind":"feature","icon":"users","buttonLabel":"Условия для блогеров","buttonUrl":"/partnerships"},
    {"id":"directions","title":"Клуб подстраивается под вашу работу.","body":"Выберите направление — и откройте только те возможности, которые подходят именно вам.","kind":"text"},
    {"id":"footer","title":"Выберите направление, а дальше мы поможем.","body":"Если остались вопросы, команда SARKISIAN подскажет подходящий формат.","kind":"action","buttonLabel":"Задать вопрос","buttonUrl":"/contacts"}
  ]$$::jsonb,
  true,
  false,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StorefrontPage" WHERE "slug" = 'club');
