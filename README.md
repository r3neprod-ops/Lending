# 🏗 ЛНР Новострой — Лендинг с AI

Ультрасовременный продающий лендинг новостроек ЛНР под ипотеку 2%.  
Стек: **Node.js + Express + Anthropic Claude API**

## Что внутри

| Блок | Описание |
|------|----------|
| 🏠 Hero | Автозагрузка фото новостройки |
| 📊 Статы | 4 ключевых цифры |
| 💰 Ипотека 2% | Условия + тарифная сетка |
| 🏢 Каталог | 3 ЖК с фото и ценами |
| 🧮 Калькулятор | Ипотека в реальном времени |
| ✨ AI Визуализатор | Claude генерирует промпт → Unsplash фото |
| 🤖 AI Чат | Потоковый чат-консультант на Claude |
| 📋 Форма | Заявка → Express API → консоль (+ можно CRM) |

## Быстрый старт в GitHub Codespaces

```bash
# 1. Клонируй репо
git clone https://github.com/YOUR_USERNAME/lnr-realty
cd lnr-realty

# 2. Установи зависимости
npm install

# 3. Настрой API ключ
cp .env.example .env
# Открой .env и вставь свой ANTHROPIC_API_KEY

# 4. Запусти
npm run dev
# → http://localhost:3000
```

## Через Claude Code

```bash
# В терминале Codespace:
claude

# Дай команду:
# "запусти npm install и npm run dev, потом открой порт 3000"
```

## Структура

```
lnr-realty/
├── server.js          # Express сервер + API роуты
├── public/
│   └── index.html     # Лендинг (весь CSS/JS внутри)
├── package.json
├── .env.example       # Шаблон переменных окружения
├── .env               # Твой API ключ (не в git!)
└── .gitignore
```

## API эндпоинты

### `POST /api/ai/visualize`
Генерирует промпт интерьера через Claude.
```json
{ "style": "современный минималистичный", "room": "гостиная", "extra": "светло" }
```

### `POST /api/ai/chat`
Потоковый чат-консультант (SSE стрим).
```json
{ "messages": [{ "role": "user", "content": "Какие квартиры есть?" }] }
```

### `POST /api/form/submit`
Приём заявки.
```json
{ "name": "Иван", "phone": "+7...", "rooms": "2-комнатная", "budget": "...", "time": "..." }
```

## Добавить Telegram уведомление о заявке

В `server.js` в блоке `POST /api/form/submit` добавь:

```js
// npm install node-fetch
const tgToken = process.env.TG_BOT_TOKEN;
const tgChat  = process.env.TG_CHAT_ID;
if (tgToken && tgChat) {
  const text = `📋 Новая заявка\n👤 ${name}\n📞 ${phone}\n🏠 ${rooms}\n💰 ${budget}`;
  await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: tgChat, text })
  });
}
```

## Деплой на Railway / Render / VPS

```bash
# Railway
npm install -g @railway/cli
railway login
railway init
railway up

# Не забудь добавить переменную окружения ANTHROPIC_API_KEY в дашборде
```
