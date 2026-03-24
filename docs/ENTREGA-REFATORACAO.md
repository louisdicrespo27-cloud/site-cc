# Entrega — refatoração estrutural (março 2026)

## Nova arquitetura

Site **estático multipágina em português de Portugal**, sem frameworks. As páginas públicas estão na **raiz** do repositório. O **cabeçalho e o rodapé** são partilhados via `partials/header.html` e `partials/footer.html`, injetados em tempo de carregamento por `assets/js/main.js` (fetch + substituição do token `%%BASE%%` segundo `data-site-base` no `<body>`).

A **navegação principal** reflete as áreas de atuação e páginas institucionais. O **formulário de contactos** utiliza `mailto:` no cliente (sem backend no repositório). A **consulta jurídica** mantém formulário análogo com consentimento explícito.

Ficheiros de apoio à publicação: `robots.txt`, `sitemap.xml` (gerado por `npm run seo`), `CNAME`, workflow em `.github/workflows/deploy-pages.yml`.

---

## Ficheiros criados ou substituídos de forma relevante

| Ficheiro | Nota |
|----------|------|
| `docs/ENTREGA-REFATORACAO.md` | Este documento. |
| `404.html` | Reescrito: alinhado à navegação real, cabeçalho/rodapé via partials, sem versões EN/FR. |
| `assets/js/main.js` | Simplificado: sem WhatsApp automático, sem API/triagem; validação alargada do formulário de contacto. |
| `contactos.html` | Formulário completo (nome, email, telefone, assunto, mensagem, consentimento, nota jurídica). |
| `consulta-juridica.html` | Nome obrigatório, consentimento RGPD, apenas envio por email (removido botão WhatsApp). |
| `politica-de-privacidade.html` | Texto alinhado a sítio estático + mailto (sem “triagem”/IA). |
| `aviso-legal.html` | Removidas referências a triagem e link quebrado para termos. |
| `package.json` | Apenas script `seo`; removidas dependências Node de servidor. |
| `robots.txt` | Simplificado (sem `Disallow` a artigos inexistentes). |

---

## Removido do repositório (limpeza)

### Pastas

- `en/` — versão inglesa do site.  
- `fr/` — versão francesa.  
- `artigos/` — artigos jurídicos e páginas satélite.  
- `paginas/` — páginas PT complementares (áreas detalhadas, termos, etc.).  
- `node_modules/` — não faz parte do pacote estático (reinstalar só se correr `npm run seo` numa máquina limpa: não há dependências npm).  
- `docs/json/`, `docs/SEO.md` — conteúdo auxiliar não necessário ao site mínimo.  
- `templates/` — modelo não usado no deploy atual.  
- `menu-do-dia/` — pasta alheia ao site do escritório.  
- `__MACOSX/` — se existir (metadados macOS); referência em `.gitignore`.

### Ficheiros na raiz (stubs, duplicados ou legado)

- Stubs e páginas legado: `artigos.html`, `areas-de-pratica.html`, `agendar-consulta.html`, `privacidade.html`, `residentes-fora-de-portugal.html`, `termos.html`, `divorcio.html`, `contencioso-civil.html`, `direito-imobiliario.html`, `contratos-comerciais.html`, `injuncoes-recuperacao-credito.html`, `compliance-aml-branqueamento-capitais.html`, `mica-criptoativos.html`, `honorarios.html`, `direito-societario-registos-atas.html`, `responsabilidades-parentais.html`, entre outras que duplicavam o escopo.  
- `server.js` — servidor Express/triagem (fora do âmbito “só estático”).  
- `assets/js/triage.js`.  
- `scripts/repair-paginas-paths.mjs` — script da estrutura intermédia com `paginas/`.  
- `package-lock.json` — removido com o desligamento de dependências npm.  
- `llms.txt`, `LOCAL_SEO.md`, `SERVIDOR_LOCAL.md`.  
- `site-cc-clean.zip` — pacote zip não necessário no repo.  
- `assets/img/estrategia-pratica.jpg` — imagem não usada nas páginas remanescentes.

### Removido ou reduzido em CSS

- Regras de `.lang-switcher` (idiomas removidos).  
- Blocos extensos ligados a **landing/triagem/chat/inspire** e componentes promocionais antigos.  
- Media queries redundantes com referências a `.triage`, `.chat-panel`, `.section.landing`, etc.

### Não incluir no pacote de produção

- `.git/` — histórico local (nunca copiar para o servidor).  
- `.env` — variáveis sensíveis (já em `.gitignore`).

---

## Acessibilidade e formulário (resumo)

- **Skip link** para `#conteudo` em páginas com shell.  
- **Menu móvel:** `aria-expanded`, `aria-controls="menu-principal"`, `aria-label` “Abrir menu” / “Fechar menu”.  
- **`:focus-visible`** em links, botões e campos (sem `outline: none` global).  
- **Formulário de contacto:** `<label>` associado a cada controlo; mensagens de erro com `role="alert"` onde aplicável.  
- **Nota jurídica** visível junto ao formulário: envio não cria relação advogado–cliente nem substitui consulta.

---

## Comandos úteis

```bash
npm run seo
```

Atualiza meta (script existente) e **sitemap.xml** com base em todos os `.html` indexáveis na raiz.
