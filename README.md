# Correia Crespo - Advogados

Site profissional para o escritório Correia Crespo, com apresentação inspirada no Google e **assistente de IA para pareceres jurídicos**.

## Características

- **Homepage estilo Google** – Barra de pesquisa central onde os clientes colocam questões jurídicas
- **Assistente de IA** – Respostas preliminares baseadas em direito português (Família, Imobiliário, RGPD, Insolvências)
- **Chat contínuo** – Possibilidade de fazer perguntas de seguimento
- Áreas de atuação, Sobre e Contactos

## Configuração da IA

O assistente usa a API da OpenAI. Para ativar:

1. Crie uma chave em [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crie um ficheiro `.env` na raiz do projeto:

```
OPENAI_API_KEY=sk-...
```

Ou defina a variável de ambiente antes de iniciar:

```bash
export OPENAI_API_KEY=sk-...
```

## Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor (porta 3000)
npm start
```

Aceda a **http://localhost:3000**. A barra de pesquisa processa questões jurídicas através da IA.

> **Nota:** Sem `OPENAI_API_KEY`, o site funciona mas o assistente exibirá uma mensagem para contacto direto.

## Estrutura

- `index.html` – Página principal (homepage estilo Google + secções)
- `styles.css` – Estilos e layout responsivo
- `script.js` – Lógica do chat e integração com a API
- `server.js` – Servidor Express com endpoint `/api/chat`

## Analytics (RGPD)

O site suporta Google Analytics 4 **apenas com consentimento**. Para ativar:

1. No `index.html`, no `<body>`, defina o ID de medição: `data-ga-id="G-XXXXXXXXXX"`.
2. O utilizador tem de aceitar a opção "Aceito a utilização de cookies de análise" no modal de consentimento.
3. Conversões (cliques em WhatsApp, email, telefone) são enviadas como eventos quando o consentimento está ativo.

## Otimização de imagens

As imagens têm `width` e `height` para evitar layout shift. Para WebP/AVIF (melhor desempenho):

- Gere versões WebP/AVIF das imagens em `assets/` (ex.: com [sharp](https://www.npmjs.com/package/sharp) ou ferramentas online).
- Pode usar `<picture>` com `<source type="image/avif">` e `<source type="image/webp">` e `<img>` como fallback.

## Aviso

O parecer da IA é meramente informativo e não substitui consultoria jurídica profissional. O site inclui avisos nesse sentido.
