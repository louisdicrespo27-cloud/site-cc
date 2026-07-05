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
  if (anchor.closest('#escolha-percurso, .audience-grid')) return 'audience';
  if (anchor.closest('#como-ajudamos, .service-split')) return 'services';
  if (anchor.closest('#como-funciona')) return 'process';
  if (anchor.closest('#leituras, .resource-list')) return 'resources';
  if (anchor.closest('#cta-final, .section--final-cta')) return 'final_cta';
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

function normalizeFormLang(lang) {
  const raw = String(lang || '').toLowerCase();
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('fr')) return 'fr';
  return 'pt';
}

const FORM_MESSAGES = {
  pt: {
    fields: {
      nome: 'Nome completo',
      email: 'Endereço de email',
      tel: 'Telefone (opcional)',
      assunto: 'Assunto',
      mensagem: 'Mensagem',
      privacidade: 'Política de Privacidade',
    },
    errors: {
      nomeRequired: 'Indique o seu nome.',
      nomeMin: 'O nome deve ter pelo menos 2 caracteres.',
      nomeMax: 'O nome não pode exceder 120 caracteres.',
      emailRequired: 'Indique o seu email.',
      emailMax: 'O email não pode exceder 254 caracteres.',
      emailInvalid: 'Indique um endereço de email válido.',
      telMax: 'O telefone não pode exceder 40 caracteres.',
      assuntoMin: 'Indique um assunto (mínimo 3 caracteres).',
      assuntoMax: 'O assunto não pode exceder 160 caracteres.',
      mensagemMin: 'Escreva uma mensagem (mínimo 10 caracteres).',
      mensagemMax: 'A mensagem não pode exceder 2000 caracteres.',
      privacidade: 'Deve declarar que leu e compreendeu a Política de Privacidade.',
    },
    errorSummaryTitle: 'Verifique os campos assinalados:',
    submitting: 'A enviar…',
  },
  en: {
    fields: {
      nome: 'Full name',
      email: 'Email address',
      tel: 'Telephone (optional)',
      assunto: 'Subject',
      mensagem: 'Message',
      privacidade: 'Privacy policy',
    },
    errors: {
      nomeRequired: 'Please enter your name.',
      nomeMin: 'Name must be at least 2 characters.',
      nomeMax: 'Name cannot exceed 120 characters.',
      emailRequired: 'Please enter your email address.',
      emailMax: 'Email cannot exceed 254 characters.',
      emailInvalid: 'Please enter a valid email address.',
      telMax: 'Telephone cannot exceed 40 characters.',
      assuntoMin: 'Please enter a subject (minimum 3 characters).',
      assuntoMax: 'Subject cannot exceed 160 characters.',
      mensagemMin: 'Please write a message (minimum 10 characters).',
      mensagemMax: 'Message cannot exceed 2000 characters.',
      privacidade: 'You must confirm that you have read and understood the Privacy policy.',
    },
    errorSummaryTitle: 'Please check the highlighted fields:',
    submitting: 'Sending…',
  },
  fr: {
    fields: {
      nome: 'Nom complet',
      email: 'Adresse e-mail',
      tel: 'Téléphone (facultatif)',
      assunto: 'Objet',
      mensagem: 'Message',
      privacidade: 'Politique de confidentialité',
    },
    errors: {
      nomeRequired: 'Veuillez indiquer votre nom.',
      nomeMin: 'Le nom doit comporter au moins 2 caractères.',
      nomeMax: 'Le nom ne peut pas dépasser 120 caractères.',
      emailRequired: 'Veuillez indiquer votre adresse e-mail.',
      emailMax: 'L’adresse e-mail ne peut pas dépasser 254 caractères.',
      emailInvalid: 'Veuillez indiquer une adresse e-mail valide.',
      telMax: 'Le téléphone ne peut pas dépasser 40 caractères.',
      assuntoMin: 'Veuillez indiquer un objet (minimum 3 caractères).',
      assuntoMax: 'L’objet ne peut pas dépasser 160 caractères.',
      mensagemMin: 'Veuillez rédiger un message (minimum 10 caractères).',
      mensagemMax: 'Le message ne peut pas dépasser 2000 caractères.',
      privacidade: 'Vous devez confirmer avoir lu et compris la politique de confidentialité.',
    },
    errorSummaryTitle: 'Veuillez vérifier les champs signalés :',
    submitting: 'Envoi…',
  },
};

const NAV_UI = {
  pt: { open: 'Abrir menu', close: 'Fechar menu' },
  en: { open: 'Open menu', close: 'Close menu' },
  fr: { open: 'Ouvrir le menu', close: 'Fermer le menu' },
};

