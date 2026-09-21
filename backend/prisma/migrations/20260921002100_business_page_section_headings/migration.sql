-- Section headlines are ordinary page blocks, editable in Site > Pages.
UPDATE "StorefrontPage" SET
  "blocks" = "blocks" || jsonb_build_array(
    jsonb_build_object('id', 'workday', 'kind', 'text', 'title', E'Больше времени на клиентов.\nМеньше ручной работы.', 'body', ''),
    jsonb_build_object('id', 'faq-intro', 'kind', 'text', 'title', 'Остались вопросы?', 'body', 'Самое важное перед подключением.')
  ),
  "revision" = "revision" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'business'
  AND "revision" = 4
  AND "title" = E'Закупки, запись, клиенты.\nВсё в одном месте.'
  AND NOT "blocks" @> '[{"id":"workday"}]'::jsonb;
