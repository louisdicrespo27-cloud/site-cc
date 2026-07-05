#!/usr/bin/env node
/**
 * QA Prompt 6 — seletor idioma (teclado), mobile, cookies, formulário EN/FR.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `file://${ROOT}/`;
const results = [];

function resolveHref(fromPage, href) {
  const fromDir = path.dirname(fromPage);
  return path.normalize(path.join(fromDir === '.' ? '' : fromDir, href)).replace(/\\/g, '/');
}

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

async function clearStorage(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function testLanguageSwitcherKeyboard(page, pagePath, currentLang, expectHref) {
  await clearStorage(page);
  await page.goto(BASE + pagePath, { waitUntil: 'load' });

  const switcher = page.locator('.language-switcher');
  await switcher.waitFor({ state: 'visible' });

  const current = switcher.locator('[aria-current="page"]');
  const currentText = await current.textContent();
  record(`lang [${pagePath}] aria-current`, currentText.trim() === currentLang, currentText);

  const links = switcher.locator('a[href]');
  const count = await links.count();
  record(`lang [${pagePath}] links não vazios`, count >= 2);

  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    const box = await links.nth(i).boundingBox();
    record(`lang [${pagePath}] link ${i} min-height`, box && box.height >= 44, `h=${box?.height}`);
    record(`lang [${pagePath}] link ${i} min-width`, box && box.width >= 44, `w=${box?.width}`);
  }

  if (expectHref) {
    const links = switcher.locator('a[href]');
    const count = await links.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (resolveHref(pagePath, href) === expectHref) {
        found = true;
        await links.nth(i).focus();
        break;
      }
    }
    record(`lang [${pagePath}] equivalente ${expectHref}`, found);
    if (found) {
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      record(`lang [${pagePath}] foco no link`, focused === 'A');
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const s = getComputedStyle(el);
        return { outline: s.outlineWidth, boxShadow: s.boxShadow };
      });
      const focusVisible = outline && (outline.outline !== '0px' || outline.boxShadow !== 'none');
      record(`lang [${pagePath}] foco visível`, !!focusVisible, JSON.stringify(outline));
    }
  } else {
    const hubLink = currentLang === 'PT'
      ? switcher.locator('a[href="en/index.html"], a[href="/en/index.html"]')
      : currentLang === 'EN'
        ? switcher.locator('a[href="../index.html"], a[href="index.html"]')
        : switcher.locator('a[href="../index.html"]');
    record(`lang [${pagePath}] hub fallback`, (await hubLink.count()) >= 1);
  }

  const autoRedirect = page.url() !== BASE + pagePath && !page.url().endsWith(pagePath);
  record(`lang [${pagePath}] sem redirect auto`, !autoRedirect, page.url());
}

async function testMobilePage(page, pagePath, w, h, hasForm = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE + pagePath, { waitUntil: 'load' });

  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    h1: !!document.querySelector('h1'),
    h1Visible: (() => {
      const h1 = document.querySelector('h1');
      if (!h1) return false;
      const r = h1.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })(),
    switcher: !!document.querySelector('.language-switcher'),
    footer: !!document.querySelector('.footer'),
    cta: document.querySelectorAll('.btn.primary, .hero-actions .btn').length,
  }));

  const key = `mobile ${pagePath} ${w}x${h}`;
  record(`${key} sem overflow`, !metrics.overflow);
  record(`${key} H1 presente`, metrics.h1 && metrics.h1Visible);
  record(`${key} seletor`, metrics.switcher);
  record(`${key} footer`, metrics.footer);
  record(`${key} CTA`, metrics.cta > 0);

  if (w <= 980) {
    const toggle = page.locator('.nav-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();
      const navOpen = await page.locator('.nav-links.active').count();
      record(`${key} menu abre`, navOpen === 1);
      await toggle.click();
    }
  }

  if (hasForm) {
    await page.click('#btnEnviar');
    await page.waitForTimeout(150);
    const summary = await page.locator('#formErrosResumo:not([hidden])').count();
    record(`${key} formulário utilizável`, summary === 1);
  }
}

async function testCookieBanner(page, pagePath, langSnippet, w, h) {
  await page.addInitScript(() => {
    localStorage.removeItem('cc_analytics_consent');
    delete window.gtag;
  });
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE + pagePath, { waitUntil: 'load' });

  const banner = page.locator('#cookie-consent');
  await banner.waitFor({ state: 'visible' });
  const text = await banner.innerText();
  record(`cookie [${pagePath}] texto ${langSnippet}`, text.includes(langSnippet), text.slice(0, 60));

  const acceptBtn = banner.locator('[data-cookie-accept]');
  const rejectBtn = banner.locator('[data-cookie-reject]');
  const submitBtn = page.locator('#btnEnviar');
  const switcher = page.locator('.language-switcher a').first();

  const submitBox = await submitBtn.boundingBox().catch(() => null);
  const bannerBox = await banner.boundingBox();
  if (submitBox && bannerBox) {
    const overlap = !(submitBox.y + submitBox.height < bannerBox.y || bannerBox.y + bannerBox.height < submitBox.y);
    record(`cookie [${pagePath}] não bloqueia submit`, !overlap || !(await submitBtn.isVisible()));
  }

  await rejectBtn.click();
  record(`cookie [${pagePath}] rejeitar`, await banner.isHidden());
  record(`cookie [${pagePath}] sem gtag após rejeitar`, await page.evaluate(() => typeof window.gtag === 'undefined'));

  await page.evaluate(() => localStorage.removeItem('cc_analytics_consent'));
  await page.reload({ waitUntil: 'load' });
  await banner.waitFor({ state: 'visible' });
  await acceptBtn.click();
  record(`cookie [${pagePath}] aceitar`, await banner.isHidden());
  record(`cookie [${pagePath}] gtag após aceitar`, await page.evaluate(() => typeof window.gtag === 'function'));

  await page.evaluate(() => localStorage.setItem('cc_analytics_consent', 'false'));
  await page.reload({ waitUntil: 'load' });
  if (await page.locator('#formContacto').count()) {
    await page.route('https://api.web3forms.com/submit', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    );
    await page.fill('#contactoNome', 'Test User');
    await page.fill('#contactoEmail', 't@example.com');
    await page.fill('#contactoAssunto', 'Test subject');
    await page.fill('#contactoMensagem', 'Test message long enough here.');
    await page.check('#contactoPrivacidade');
    await page.click('#btnEnviar');
    await page.waitForTimeout(300);
    record(`cookie [${pagePath}] form sem analytics`, (await page.locator('#formSucesso:not([hidden])').count()) === 1);
    await page.unroute('https://api.web3forms.com/submit');
  }
}

async function testFormAjax(page, pagePath, lang) {
  await page.addInitScript(() => {
    window.__gaEvents = [];
    window.gtag = (...args) => window.__gaEvents.push(Array.from(args));
    localStorage.removeItem('cc_analytics_consent');
  });
  await page.route('https://api.web3forms.com/submit', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  );
  await page.goto(BASE + pagePath, { waitUntil: 'load' });
  const urlBefore = page.url();

  await page.fill('#contactoNome', 'Test User');
  await page.fill('#contactoEmail', 't@example.com');
  await page.fill('#contactoAssunto', 'Test subject');
  await page.fill('#contactoMensagem', 'Test message long enough here.');
  await page.check('#contactoPrivacidade');
  await page.click('#btnEnviar');
  await page.waitForTimeout(400);

  record(`form AJAX [${lang}] sucesso`, (await page.locator('#formSucesso:not([hidden])').count()) === 1);
  record(`form AJAX [${lang}] permanece na página`, page.url() === urlBefore);
  const events = await page.evaluate(() => window.__gaEvents || []);
  const submits = events.filter((e) => e[1] === 'form_submit');
  const leads = events.filter((e) => e[1] === 'generate_lead');
  record(`form AJAX [${lang}] um form_submit`, submits.length === 1, String(submits.length));
  record(`form AJAX [${lang}] um generate_lead`, leads.length === 1, String(leads.length));
  await page.unroute('https://api.web3forms.com/submit');
}

async function testFormNoJs(browser, pagePath, lang, redirectContains) {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE + pagePath, { waitUntil: 'load' });
  record(`form noJS [${lang}] action`, (await p.getAttribute('#formContacto', 'action')) === 'https://api.web3forms.com/submit');
  record(`form noJS [${lang}] novalidate ausente`, (await p.getAttribute('#formContacto', 'novalidate')) === null);
  record(`form noJS [${lang}] tel opcional`, (await p.getAttribute('#contactoTel', 'required')) === null);
  const redirect = await p.locator('input[name="redirect"]').getAttribute('value');
  record(`form noJS [${lang}] redirect`, redirect.includes(redirectContains), redirect);

  const confirmPath = lang === 'EN' ? 'en/request-received.html' : 'fr/demande-recue.html';
  await p.goto(BASE + confirmPath, { waitUntil: 'load' });
  const htmlLang = await p.evaluate(() => document.documentElement.lang);
  record(`form noJS [${lang}] confirmação idioma`, lang === 'EN' ? htmlLang.startsWith('en') : htmlLang.startsWith('fr'));
  const robots = await p.locator('meta[name="robots"]').getAttribute('content');
  record(`form noJS [${lang}] confirmação noindex`, robots === 'noindex,follow');
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const langPages = [
    ['index.html', 'PT', 'en/index.html'],
    ['en/index.html', 'EN', 'fr/index.html'],
    ['fr/index.html', 'FR', 'en/index.html'],
    ['contactos.html', 'PT', 'en/contact.html'],
    ['en/contact.html', 'EN', 'fr/contact.html'],
    ['fr/contact.html', 'FR', 'en/contact.html'],
    ['consulta-juridica.html', 'PT', 'en/legal-consultation.html'],
    ['en/legal-consultation.html', 'EN', 'fr/consultation-juridique.html'],
    ['fr/consultation-juridique.html', 'FR', 'en/legal-consultation.html'],
    ['sobre.html', 'PT', 'en/about.html'],
    ['particulares.html', 'PT', null],
  ];
  for (const [p, lang, eq] of langPages) {
    await testLanguageSwitcherKeyboard(page, p, lang, eq);
  }

  const mobilePages = [
    ['en/index.html', false],
    ['fr/index.html', false],
    ['en/contact.html', true],
    ['fr/contact.html', true],
    ['en/legal-consultation.html', false],
    ['fr/consultation-juridique.html', false],
    ['en/why-portugal-a-life-worth-choosing.html', false],
    ['fr/pourquoi-le-portugal-une-vie-a-choisir.html', false],
  ];
  const viewports = [
    [320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900],
  ];
  let mobileCount = 0;
  for (const [p, hasForm] of mobilePages) {
    for (const [w, h] of viewports) {
      await testMobilePage(page, p, w, h, hasForm);
      mobileCount++;
    }
  }
  record('mobile total combinações', mobileCount === 40, String(mobileCount));

  for (const [p, snippet, w, h] of [
    ['index.html', 'Cookies de análise', 320, 568],
    ['index.html', 'Cookies de análise', 390, 844],
    ['en/contact.html', 'Analytics cookies', 320, 568],
    ['en/contact.html', 'Analytics cookies', 390, 844],
    ['fr/contact.html', "Cookies d'analyse", 320, 568],
    ['fr/contact.html', "Cookies d'analyse", 390, 844],
  ]) {
    await testCookieBanner(page, p, snippet, w, h);
  }

  await testFormAjax(page, 'en/contact.html', 'EN');
  await testFormAjax(page, 'fr/contact.html', 'FR');
  await testFormNoJs(browser, 'en/contact.html', 'EN', 'request-received');
  await testFormNoJs(browser, 'fr/contact.html', 'FR', 'demande-recue');

  const switcherPages = ['index.html', 'en/index.html', 'fr/index.html'];
  const switcherViewports = [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
  for (const p of switcherPages) {
    for (const [w, h] of switcherViewports) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE + p, { waitUntil: 'load' });
      const links = page.locator('.language-switcher a');
      const count = await links.count();
      for (let i = 0; i < count; i++) {
        const rect = await links.nth(i).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        record(`switcher 44px [${p}] ${w}x${h} link${i}`, rect.width >= 44 && rect.height >= 44, `${rect.width}x${rect.height}`);
      }
      const current = page.locator('.language-switcher__current');
      if (await current.count()) {
        const rect = await current.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        record(`switcher 44px [${p}] ${w}x${h} current`, rect.width >= 44 && rect.height >= 44, `${rect.width}x${rect.height}`);
      }
    }
  }

  await browser.close();

  const fails = results.filter((r) => !r.pass);
  console.log('\n=== QA PROMPT 6 (browser) ===');
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
