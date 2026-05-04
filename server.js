import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── ANTHROPIC CLIENT ──
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── RATE LIMITING — защита от злоупотреблений ──
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 минута
  max: 10,                   // max 10 запросов в минуту с одного IP
  message: { error: 'Слишком много запросов. Попробуйте через минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Слишком много заявок. Попробуйте через минуту.' },
});

// ─────────────────────────────────────────────
//  POST /api/ai/visualize
//  Генерирует промпт для визуализации интерьера
// ─────────────────────────────────────────────
app.post('/api/ai/visualize', aiLimiter, async (req, res) => {
  const { style, room, extra } = req.body;

  if (!style || !room) {
    return res.status(400).json({ error: 'Укажите style и room' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are an expert interior design prompt engineer for AI image generation.

Create a photorealistic image prompt for:
- Style: ${style}
- Room: ${room}
- Extra details: ${extra || 'none'}

Return ONLY valid JSON (no markdown, no extra text):
{
  "imagePrompt": "<English prompt, 100+ words, highly specific, photorealistic, 8K, architectural visualization>",
  "unsplashQuery": "<3-5 English keywords for Unsplash, e.g. modern living room interior luxury>"
}`,
        },
      ],
    });

    const raw = message.content.map((c) => c.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // fallback если Claude вернул не чистый JSON
      parsed = {
        imagePrompt: `${style} ${room} interior, photorealistic, 8K`,
        unsplashQuery: `${style} ${room} interior apartment`,
      };
    }

    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error('[AI visualize error]', err.message);
    res.status(500).json({ error: 'Ошибка AI. Попробуйте ещё раз.' });
  }
});

// ─────────────────────────────────────────────
//  POST /api/ai/chat
//  Чат-консультант по недвижимости
// ─────────────────────────────────────────────
app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Передайте массив messages' });
  }

  // Streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `Ты — профессиональный консультант по недвижимости компании «ЛНР Новострой».
Ты помогаешь клиентам выбрать квартиру в новостройках ЛНР и оформить ипотеку под 2% годовых.
Отвечай кратко (2–4 предложения), по делу, по-русски. Будь дружелюбным и профессиональным.
Если спрашивают цены — говори "от 1 500 000 до 6 000 000 ₽ в зависимости от объекта".
Всегда предлагай оставить заявку для точного расчёта.`,
      messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta?.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[AI chat error]', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Ошибка соединения' })}\n\n`);
    res.end();
  }
});

// ─────────────────────────────────────────────
//  POST /api/form/submit
//  Приём заявки
// ─────────────────────────────────────────────
app.post('/api/form/submit', formLimiter, async (req, res) => {
  const { name, phone, rooms, budget, time } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Имя и телефон обязательны' });
  }

  // Здесь можно подключить email/CRM/Telegram уведомление
  console.log(`\n📋 НОВАЯ ЗАЯВКА`);
  console.log(`   Имя:    ${name}`);
  console.log(`   Тел:    ${phone}`);
  console.log(`   Комнат: ${rooms || '—'}`);
  console.log(`   Бюджет: ${budget || '—'}`);
  console.log(`   Время:  ${time || '—'}`);
  console.log(`   Дата:   ${new Date().toLocaleString('ru-RU')}\n`);

  res.json({ success: true, message: 'Заявка принята! Перезвоним в течение 15 минут.' });
});

// ─────────────────────────────────────────────
//  Fallback → SPA index.html
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── START ──
app.listen(PORT, () => {
  console.log(`\n🏗  ЛНР Новострой сервер запущен`);
  console.log(`   ➜ http://localhost:${PORT}`);
  console.log(`   ➜ API ключ: ${process.env.ANTHROPIC_API_KEY ? '✓ настроен' : '✗ НЕ ЗАДАН (добавь в .env)'}\n`);
});
