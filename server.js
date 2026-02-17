/**
 * Correia Crespo - Servidor
 * Serve o site estático e a API de chat com IA para pareceres jurídicos
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave da API OpenAI (definir em OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Middleware
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname)));

// Rate-limit (anti abuso / controlo de custos)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  limit: 10, // 10 pedidos / 5 min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Sistema de prompts para orientação jurídica limitada e generalizada
const SYSTEM_PROMPT = `Tu és um assistente jurídico do escritório Correia Crespo - Advogados, em Portugal.
O teu papel é fornecer respostas LIMITADAS e GENERALIZADAS (triagem/orientação geral).

FORMATO OBRIGATÓRIO (3 blocos, 1–3 frases cada):
1. **Intervenção de advogado:** (sim/não/talvez) com breve justificação genérica.
2. **Direitos lesados:** possíveis direitos/interesses em causa (generalizado).
3. **Soluções previstas:** vias típicas e gerais (judicial/extrajudicial), sem prometer resultados.

REGRAS OBRIGATÓRIAS:
- Nunca dês aconselhamento específico, nem passos personalizados, nem conclusões definitivas.
- Se faltarem dados essenciais, faz NO MÁXIMO 1 pergunta de clarificação (sem pedir dados identificativos).
- Não peças, nem repitas, nem uses dados pessoais (nomes, moradas, NIF, emails, telefones, detalhes identificativos).
- Inclui SEMPRE um aviso final: "Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta com advogado."
- Responde em português de Portugal.
- Foca-te em direito português (Família, Imobiliário/Arrendamento, RGPD, Insolvências, Processo Executivo).`;

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
    '\n\n—\nℹ️ Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta com advogado.'
  );
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
      max_tokens: 1024,
      temperature: 0.3,
    });

    const replyRaw = completion.choices[0]?.message?.content;

    if (!replyRaw) {
      return res.status(500).json({ error: 'Resposta vazia da IA.' });
    }

    const reply = ensureDisclaimer(replyRaw);
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
