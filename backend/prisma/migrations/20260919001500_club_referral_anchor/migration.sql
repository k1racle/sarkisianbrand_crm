-- Ensure the referral destination exists even when no transferable source block
-- was available. The earlier club copy and all existing editorial blocks remain.
UPDATE "StorefrontPage" SET "blocks" = "blocks" || $copy$[
 {"id":"referral","title":"Делитесь любимым. Получайте бонусы.","body":"Рекомендуйте материалы SARKISIAN друзьям по персональной ссылке. Большая аудитория не нужна: участвовать может зарегистрированный частный клиент, принявший условия открытой программы.\nЗа подходящие покупки приглашённых клиентов получайте бонусы для следующих заказов на сайте. Денежные выплаты в реферальной программе не предусмотрены.","buttonLabel":"Условия и моя ссылка","buttonUrl":"/account?tab=referrals"}
]$copy$::jsonb, "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'club' AND NOT EXISTS
 (SELECT 1 FROM jsonb_array_elements("blocks") block WHERE block->>'id' = 'referral');
