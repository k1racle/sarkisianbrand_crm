-- Add an editable biography/gallery. Preserve all existing about-page copy.
-- Factual basis: sarkisianbrand.ru brand description and the owner's confirmation.
UPDATE "StorefrontPage" SET "blocks" = $copy$[
 {"id":"founder","kind":"biography","title":"Светлана Саркисян","body":"Светлана Саркисян — мастер маникюра, блогер и основательница SARKISIAN. В её работе встречаются два направления: практика мастера и создание профессиональных материалов для ногтевого сервиса.\nОпыт ежедневной работы стал основой бренда. SARKISIAN выпускает материалы для маникюра под личным контролем Светланы — с вниманием к тому, как продукт ведёт себя в руках мастера.\nВ своём блоге Светлана рассказывает о работе с ногтями и делится профессиональным опытом. Эту же связь с мастерами продолжает бренд: от знакомства с материалами до их использования в салоне.","images":["/storefront/svetlana-portrait.png","/storefront/svetlana-creator-youtube.jpg","/storefront/hero.jpg"]}
]$copy$::jsonb || "blocks", "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'about' AND NOT EXISTS
 (SELECT 1 FROM jsonb_array_elements("blocks") block WHERE block->>'id' = 'founder');
