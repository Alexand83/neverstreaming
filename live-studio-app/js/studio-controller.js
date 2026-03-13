/**
 * Studio page controller: room init, WebRTC signaling, layout, scenes, local controls
 */
import {
  getRoom,
  subscribeRoom,
  subscribeParticipants,
  updateRoom,
  setParticipant,
  addSignalingMessage,
  subscribeSignalingBetween,
  ensureAuth
} from './firebase.js';
import {
  getLocalStream,
  getLocalStreamRef,
  getLocalVideoTrack,
  getDevices,
  setCallbacks,
  setContext,
  createOfferFor,
  handleOffer,
  handleAnswer,
  handleIce,
  removePeer,
  replaceTrack,
  toggleLocalTrack,
  getConnectionQuality
} from './webrtc.js';
import {
  initParticipants,
  setParticipants,
  setStageOrder as setParticipantsStageOrder,
  renderBackstageList,
  getOnStageParticipants
} from './participants.js';
import { initChat, startChat, setLocalName } from './chat.js';
import { initDragLayout, setStageOrder as setDragStageOrder, renderSlots, setLayout } from './drag-layout.js';
import { setElements as setScreenShareElements, startScreenShare, stopScreenShare } from './screen-share.js';
import * as recording from './recording.js';
import * as virtualBackground from './virtual-background.js';

const urlParams = new URLSearchParams(location.search);
const roomId = urlParams.get('room');
const isHost = urlParams.get('host') === '1';

let localUserId;
let localName;
let roomData = {};
let participantsList = [];
const remoteStreams = new Map();
const signalingUnsubs = new Map();
const LAYOUTS = [1, 2, 3, 4, 6, 9, 12];
const SCENES = [
  { id: 'default', name: 'Default' },
  { id: 'host_only', name: 'Host only' },
  { id: 'interview', name: 'Interview' },
  { id: 'panel', name: 'Panel' },
  { id: 'screen_share', name: 'Screen share' }
];

function getEl(id) {
  return document.getElementById(id);
}

