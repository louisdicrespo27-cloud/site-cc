// Correia Crespo - Advogados
// Homepage estilo Google + Assistente de IA para triagem/orientação jurídica (limitada)

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
  const MAX_HISTORY = 10; // mensagens (user+assistant) enviadas ao servidor
  const CONSENT_KEY = 'cc_ai_consent_v1';

  // ===== Elementos =====
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const topicSelect = document.getElementById('topicSelect');

  // Modal consentimento
  const consentModal = document.getElementById('consentModal');
  const consentClose = document.getElementById('consentClose');
  const consentCancel = document.getElementById('consentCancel');
  const consentAccept = document.getElementById('consentAccept');
  const consentChecks = Array.from(
    document.querySelectorAll('input[data-consent-check]')
  );

  // ===== Estado =====
  let messageHistory = []; // histórico local (sem system)
  let pendingQuestion = null;
  let focusBeforeModal = null;

  // ===== Utilitários =====
  function hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  }

  function openConsentModal() {
    if (!consentModal) return;
    focusBeforeModal = document.activeElement;
    consentModal.hidden = false;
    consentModal.removeAttribute('hidden');
    consentModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    consentChecks.forEach((c) => { c.checked = false; });
    updateConsentButton();
    setTimeout(() => {
      const firstCheck = consentChecks[0];
      if (firstCheck) firstCheck.focus();
      else consentClose?.focus();
    }, 0);
  }

  function closeConsentModal() {
    if (!consentModal) return;
    const toFocus = focusBeforeModal || searchInput || document.querySelector('a, button');
    if (toFocus && toFocus !== consentModal && typeof toFocus.focus === 'function') {
      toFocus.focus();
    }
    setTimeout(() => {
      consentModal.hidden = true;
      consentModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      focusBeforeModal = null;
    }, 0);
  }

  function updateConsentButton() {
    if (!consentAccept) return;
    const allChecked = consentChecks.length > 0 && consentChecks.every((c) => c.checked);
    consentAccept.classList.toggle('consent-ready', allChecked);
    consentAccept.classList.toggle('consent-disabled', !allChecked);
  }

  function detectPII(text) {
    const t = String(text || '');
    const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phone = /\b(?:\+351\s*)?(?:9\d{2}|2\d{2})\s?\d{3}\s?\d{3}\b/;
    const nif = /\b\d{9}\b/; // heurístico
    const iban = /\bPT\d{23}\b/i;
    return email.test(t) || phone.test(t) || nif.test(t) || iban.test(t);
  }

  function getTopicPrefix() {
    const t = topicSelect?.value?.trim();
    if (!t || t === 'Sem categoria') return '';
    return `[Área: ${t}] `;
  }

  function getTrimmedHistory() {
    return messageHistory.slice(-MAX_HISTORY);
  }

  // ===== UI Chat =====
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
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: outgoingMessages }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao obter resposta. Tente novamente.');
    }

    const data = await response.json();
    return data.reply;
  }

  async function handleQuestion(question) {
    const clean = String(question || '').trim();
    if (!clean) return;

    if (!hasConsent()) {
      if (!document.getElementById('consentModal')) {
        localStorage.setItem(CONSENT_KEY, 'true');
      } else {
        pendingQuestion = clean;
        openConsentModal();
        return;
      }
    }

    if (detectPII(clean)) {
      addMessage(
        'assistant',
        '⚠️ Por favor, remova dados pessoais identificativos (ex.: nomes, moradas, NIF, email, telefone) e reformule a questão de forma geral.'
      );
      return;
    }

    // Mostrar painel de chat
    chatPanel.hidden = false;

    // UI: mensagem do utilizador
    addMessage('user', clean);

    const loadingBubble = addMessage(
      'assistant',
      'A analisar a sua questão (orientação geral)…',
      true
    );

    const prefixedQuestion = getTopicPrefix() + clean;
    const outgoing = getTrimmedHistory().concat([
      { role: 'user', content: prefixedQuestion },
    ]);

    try {
      const reply = await getLegalOpinion(outgoing);

      // Atualizar histórico local APÓS sucesso
      messageHistory.push({ role: 'user', content: prefixedQuestion });
      messageHistory.push({ role: 'assistant', content: reply });

      loadingBubble.classList.remove('loading');
      loadingBubble.textContent = reply;
    } catch (err) {
      loadingBubble.classList.remove('loading');
      loadingBubble.innerHTML =
        'Não foi possível obter uma resposta automática. Por favor, contacte-nos diretamente: ' +
        '<a href="mailto:correiacrespo-67709L@adv.oa.pt">correiacrespo-67709L@adv.oa.pt</a> ou telefone 914 376 903.';
      loadingBubble
        .querySelector('a')
        ?.addEventListener('click', (e) => e.stopPropagation());
      console.error(err);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ===== Eventos =====
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleQuestion(searchInput.value);
      searchInput.value = '';
    });
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleQuestion(chatInput.value);
      chatInput.value = '';
    });
  }

  // Modal consentimento
  consentChecks.forEach((c) => {
    c.addEventListener('change', updateConsentButton);
    c.addEventListener('click', updateConsentButton);
  });

  consentClose?.addEventListener('click', () => {
    pendingQuestion = null;
    closeConsentModal();
  });

  consentCancel?.addEventListener('click', () => {
    pendingQuestion = null;
    closeConsentModal();
  });

  consentModal?.addEventListener('click', (e) => {
    if (e.target === consentModal) {
      pendingQuestion = null;
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
    if (pendingQuestion) {
      const q = pendingQuestion;
      pendingQuestion = null;
      handleQuestion(q);
    }
  });

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
