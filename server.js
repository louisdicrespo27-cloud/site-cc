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

// Sistema de prompts para parecer jurídico (direito português)
const SYSTEM_PROMPT = `Tu és um assistente jurídico do escritório Correia Crespo - Advogados, em Portugal.
O teu papel é fornecer informação jurídica preliminar e genérica em resposta a questões colocadas pelos utilizadores.
Regras importantes:
- Responde sempre em português de Portugal.
- Sê claro, conciso e útil.
- Indica que a informação é meramente informativa e não constitui aconselhamento jurídico.
- Recomenda sempre uma consulta com um advogado para análise do caso concreto.
- Foca-te em direito português: Direito da Família, Imobiliário, RGPD, Insolvências e Processo Executivo.
- Mantém um tom profissional mas acessível.`;

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