function getFormLang() {
  return normalizeFormLang(document.documentElement.lang);
}

function initContactForm() {
  const form = document.getElementById('formContacto');
  if (!form) return;

  form.noValidate = true;
  const msgs = FORM_MESSAGES[getFormLang()] || FORM_MESSAGES.pt;

  const nomeInput = form.querySelector('#contactoNome');
  const nomeErr = form.querySelector('#contactoNomeError');
  const emailInput = form.querySelector('#contactoEmail');
  const emailErr = form.querySelector('#contactoEmailError');
  const telInput = form.querySelector('#contactoTel');
  const telErr = form.querySelector('#contactoTelError');
  const assuntoEl = form.querySelector('#contactoAssunto');
  const assuntoErr = form.querySelector('#contactoAssuntoError');
  const msgEl = form.querySelector('#contactoMensagem');
  const msgErr = form.querySelector('#contactoMensagemError');
  const consentCb = form.querySelector('#contactoPrivacidade');
  const privacidadeErr = form.querySelector('#contactoPrivacidadeError');
  const btnEnviar = form.querySelector('#btnEnviar');
  const divSucesso = document.getElementById('formSucesso');
  const divErro = document.getElementById('formErro');
  const errorSummary = document.getElementById('formErrosResumo');
  const errorSummaryList = errorSummary ? errorSummary.querySelector('ul') : null;
  const errorSummaryTitle = errorSummary ? errorSummary.querySelector('p strong') : null;
  if (errorSummaryTitle) errorSummaryTitle.textContent = msgs.errorSummaryTitle;

  let isSubmitting = false;
  let formStarted = false;
  const btnOriginalText = btnEnviar ? btnEnviar.textContent : '';

  const fieldMeta = {
    nome: { input: nomeInput, err: nomeErr, label: msgs.fields.nome, id: 'contactoNome' },
    email: { input: emailInput, err: emailErr, label: msgs.fields.email, id: 'contactoEmail' },
    tel: { input: telInput, err: telErr, label: msgs.fields.tel, id: 'contactoTel' },
    assunto: { input: assuntoEl, err: assuntoErr, label: msgs.fields.assunto, id: 'contactoAssunto' },
    mensagem: { input: msgEl, err: msgErr, label: msgs.fields.mensagem, id: 'contactoMensagem' },
    privacidade: { input: consentCb, err: privacidadeErr, label: msgs.fields.privacidade, id: 'contactoPrivacidade', isCheckbox: true },
  };

  function trackFormEvent(action, extra = {}) {
    trackConversion(action, action, 'contacto', {
      form_name: 'contact_form',
      link_location: 'form',
      ...extra,
    });
  }

  function markFormStart() {
    if (formStarted) return;
    formStarted = true;
    trackFormEvent('form_start');
  }

  function hideFieldError(key) {
    const field = fieldMeta[key];
    if (!field) return;
    hideErr(field.err);
    if (field.input && !field.isCheckbox) {
      field.input.removeAttribute('aria-invalid');
    }
    removeSummaryItem(key);
    if (errorSummary && errorSummaryList && !errorSummaryList.children.length) {
      errorSummary.hidden = true;
    }
  }

  function showFieldError(key, message) {
    const field = fieldMeta[key];
    if (!field) return;
    showErr(field.err, message);
    if (field.input && !field.isCheckbox) {
      field.input.setAttribute('aria-invalid', 'true');
    }
  }

  function removeSummaryItem(key) {
    if (!errorSummaryList) return;
    const existing = errorSummaryList.querySelector(`[data-field="${key}"]`);
    if (existing) existing.remove();
  }

  function addSummaryItem(key, label) {
    if (!errorSummaryList) return;
    removeSummaryItem(key);
    const li = document.createElement('li');
    li.setAttribute('data-field', key);
    const link = document.createElement('a');
    link.href = `#${fieldMeta[key].id}`;
    link.textContent = label;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(fieldMeta[key].id);
      if (target) target.focus();
    });
    li.appendChild(link);
    errorSummaryList.appendChild(li);
  }

  function showErrorSummary(keys) {
    if (!errorSummary || !errorSummaryList) return;
    errorSummaryList.replaceChildren();
    keys.forEach((key) => {
      addSummaryItem(key, fieldMeta[key].label);
    });
    errorSummary.hidden = false;
    errorSummary.focus();
  }

  function clearAllErrors() {
    Object.keys(fieldMeta).forEach(hideFieldError);
    if (errorSummary) errorSummary.hidden = true;
    if (errorSummaryList) errorSummaryList.replaceChildren();
    if (divErro) divErro.hidden = true;
  }

  function validateField(key) {
    const e = msgs.errors;
    switch (key) {
      case 'nome': {
        const val = nomeInput ? String(nomeInput.value || '').trim() : '';
        if (!val) return e.nomeRequired;
        if (val.length < 2) return e.nomeMin;
        if (val.length > 120) return e.nomeMax;
        return null;
      }
      case 'email': {
        if (!emailInput || !emailInput.value.trim()) return e.emailRequired;
        if (emailInput.value.length > 254) return e.emailMax;
        if (!emailInput.checkValidity()) return e.emailInvalid;
        return null;
      }
      case 'tel': {
        const val = telInput ? String(telInput.value || '').trim() : '';
        if (val.length > 40) return e.telMax;
        return null;
      }
      case 'assunto': {
        const val = assuntoEl ? String(assuntoEl.value || '').trim() : '';
        if (val.length < 3) return e.assuntoMin;
        if (val.length > 160) return e.assuntoMax;
        return null;
      }
      case 'mensagem': {
        const val = msgEl ? String(msgEl.value || '').trim() : '';
        if (val.length < 10) return e.mensagemMin;
        if (val.length > 2000) return e.mensagemMax;
        return null;
      }
      case 'privacidade': {
        if (!consentCb || !consentCb.checked) return e.privacidade;
        return null;
      }
      default:
        return null;
    }
  }

  function validateAll() {
    const invalidKeys = [];
    Object.keys(fieldMeta).forEach((key) => {
      const message = validateField(key);
      if (message) {
        invalidKeys.push(key);
        showFieldError(key, message);
      } else {
        hideFieldError(key);
      }
    });
    return invalidKeys;
  }

  function setSubmittingState(active) {
    if (btnEnviar) {
      btnEnviar.disabled = active;
      btnEnviar.setAttribute('aria-disabled', active ? 'true' : 'false');
      btnEnviar.classList.toggle('is-loading', active);
      btnEnviar.textContent = active ? msgs.submitting : btnOriginalText;
    }
    if (active) {
      form.setAttribute('aria-busy', 'true');
    } else {
      form.removeAttribute('aria-busy');
    }
  }

  const fieldKeyById = {
    contactoNome: 'nome',
    contactoEmail: 'email',
    contactoTel: 'tel',
    contactoAssunto: 'assunto',
    contactoMensagem: 'mensagem',
  };

  const startFields = [nomeInput, emailInput, telInput, assuntoEl, msgEl];
  startFields.forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
      markFormStart();
      const fieldKey = fieldKeyById[el.id];
      if (fieldKey) hideFieldError(fieldKey);
    });
  });

  if (consentCb) {
    consentCb.addEventListener('change', () => {
      markFormStart();
      hideFieldError('privacidade');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (divErro) divErro.hidden = true;
    const invalidKeys = validateAll();

    if (invalidKeys.length) {
      showErrorSummary(invalidKeys);
      trackFormEvent('form_error', { error_type: 'validation' });
      return;
    }

    isSubmitting = true;
    setSubmittingState(true);
    trackFormEvent('form_submit');

    try {
      const data = new FormData(form);
      data.delete('redirect');

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
      });

      let json = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          json = await res.json();
        } catch {
          json = null;
        }
      }

      if (res.ok && json && json.success === true) {
        trackFormEvent('generate_lead');
        form.reset();
        clearAllErrors();
        form.hidden = true;
        if (divSucesso) {
          divSucesso.hidden = false;
          divSucesso.focus();
        }
      } else {
        throw new Error('submission_failed');
      }
    } catch {
      console.error('contact_form_submission_failed');
      if (divErro) {
        divErro.hidden = false;
        divErro.focus();
      }
      trackFormEvent('form_error', { error_type: 'technical' });
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
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
  const navUi = NAV_UI[getFormLang()] || NAV_UI.pt;

  function closeMobileNav(options = {}) {
    const { returnFocus = false } = options;
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', navUi.open);
    document.body.classList.remove('nav-menu-open');
    if (returnFocus) {
      navToggle.focus({ preventScroll: true });
    }
  }

  function openMobileNav(moveFocusToFirstLink) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', navUi.close);
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
      closeMobileNav({ returnFocus: true });
    });

    document.addEventListener('pointerup', (event) => {
      if (!mqCompactNav.matches || !navLinks.classList.contains('active')) return;

      const target = event.target;
      if (!(target instanceof Node)) return;
      if (navLinks.contains(target) || navToggle.contains(target)) return;

      closeMobileNav();
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
