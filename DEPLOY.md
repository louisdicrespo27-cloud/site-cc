# Deploy — Pacote de produção

O site é estático (HTML, CSS, JS e recursos). Para deploy, use apenas os ficheiros necessários à produção.

## O que NÃO incluir no pacote público / servidor

- `.env` e ficheiros `.env.*` (credenciais e variáveis sensíveis)
- `.git/` (histórico do repositório)
- `node_modules/` (se existir)
- Ficheiros `*.zip` auxiliares
- Ficheiros de teste ou debug
- `.DS_Store`, `*.log`, pastas `.cache/`, `dist/`, `build/`

O `.gitignore` já está configurado para excluir estes itens do repositório. Em deploy por clone (ex.: Git no servidor), não faça upload de `.env`; use variáveis de ambiente do painel de alojamento quando necessário.

## Pacote limpo a partir da pasta do projeto

Copiar para o servidor apenas o conteúdo necessário (por exemplo, todas as pastas e ficheiros visíveis, exceto `.git`, `.env`, `node_modules`). Se usar FTP ou painel de ficheiros, envie apenas:

- Raiz: `index.html`, `artigos.html`, `contactos.html`, `agendar-consulta.html`, `areas-de-pratica.html`, `direito-imobiliario.html`, `residentes-fora-de-portugal.html`, `termos.html`, `privacidade.html`, `styles.css`, `script.js`, `sitemap.xml`, etc.
- Pastas: `artigos/`, `assets/`, `en/`, `fr/` (conforme a estrutura do site).

Não inclua `.env` nem a pasta `.git` no upload.
