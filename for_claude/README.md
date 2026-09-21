IOMASTAVKA FILE 24

Важно: токен API-CLOUD не вшивается в GitHub/ZIP. На Render добавьте переменную окружения API_CLOUD_FTS_TOKEN со своим токеном.

Примечание: документированный API-CLOUD FTS v2 предназначен для проверки таможенного оформления автомобилей по VIN, а не для поиска ТН ВЭД. Поэтому проверка ТН ВЭД в приложении использует актуальный web-поиск по ФТС/ЕЭК и официальным источникам, а API-CLOUD хранится серверно для FTS-задач, где он действительно применим.

Запуск: node server.js

## Render environment
OPENAI_API_KEY must remain configured in Render. Optional API_CLOUD_FTS_TOKEN can be configured server-side; it is not exposed to the browser. The TN VED checker uses official web sources and AI analysis because the supplied API-CLOUD FTS v2 endpoint is VIN/vehicle-oriented, not a TN VED tariff lookup.
