/**
 * Drag and drop layout: reorder video slots, swap cameras
 */
import { updateRoom } from './firebase.js';

let videoGridEl;
let roomId;
let stageOrder = [];
let onSlotDrop;

function init(opt) {
  videoGridEl = opt.videoGridEl;
  roomId = opt.roomId;
  onSlotDrop = opt.onSlotDrop;
}

function setStageOrder(order) {
  stageOrder = order;
}

function renderSlots(participants, streamMap, layout) {
  if (!videoGridEl) return;
  const count = Math.min(12, Math.max(1, parseInt(layout, 10) || 1));
  videoGridEl.dataset.layout = String(count);
  const slots = [];
  for (let i = 0; i < count; i++) {
    const userId = stageOrder[i] || participants[i]?.id;
    const p = participants.find((x) => x.id === userId);
    const stream = userId ? streamMap.get(userId) : null;
    slots.push({ userId, participant: p, stream });
  }

  videoGridEl.innerHTML = slots.map((s, i) => {
    const label = s.participant ? s.participant.name : 'Empty';
    const stream = s.stream;
    return `
      <div class="video-slot" data-slot-index="${i}" data-user-id="${s.userId || ''}" draggable="true">
        ${stream ? `<video autoplay playsinline data-remote="${s.userId}"></video>` : '<div class="empty-slot">Empty</div>'}
        <span class="slot-label">${escapeHtml(label)}</span>
        <span class="quality-dot"></span>
      </div>
    `;
  }).join('');

  slots.forEach((s, i) => {
    const slotEl = videoGridEl.querySelector(`[data-slot-index="${i}"]`);
    if (!slotEl) return;
    const video = slotEl.querySelector('video');
    if (video && s.stream) {
      video.srcObject = s.stream;
    }
  });

  attachDragListeners();
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function attachDragListeners() {
  if (!videoGridEl) return;
  videoGridEl.querySelectorAll('.video-slot').forEach((el) => {
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);
    el.addEventListener('dragend', onDragEnd);
  });
}

let draggedIndex = null;

function onDragStart(e) {
  const slot = e.target.closest('.video-slot');
  if (!slot) return;
  draggedIndex = parseInt(slot.dataset.slotIndex, 10);
  slot.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(draggedIndex));
}

function onDragOver(e) {
  e.preventDefault();
  const slot = e.target.closest('.video-slot');
  if (slot) slot.classList.add('drag-over');
  e.dataTransfer.dropEffect = 'move';
}

function onDrop(e) {
  e.preventDefault();
  videoGridEl.querySelectorAll('.video-slot').forEach((s) => s.classList.remove('drag-over'));
  const slot = e.target.closest('.video-slot');
  if (!slot || draggedIndex == null) return;
  const targetIndex = parseInt(slot.dataset.slotIndex, 10);
  if (targetIndex === draggedIndex) return;
  const newOrder = [...stageOrder];
  const a = newOrder[draggedIndex];
  const b = newOrder[targetIndex];
  newOrder[draggedIndex] = b;
  newOrder[targetIndex] = a;
  stageOrder = newOrder.filter(Boolean);
  updateRoom(roomId, { stageOrder });
  if (onSlotDrop) onSlotDrop(stageOrder);
}

function onDragEnd(e) {
  const slot = e.target.closest('.video-slot');
  if (slot) slot.classList.remove('dragging');
  videoGridEl.querySelectorAll('.video-slot').forEach((s) => s.classList.remove('drag-over'));
  draggedIndex = null;
}

function setLayout(layoutNumber) {
  if (videoGridEl) videoGridEl.dataset.layout = String(layoutNumber);
}

export { init as initDragLayout, setStageOrder, renderSlots, setLayout };
