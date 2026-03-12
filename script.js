// Corporate-law landing + limited triage assistant
document.addEventListener('DOMContentLoaded', () => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBaseAttr = document.body.getAttribute('data-api-base')?.trim() || '';
  const API_BASE = apiBaseAttr || (isLocalhost ? window.location.origin : '');
  // ===== Year =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ===== Mobile nav =====
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }

  // ===== Reveal on scroll =====
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // ===== Counters (simple) =====
  const counterEls = Array.from(document.querySelectorAll('[data-counter]'));
  const counterIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = Number(el.getAttribute('data-counter') || '0');
        animateCounter(el, target);
        counterIo.unobserve(el);
      });
    },
    { threshold: 0.35 }
  );
  counterEls.forEach((el) => counterIo.observe(el));

  function animateCounter(el, target) {
    const duration = 900;
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (target - from) * eased);
      el.textContent = String(val);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ===== Accordion =====
  const accordion = document.querySelector('[data-accordion]');
  if (accordion) {
    const items = Array.from(accordion.querySelectorAll('.acc-item'));
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        const expanded = btn.getAttribute('aria-expanded') === 'true';

        // Close all
        items.forEach((b) => {
          b.setAttribute('aria-expanded', 'false');
          const p = b.nextElementSibling;
          if (p) p.hidden = true;
          const icon = b.querySelector('.acc-icon');
          if (icon) icon.textContent = '+';
        });

        // Toggle current
        if (!expanded) {
          btn.setAttribute('aria-expanded', 'true');
          if (panel) panel.hidden = false;
          const icon = btn.querySelector('.acc-icon');
          if (icon) icon.textContent = '–';
        }
      });
    });
  }

  // ===== Card tilt (subtle, pointer-based) =====
  const tiltCards = Array.from(document.querySelectorAll('[data-tilt]'));
  tiltCards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = (-py * 4).toFixed(2);
      const ry = (px * 6).toFixed(2);
      card.style.transform = `translateY(-3px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  // ===== Triage assistant (single input, limited flow) =====
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  const whatsappHeader = document.getElementById('whatsappHeader');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const whatsappBtn2 = document.getElementById('whatsappBtn2');
  const whatsappContact = document.getElementById('whatsappContact');

  // Consent modal
  const CONSENT_KEY = 'cc_ai_consent_v2';
  const consentModal = document.getElementById('consentModal');
  const consentClose = document.getElementById('consentClose');
  const consentCancel = document.getElementById('consentCancel');
  const consentAccept = document.getElementById('consentAccept');
  const consentChecks = Array.from(document.querySelectorAll('input[data-consent-check]'));

  // WhatsApp number (international format, no +)
  const WHATSAPP_NUMBER = '351914376903';

  // Flow control: pequena conversa com limite de interações
  const MAX_TURNS = 5; // número máximo de mensagens do utilizador por sessão
  let turnCount = 0;
  let conversation = []; // { role: 'user' | 'assistant', content: string }
  let lastUserQuestion = '';

  function hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  }

  function openConsentModal() {
    if (!consentModal) return;
    consentModal.hidden = false;
    consentModal.style.display = 'flex';
    document.body.classList.add('modal-open');

    // reset checks
    consentChecks.forEach((c) => (c.checked = false));
    updateConsentButton();

    // focus first checkbox
    const first = consentChecks[0];
    first?.focus();
  }

  function closeConsentModal() {
    if (!consentModal) return;

    // move focus out before hiding
    searchInput?.focus();

    consentModal.hidden = true;
    consentModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function updateConsentButton() {
    if (!consentAccept) return;
    const all = consentChecks.length > 0 && consentChecks.every((c) => c.checked);
    consentAccept.disabled = !all;
  }

  consentChecks.forEach((c) => c.addEventListener('change', updateConsentButton));

  consentClose?.addEventListener('click', () => closeConsentModal());
  consentCancel?.addEventListener('click', () => closeConsentModal());

  consentModal?.addEventListener('click', (e) => {
    if (e.target === consentModal) closeConsentModal();
  });

  const ANALYTICS_CONSENT_KEY = 'cc_analytics_consent';
  const consentAnalyticsEl = document.getElementById('consentAnalytics');

  consentAccept?.addEventListener('click', () => {
    if (consentAccept.disabled) return;
    localStorage.setItem(CONSENT_KEY, 'true');
    if (consentAnalyticsEl?.checked) localStorage.setItem(ANALYTICS_CONSENT_KEY, 'true');
    else localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    closeConsentModal();
    if (consentAnalyticsEl?.checked) loadAnalytics();
    searchInput?.focus();
  });

  // ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!consentModal || consentModal.hidden) return;
    closeConsentModal();
  });

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

  function detectPII(text) {
    const t = String(text || '');
    const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phone = /\b(?:\+351\s*)?(?:9\d{2}|2\d{2})\s?\d{3}\s?\d{3}\b/;
    const nif = /\b\d{9}\b/;
    const iban = /\bPT\d{23}\b/i;
    return email.test(t) || phone.test(t) || nif.test(t) || iban.test(t);
  }

  function lockInput(message) {
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.value = '';
      searchInput.placeholder = message || 'Para continuar, marque consulta.';
    }
    if (chatInput) {
      chatInput.disabled = true;
      chatInput.value = '';
      chatInput.placeholder = message || 'Para continuar, marque consulta.';
    }
  }

  function unlockInput(message) {
    const target =
      chatPanel && !chatPanel.hidden && chatInput
        ? chatInput
        : searchInput;
    if (!target) return;
    target.disabled = false;
    target.placeholder = message || 'Descreva a questão (sem dados pessoais)…';
    target.focus();
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      // scrollIntoView not critical; ignore errors
    }
  }

  async function getReply(messages) {
    const base = API_BASE;
    if (!base) {
      throw new Error('Assistente indisponível neste ambiente.');
    }

    const res = await fetch(`${base.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro ao obter resposta.');
    return data.reply;
  }

  function buildStaticTriageReply(question) {
    const q = (question || '').toLowerCase();

    const blocks = [];
    let titulo = 'Isto pode exigir advogado?';
    let risco = 'Talvez — depende dos factos e documentos envolvidos.';
    const bullets = [];
    let proximo = 'Próximo passo recomendado: marcar consulta para análise detalhada da situação e dos documentos.';

    if (q.includes('contrato') || q.includes('cláusula') || q.includes('prestação de serviços')) {
      risco = 'Sim — contratos podem criar obrigações e riscos relevantes para a empresa ou para si.';
      bullets.push(
        'Tipo de contrato, partes envolvidas e equilíbrio das cláusulas.',
        'Riscos de incumprimento, penalizações e prazos.',
        'Necessidade de ajustar ou negociar termos antes de assinar.'
      );
    } else if (q.includes('socied') || q.includes('sócio') || q.includes('quotas') || q.includes('ações')) {
      risco = 'Sim — questões societárias impactam a governação e os direitos dos sócios.';
      bullets.push(
        'Direitos e deveres de cada sócio, e forma de decisão.',
        'Registo de alterações (quotas, administração, sede, objeto).',
        'Prevenção de conflitos futuros entre sócios.'
      );
    } else if (q.includes('divórcio') || q.includes('guarda') || q.includes('regula') || q.includes('responsabilidades parentais')) {
      risco = 'Sim — matérias de família têm impacto duradouro em pessoas e património.';
      bullets.push(
        'Regime de responsabilidades parentais e convivência com os filhos.',
        'Partilha de bens e eventual pensão de alimentos.',
        'Proteção do interesse superior da criança e segurança jurídica.'
      );
    } else if (q.includes('insolven') || q.includes('dívida') || q.includes('recuperação de crédito') || q.includes('injunç')) {
      risco = 'Sim — situações de incumprimento podem exigir uma estratégia jurídica cuidada.';
      bullets.push(
        'Verificação de títulos, prazos e meios de cobrança.',
        'Avaliação de vias amigáveis versus processo judicial.',
        'Possibilidade de planos de pagamento, injunções ou ações executivas.'
      );
    } else {
      // Pergunta não parece ter ligação clara ao direito: não inventar problemas
      const disclaimer =
        'Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta.';

      return [
        '**Isto pode exigir advogado?** Pela forma como a pergunta está colocada, não parece descrever uma questão jurídica.',
        '**O que pode estar em causa:**',
        '- Se houver um contrato, um prejuízo concreto, uma dívida ou um processo associado, então já pode existir relevância jurídica.',
        '- Caso contrário, trata-se apenas de uma situação de vida corrente, sem enquadramento legal óbvio.',
        '',
        'Se houver algum elemento jurídico (contrato assinado, carta de tribunal, injunção, dívida, conflito com entidade pública ou empresa), descreva isso de forma geral, sem dados pessoais.',
        '',
        `—\nℹ️ ${disclaimer}`,
      ].join('\n');
    }

    const disclaimer =
      'Informação geral e não vinculativa; não constitui parecer jurídico. Para análise do caso concreto, marque consulta.';

    blocks.push(`**${titulo}** ${risco}`);
    blocks.push('**O que pode estar em causa (de forma geral):**');
    bullets.forEach((b) => blocks.push(`- ${b}`));
    blocks.push(`**${proximo}**`);
    blocks.push(`\n—\nℹ️ ${disclaimer}`);

    return blocks.join('\n');
  }

  async function handleSubmit(raw) {
    const clean = String(raw || '').trim();
    if (!clean) return;

    if (!hasConsent()) {
      openConsentModal();
      return;
    }

    if (detectPII(clean)) {
      chatPanel.hidden = false;
      addMessage('assistant', '⚠️ Remova dados pessoais (nome, morada, NIF, email, telefone) e reformule de forma geral.');
      return;
    }

    // Limite de trocas para manter a triagem curta
    if (turnCount >= MAX_TURNS) {
      chatPanel.hidden = false;
      addMessage('assistant', 'Para continuar, é necessária consulta com advogado. Clique em “Marcar consulta” ou envie WhatsApp.');
      lockInput('Para continuar, marque consulta.');
      return;
    }

    lastUserQuestion = clean;

    chatPanel.hidden = false;
    addMessage('user', clean);
    const loading = addMessage('assistant', 'A analisar (informação geral)…', true);

    // Regista pergunta do utilizador na conversa
    conversation.push({ role: 'user', content: clean });

    // Se não houver backend configurado (ex.: GitHub Pages), usar triagem estática no frontend
    if (!API_BASE) {
      const reply = buildStaticTriageReply(clean);
      loading.classList.remove('loading');
      loading.textContent = reply;
      conversation.push({ role: 'assistant', content: reply });
      turnCount += 1;
      if (turnCount >= MAX_TURNS) {
        lockInput('Para continuar, marque consulta.');
      } else {
        unlockInput('Pode colocar outra questão geral (sem dados pessoais)…');
      }
      return;
    }

    try {
      const reply = await getReply(conversation);
      loading.classList.remove('loading');
      loading.textContent = reply;
      conversation.push({ role: 'assistant', content: reply });

      turnCount += 1;
      if (turnCount >= MAX_TURNS) {
        lockInput('Para continuar, marque consulta.');
      } else {
        unlockInput('Pode colocar outra questão geral (sem dados pessoais)…');
      }
    } catch (err) {
      loading.classList.remove('loading');
      loading.textContent = 'Serviço temporariamente indisponível. Para análise do caso concreto, marque consulta.';
      lockInput('Para continuar, marque consulta.');
      console.error(err);
    }
  }

  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(searchInput?.value);
    if (searchInput) searchInput.value = '';
    blurChatInput();
  });

  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(chatInput?.value);
    if (chatInput) chatInput.value = '';
    blurChatInput();
  });

  // ===== WhatsApp links =====
  function buildWhatsAppUrl() {
    const base = 'https://wa.me/' + WHATSAPP_NUMBER;

    const msg =
      'Olá. Gostaria de marcar consulta (Direito Empresarial).\n\n' +
      'Resumo da questão: ' + (lastUserQuestion || '[não preenchido]') + '\n\n' +
      'Melhor horário: \n' +
      'Preferência de contacto (WhatsApp/telefone/email): \n';

    return base + '?text=' + encodeURIComponent(msg);
  }

  function trackConversion(action, label) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', action, { event_category: 'engagement', event_label: label || '' });
  }

  function attachWhatsApp(el) {
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      trackConversion('contact_whatsapp', 'whatsapp_click');
      window.open(buildWhatsAppUrl(), '_blank', 'noopener,noreferrer');
    });
  }

  attachWhatsApp(whatsappHeader);
  attachWhatsApp(whatsappBtn);
  attachWhatsApp(whatsappBtn2);
  attachWhatsApp(whatsappContact);

  // Contact links (email/tel) — conversões
  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach((a) => {
    a.addEventListener('click', () => {
      const type = a.getAttribute('href').startsWith('mailto:') ? 'email' : 'tel';
      trackConversion('contact_click', type);
    });
  });

  // ===== Analytics (RGPD: só carrega com consentimento) =====
  function loadAnalytics() {
    const gaId = document.body.getAttribute('data-ga-id')?.trim();
    if (!gaId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
    document.head.appendChild(s);
  }
  if (localStorage.getItem('cc_analytics_consent') === 'true') loadAnalytics();
});