async function main() {
  if (!roomId) {
    location.href = 'index.html';
    return;
  }

  localUserId = sessionStorage.getItem('liveStudio_userId') || (await ensureAuth());
  localName = sessionStorage.getItem('liveStudio_displayName') || 'Guest';
  if (!localUserId) {
    alert('Auth required');
    location.href = 'join.html';
    return;
  }

  getEl('room-badge').textContent = roomId;
  getEl('connection-status').textContent = 'Connecting…';

  function attachBackstageStreams() {
    const list = getEl('backstage-list');
    if (!list) return;
    list.querySelectorAll('[data-remote-preview]').forEach((video) => {
      const userId = video.getAttribute('data-remote-preview');
      const stream = remoteStreams.get(userId);
      if (stream) {
        video.srcObject = stream;
        video.muted = true;
      }
    });
  }

  setCallbacks(
    (userId, stream) => {
      remoteStreams.set(userId, stream);
      refreshVideoGrid();
      attachBackstageStreams();
    },
    (userId) => { remoteStreams.delete(userId); refreshVideoGrid(); }
  );

  const sendSignaling = (remoteId, type, payload) => {
    addSignalingMessage(roomId, localUserId, remoteId, type, payload);
  };
  setContext(localUserId, roomId, sendSignaling);

  const room = await getRoom(roomId);
  if (!room) {
    getEl('connection-status').textContent = 'Room not found';
    return;
  }

  roomData = room;
  const stageOrder = room.stageOrder || [];
  setParticipantsStageOrder(stageOrder);
  setDragStageOrder(stageOrder);

  await setParticipant(roomId, localUserId, {
    name: localName,
    role: isHost ? 'host' : 'guest',
    status: isHost ? 'on_stage' : 'backstage',
    mic: true,
    cam: true
  });

  try {
    const stream = await getLocalStream(null, null);
    const localVideoSlot = document.querySelector('[data-local-preview]');
    if (localVideoSlot) localVideoSlot.srcObject = stream;
    virtualBackground.setInputStream(stream);
  } catch (e) {
    console.warn('getUserMedia failed:', e);
  }

  recording.setStageElement(getEl('video-grid'));

  subscribeRoom(roomId, (data) => {
    roomData = data || {};
    const order = roomData.stageOrder || [];
    setParticipantsStageOrder(order);
    setDragStageOrder(order);
    const layout = roomData.layout || 1;
    setLayout(layout);
    const grid = getEl('video-grid');
    if (grid) grid.dataset.layout = String(layout);
    refreshVideoGrid();
    renderSceneButtons();
  });

  subscribeParticipants(roomId, (list) => {
    participantsList = list;
    setParticipants(list);
    setParticipantsStageOrder(roomData.stageOrder || []);
    renderBackstageList(getEl('backstage-list'), (uid) => createOfferFor(uid));

    const onStageCount = list.filter((p) => p.status === 'on_stage').length;
    const autoLayout = onStageCount <= 1 ? 1 : onStageCount <= 2 ? 2 : onStageCount <= 3 ? 3 : onStageCount <= 4 ? 4 : onStageCount <= 6 ? 6 : onStageCount <= 9 ? 9 : 12;
    if (isHost && onStageCount > 0 && roomData.layout !== autoLayout) {
      updateRoom(roomId, { layout: autoLayout });
    }

    list.filter((p) => p.id !== localUserId).forEach((p) => {
      createOfferFor(p.id);
    });
    attachBackstageStreams();

    list.filter((p) => p.id !== localUserId).forEach((p) => {
      if (signalingUnsubs.has(p.id)) return;
      const unsub = subscribeSignalingBetween(roomId, localUserId, p.id, (msg) => {
        if (msg.from === localUserId) return;
        if (msg.type === 'offer') handleOffer(msg.from, msg.payload);
        if (msg.type === 'answer') handleAnswer(msg.from, msg.payload);
        if (msg.type === 'ice') handleIce(msg.from, msg.payload);
      });
      signalingUnsubs.set(p.id, unsub);
    });

    refreshVideoGrid();
    attachBackstageStreams();
  });

  initParticipants({ roomId, localUserId, isHost });
  initDragLayout({
    videoGridEl: getEl('video-grid'),
    roomId,
    onSlotDrop: (order) => { setDragStageOrder(order); refreshVideoGrid(); }
  });

  initChat({ roomId, localUserId, localName });
  startChat(getEl('chat-container'));

  setScreenShareElements(getEl('screen-share-video'), getEl('screen-share-overlay'));

  getEl('btn-toggle-cam').addEventListener('click', () => {
    const stream = getLocalStreamRef();
    const enabled = stream?.getVideoTracks()[0]?.enabled ?? true;
    toggleLocalTrack('video', !enabled);
    setParticipant(roomId, localUserId, { cam: !enabled });
    getEl('btn-toggle-cam').classList.toggle('off', enabled);
  });
  getEl('btn-toggle-mic').addEventListener('click', () => {
    const stream = getLocalStreamRef();
    const enabled = stream?.getAudioTracks()[0]?.enabled ?? true;
    toggleLocalTrack('audio', !enabled);
    setParticipant(roomId, localUserId, { mic: !enabled });
    getEl('btn-toggle-mic').classList.toggle('off', enabled);
  });
  getEl('btn-screen-share').addEventListener('click', async () => {
    const overlay = getEl('screen-share-overlay');
    if (overlay.classList.contains('hidden')) {
      await startScreenShare();
      getEl('btn-screen-share').classList.add('active');
    } else {
      stopScreenShare();
      getEl('btn-screen-share').classList.remove('active');
    }
  });

  getEl('btn-record').addEventListener('click', async () => {
    if (recording.isRecording()) {
      recording.stopRecording();
      recording.downloadRecording();
      getEl('btn-record').classList.remove('recording');
      getEl('btn-record').textContent = '⏺ Record';
    } else {
      const started = recording.startRecording();
      if (started) {
        getEl('btn-record').classList.add('recording');
        getEl('btn-record').textContent = '⏹ Stop';
      }
    }
  });

  getEl('vb-select').addEventListener('change', async (e) => {
    const value = e.target.value;
    const localStreamRef = getLocalStreamRef();
    if (!localStreamRef) return;
    if (value === 'none') {
      await virtualBackground.stop();
      const orig = getLocalVideoTrack();
      if (orig) replaceTrack('video', orig);
      getEl('vb-file').value = '';
      return;
    }
    if (value === 'blur') {
      virtualBackground.setInputStream(localStreamRef);
      const out = await virtualBackground.setMode('blur');
      if (out) {
        const track = virtualBackground.getOutputVideoTrack();
        if (track) replaceTrack('video', track);
      }
      return;
    }
    if (value === 'image') {
      getEl('vb-file').click();
    }
  });

  getEl('vb-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const localStreamRef = getLocalStreamRef();
    if (!localStreamRef) return;
    const imageUrl = URL.createObjectURL(file);
    virtualBackground.setInputStream(localStreamRef);
    const out = await virtualBackground.setMode('image', { imageUrl });
    if (out) {
      const track = virtualBackground.getOutputVideoTrack();
      if (track) replaceTrack('video', track);
    }
    getEl('vb-select').value = 'image';
  });

  async function populateSettingsPanel() {
    const nickEl = getEl('settings-nickname');
    const camEl = getEl('settings-camera');
    const micEl = getEl('settings-microphone');
    if (nickEl) nickEl.value = localName || '';
    const { cameras, microphones } = await getDevices();
    if (camEl) {
      camEl.innerHTML = cameras.map((c) => `<option value="${c.deviceId}">${c.label || 'Webcam'}</option>`).join('');
      const stream = getLocalStreamRef();
      const curCam = stream && stream.getVideoTracks()[0] && stream.getVideoTracks()[0].getSettings().deviceId;
      if (curCam) camEl.value = curCam;
    }
    if (micEl) {
      micEl.innerHTML = microphones.map((m) => `<option value="${m.deviceId}">${m.label || 'Microfono'}</option>`).join('');
      const stream = getLocalStreamRef();
      const curMic = stream && stream.getAudioTracks()[0] && stream.getAudioTracks()[0].getSettings().deviceId;
      if (curMic) micEl.value = curMic;
    }
  }

  getEl('panel-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;
    const panelId = tab.dataset.panel;
    if (panelId === 'settings') populateSettingsPanel();
  });

  getEl('settings-apply').addEventListener('click', async () => {
    const nickEl = getEl('settings-nickname');
    const camEl = getEl('settings-camera');
    const micEl = getEl('settings-microphone');
    const newName = (nickEl && nickEl.value || '').trim().slice(0, 32) || 'Guest';
    if (newName !== localName) {
      localName = newName;
      setLocalName(newName);
      await setParticipant(roomId, localUserId, { name: newName });
    }
    const cameraId = (camEl && camEl.value) || null;
    const microphoneId = (micEl && micEl.value) || null;
    try {
      const stream = await getLocalStream(cameraId, microphoneId);
      replaceTrack('video', stream.getVideoTracks()[0]);
      replaceTrack('audio', stream.getAudioTracks()[0]);
      const vbSelect = getEl('vb-select');
      if (vbSelect && vbSelect.value !== 'none') {
        virtualBackground.setInputStream(stream);
        const mode = vbSelect.value;
        const out = mode === 'blur' ? await virtualBackground.setMode('blur') : null;
        if (out && mode === 'blur') {
          const track = virtualBackground.getOutputVideoTrack();
          if (track) replaceTrack('video', track);
        }
      }
    } catch (err) {
      console.warn('Impostazioni dispositivi:', err);
    }
  });

  const layoutPresets = getEl('layout-presets');
  LAYOUTS.forEach((n) => {
    const btn = document.createElement('button');
    btn.textContent = `${n} layout`;
    btn.dataset.layout = String(n);
    btn.addEventListener('click', () => {
      updateRoom(roomId, { layout: n });
      layoutPresets.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
    layoutPresets.appendChild(btn);
  });

  function renderSceneButtons() {
    const container = getEl('scene-buttons');
    if (!container) return;
    container.innerHTML = SCENES.map((s) =>
      `<button class="scene-btn ${roomData.scene === s.id ? 'active' : ''}" data-scene="${s.id}">${s.name}</button>`
    ).join('');
    container.querySelectorAll('.scene-btn').forEach((btn) => {
      btn.addEventListener('click', () => updateRoom(roomId, { scene: btn.dataset.scene }));
    });
  }
  renderSceneButtons();

  getEl('panel-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;
    const panelId = tab.dataset.panel;
    getEl('panel-tabs').querySelectorAll('.panel-tab').forEach((t) => t.classList.remove('active'));
    getEl('panel-content').querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('panel-' + panelId);
    if (panel) panel.classList.add('active');
  });

  getEl('btn-end-call').addEventListener('click', () => {
    setParticipant(roomId, localUserId, { status: 'left' });
    remoteStreams.clear();
    participantsList.forEach((p) => removePeer(p.id));
    location.href = 'index.html';
  });

  setInterval(() => {
    getEl('connection-status').textContent = 'Connected';
    getEl('connection-status').classList.add('connected');
    const q = getConnectionQuality();
    getEl('quality-indicator').textContent = q === 'good' ? 'Good' : q === 'poor' ? 'Poor' : '—';
  }, 2000);

  function refreshVideoGrid() {
    const list = getOnStageParticipants();
    const order = roomData.stageOrder || list.map((p) => p.id);
    const streamMap = new Map(remoteStreams);
    const localStream = getLocalStreamRef();
    const me = participantsList.find((p) => p.id === localUserId);
    if (me && (me.status === 'on_stage' || isHost) && localStream) {
      streamMap.set(localUserId, localStream);
    }
    const participants = order.map((id) => list.find((p) => p.id === id) || participantsList.find((p) => p.id === id)).filter(Boolean);
    renderSlots(participants, streamMap, roomData.layout || 1);
  }

  getEl('connection-status').textContent = 'Connected';
  getEl('connection-status').classList.add('connected');
}

main().catch((e) => {
  console.error(e);
  getEl('connection-status').textContent = 'Error';
  getEl('connection-status').classList.add('error');
});
