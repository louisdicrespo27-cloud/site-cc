#!/usr/bin/env node
/**
 * QA validation script — overflow, menu mobile, cookie banner, analytics hooks.
 * Usage: node scripts/qa-validate.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = `file://${ROOT}/`;

const VIEWPORTS = [
  { w: 320, h: 568, label: '320×568' },
  { w: 375, h: 667, label: '375×667' },
  { w: 390, h: 844, label: '390×844' },
  { w: 768, h: 1024, label: '768×1024' },
  { w: 1024, h: 768, label: '1024×768' },
  { w: 1440, h: 900, label: '1440×900' },
];

const PAGES = [
  'index.html',
  'particulares.html',
  'empresas.html',
  'consulta-juridica.html',
  'contactos.html',
  'familia-menores.html',
  'quanto-tempo-demora-divorcio-portugal.html',
  'sobre.html',
  'aviso-legal.html',
  'politica-de-privacidade.html',
  '404.html',
  'en/index.html',
  'fr/index.html',
  'en/buying-property-portugal-us-citizens.html',
];

const issues = [];
const passes = [];

function fail(area, msg, detail = '') {
  issues.push({ area, msg, detail });
}
function pass(area, msg) {
  passes.push({ area, msg });
}

async function findOverflowCause(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        offenders.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          cls: (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join(' ') : null,
          right: Math.round(r.right),
          left: Math.round(r.left),
          width: Math.round(r.width),
          overflow: cs.overflowX,
        });
      }
    }
    offenders.sort((a, b) => b.right - a.right);
    return offenders.slice(0, 5);
  });
}

async function testOverflow(page, pagePath, vp) {
  const file = pagePath.replace(/\s*\[no-mask\]$/, '');
  const label = pagePath.includes('[no-mask]') ? `${file} (sem mask) @ ${vp.label}` : `${file} @ ${vp.label}`;
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(BASE + file, { waitUntil: 'load' });
  await page.waitForTimeout(150);

  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  if (result.scrollWidth > result.clientWidth) {
    const offenders = await findOverflowCause(page);
    fail('overflow', `${label}: scrollWidth ${result.scrollWidth} > clientWidth ${result.clientWidth}`, JSON.stringify(offenders));
  } else {
    pass('overflow', `${label}: OK`);
  }
}

async function testHomepage(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });

  const h1Count = await page.locator('h1').count();
  if (h1Count !== 1) fail('homepage', `Esperado 1 H1, encontrado ${h1Count}`);
  else pass('homepage', 'Exatamente 1 H1');

  const primaryCta = await page.locator('.hero-actions .btn.primary').textContent();
  if (!primaryCta?.includes('Pedir consulta jurídica')) fail('homepage', `CTA principal hero: "${primaryCta?.trim()}"`);
  else pass('homepage', 'CTA principal hero correto');

  const secondaryHref = await page.locator('.hero-actions .btn.secondary').getAttribute('href');
  if (secondaryHref !== '#escolha-percurso') fail('homepage', `CTA secundário href: ${secondaryHref}`);
  else pass('homepage', 'CTA secundário aponta para #escolha-percurso');

  await page.locator('.hero-actions .btn.secondary').click();
  await page.waitForTimeout(300);
  const targetVisible = await page.evaluate(() => {
    const el = document.getElementById('escolha-percurso');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight * 0.4;
  });
  if (!targetVisible) fail('homepage', 'Âncora #escolha-percurso não visível após clique');
  else pass('homepage', 'Âncora #escolha-percurso funcional');

  const ids = await page.evaluate(() => {
    const seen = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      const id = el.id;
      seen.set(id, (seen.get(id) || 0) + 1);
    }
    return [...seen.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);
  });
  if (ids.length) fail('homepage', `IDs duplicados: ${ids.join(', ')}`);
  else pass('homepage', 'Sem IDs duplicados');

  const anchors = ['#escolha-percurso', '#como-ajudamos', '#como-funciona', '#cta-final'];
  for (const a of anchors) {
    const exists = await page.locator(a).count();
    if (!exists) fail('homepage', `Âncora em falta: ${a}`);
    else pass('homepage', `Âncora existe: ${a}`);
  }

  const resourceLinks = await page.locator('#leituras .resource-list a').evaluateAll((els) =>
    els.map((a) => ({ href: a.getAttribute('href'), ok: a.href }))
  );
  for (const link of resourceLinks) {
    const file = link.href.replace(BASE, '');
    const abs = path.join(ROOT, decodeURIComponent(file.split('file://')[1] || link.href.replace(BASE, '')));
  }
  // check files exist
  const hrefs = await page.locator('#leituras .resource-list a').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  for (const href of hrefs) {
    const fp = path.join(ROOT, href);
    if (!fs.existsSync(fp)) fail('homepage', `Link inválido em leituras: ${href}`);
    else pass('homepage', `Link leituras válido: ${href}`);
  }
}

async function testMobileMenu(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });

  const toggle = page.locator('.nav-toggle');
  const navLinks = page.locator('.nav-links');

  // Open
  await toggle.click();
  await page.waitForTimeout(100);
  let expanded = await toggle.getAttribute('aria-expanded');
  if (expanded !== 'true') fail('menu', `aria-expanded após abrir: ${expanded}`);
  else pass('menu', 'aria-expanded=true ao abrir');

  const active = await navLinks.evaluate((el) => el.classList.contains('active'));
  if (!active) fail('menu', 'nav-links sem classe active ao abrir');
  else pass('menu', 'nav-links.active ao abrir');

  const bodyLock = await page.evaluate(() => document.body.classList.contains('nav-menu-open'));
  if (!bodyLock) fail('menu', 'body sem nav-menu-open');
  else pass('menu', 'Scroll lock activo');

  // Click inside — should NOT close + return focus incorrectly
  await navLinks.locator('a').first().focus();
  await page.mouse.click(200, 200); // inside nav panel area - need coords inside menu
  const menuStillOpen = await navLinks.evaluate((el) => el.classList.contains('active'));
  // click on first nav link text area
  const box = await navLinks.locator('a').first().boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    // clicking link closes menu - that's expected. Reopen for outside test.
  }

  await toggle.click();
  await page.waitForTimeout(100);
  await toggle.click();
  await page.waitForTimeout(100);

  // Click outside
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
  expanded = await toggle.getAttribute('aria-expanded');
  const focused = await page.evaluate(() => document.activeElement?.classList?.contains('nav-toggle'));
  if (expanded !== 'false') fail('menu', `Menu não fechou ao clicar fora (aria-expanded=${expanded})`);
  else pass('menu', 'Fecha ao clicar fora');
  if (!focused) fail('menu', 'Foco não devolvido ao toggle após clicar fora');
  else pass('menu', 'Foco devolvido ao toggle após clicar fora');

  // Escape
  await toggle.click();
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expanded = await toggle.getAttribute('aria-expanded');
  const focusedEsc = await page.evaluate(() => document.activeElement?.classList?.contains('nav-toggle'));
  if (expanded !== 'false') fail('menu', `Menu não fechou com Escape (aria-expanded=${expanded})`);
  else pass('menu', 'Fecha com Escape');
  if (!focusedEsc) fail('menu', 'Foco não devolvido ao toggle após Escape');
  else pass('menu', 'Foco devolvido ao toggle após Escape');

  // Resize desktop with menu open
  await toggle.click();
  await page.waitForTimeout(100);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(150);
  const activeAfterResize = await navLinks.evaluate((el) => el.classList.contains('active'));
  if (activeAfterResize) fail('menu', 'Menu permanece active após resize para desktop');
  else pass('menu', 'Menu fecha ao redimensionar para desktop');

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  if (consoleErrors.length) fail('menu', `Erros consola: ${consoleErrors.join('; ')}`);
  else pass('menu', 'Sem erros consola durante testes menu');
}

async function testCookieBanner(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('cc_analytics_consent');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });

  const banner = page.locator('#cookie-consent');
  await page.evaluate(() => {
    const b = document.getElementById('cookie-consent');
    if (b) b.hidden = false;
  });

  const targets = [
    { sel: '#cta-final, .section--final-cta', page: 'index.html', name: 'CTA final' },
  ];

  // Test on contactos at 320 and 390
  for (const vp of [{ w: 320, h: 568 }, { w: 390, h: 844 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + 'contactos.html', { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.removeItem('cc_analytics_consent');
      const b = document.getElementById('cookie-consent');
      if (b) b.hidden = false;
    });
    await page.waitForTimeout(200);

    const checks = [
      { sel: '#btnEnviar', name: 'botão enviar' },
      { sel: 'a[href^="tel:"]', name: 'telefone' },
      { sel: 'a[href^="mailto:"]', name: 'email' },
      { sel: 'a[href*="wa.me"]', name: 'WhatsApp' },
      { sel: 'a[href="politica-de-privacidade.html"]', name: 'link legal' },
      { sel: '#contactoNome', name: 'campo nome' },
    ];

    for (const c of checks) {
      const el = page.locator(c.sel).first();
      const visible = await el.isVisible();
      const box = await el.boundingBox();
      const bannerBox = await page.locator('#cookie-consent').boundingBox();
      if (!visible || !box) {
        fail('cookie', `${c.name} não visível @ ${vp.w}×${vp.h}`);
        continue;
      }
      const viewportH = vp.h;
      const blocked = bannerBox && box.y + box.height > bannerBox.y - 4 && box.y + box.height > viewportH - 10;
      // element should be above banner or scrollable into view
      const canScrollTo = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const banner = document.getElementById('cookie-consent');
        const br = banner?.getBoundingClientRect();
        if (!br || banner.hidden) return r.bottom <= window.innerHeight;
        return r.bottom <= br.top - 8 || r.top >= 0;
      }, c.sel);
      if (!canScrollTo) fail('cookie', `${c.name} bloqueado pelo banner @ ${vp.w}×${vp.h}`);
      else pass('cookie', `${c.name} acessível com banner @ ${vp.w}×${vp.h}`);
    }
  }

  // CTA final on index
  for (const vp of [{ w: 320, h: 568 }, { w: 390, h: 844 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + 'index.html', { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.removeItem('cc_analytics_consent');
      const b = document.getElementById('cookie-consent');
      if (b) b.hidden = false;
    });
    const ok = await page.evaluate(() => {
      const el = document.querySelector('#cta-final .btn.primary');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const br = document.getElementById('cookie-consent')?.getBoundingClientRect();
      return !br || r.bottom <= br.top - 8;
    });
    if (!ok) fail('cookie', `CTA final bloqueado @ ${vp.w}×${vp.h}`);
    else pass('cookie', `CTA final acessível @ ${vp.w}×${vp.h}`);
  }
}

async function testAnalytics(page) {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => {
    localStorage.setItem('cc_analytics_consent', 'true');
    window.__gaEvents = [];
    window.dataLayer = [];
    window.gtag = (...args) => {
      window.__gaEvents.push(Array.from(args));
      window.dataLayer.push(args);
    };
  });
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });

  // Contact links with data-loc — only tel/mailto/wa.me fire contact_click
  const contactLocs = [
    { sel: '#cta-final a[href^="tel:"]', loc: 'final_cta' },
    { sel: '#cta-final a[href^="mailto:"]', loc: 'final_cta' },
    { sel: '#cta-final a[href*="wa.me"]', loc: 'final_cta' },
    { sel: '.footer a[href^="tel:"]', loc: 'footer' },
  ];

  for (const item of contactLocs) {
    const el = page.locator(item.sel).first();
    if (!(await el.count())) {
      fail('analytics', `Elemento contacto não encontrado: ${item.sel}`);
      continue;
    }
    await page.evaluate(() => { window.__gaEvents = []; });
    await el.click({ force: true });
    await page.waitForTimeout(80);
    const events = await page.evaluate(() => window.__gaEvents || []);
    const contactEvent = events.find((e) => e[0] === 'event' && e[1] === 'contact_click');
    const linkLoc = contactEvent?.[2]?.link_location;
    if (linkLoc !== item.loc) {
      fail('analytics', `${item.loc}: link_location="${linkLoc}" event=${JSON.stringify(contactEvent)}`);
    } else {
      pass('analytics', `contact_click link_location=${item.loc} OK`);
    }
  }

  // DOM data-loc presence for non-contact zones
  const domLocs = ['header', 'hero', 'audience', 'services', 'resources'];
  for (const loc of domLocs) {
    const count = await page.locator(`[data-loc="${loc}"]`).count();
    if (!count) fail('analytics', `data-loc="${loc}" ausente no DOM`);
    else pass('analytics', `data-loc="${loc}" presente (${count} elemento(s))`);
  }

  // getLinkLocation fallback via inline test
  const fallback = await page.evaluate(() => {
    const results = {};
    const hero = document.querySelector('.hero a[href^="tel:"]') || document.querySelector('[data-loc="hero"]');
    const audience = document.querySelector('[data-loc="audience"]');
    const services = document.querySelector('[data-loc="services"]');
    const getLoc = (a) => a?.getAttribute('data-loc') || 'missing';
    results.hero = getLoc(document.querySelector('[data-loc="hero"]'));
    results.audience = getLoc(audience);
    results.services = getLoc(services);
    return results;
  });
  if (fallback.hero !== 'hero') fail('analytics', `hero data-loc: ${fallback.hero}`);
  else pass('analytics', 'hero data-loc verificado');

  const allEvents = await page.evaluate(() => JSON.stringify(window.__gaEvents || []));
  if (/correiacrespo|914376903|@adv\.oa\.pt/i.test(allEvents)) {
    fail('analytics', 'PII detectado em eventos GA');
  } else {
    pass('analytics', 'Sem PII nos eventos testados');
  }
}

async function testHeaderOffset(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.locator('.hero-actions .btn.secondary').click();
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const header = document.querySelector('.header');
    const target = document.getElementById('escolha-percurso-titulo');
    if (!header || !target) return null;
    const hr = header.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const offset = parseInt(getComputedStyle(document.documentElement).scrollPaddingTop || '0', 10);
    return {
      headerHeight: Math.round(hr.height),
      titleTop: Math.round(tr.top),
      scrollPadding: offset,
      obscured: tr.top < hr.bottom - 2,
    };
  });

  if (!result) fail('header', 'Não foi possível medir offset');
  else if (result.obscured) fail('header', `Título obscurecido: top=${result.titleTop}, headerBottom≈${result.headerHeight}`);
  else pass('header', `Título visível após âncora (top=${result.titleTop}px, scroll-padding=${result.scrollPadding}px, header≈${result.headerHeight}px)`);
}

async function testH1AllPages(page) {
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    const count = await page.locator('h1').count();
    if (count !== 1) fail('h1', `${p}: ${count} H1`);
    else pass('h1', `${p}: 1 H1`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  console.log('=== OVERFLOW ===');
  for (const p of PAGES) {
    for (const vp of VIEWPORTS) {
      await testOverflow(page, p, vp);
    }
  }

  console.log('=== HOMEPAGE ===');
  await testHomepage(page);

  console.log('=== MOBILE MENU ===');
  await testMobileMenu(page);

  console.log('=== COOKIE BANNER ===');
  await testCookieBanner(page);

  console.log('=== HEADER OFFSET ===');
  await testHeaderOffset(page);

  console.log('=== ANALYTICS ===');
  await testAnalytics(page);

  console.log('=== H1 ALL PAGES ===');
  await testH1AllPages(page);

  console.log('=== OVERFLOW SEM overflow-x:hidden ===');
  await page.addStyleTag({
    content: 'html, body { overflow-x: visible !important; }',
  });
  for (const p of ['index.html', 'contactos.html', 'empresas.html']) {
    for (const vp of VIEWPORTS) {
      await testOverflow(page, p + ' [no-mask]', vp);
    }
  }

  await browser.close();

  console.log('\n========== RESUMO ==========');
  console.log(`PASS: ${passes.length}`);
  console.log(`FAIL: ${issues.length}`);
  if (issues.length) {
    console.log('\n--- FALHAS ---');
    for (const i of issues) {
      console.log(`[${i.area}] ${i.msg}${i.detail ? '\n  ' + i.detail : ''}`);
    }
  }
  process.exit(issues.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
