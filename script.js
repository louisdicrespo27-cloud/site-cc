// Correia Crespo - Advogados
// Homepage estilo Google + Assistente de IA para pareceres jurídicos

document.addEventListener('DOMContentLoaded', () => {
  // Menu mobile
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

  // API base URL (usa o mesmo host em produção, ou localhost:3000 em dev)
  const API_BASE = window.location.origin;

  // Elementos
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  // Histórico de mensagens para contexto da IA
  let messageHistory = [];

  // Adicionar mensagem ao chat
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

  // Chamar API da IA
  async function getLegalOpinion(question) {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messageHistory.concat([{ role: 'user', content: question }]),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao obter resposta. Tente novamente.');
    }

    const data = await response.json();
    return data.reply;
  }

  // Processar questão e mostrar resposta
  async function handleQuestion(question) {
    question = question.trim();
    if (!question) return;

    // Adicionar mensagem do utilizador
    addMessage('user', question);
    messageHistory.push({ role: 'user', content: question });

    // Mostrar loading
    const loadingBubble = addMessage('assistant', 'A analisar a sua questão...', true);

    try {
      const reply = await getLegalOpinion(question);
      messageHistory.push({ role: 'assistant', content: reply });
      loadingBubble.classList.remove('loading');
      loadingBubble.textContent = reply;
    } catch (err) {
      loadingBubble.classList.remove('loading');
      loadingBubble.innerHTML = `Não foi possível obter um parecer automático. Por favor, contacte-nos diretamente: <a href="mailto:correiacrespo-67709L@adv.oa.pt">correiacrespo-67709L@adv.oa.pt</a> ou telefone 914 376 903.`;
      loadingBubble.querySelector('a').addEventListener('click', (e) => e.stopPropagation());
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Mostrar painel de chat e processar primeira questão
  function showChatAndProcess(question) {
    chatPanel.hidden = false;
    searchInput.value = '';
    handleQuestion(question);
  }

  // Formulário de pesquisa (barra principal)
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = searchInput.value.trim();
      if (question) showChatAndProcess(question);
    });
  }

  // Formulário de chat (perguntas de seguimento)
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = chatInput.value.trim();
      if (question) {
        chatInput.value = '';
        handleQuestion(question);
      }
    });
  }
});
