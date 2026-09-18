-- Move the existing referral copy into the club before removing it from creators.
-- Preserve all existing club blocks and do not add the same referral section twice.
UPDATE "StorefrontPage" club SET "blocks" = club."blocks" || jsonb_build_array(referral.block),
  "revision" = club."revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
FROM (SELECT block FROM "StorefrontPage", jsonb_array_elements("blocks") block
      WHERE "slug" = 'partnerships' AND block->>'id' = 'referral') referral
WHERE club."slug" = 'club' AND NOT EXISTS
  (SELECT 1 FROM jsonb_array_elements(club."blocks") block WHERE block->>'id' = 'referral');

UPDATE "StorefrontPage" SET "blocks" = "blocks" || $copy$[
 {"id":"referral-rules","title":"Как работают рекомендации","body":"Откройте раздел «Рефералы» в личном кабинете. Когда программа открыта, примите её условия и получите персональную ссылку. Поделитесь ссылкой с друзьями: привязка перехода сохраняется с согласия посетителя.\nЗа подходящие розничные покупки начисляются бонусы для следующих заказов на сайте, а не деньги. Размер награды, окно привязки и срок ожидания указаны в кабинете. Награда подтверждается после оплаты, доставки и установленного срока ожидания.\nB2B-заказы, маркетплейсы, подарочные сертификаты и самоприглашения не участвуют. Отмены и возвраты могут изменять начисления. Одна покупка не даёт двойного партнёрского вознаграждения.","buttonLabel":"Моя персональная ссылка","buttonUrl":"/account?tab=referrals"}
]$copy$::jsonb, "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'club' AND NOT EXISTS
  (SELECT 1 FROM jsonb_array_elements("blocks") block WHERE block->>'id' = 'referral-rules');

UPDATE "StorefrontPage" SET "title" = 'Создавайте контент.
Растите с брендом.', "eyebrow" = 'БЛОГЕРАМ И АВТОРАМ',
"lead" = 'Ваш опыт заслуживает внимания. Рассказывайте о материалах SARKISIAN, делитесь находками и развивайте сотрудничество с брендом.',
"seoDescription" = 'Сотрудничество с блогерами SARKISIAN: персональная ссылка, аналитика, денежное вознаграждение за розничные покупки и отдельная награда за привлечение бизнеса.',
"blocks" = (SELECT COALESCE(jsonb_agg(CASE block->>'id'
 WHEN 'cover' THEN block || $copy${"title":"Ваш опыт имеет значение","body":"Персональная ссылка\nАналитика рекомендаций\nДенежное вознаграждение","buttonLabel":"Подать заявку блогера","buttonUrl":"/account?tab=bloggers","secondaryLabel":"Уже участвуете? В кабинет","secondaryUrl":"/account?tab=bloggers"}$copy$::jsonb
 WHEN 'referral-start' THEN (block || $copy${"id":"creator-start","title":"От знакомства к партнёрству","body":"Расскажите о себе и добавьте ссылки на ваши каналы в заявке.\nПосле одобрения получите персональную ссылку и согласуйте условия сотрудничества.\nСоздавайте контент и следите за переходами, заказами и начислениями в кабинете."}$copy$::jsonb)
 WHEN 'transparent' THEN block || $copy${"title":"Все результаты — в вашем кабинете","body":"Следите за переходами по ссылке, подходящими заказами и историей начислений. Данные покупателей остаются закрытыми.\nПосле подтверждения награды и достижения минимальной суммы можно запросить денежную выплату. Условия и проверка получателя — в кабинете."}$copy$::jsonb
 WHEN 'eligible' THEN block || $copy${"body":"Комиссия действует на подходящие розничные покупки по правилам программы. B2B-продажи, маркетплейсы, подарочные сертификаты и самоприглашения не участвуют; доставка не входит в расчёт.\nСтавка, минимальная покупка и срок привязки ссылки указаны в кабинете партнёра."}$copy$::jsonb
 WHEN 'together' THEN block || $copy${"title":"Давайте создавать вместе","body":"Расскажите о вашей аудитории и любимых форматах. Мы рассмотрим заявку и обсудим условия сотрудничества.","buttonLabel":"Подать заявку блогера","buttonUrl":"/account?tab=bloggers","secondaryLabel":"Задать вопрос","secondaryUrl":"/contacts"}$copy$::jsonb
 ELSE block END ORDER BY ordinal), '[]'::jsonb)
 FROM jsonb_array_elements("blocks") WITH ORDINALITY AS source(block, ordinal)
 WHERE block->>'id' NOT IN ('referral', 'joining')),
"revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "slug" = 'partnerships';

UPDATE "StorefrontPage" SET "title" = 'Сильные материалы.
Удобный бизнес.', "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'business' AND "title" = 'Ваш бизнес.
Наши решения.';

UPDATE "StorefrontMenuItem" SET "label" = 'Для блогеров', "updatedAt" = CURRENT_TIMESTAMP
WHERE "url" = '/partnerships' AND "label" IN ('Рефералы и блогеры', 'Сотрудничество');
