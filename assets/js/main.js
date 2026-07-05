// Navegação, formulário de contacto (Web3Forms), ano no rodapé, consentimento e analítica.
// Header e footer vêm inline no HTML (gerados por scripts/build.mjs).

const CONSENT_KEY = 'cc_analytics_consent';

function loadAnalytics() {
  const gaId = document.body.getAttribute('data-ga-id')?.trim();
  if (!gaId || typeof window.gtag === 'function') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', gaId, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
  document.head.appendChild(s);
}

function getPageContext() {
  return {
    page_path: location.pathname,
    page_lang: document.documentElement.lang || '',
  };
}

function trackConversion(action, label, category, extra = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', action, {
    event_category: category || 'engagement',
    event_label: label || '',
    ...getPageContext(),
    ...extra,
  });
}

function isContactLink(anchor) {
  const href = anchor.getAttribute('href');
  if (!href) return false;
  return href.startsWith('tel:') || href.startsWith('mailto:') || href.includes('wa.me');
}

function getContactType(href) {
  if (href.startsWith('mailto:')) return 'email';
  if (href.startsWith('tel:')) return 'tel';
  if (href.includes('wa.me')) return 'whatsapp';
  return 'unknown';
}

function getLinkLocation(anchor) {
  const explicit = anchor.getAttribute('data-loc');
  if (explicit) return explicit;

  if (anchor.closest('.header')) return 'header';
  if (anchor.closest('.footer')) return 'footer';
  if (anchor.closest('#cookie-consent, .cookie-consent')) return 'banner';
  if (anchor.closest('.hero')) return 'hero';
  if (anchor.closest('.cta-row, .consulta-booking, .consulta-booking__actions, .home-contact-line')) return 'cta';
  if (anchor.closest('main, #conteudo, .page')) return 'body';
  return 'unknown';
}

function initContactTracking() {
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor || !isContactLink(anchor)) return;

    const href = anchor.getAttribute('href');
    trackConversion('contact_click', getContactType(href), 'contacto', {
      link_location: getLinkLocation(anchor),
    });
  });
}

function initCookieConsent() {
  const banner = document.getElementById('cookie-consent');
  const stored = localStorage.getItem(CONSENT_KEY);

  if (stored === 'true') {
    loadAnalytics();
    return;
  }
  if (stored === 'false' || !banner) return;

  const acceptBtn = banner.querySelector('[data-cookie-accept]');
  const rejectBtn = banner.querySelector('[data-cookie-reject]');

  function closeBanner(consent) {
    localStorage.setItem(CONSENT_KEY, consent);
    banner.hidden = true;
  }

  banner.hidden = false;

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      closeBanner('true');
      loadAnalytics();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      closeBanner('false');
    });
  }
}

function applyActiveNav() {
  const current = document.body.getAttribute('data-current-nav');
  if (!current) return;
  document.querySelectorAll('.nav a[data-nav]').forEach((a) => {
    if (a.getAttribute('data-nav') === current) {
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    }
  });
}

function hideErr(el) {
  if (el) {
    el.hidden = true;
    el.textContent = '';
  }
}

function showErr(el, text) {
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
}

