# Checklist de publicação — Correia Crespo Advogados

## Antes de publicar

- [ ] Luís Correia Crespo leu os 3 artigos empresariais:
  - `fatura-por-cobrar-empresa.html`
  - `trabalhos-extra-obra-nao-pagos.html`
  - `produto-agricola-entregue-nao-pago.html`
- [ ] Luís Correia Crespo leu a nova secção "Consulta jurídica para empresas" em `consulta-juridica.html`.
- [ ] Confirmado que as áreas empresariais publicadas correspondem à atuação real pretendida do escritório.
- [ ] Confirmado que não há promessas de resultado.
- [ ] Confirmado que não há linguagem agressiva ou angariação direta.
- [ ] Confirmado que o conteúdo mantém natureza informativa.
- [ ] Confirmado que o formulário de contacto continua funcional.
- [ ] Confirmado que email, telefone e morada estão corretos.
- [ ] Confirmado que o deploy usa `dist/`.

## Comandos finais

```bash
npm run build
npm run seo
npm run prepare:public
node scripts/validate-jsonld.mjs
```

## Após publicar

- [ ] Abrir homepage em desktop.
- [ ] Abrir homepage em mobile.
- [ ] Testar menu mobile.
- [ ] Testar links principais:
  - Particulares
  - Empresas
  - Consulta jurídica
  - Contactos
  - Sobre
- [ ] Testar os 3 artigos empresariais.
- [ ] Testar as 7 páginas empresariais.
- [ ] Testar formulário de contacto.
- [ ] Testar links mailto e WhatsApp, se existirem.
- [ ] Verificar `https://www.correiacrespo-advogados.pt/sitemap.xml`.
- [ ] Verificar `https://www.correiacrespo-advogados.pt/robots.txt`.
- [ ] Verificar `https://www.correiacrespo-advogados.pt/llms.txt`.
- [ ] Submeter sitemap no Google Search Console.
- [ ] Pedir indexação das páginas principais:
  - `/`
  - `/empresas.html`
  - `/particulares.html`
  - `/cobranca-dividas-empresas.html`
  - `/construcao-civil-obras-subempreitadas.html`
  - `/agricultura-fornecimentos-pagamentos.html`
  - `/fatura-por-cobrar-empresa.html`
  - `/trabalhos-extra-obra-nao-pagos.html`
  - `/produto-agricola-entregue-nao-pago.html`
- [ ] Validar rich results quando aplicável.
- [ ] Confirmar que o perfil Google Business, se existir, está coerente com o site.
- [ ] Não fazer envio massivo de emails a empresas a promover serviços.
- [ ] Divulgar conteúdos apenas de forma informativa, institucional e prudente.

## Monitorização

Após 2 a 4 semanas:

- [ ] Verificar páginas indexadas no Search Console.
- [ ] Verificar consultas relacionadas com empresas, cobrança, construção civil e agricultura.
- [ ] Verificar erros 404.
- [ ] Verificar CTR das páginas empresariais.
- [ ] Verificar se há páginas com impressões mas sem cliques.
- [ ] Verificar se algum conteúdo deve ser encurtado, clarificado ou reforçado.
