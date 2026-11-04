# Code Mentor

Адаптивный одностраничный сайт для школы программирования. Главная страница `index.html` содержит описание курсов и их программы; карточки раскрывают выбранный курс прямо на этой странице.

## Разделы курсов

- `#python-course`, `#python-program`, `#python-full-program`, `#python-skills` — курс Python, базовая программа и полный учебный план.
- `#web-course`, `#web-program`, `#web-full-program`, `#web-skills` — курс Web-разработки, базовая программа и полный учебный план.
- `#roblox-course`, `#roblox-program`, `#roblox-skills` — курс Roblox Studio и базовая программа.

Полные программы Python и Web оформлены аккордеоном: Python — 5 блоков, 22 модуля и 191 тема; Web — 6 блоков, 22 модуля и 139 тем.

`python.html`, `web.html` и `roblox.html` оставлены как отдельные копии страниц, но ссылки сайта на них не ведут.

## Файлы и запуск

- `styles.css` — общие стили сайта.
- `script.js` — калькулятор, форма заявки и виджет контактов.
- `telegram-worker.js` — безопасный обработчик заявок для Cloudflare Workers.

Откройте `index.html` в браузере или запустите Live Server.

## Подключение заявок в Telegram бесплатно

Форма отправляет заявки в Telegram. Бот также отвечает на `/start`, пересылает текстовые сообщения посетителей владельцу и доставляет ответ владельца обратно в личный чат посетителя.

1. В Cloudflare откройте существующий Worker и замените его код содержимым `telegram-worker.js`, затем опубликуйте.
2. В **Settings → Variables and Secrets** настройте:
   - `TELEGRAM_BOT_TOKEN` — актуальный токен бота как **Secret**.
   - `TELEGRAM_CHAT_ID` — ваш числовой Telegram ID как **Secret** (его можно узнать у `@userinfobot`).
   - `TELEGRAM_WEBHOOK_SECRET` — случайная строка из латинских букв, цифр, `_` и `-`; создайте её, например, командой PowerShell `[guid]::NewGuid().ToString("N")`.
   - `WEBHOOK_SETUP_SECRET` — отдельная случайная строка, созданная такой же командой.
   - `SITE_ORIGIN` — точный origin сайта без завершающего `/`, например `https://example.com`.
3. Создайте KV namespace, например `telegram-chat-mappings`, и добавьте его в Worker в **Settings → Bindings → KV namespace** с variable name `CHAT_MAPPINGS`. Эта привязка нужна, чтобы бот мог доставлять ваши ответы нужным посетителям.
4. Опубликуйте Worker. Один раз зарегистрируйте webhook, выполнив в PowerShell (подставьте URL вашего Worker):

   ```powershell
   $worker = "https://your-worker.workers.dev"
   $setupSecret = Read-Host "Введите WEBHOOK_SETUP_SECRET"
   Invoke-RestMethod -Method Post -Uri "$worker/admin/set-webhook" -Headers @{ Authorization = "Bearer $setupSecret" }
   ```

   Введите значение `WEBHOOK_SETUP_SECRET`, заданное в Cloudflare. Не публикуйте его и токен бота.
5. Убедитесь, что адрес Worker указан в `data-endpoint` у формы `#form` в `index.html`. Загрузите обновлённый сайт на хостинг и установите `SITE_ORIGIN` равным адресу опубликованного сайта.
6. Проверьте `/start` в чате с ботом. Чтобы ответить посетителю, используйте в чате владельца Telegram функцию **Ответить** на пересланном сообщении. Бот принимает текстовые сообщения.

Токен, setup-секреты и chat ID храните только в Cloudflare Secrets. Для локальной проверки временно установите `SITE_ORIGIN` в `http://127.0.0.1:8000`, а перед публикацией замените на production-origin сайта.
