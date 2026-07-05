# Segurança e privacidade — formulário de contacto

Documento interno de registo de decisões. Não substitui a [política de privacidade](../politica-de-privacidade.html) nem o aviso legal publicados no sítio.

---

## Web3Forms — plano e restrição por domínio

O formulário de contacto em `contactos.html` envia mensagens através do **[Web3Forms](https://web3forms.com/)**, no **plano gratuito**.

Nesse plano, **a restrição da `access_key` a domínios específicos não está disponível** e **não será contratada** (sem upgrade para plano pago, sem migração para outro fornecedor de formulários e sem backend próprio).

A `access_key` permanece no HTML do cliente, conforme o modelo do serviço. Isto é uma limitação conhecida e **aceite como risco residual proporcional** ao volume e à natureza do contacto inicial (formulário curto, sem anexos, sem dados sensíveis solicitados).

---

## Medidas de mitigação em vigor

| Medida | Implementação |
|--------|----------------|
| Honeypot | Campo `botcheck` invisível, fora da árvore de acessibilidade, incluído no envio |
| Validação | Nativa sem JavaScript; validação acessível com JavaScript (`form.noValidate = true`) |
| Limites de caracteres | Nome, email, telefone, assunto e mensagem com `maxlength` definidos |
| Sem anexos | Não existe upload de ficheiros no formulário |
| Minimização de dados | Telefone opcional; aviso para não enviar documentos ou dados confidenciais extensos |
| Proteção contra duplo envio | Estado `isSubmitting`, botão desativado durante o pedido |
| Monitorização de spam | Revisão periódica das mensagens recebidas via Web3Forms / email do escritório |
| Rotação da chave | Em caso de abuso confirmado, gerar nova `access_key` no painel Web3Forms e atualizar `contactos.html` |

---

## O que não está previsto

- reCAPTCHA, hCaptcha ou Cloudflare Turnstile;
- novo fornecedor de formulários;
- servidor, base de dados ou área de cliente;
- plano pago do Web3Forms solely para restrição por domínio.

Alterações futuras a estes limites devem ser registadas neste documento e refletidas na política de privacidade apenas quando houver mudança material no tratamento de dados.

---

## Referências no repositório

- Formulário: `contactos.html` (`#formContacto`)
- Lógica cliente: `assets/js/main.js` (`initContactForm()`)
- Fallback sem JavaScript: `action` Web3Forms + redirect para `pedido-recebido.html`
- Política publicada: `politica-de-privacidade.html` (secção «Formulário de contacto»)

*Última atualização: julho 2026.*