function initContactForm() {
  const form = document.getElementById('formContacto');
  if (!form) return;

  const nomeInput  = form.querySelector('#contactoNome');
  const nomeErr    = form.querySelector('#contactoNomeError');
  const emailInput = form.querySelector('#contactoEmail');
  const emailErr   = form.querySelector('#contactoEmailError');
  const telInput   = form.querySelector('#contactoTel');
  const telErr     = form.querySelector('#contactoTelError');
  const assuntoEl  = form.querySelector('#contactoAssunto');
  const assuntoErr = form.querySelector('#contactoAssuntoError');
  const msgEl      = form.querySelector('#contactoMensagem');
  const msgErr     = form.querySelector('#contactoMensagemError');
  const consentCb  = form.querySelector('#contactoPrivacidade');
  const btnEnviar  = form.querySelector('#btnEnviar');
  const divSucesso = document.getElementById('formSucesso');
  const divErro    = document.getElementById('formErro');

  function clearFieldErrs() {
    [nomeErr, emailErr, telErr, assuntoErr, msgErr].forEach(hideErr);
    if (emailInput) emailInput.removeAttribute('aria-invalid');
    if (divErro)    divErro.hidden = true;
  }

  [nomeInput, emailInput, telInput, assuntoEl, msgEl].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', clearFieldErrs);
    el.addEventListener('focus', clearFieldErrs);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrs();

    if (consentCb && !consentCb.checked) {
      consentCb.focus();
      return;
    }
    if (!nomeInput || !String(nomeInput.value || '').trim()) {
      showErr(nomeErr, 'Indique o seu nome.');
      if (nomeInput) nomeInput.focus();
      return;
    }
    if (!emailInput || !emailInput.value.trim()) {
      emailInput.setAttribute('aria-invalid', 'true');
      showErr(emailErr, 'Indique o seu email.');
      emailInput.focus();
      return;
    }
    if (!emailInput.checkValidity()) {
      emailInput.setAttribute('aria-invalid', 'true');
      showErr(emailErr, 'Indique um endereço de email válido.');
      emailInput.focus();
      return;
    }
    if (!telInput || !String(telInput.value || '').trim()) {
      showErr(telErr, 'Indique um contacto telefónico.');
      telInput.focus();
      return;
    }
    const assuntoVal = assuntoEl ? String(assuntoEl.value || '').trim() : '';
    if (assuntoVal.length < 3) {
      showErr(assuntoErr, 'Indique um assunto (mínimo 3 caracteres).');
      if (assuntoEl) assuntoEl.focus();
      return;
    }
    if (!msgEl || String(msgEl.value || '').trim().length < 10) {
      showErr(msgErr, 'Escreva uma mensagem (mínimo 10 caracteres).');
      if (msgEl) msgEl.focus();
      return;
    }

    if (btnEnviar) btnEnviar.classList.add('is-loading');

    try {
      const data = new FormData(form);
      const res  = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body:   data,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        form.hidden = true;
        if (divSucesso) divSucesso.hidden = false;
        if (divErro)    divErro.hidden    = true;
        trackConversion('generate_lead', 'formulario', 'contacto', { link_location: 'form' });
      } else {
        throw new Error(json.message || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Formulário:', err);
      if (divErro) divErro.hidden = false;
    } finally {
      if (btnEnviar) btnEnviar.classList.remove('is-loading');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyActiveNav();

  const mainLandmark = document.getElementById('conteudo');
  if (mainLandmark && !mainLandmark.hasAttribute('tabindex')) {
    mainLandmark.setAttribute('tabindex', '-1');
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const mqCompactNav = window.matchMedia('(max-width: 980px)');

  function closeMobileNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('nav-menu-open');
  }

  function openMobileNav(moveFocusToFirstLink) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Fechar menu');
    document.body.classList.add('nav-menu-open');
    if (moveFocusToFirstLink) {
      const first = navLinks.querySelector('a');
      if (first) requestAnimationFrame(() => first.focus());
    }
  }

  let navOpenedFromKeyboard = false;
  if (navToggle && navLinks) {
    navToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') navOpenedFromKeyboard = true;
    });
    navToggle.addEventListener('pointerdown', () => {
      navOpenedFromKeyboard = false;
    });
    navToggle.addEventListener('click', () => {
      if (navLinks.classList.contains('active')) {
        closeMobileNav();
        navOpenedFromKeyboard = false;
        return;
      }
      const fromKb = navOpenedFromKeyboard;
      navOpenedFromKeyboard = false;
      openMobileNav(fromKb);
    });

    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', closeMobileNav);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!navLinks.classList.contains('active')) return;
      closeMobileNav();
      navToggle.focus();
    });

    mqCompactNav.addEventListener('change', (ev) => {
      if (!ev.matches) closeMobileNav();
    });
  }

  let accordionRootIdx = 0;
  document.querySelectorAll('[data-accordion]').forEach((accordion) => {
    const rootIdx = accordionRootIdx++;
    const items = Array.from(accordion.querySelectorAll('.acc-item'));
    items.forEach((btn, i) => {
      const panel = btn.nextElementSibling;
      if (!panel || !panel.classList.contains('acc-panel')) return;
      const hid = `acc-h-${rootIdx}-${i}`;
      const pid = `acc-p-${rootIdx}-${i}`;
      btn.id = hid;
      panel.id = pid;
      btn.setAttribute('aria-controls', pid);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', hid);
    });

    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        const expanded = btn.getAttribute('aria-expanded') === 'true';

        items.forEach((b) => {
          b.setAttribute('aria-expanded', 'false');
          const p = b.nextElementSibling;
          if (p && p.classList.contains('acc-panel')) p.hidden = true;
          const icon = b.querySelector('.acc-icon');
          if (icon) icon.textContent = '+';
        });

        if (!expanded && panel && panel.classList.contains('acc-panel')) {
          btn.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          const icon = btn.querySelector('.acc-icon');
          if (icon) icon.textContent = '–';
        }
      });
    });

    items.forEach((btn, i) => {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[Math.min(i + 1, items.length - 1)].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[Math.max(i - 1, 0)].focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          items[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          items[items.length - 1].focus();
        }
      });
    });
  });

  initContactForm();
  initContactTracking();
  initCookieConsent();
});
