/**
 * Corporate-law landing (Correia & Crespo) - Node/Express server
 * - Serves static site
 * - Provides /api/chat with strict, limited "triage" responses
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;

// OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.json({ limit: '32kb' }));

// Security headers (mínimo útil)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP (ajusta se usares fontes externas)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-src https://www.google.com https://maps.google.com"
    ].join('; ')
  );

  next();
});

// Avoid caching index during development
app.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname)));

// Rate limit for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict system prompt: corporate-law triage, no templates, no steps, no conversation
const SYSTEM_PROMPT = `És um assistente de TRIAGEM JURÍDICA do escritório Correia & Crespo (Portugal), focado em Direito Empresarial.
O utilizador procura orientação geral para decidir se deve marcar consulta.

OBJETIVO:
- Ser útil apenas ao nível de enquadramento geral.
- Incentivar marcação de consulta para análise documental.
- Evitar que o utilizador resolva o problema aqui.

FORMATO OBRIGATÓRIO (resposta curta):
1) **Isto pode exigir advogado?** (sim/talvez) – 1 frase.
2) **O que pode estar em causa (muito geral)** – 2–4 bullets.
3) **Próximo passo recomendado** – "Marcar consulta" – 1 frase.

REGRAS ABSOLUTAS:
- NÃO redigir minutas/modelos/cartas/requerimentos.
- NÃO dar instruções operacionais ("faça X", "envie Y", "submeta Z") nem listas de passos.
- NÃO indicar “soluções” para resolver o caso; apenas enquadramento genérico e fatores a analisar.
- NÃO conversar: se faltar dado essencial, faz NO MÁXIMO 1 pergunta curta de clarificação e termina.
- NÃO pedir dados pessoais (nome, morada, NIF, email, telefone).
- Responder em português de Portugal.
- Incluir SEMPRE no final: "Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta."`;

const MAX_MESSAGES = 6; // keep context minimal
const MAX_CHARS_PER_MESSAGE = 900;

function truncateStr(s, max) {
  if (!s) return '';
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

function sanitizeMessages(messages) {
  const cleaned = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') continue;
    const content = truncateStr(m.content, MAX_CHARS_PER_MESSAGE);
    if (!content) continue;
    cleaned.push({ role, content });
  }
  return cleaned.slice(-MAX_MESSAGES);
}

function looksLikePII(text) {
  const t = String(text || '');
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone = /\b(?:\+351\s*)?(?:9\d{2}|2\d{2})\s?\d{3}\s?\d{3}\b/;
  const nif = /\b\d{9}\b/;
  const iban = /\bPT\d{23}\b/i;
  return email.test(t) || phone.test(t) || nif.test(t) || iban.test(t);
}

function ensureDisclaimer(text) {
  const t = String(text || '').trim();
  const has = /não constitui\s+(parecer|aconselhamento)|não\s+vinculativ/i.test(t);
  if (has) return t;
  return (
    t +
    '\n\n—\nℹ️ Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta.'
  );
}

function enforceNoTemplates(text) {
  const t = String(text || '');
  const banned = /(minuta|modelo de|template|carta|requerimento|peti[cç][aã]o|cl[áa]usula|redija|copie e cole)/i;
  const steps = /(passo\s*\d+|1\)|2\)|3\)|primeiro|depois|em seguida|faça|envie|apresente|submeta)/i;
  if (banned.test(t) || steps.test(t)) {
    return (
      `**Isto pode exigir advogado?** Talvez – depende dos factos e documentos.\n` +
      `**O que pode estar em causa (muito geral):**\n` +
      `- Enquadramento contratual/societário a determinar.\n` +
      `- Risco e obrigações a validar em documentos.\n` +
      `- Eventual impacto em registos e compliance.\n` +
      `**Próximo passo recomendado:** Marcar consulta para avaliação do caso concreto.`
    );
  }
  return t;
}

// Chat endpoint
app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!openai) {
    return res.status(503).json({
      error: 'Assistente indisponível. OPENAI_API_KEY não está configurada no servidor.',
    });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensagens em falta.' });
  }

  const cleaned = sanitizeMessages(messages);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Mensagens inválidas.' });
  }

  const anyPII = cleaned.some((m) => m.role === 'user' && looksLikePII(m.content));
  if (anyPII) {
    return res.status(400).json({
      error: 'Remova dados pessoais identificativos (nome, morada, NIF, email, telefone) e reformule de forma geral.',
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
      max_tokens: 220,
      temperature: 0.2,
    });

    const replyRaw = completion.choices[0]?.message?.content;
    if (!replyRaw) return res.status(500).json({ error: 'Resposta vazia da IA.' });

    let reply = ensureDisclaimer(replyRaw);
    reply = enforceNoTemplates(reply);
    reply = ensureDisclaimer(reply);

    res.json({ reply });
  } catch (err) {
    const msg = err?.message || 'Erro ao processar o pedido.';
    console.error('Erro OpenAI:', msg);

    // Friendly mapping for common quota errors
    if (String(msg).includes('quota') || String(msg).includes('billing')) {
      return res.status(429).json({
        error:
          'Serviço temporariamente indisponível por limite de utilização. Por favor, marque consulta para análise do caso concreto.',
      });
    }

    res.status(500).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n  Servidor em http://localhost:${PORT}\n`);
  if (!openai) {
    console.log('  AVISO: OPENAI_API_KEY não definida. O chat não funcionará.\n');
  }
});
