# Локальные значки интеграций CRM

Файлы `frontend/public/crm/brands/` заменяют обращения к внешним CDN при открытии служебных экранов. Это копии существующих значков, а не новые нарисованные логотипы. Для отсутствующего изображения используется текстовая подпись. Права на товарные знаки принадлежат их владельцам.

Источники (сохранены 23.09.2026):

| Файлы | Источник |
| --- | --- |
| `ozon.svg`, `ozon_logistics.svg` | Google S2 favicon для `ozon.ru` (тот же источник, что использовался в компоненте) |
| `yandex_market.svg` | Google S2 favicon для `market.yandex.ru` |
| `vk.svg` | Google S2 favicon для `vk.com` |
| `wildberries.svg` | Wikimedia Commons, `Wildberries_2023_Pink.svg` |
| `cdek.svg` | [CDEK logo.svg](https://commons.wikimedia.org/wiki/File:CDEK_logo.svg), простой текстовый логотип |
| `yandex_delivery.svg` | `https://dostavka.yandex.ru/favicon.ico` |
| `one_c.svg` | `https://1c.ru/fav.svg` |
| `yookassa.svg` | `https://static.yoomoney.ru/files-front/resources/head/checkout/favicon-32x32.png` |
| `sms_aero.svg` | `https://smsaero.ru/logos/icon.png` |
| `telegram.svg` | `https://telegram.org/img/website_icon.svg?4` |
| `max.svg` | `https://max.ru/favicon.svg` |

Часть SVG служит контейнером для исходного растрового favicon. В дальнейшем заменять такие файлы только проверенными материалами владельца бренда. Для CloudKassir оставлена текстовая подпись CK: недоступный внешний источник не используется в CRM.