// --- Mobile fix: desfazer zoom ao terminar/enviar ---
function blurChatInput() {
  const el = document.querySelector('#chatInput, input[type="text"], textarea');
  if (el) el.blur();
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
}

// desfoca quando o utilizador toca fora do input (ajuda a "voltar ao normal")
document.addEventListener('touchend', (e) => {
  const input = document.querySelector('#chatInput, input[type="text"], textarea');
  if (!input) return;
  if (!input.contains(e.target)) blurChatInput();
}, { passive: true });

// --- Chat Notice: abrir só quando o utilizador interage com o input ---
function initChatNotice() {
  const KEY = "cc_chat_notice_ack_v2";
  const notice = document.getElementById("chatNotice");
  const backdrop = document.getElementById("chatNoticeBackdrop");
  const okBtn = document.getElementById("chatNoticeOk");
  const input = document.getElementById("searchInput") || document.querySelector("input[type='text'], textarea");

  if (!notice || !backdrop || !okBtn || !input) return;

  function openNotice() {
    backdrop.hidden = false;
    notice.hidden = false;
    backdrop.style.display = "";
    notice.style.display = "";
  }

  function closeNotice() {
    backdrop.hidden = true;
    notice.hidden = true;
    backdrop.style.display = "none";
    notice.style.display = "none";
    try { localStorage.setItem(KEY, "1"); } catch (_) {}
  }

  function alreadySeen() {
    try { return localStorage.getItem(KEY) === "1"; } catch (_) { return false; }
  }

  function maybeOpenOnFirstInteraction() {
    if (alreadySeen()) return;
    openNotice();
    input.removeEventListener("focus", maybeOpenOnFirstInteraction);
    input.removeEventListener("touchstart", maybeOpenOnFirstInteraction);
    input.removeEventListener("click", maybeOpenOnFirstInteraction);
  }

  input.addEventListener("focus", maybeOpenOnFirstInteraction, { passive: true });
  input.addEventListener("touchstart", maybeOpenOnFirstInteraction, { passive: true });
  input.addEventListener("click", maybeOpenOnFirstInteraction, { passive: true });

  okBtn.addEventListener("click", closeNotice);
  backdrop.addEventListener("click", closeNotice);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatNotice);
} else {
  initChatNotice();
}
