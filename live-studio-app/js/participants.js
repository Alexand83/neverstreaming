/**
 * Participants list (backstage + on stage), host controls: add to stage, mute, remove
 */
import { setParticipant, updateRoom } from './firebase.js';
import { removePeer, createOfferFor } from './webrtc.js';

let roomId;
let localUserId;
let isHost;
let onStageOrder = [];
let participantsList = [];

function init(opt) {
  roomId = opt.roomId;
  localUserId = opt.localUserId;
  isHost = opt.isHost;
}

function setParticipants(list) {
  participantsList = list;
}

function setStageOrder(order) {
  onStageOrder = order;
}

function renderBackstageList(container, webrtcCreateOffer) {
  if (!container) return;
  const backstage = participantsList.filter((p) => p.status === 'backstage' && p.id !== localUserId);
  container.innerHTML = backstage.map((p) => `
    <div class="backstage-item" data-user-id="${p.id}">
      <div class="thumb">
        <video autoplay playsinline muted data-remote-preview="${p.id}" width="48" height="36"></video>
      </div>
      <div class="info">
        <span class="name">${escapeHtml(p.name || 'Guest')}</span>
        <span class="status">Waiting</span>
      </div>
      ${isHost ? `
      <div class="actions">
        <button class="add" data-action="add" title="Add to stage">+ Stage</button>
        <button class="remove" data-action="remove" title="Remove">Remove</button>
      </div>
      ` : ''}
    </div>
  `).join('') || '<p class="text-muted">No one in backstage</p>';

  container.querySelectorAll('[data-action="add"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.closest('.backstage-item').dataset.userId;
      addToStage(uid, webrtcCreateOffer);
    });
  });
  container.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.closest('.backstage-item').dataset.userId;
      removeFromRoom(uid);
    });
  });
}

function renderBackstageStrip(container) {
  if (!container) return;
  const backstage = participantsList.filter((p) => p.status === 'backstage' && p.id !== localUserId);
  container.innerHTML = backstage.length
    ? backstage.map((p) => `
        <div class="backstage-strip-item" data-user-id="${p.id}">
          <video autoplay playsinline muted data-remote-preview="${p.id}"></video>
          <span class="strip-name">${escapeHtml(p.name || 'Guest')}</span>
        </div>
      `).join('')
    : '<div class="backstage-strip-empty">Nessuno in backstage</div>';
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function addToStage(userId, webrtcCreateOffer) {
  const onStage = participantsList.filter((p) => p.status === 'on_stage');
  if (onStage.length >= 12) return;
  await setParticipant(roomId, userId, { status: 'on_stage', order: onStage.length });
  const newOrder = [...onStageOrder.filter((id) => id !== userId), userId];
  await updateRoom(roomId, { stageOrder: newOrder });
  if (webrtcCreateOffer) webrtcCreateOffer(userId);
}

async function removeFromStage(userId) {
  await setParticipant(roomId, userId, { status: 'backstage' });
  const newOrder = onStageOrder.filter((id) => id !== userId);
  await updateRoom(roomId, { stageOrder: newOrder });
  removePeer(userId);
}

async function removeFromRoom(userId) {
  await setParticipant(roomId, userId, { status: 'left' });
  const newOrder = onStageOrder.filter((id) => id !== userId);
  await updateRoom(roomId, { stageOrder: newOrder });
  removePeer(userId);
}

async function forceMute(userId) {
  await setParticipant(roomId, userId, { mic: false });
}

async function forceDisableCamera(userId) {
  await setParticipant(roomId, userId, { cam: false });
}

function getOnStageParticipants() {
  const active = participantsList.filter((p) => p.status === 'on_stage');
  const order = onStageOrder.length ? onStageOrder : active.map((p) => p.id);
  return order.map((id) => participantsList.find((p) => p.id === id)).filter((p) => p && p.status === 'on_stage');
}

export {
  init as initParticipants,
  setParticipants,
  setStageOrder,
  renderBackstageList,
  renderBackstageStrip,
  addToStage,
  removeFromStage,
  removeFromRoom,
  forceMute,
  forceDisableCamera,
  getOnStageParticipants
};
