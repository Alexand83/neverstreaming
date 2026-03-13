/**
 * Real-time chat via Firestore
 */
import { addChatMessage, subscribeChat } from './firebase.js';

let roomId;
let localUserId;
let localName;

function init(opt) {
  roomId = opt.roomId;
  localUserId = opt.localUserId;
  localName = opt.localName || 'Guest';
}

function setLocalName(name) {
  localName = (name || 'Guest').trim().slice(0, 32);
}

function start(container) {
  const messagesEl = container.querySelector('.chat-messages');
  const input = container.querySelector('#chat-input');
  const sendBtn = container.querySelector('#btn-send-chat');

  const unsub = subscribeChat(roomId, (list) => {
    messagesEl.innerHTML = list.map((m) => {
      const time = m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleTimeString() : '';
      return `<div class="chat-msg"><span class="sender">${escapeHtml(m.name || 'Guest')}</span><span class="time">${time}</span>: ${escapeHtml(m.text || '')}</div>`;
    }).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  function send() {
    const text = (input.value || '').trim();
    if (!text) return;
    addChatMessage(roomId, localUserId, localName, text);
    input.value = '';
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  return unsub;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export { init as initChat, start as startChat, setLocalName };
