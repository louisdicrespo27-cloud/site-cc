# Deploy — site estático (produção)

O site é servido como ficheiros estáticos (HTML, CSS, JS, `partials/`, imagens). O workflow **GitHub Actions** (`.github/workflows/deploy-pages.yml`) publica o conteúdo da raiz do repositório na branch `main`.

## Estrutura publicada

- **Páginas PT (raiz):** `index.html`, `sobre.html`, `consulta-juridica.html`, `familia-menores.html`, `imobiliario-arrendamento.html`, `execucoes-insolvencia.html`, `residentes-no-estrangeiro.html`, `contactos.html`, `politica-de-privacidade.html`, `aviso-legal.html`, `404.html`.
- **Partilhado:** `partials/`, `assets/css/main.css`, `assets/js/main.js`, `assets/img/`, `assets/icons/`, `robots.txt`, `sitemap.xml`, `CNAME` (se aplicável).

## O que não enviar para o servidor público

- `.git/`, `.env`, `node_modules/`, ficheiros `*.zip`, `__MACOSX/`, `.DS_Store`.

## Sitemap

Após alterar páginas HTML, executar localmente:

```bash
npm run seo
```

Isto regista `sitemap.xml` com as URLs indexáveis (exclui `404.html` por `noindex`).

## Pré-visualização

Para testar sem alterar produção, use um servidor HTTP local sobre a pasta do projeto (por exemplo `npx serve .`) ou um ambiente de preview do fornecedor de alojamento (ex.: Cloudflare Pages com branch de teste).
