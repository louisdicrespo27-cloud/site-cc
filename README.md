# Correia Crespo — Advogados (site estático)

Site institucional em **português de Portugal**, multipágina, sem frameworks de UI. Cabeçalho e rodapé partilhados via `partials/` e `assets/js/main.js`.

## Estrutura

Páginas principais na raiz; recursos em `assets/`; política e aviso legal como HTML dedicados.

## Desenvolvimento

Abrir os ficheiros localmente ou servir a pasta com um servidor estático para testar o carregamento dos partials (fetch pode exigir origem HTTP, não `file://`).

## SEO

```bash
npm run seo
```

Gera/atualiza `sitemap.xml` e normaliza alguns meta tags.

## Documentação

- `DEPLOY.md` — pacote e GitHub Pages.  
- `docs/ENTREGA-REFATORACAO.md` — lista do removido, do criado e arquitetura (refatoração 2026).
