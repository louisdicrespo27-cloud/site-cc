// Navegação, formulário de contacto (mailto), ano no rodapé.
// Header e footer vêm inline no HTML (gerados por scripts/build.mjs).

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
  const to = 'correiacrespo-67709L@adv.oa.pt';

  const nomeInput = form.querySelector('#contactoNome');
  const nomeErr = form.querySelector('#contactoNomeError');
  const emailInput = form.querySelector('#contactoEmail');
  const emailErr = document.getElementById('contactoEmailError');
  const telInput = form.querySelector('#contactoTel');
  const telErr = form.querySelector('#contactoTelError');
  const assuntoEl = form.querySelector('#contactoAssunto');
  const assuntoErr = form.querySelector('#contactoAssuntoError');
  const msgEl = form.querySelector('#contactoMensagem');
  const msgErr = form.querySelector('#contactoMensagemError');
  const consentCb = form.querySelector('#contactoPrivacidade');

  function clearFieldErrs() {
    hideErr(nomeErr);
    if (emailInput) emailInput.removeAttribute('aria-invalid');
    hideErr(emailErr);
    hideErr(telErr);
    hideErr(assuntoErr);
    hideErr(msgErr);
  }

  [nomeInput, emailInput, telInput, assuntoEl, msgEl].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', clearFieldErrs);
    el.addEventListener('focus', clearFieldErrs);
  });

  form.addEventListener('submit', (e) => {
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
      showErr(assuntoErr, 'Indique um assunto (mínimo de 3 caracteres).');
      if (assuntoEl) assuntoEl.focus();
      return;
    }

    if (!msgEl || String(msgEl.value || '').trim().length < 10) {
      showErr(msgErr, 'Escreva uma mensagem (mínimo de 10 caracteres).');
      if (msgEl) msgEl.focus();
      return;
    }

    const nome = String(nomeInput.value || '').trim();
    const tel = String(telInput.value || '').trim();
    const msg = String(msgEl.value || '').trim();
    const lines = [
      'Contacto — formulário do sítio',
      '',
      'Nome: ' + nome,
      'Email: ' + emailInput.value.trim(),
      'Telefone: ' + tel,
      'Assunto: ' + assuntoVal,
      '',
      'Mensagem:',
      msg,
    ];
    const subj = encodeURIComponent('Contacto via sítio — ' + assuntoVal);
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = 'mailto:' + to + '?subject=' + subj + '&body=' + body;
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

  function trackConversion(action, label) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', action, { event_category: 'engagement', event_label: label || '' });
  }

  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach((a) => {
    a.addEventListener('click', () => {
      const type = a.getAttribute('href').startsWith('mailto:') ? 'email' : 'tel';
      trackConversion('contact_click', type);
    });
  });

  function loadAnalytics() {
    const gaId = document.body.getAttribute('data-ga-id')?.trim();
    if (!gaId) return;
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
  if (localStorage.getItem('cc_analytics_consent') === 'true') loadAnalytics();
});
