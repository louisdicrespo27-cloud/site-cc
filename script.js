// Correia Crespo - Advogados
// Homepage estilo Google + Assistente de IA para triagem/orientação jurídica (limitada)
// Fluxo: 1 pergunta + máx. 1 clarificação → CTA

document.addEventListener('DOMContentLoaded', () => {
  // ===== Menu mobile =====
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      navToggle.setAttribute(
        'aria-label',
        navMenu.classList.contains('active') ? 'Fechar menu' : 'Abrir menu'
      );
    });
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }

  // ===== Config =====
  const API_BASE = window.location.origin;
  const CONSENT_KEY = 'cc_ai_consent_v1';

  // ===== Elementos =====
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const newQuestionBtn = document.getElementById('newQuestionBtn');

  // Modal consentimento
  const consentModal = document.getElementById('consentModal');
  const consentClose = document.getElementById('consentClose');
  const consentCancel = document.getElementById('consentCancel');
  const consentAccept = document.getElementById('consentAccept');
  const consentChecks = Array.from(
    document.querySelectorAll('input[data-consent-check]')
  );

  // ===== Estado =====
  let stage = 'initial'; // initial | awaiting_clarification | done
  let pendingQuestion = null; // 1.ª pergunta (quando em awaiting_clarification)
  let pendingAfterConsent = null; // pergunta a processar após aceitar consentimento
  let lastActiveElement = null;
  let isModalOpen = false;

  // ===== Helpers do fluxo =====
  function lockInput(msg) {
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.value = '';
      searchInput.placeholder = msg || 'Para continuar, marque consulta.';
    }
  }

  function unlockInput(placeholder) {
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.placeholder = placeholder || 'Descreva o problema (sem dados pessoais)…';
      searchInput.focus();
    }
  }

  function resetFlow() {
    stage = 'initial';
    pendingQuestion = null;
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatPanel) chatPanel.hidden = true;
    unlockInput('Descreva o problema (sem dados pessoais)…');
  }

  // ===== Consentimento =====
  function hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  }

  function openConsentModal() {
    if (!consentModal) return;
    lastActiveElement = document.activeElement;
    isModalOpen = true;

    consentModal.hidden = false;
    consentModal.style.display = 'flex';
    document.body.classList.add('modal-open');

    const pageContent = document.getElementById('pageContent');
    if (pageContent) pageContent.inert = true;

    consentChecks.forEach((c) => { c.checked = false; });
    updateConsentButton();

    const first = consentModal.querySelector('input[data-consent-check]');
    first?.focus();

    document.addEventListener('keydown', onModalKeydown, true);
  }

  function closeConsentModal() {
    const modal = document.getElementById('consentModal');
    if (!modal) return;

    isModalOpen = false;
    document.removeEventListener('keydown', onModalKeydown, true);

    const pageContent = document.getElementById('pageContent');
    if (pageContent) pageContent.inert = false;

    document.body.classList.remove('modal-open');
    modal.hidden = true;
    modal.style.display = 'none';

    const focusTarget = document.getElementById('searchInput');
    (lastActiveElement && typeof lastActiveElement.focus === 'function'
      ? lastActiveElement
      : focusTarget)?.focus();
  }

  function updateConsentButton() {
    if (!consentAccept) return;
    const allChecked = consentChecks.length > 0 && consentChecks.every((c) => c.checked);
    consentAccept.disabled = !allChecked;
    consentAccept.classList.toggle('consent-ready', allChecked);
    consentAccept.classList.toggle('consent-disabled', !allChecked);
  }

  function getFocusableInModal() {
    if (!consentModal) return [];
    const nodes = consentModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(nodes).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function onModalKeydown(e) {
    if (!isModalOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      pendingAfterConsent = null;
      closeConsentModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = getFocusableInModal();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ===== Chat / API =====
  function detectPII(text) {
    const t = String(text || '');
    const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phone = /\b(?:\+351\s*)?(?:9\d{2}|2\d{2})\s?\d{3}\s?\d{3}\b/;
    const nif = /\b\d{9}\b/;
    const iban = /\bPT\d{23}\b/i;
    return email.test(t) || phone.test(t) || nif.test(t) || iban.test(t);
  }

  function addMessage(role, content, isLoading = false) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble' + (isLoading ? ' loading' : '');
    bubble.textContent = content;

    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  async function getLegalOpinion(outgoingMessages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: outgoingMessages }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erro ao obter resposta.');
    return data.reply;
  }

  function isClarificationQuestion(text) {
    const s = String(text || '').trim();
    return /^pergunta\s*:/i.test(s) || /\?\s*$/.test(s);
  }

  async function handleQuestion(question) {
    const clean = String(question || '').trim();
    if (!clean) return;

    // Consentimento
    if (!hasConsent()) {
      if (!document.getElementById('consentModal')) {
        localStorage.setItem(CONSENT_KEY, 'true');
      } else {
        pendingAfterConsent = clean;
        openConsentModal();
        return;
      }
    }

    // Bloqueia conversa se já terminou
    if (stage === 'done') {
      addMessage('assistant', 'Para continuar, é necessária consulta com advogado. Clique em "Marcar consulta".');
      lockInput('Para continuar, marque consulta.');
      return;
    }

    if (detectPII(clean)) {
      addMessage('assistant', '⚠️ Remova dados pessoais (nome, morada, NIF, email, telefone) e reformule de forma geral.');
      return;
    }

    chatPanel.hidden = false;
    addMessage('user', clean);

    const loading = addMessage('assistant', 'A analisar (orientação geral)…', true);

    const prefixed = clean;
    const outgoing = [];

    if (stage === 'initial') {
      outgoing.push({ role: 'user', content: prefixed });
    } else if (stage === 'awaiting_clarification') {
      outgoing.push({ role: 'user', content: pendingQuestion });
      outgoing.push({ role: 'user', content: `[Resposta à clarificação] ${prefixed}` });
    }

    try {
      const reply = await getLegalOpinion(outgoing);
      loading.classList.remove('loading');
      loading.textContent = reply;

      if (stage === 'initial' && isClarificationQuestion(reply)) {
        stage = 'awaiting_clarification';
        pendingQuestion = prefixed;
        unlockInput('Responda apenas à pergunta de clarificação (sem dados pessoais)…');
        return;
      }

      stage = 'done';
      lockInput('Para continuar, marque consulta.');
    } catch (err) {
      loading.classList.remove('loading');
      loading.textContent =
        'Não foi possível obter resposta automática. Para análise do caso concreto, marque consulta.';
      stage = 'done';
      lockInput('Para continuar, marque consulta.');
      console.error(err);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ===== Eventos =====
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleQuestion(searchInput.value);
    searchInput.value = '';
  });

  newQuestionBtn?.addEventListener('click', resetFlow);

  // Modal consentimento
  consentChecks.forEach((c) => {
    c.addEventListener('change', updateConsentButton);
    c.addEventListener('click', updateConsentButton);
  });

  consentClose?.addEventListener('click', () => {
    pendingAfterConsent = null;
    closeConsentModal();
  });

  consentCancel?.addEventListener('click', () => {
    pendingAfterConsent = null;
    closeConsentModal();
  });

  consentAccept?.addEventListener('click', async () => {
    const allChecked = consentChecks.length > 0 && consentChecks.every((c) => c.checked);
    if (!allChecked) {
      updateConsentButton();
      return;
    }
    localStorage.setItem(CONSENT_KEY, 'true');
    closeConsentModal();
    if (pendingAfterConsent) {
      const q = pendingAfterConsent;
      pendingAfterConsent = null;
      await handleQuestion(q);
    }
  });

  consentModal?.addEventListener('click', (e) => {
    if (e.target === consentModal) {
      pendingAfterConsent = null;
      closeConsentModal();
    }
  });

  document.getElementById('consentModalCard')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const consentForm = document.getElementById('consentForm');
  consentForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const allChecked = consentChecks.length > 0 && consentChecks.every((c) => c.checked);
    if (!allChecked) return;
    localStorage.setItem(CONSENT_KEY, 'true');
    closeConsentModal();
    if (pendingAfterConsent) {
      const q = pendingAfterConsent;
      pendingAfterConsent = null;
      handleQuestion(q);
    }
  });

  // =============================
  // CONSENT MODAL — FIX DEFINITIVO
  // =============================
  (function consentFix() {
    const KEY = CONSENT_KEY || 'cc_ai_consent_v1';

    function allCheckedNow() {
      const checks = Array.from(document.querySelectorAll('input[data-consent-check]'));
      return checks.length > 0 && checks.every((c) => c.checked);
    }

    document.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('#consentAccept');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      console.log('[Consent] Clique em consentAccept. disabled=', btn.disabled);

      if (btn.disabled) return;

      if (!allCheckedNow()) {
        console.warn('[Consent] Ainda faltam checkboxes.');
        try { updateConsentButton?.(); } catch {}
        return;
      }

      localStorage.setItem(KEY, 'true');
      console.log('[Consent] Gravado em localStorage:', localStorage.getItem(KEY));

      const modal = document.getElementById('consentModal');
      if (modal) {
        modal.hidden = true;
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
      }

      if (typeof pendingAfterConsent !== 'undefined' && pendingAfterConsent) {
        const q = pendingAfterConsent;
        pendingAfterConsent = null;
        console.log('[Consent] A processar pergunta pendente...');
        await handleQuestion(q);
      } else {
        console.log('[Consent] Sem pergunta pendente. Modal fechado.');
      }
    });

    document.addEventListener('change', (e) => {
      if (!e.target?.matches?.('input[data-consent-check]')) return;
      const btn = document.getElementById('consentAccept');
      if (!btn) return;
      btn.disabled = !allCheckedNow();
      console.log('[Consent] Checks alterados. btn.disabled=', btn.disabled);
    });
  })();

  // Newsletter
  const newsletterForm = document.querySelector('.contactos .newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[type="email"]').value;
      if (email) {
        alert('Obrigado! Receberá as nossas atualizações em ' + email);
        newsletterForm.reset();
      }
    });
  }
});
