/**
 * Correia Crespo - Servidor
 * Serve o site estático e a API de chat com IA para orientação jurídica (limitada)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Chave da API OpenAI (definir em OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Middleware
app.use(express.json({ limit: '32kb' }));

// Headers básicos de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Rotas explícitas para a página principal (antes do static)
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Bloquear acesso a .env
app.use((req, res, next) => {
  if (req.path.includes('.env')) return res.status(404).end();
  next();
});
app.use(express.static(path.join(__dirname)));

// Rate-limit (anti abuso / controlo de custos)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  limit: 10, // 10 pedidos / 5 min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Sistema de prompts para orientação jurídica limitada e generalizada
const SYSTEM_PROMPT = `És um assistente de triagem jurídica do escritório Correia Crespo - Advogados (Portugal).

OBJETIVO:
- Atrair o utilizador a marcar consulta.
- Dar apenas informação geral e muito limitada, sem resolver o problema.

FORMATO OBRIGATÓRIO:
1) **Isto pode exigir advogado?** (sim/talvez) – 1 frase.
2) **O que pode estar em causa (muito geral)** – 1–2 bullets.
3) **Próximo passo recomendado** – "Marcar consulta" (sem instruções detalhadas).

RESTRIÇÕES ABSOLUTAS:
- NÃO fornecer minutas/modelos/cartas/requerimentos.
- NÃO dar passos concretos ("faça X amanhã", "envie Y", "apresente Z").
- NÃO listar "soluções para resolver" o caso; apenas indicar que existe enquadramento legal e que depende de análise.
- NÃO ter conversa; se faltarem dados essenciais, faz NO MÁXIMO 1 pergunta de clarificação curta e termina aí.
- Respostas curtas (máx. ~1200 caracteres).
- NÃO pedir dados pessoais (nome, morada, NIF, email, telefone).
- Incluir sempre no fim: "Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta."`;

// Limites de contexto enviados ao modelo
const MAX_MESSAGES = 16; // ~8 interações (user+assistant)
const MAX_CHARS_PER_MESSAGE = 1800;

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
  // manter apenas as últimas mensagens
  return cleaned.slice(-MAX_MESSAGES);
}

function looksLikePII(text) {
  const t = String(text || '');
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone = /\b(?:\+351\s*)?(?:9\d{2}|2\d{2})\s?\d{3}\s?\d{3}\b/;
  const nif = /\b\d{9}\b/; // heurístico
  const iban = /\bPT\d{23}\b/i;
  return email.test(t) || phone.test(t) || nif.test(t) || iban.test(t);
}

function ensureDisclaimer(text) {
  const t = String(text || '').trim();
  const has = /não constitui\s+(parecer|aconselhamento)|meramente\s+informativ|não\s+vinculativ/i.test(t);
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
    return `**Isto pode exigir advogado?** Talvez – depende dos factos e documentos.\n` +
      `**O que pode estar em causa (muito geral):**\n- Enquadramento legal a determinar (depende da área).\n- Necessidade de análise documental.\n` +
      `**Próximo passo recomendado:** Marcar consulta para avaliação do caso concreto.\n\n—\nℹ️ Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta.`;
  }
  return t;
}

// API: Chat com IA
app.post('/api/chat', chatLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!openai) {
    return res.status(503).json({
      error:
        'O assistente de IA não está configurado. Defina a variável OPENAI_API_KEY no ambiente.',
    });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensagens em falta.' });
  }

  const cleaned = sanitizeMessages(messages);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Mensagens inválidas.' });
  }

  // Bloqueio simples de dados pessoais (reduz risco RGPD e evita mandato implícito)
  const anyPII = cleaned.some((m) => m.role === 'user' && looksLikePII(m.content));
  if (anyPII) {
    return res.status(400).json({
      error:
        'Por favor, remova dados pessoais identificativos (ex.: nomes, moradas, NIF, email, telefone) e reformule a questão de forma geral.',
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
      max_tokens: 220,
      temperature: 0.2,
    });

    const replyRaw = completion.choices[0]?.message?.content;

    if (!replyRaw) {
      return res.status(500).json({ error: 'Resposta vazia da IA.' });
    }

    let reply = ensureDisclaimer(replyRaw);
    reply = enforceNoTemplates(reply);
    res.json({ reply });
  } catch (err) {
    console.error('Erro OpenAI:', err.message);
    res.status(500).json({
      error: err.message || 'Erro ao processar o pedido. Tente novamente.',
    });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n  Correia Crespo - Servidor em http://localhost:${PORT}\n`);
  if (!openai) {
    console.log(
      '  AVISO: OPENAI_API_KEY não definida. O assistente de IA não funcionará.\n'
    );
    console.log(
      '  Para ativar: export OPENAI_API_KEY=sk-...  (e reiniciar)\n'
    );
  }
});
