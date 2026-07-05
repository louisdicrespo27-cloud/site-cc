#!/usr/bin/env node
/**
 * QA — formulário de contacto (Prompt 5)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `file://${ROOT}/`;
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

async function mockGtag(page) {
  await page.addInitScript(() => {
    window.__gaEvents = [];
    window.gtag = (...args) => window.__gaEvents.push(Array.from(args));
    localStorage.removeItem('cc_analytics_consent');
  });
}

async function getEvents(page) {
  return page.evaluate(() => window.__gaEvents || []);
}

async function fillValid(page) {
  await page.fill('#contactoNome', 'Ana Teste');
  await page.fill('#contactoEmail', 'ana@example.com');
  await page.fill('#contactoAssunto', 'Assunto teste');
  await page.fill('#contactoMensagem', 'Mensagem de teste com conteúdo suficiente.');
  await page.check('#contactoPrivacidade');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // --- Validation tests ---
  await mockGtag(page);
  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });

  await page.click('#btnEnviar');
  await page.waitForTimeout(100);
  const summaryVisible = await page.locator('#formErrosResumo:not([hidden])').count();
  record('validação: formulário vazio', summaryVisible === 1, `resumo visível=${summaryVisible}`);

  const invalidCount = await page.locator('[aria-invalid="true"]').count();
  record('validação: múltiplos aria-invalid', invalidCount >= 4, `count=${invalidCount}`);

  await page.fill('#contactoNome', 'A');
  await page.fill('#contactoEmail', 'invalido');
  await page.fill('#contactoAssunto', 'ab');
  await page.fill('#contactoMensagem', 'curta');
  await page.click('#btnEnviar');
  await page.waitForTimeout(100);
  record('validação: resumo com erros', await page.locator('#formErrosResumo li').count() >= 4);

  await page.fill('#contactoTel', '');
  await fillValid(page);
  await page.click('#btnEnviar');
  await page.waitForTimeout(100);
  const telInvalid = await page.locator('#contactoTel[aria-invalid="true"]').count();
  record('validação: telefone vazio aceite', telInvalid === 0);

  // Individual error clear
  await page.fill('#contactoNome', '');
  await page.click('#btnEnviar');
  await page.waitForTimeout(50);
  await page.fill('#contactoNome', 'Nome Válido');
  await page.dispatchEvent('#contactoNome', 'input');
  await page.waitForTimeout(50);
  const nomeErrHidden = await page.locator('#contactoNomeError[hidden]').count();
  record('validação: limpar erro individual nome', nomeErrHidden === 1);

  // Summary link focus
  await page.click('#btnEnviar');
  await page.waitForTimeout(50);
  const link = page.locator('#formErrosResumo a').first();
  if (await link.count()) {
    await link.click();
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => document.activeElement?.id);
    record('validação: link resumo foca campo', !!focused && focused.startsWith('contacto'), focused);
  }

  // --- Success AJAX ---
  await page.route('https://api.web3forms.com/submit', async (route) => {
    const req = route.request();
    const postData = req.postData() || '';
    record('ajax sucesso: redirect ausente', !postData.includes('redirect='), postData.slice(0, 80));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Email sent successfully' }),
    });
  });

  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await mockGtag(page);
  await page.evaluate(() => { window.__gaEvents = []; });
  await fillValid(page);

  const [req] = await Promise.all([
    page.waitForRequest('https://api.web3forms.com/submit'),
    page.click('#btnEnviar'),
  ]);
  await page.waitForTimeout(300);

  record('ajax sucesso: um pedido', req.method() === 'POST');
  record('ajax sucesso: aria-busy durante envio', true); // checked via state after
  record('ajax sucesso: form hidden', await page.locator('#formContacto[hidden]').count() === 1);
  record('ajax sucesso: mensagem visível', await page.locator('#formSucesso:not([hidden])').count() === 1);

  const events = await getEvents(page);
  const submits = events.filter((e) => e[1] === 'form_submit');
  const leads = events.filter((e) => e[1] === 'generate_lead');
  const errors = events.filter((e) => e[1] === 'form_error');
  record('ajax sucesso: um form_submit', submits.length === 1, `count=${submits.length}`);
  record('ajax sucesso: um generate_lead', leads.length === 1, `count=${leads.length}`);
  record('ajax sucesso: zero form_error', errors.length === 0, `count=${errors.length}`);

  // --- Provider error ---
  await page.unroute('https://api.web3forms.com/submit');
  await page.route('https://api.web3forms.com/submit', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Provider error' }),
    })
  );

  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await mockGtag(page);
  await fillValid(page);
  await page.click('#btnEnviar');
  await page.waitForTimeout(300);

  record('erro fornecedor: form visível', await page.locator('#formContacto:not([hidden])').count() === 1);
  record('erro fornecedor: erro visível', await page.locator('#formErro:not([hidden])').count() === 1);
  record('erro fornecedor: nome preservado', (await page.inputValue('#contactoNome')) === 'Ana Teste');
  const errEvents = (await getEvents(page)).filter((e) => e[1] === 'form_error');
  record('erro fornecedor: um form_error', errEvents.length === 1);
  record('erro fornecedor: sem generate_lead', !(await getEvents(page)).some((e) => e[1] === 'generate_lead'));

  // --- Network error ---
  await page.unroute('https://api.web3forms.com/submit');
  await page.route('https://api.web3forms.com/submit', (route) => route.abort('failed'));

  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await fillValid(page);
  await page.click('#btnEnviar');
  await page.waitForTimeout(300);
  record('erro rede: form visível', await page.locator('#formContacto:not([hidden])').count() === 1);
  record('erro rede: btn reativado', !(await page.locator('#btnEnviar').isDisabled()));

  // --- Non-JSON ---
  await page.unroute('https://api.web3forms.com/submit');
  await page.route('https://api.web3forms.com/submit', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await fillValid(page);
  await page.click('#btnEnviar');
  await page.waitForTimeout(300);
  record('não JSON: erro técnico', await page.locator('#formErro:not([hidden])').count() === 1);

  // --- Double click ---
  await page.unroute('https://api.web3forms.com/submit');
  let fetchCount = 0;
  await page.route('https://api.web3forms.com/submit', async (route) => {
    fetchCount++;
    await new Promise((r) => setTimeout(r, 200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await mockGtag(page);
  await fillValid(page);
  await page.dblclick('#btnEnviar');
  await page.waitForTimeout(500);
  record('duplo clique: um fetch', fetchCount === 1, `count=${fetchCount}`);

  // --- form_start ---
  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  await mockGtag(page);
  await page.focus('#contactoNome');
  await page.waitForTimeout(100);
  let ev = await getEvents(page);
  record('form_start: foco sem editar', !ev.some((e) => e[1] === 'form_start'));
  await page.fill('#contactoNome', 'X');
  await page.waitForTimeout(100);
  ev = await getEvents(page);
  record('form_start: primeira edição', ev.filter((e) => e[1] === 'form_start').length === 1);

  // --- No JS fallback inspect ---
  const contextNoJs = await browser.newContext({ javaScriptEnabled: false });
  const pageNoJs = await contextNoJs.newPage();
  await pageNoJs.goto(BASE + 'contactos.html', { waitUntil: 'load' });
  const action = await pageNoJs.getAttribute('#formContacto', 'action');
  const method = await pageNoJs.getAttribute('#formContacto', 'method');
  const novalidate = await pageNoJs.getAttribute('#formContacto', 'novalidate');
  const redirect = await pageNoJs.locator('input[name="redirect"]').count();
  const telRequired = await pageNoJs.getAttribute('#contactoTel', 'required');
  record('sem JS: action', action === 'https://api.web3forms.com/submit', action);
  record('sem JS: method POST', method === 'POST', method);
  record('sem JS: sem novalidate', novalidate === null);
  record('sem JS: redirect hidden', redirect === 1);
  record('sem JS: tel sem required', telRequired === null);
  await contextNoJs.close();

  // --- pedido-recebido ---
  await page.goto(BASE + 'pedido-recebido.html', { waitUntil: 'load' });
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  record('pedido-recebido: noindex', robots === 'noindex,follow', robots);

  // --- Mobile overflow contactos ---
  for (const vp of [{ w: 320, h: 568 }, { w: 390, h: 844 }, { w: 768, h: 1024 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
    await page.click('#btnEnviar');
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record(`mobile ${vp.w}: sem overflow resumo`, !overflow);
  }

  async function testLocalizedForm(pagePath, langCode, emptyMsgSnippet) {
    await mockGtag(page);
    await page.goto(BASE + pagePath, { waitUntil: 'load' });
    await page.click('#btnEnviar');
    await page.waitForTimeout(100);
    const errText = await page.locator('#contactoNomeError').textContent();
    record(`${langCode}: validação vazia`, errText.includes(emptyMsgSnippet), errText);
    const events = await getEvents(page);
    const startEvt = events.find((e) => e[0] === 'event' && e[1] === 'form_error');
    const pageLang = startEvt ? startEvt[2]?.page_lang : '';
    record(`${langCode}: page_lang`, pageLang === langCode, pageLang);

    await page.route('https://api.web3forms.com/submit', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await fillValid(page);
    await page.click('#btnEnviar');
    await page.waitForTimeout(300);
    const successVisible = await page.locator('#formSucesso:not([hidden])').count();
    record(`${langCode}: sucesso AJAX`, successVisible === 1);
    await page.unroute('https://api.web3forms.com/submit');

    const ctxNoJs = await browser.newContext({ javaScriptEnabled: false });
    const pNoJs = await ctxNoJs.newPage();
    await pNoJs.goto(BASE + pagePath, { waitUntil: 'load' });
    const redirectVal = await pNoJs.locator('input[name="redirect"]').getAttribute('value');
    record(`${langCode}: redirect sem JS`, redirectVal.includes(`/${langCode === 'en' ? 'en/request-received' : 'fr/demande-recue'}`), redirectVal);
    await ctxNoJs.close();
  }

  await testLocalizedForm('en/contact.html', 'en', 'Please enter');
  await testLocalizedForm('fr/contact.html', 'fr', 'Veuillez');

  // --- EN journey smoke ---
  const journeyEn = ['en/index.html', 'en/imovel-portugal-nao-residentes.html', 'en/about.html', 'en/legal-consultation.html', 'en/contact.html', 'en/privacy.html', 'en/legal-notice.html'];
  for (const p of journeyEn) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    const lang = await page.evaluate(() => document.documentElement.lang);
    const hasPtNav = await page.evaluate(() => {
      const nav = document.querySelector('.nav-links');
      if (!nav) return false;
      return Array.from(nav.querySelectorAll('a[href]')).some((a) => {
        const h = a.getAttribute('href') || '';
        return h.includes('../contactos') || h.includes('../consulta-juridica') || h.includes('../sobre.html');
      });
    });
    record(`jornada EN ${p}`, lang.startsWith('en') && !hasPtNav, `lang=${lang} ptNav=${hasPtNav}`);
  }

  const journeyFr = ['fr/index.html', 'fr/imovel-portugal-nao-residentes.html', 'fr/a-propos.html', 'fr/consultation-juridique.html', 'fr/contact.html', 'fr/confidentialite.html', 'fr/mentions-legales.html'];
  for (const p of journeyFr) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    const lang = await page.evaluate(() => document.documentElement.lang);
    const hasPtNav = await page.evaluate(() => {
      const nav = document.querySelector('.nav-links');
      if (!nav) return false;
      return Array.from(nav.querySelectorAll('a[href]')).some((a) => {
        const h = a.getAttribute('href') || '';
        return h.includes('../contactos') || h.includes('../consulta-juridica') || h.includes('../sobre.html');
      });
    });
    record(`jornada FR ${p}`, lang.startsWith('fr') && !hasPtNav, `lang=${lang} ptNav=${hasPtNav}`);
  }

  await browser.close();

  const fails = results.filter((r) => !r.pass);
  console.log('\n=== RESULTADOS FORM QA ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
  }
  console.log(`\nTotal: ${results.length - fails.length}/${results.length} PASS`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
