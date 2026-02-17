/**
 * Correia Crespo - Servidor
 * Serve o site estático e a API de chat com IA para pareceres jurídicos
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave da API OpenAI (definir em OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Sistema de prompts para parecer jurídico limitado e generalizado
const SYSTEM_PROMPT = `Tu és um assistente jurídico do escritório Correia Crespo - Advogados, em Portugal.
O teu papel é fornecer respostas LIMITADAS e GENERALIZADAS. Cada resposta DEVE seguir EXATAMENTE esta estrutura:

1. **Intervenção de advogado:** Indica, de forma generalizada, se a situação apresentada carece ou não da intervenção de um advogado (sim/não/talvez, com breve justificação genérica).

2. **Direitos lesados:** Enumera, de forma GENERALIZADA, os possíveis direitos que possam estar em causa ou lesados, sem entrar em pormenores do caso concreto.

3. **Soluções previstas:** Indica, de forma GENERALIZADA e SEM COMPROMISSO, as soluções ou vias jurídicas que, em termos gerais, possam estar previstas na lei (ex.: ação judicial, reclamação, mediação), sem garantir qualquer resultado.

REGRAS OBRIGATÓRIAS:
- Mantém TODAS as respostas generalizadas e limitadas. Nunca dês aconselhamento específico nem conclusões definitivas.
- Declara claramente que a informação é meramente orientativa e NÃO constitui parecer jurídico vinculativo.
- Recomenda sempre uma consulta com advogado para análise do caso concreto.
- Responde em português de Portugal.
- Sê conciso. Cada secção deve ter 1-3 frases no máximo.
- Foca-te em direito português (Família, Imobiliário, RGPD, Insolvências, Processo Executivo).`;

// API: Chat com IA
app.post('/api/chat', async (req, res) => {
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

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: 'Resposta vazia da IA.' });
    }

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
