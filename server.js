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

// Redirects canónicos (produção): HTTP→HTTPS, www→não-www
const canonicalHost = process.env.CANONICAL_HOST || 'www.correiacrespo-advogados.pt';
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const proto = req.get('X-Forwarded-Proto');
  const host = req.get('host') || '';
  let target = null;
  if (proto === 'http') {
    target = 'https://' + (host.toLowerCase().startsWith('www.') ? canonicalHost : host) + req.url;
  } else if (host.toLowerCase().startsWith('www.')) {
    target = 'https://' + canonicalHost + req.url;
  }
  if (target) return res.redirect(301, target);
  next();
});

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
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-src https://www.google.com https://maps.google.com"
    ].join('; ')
  );

  next();
});

// Raiz: no-store em produção para sempre servir HTML atualizado
app.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
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

// System prompt: corporate-law triage, com explicação clara e alguma conversa limitada
const SYSTEM_PROMPT = `És um assistente de TRIAGEM JURÍDICA do escritório Correia & Crespo (Portugal), com foco em Direito Empresarial, societário, contratos, insolvências e matérias de família ligadas à atividade económica.
O utilizador procura orientação geral para perceber melhor a sua situação e decidir se deve marcar consulta.

OBJETIVO:
- Explicar, em linguagem simples e clara, o enquadramento jurídico geral da situação descrita.
- Identificar os principais riscos e pontos de atenção.
- Sugerir, de forma sintética, opções possíveis e próximos passos.
- Incentivar marcação de consulta para análise documental e definição da estratégia concreta.

FORMATO RECOMENDADO (não é obrigatório, mas preferível):
1) **Isto pode exigir advogado?** (sim/talvez) – 1 frase.
2) **O que está em causa (de forma geral)** – 2–4 bullets, explicando a situação em termos acessíveis.
3) **Opções possíveis / caminhos usuais** – 2–4 bullets, com soluções em termos gerais (sem minutas nem instruções detalhadas).
4) **Próximo passo recomendado** – 1 frase a sugerir consulta para analisar documentos e prazos.

CONVERSA:
- Podes fazer até **2 perguntas de clarificação**, se forem mesmo necessárias para enquadrar melhor a situação.
- As perguntas devem ser curtas, objetivas e em linguagem simples.
- Depois de obteres as respostas, apresenta uma síntese clara e os caminhos possíveis.

REGRAS ABSOLUTAS:
- NÃO redigir minutas/modelos/cartas/requerimentos.
- NÃO fornecer listas de passos operacionais detalhados (tutoriais); foca-te em opções e decisões a considerar.
- NÃO pedir dados pessoais (nome, morada, NIF, email, telefone).
- Responder SEMPRE em português de Portugal.
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
  // Bloqueia apenas instruções em formato de "manual de passos"
  const steps = /(passo\s*\d+|1\)|2\)|3\)|4\)|primeiro\s+passo|segundo\s+passo|terceiro\s+passo)/i;
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

// 404 real para rotas inexistentes (evitar Soft 404; Google recomenda 404 quando a página não existe)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Servidor em http://localhost:${PORT}\n`);
  if (!openai) {
    console.log('  AVISO: OPENAI_API_KEY não definida. O chat não funcionará.\n');
  }
});

