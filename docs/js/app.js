/**
 * Landing (index) and Join page logic
 */
import { ensureAuth, createRoom, getRoom, setParticipant } from './firebase.js';

const page = document.body.classList.contains('landing-page') ? 'landing' : 'join';

if (page === 'landing') {
  const btnCreate = document.getElementById('btn-create-room');
  const roomLinkSection = document.getElementById('room-link-section');
  const roomLinkInput = document.getElementById('room-link-input');
  const btnCopy = document.getElementById('btn-copy-link');
  const btnEnter = document.getElementById('btn-enter-studio');

  btnCreate.addEventListener('click', async () => {
    btnCreate.disabled = true;
    btnCreate.textContent = 'Creating…';
    try {
      const uid = await ensureAuth();
      if (!uid) throw new Error('Auth failed');
      const roomId = await createRoom(uid);
      const url = `${location.origin}${location.pathname.replace('index.html', '')}studio.html?room=${roomId}`;
      roomLinkInput.value = url;
      roomLinkSection.classList.remove('hidden');
      btnEnter.href = `studio.html?room=${roomId}&host=1`;
    } catch (e) {
      console.error(e);
      btnCreate.textContent = 'Error – try again';
    } finally {
      btnCreate.disabled = false;
    }
  });

  btnCopy.addEventListener('click', () => {
    roomLinkInput.select();
    document.execCommand('copy');
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 2000);
  });
}

if (page === 'join') {
  const roomIdInput = document.getElementById('room-id-input');
  const btnContinue = document.getElementById('btn-continue');
  const deviceSection = document.getElementById('device-setup-section');
  const selectCamera = document.getElementById('select-camera');
  const selectMicrophone = document.getElementById('select-microphone');
  const displayName = document.getElementById('display-name');
  const previewVideo = document.getElementById('preview-video');
  const btnJoinBackstage = document.getElementById('btn-join-backstage');

  function parseRoomId(value) {
    const v = (value || '').trim();
    const match = v.match(/studio\.html\?room=([A-Za-z0-9]+)/);
    if (match) return match[1];
    if (/^[A-Za-z0-9]{4,10}$/.test(v)) return v;
    return null;
  }

  btnContinue.addEventListener('click', async () => {
    const roomId = parseRoomId(roomIdInput.value);
    if (!roomId) {
      alert('Please enter a valid room link or ID.');
      return;
    }
    const room = await getRoom(roomId);
    if (!room) {
      alert('Room not found.');
      return;
    }
    sessionStorage.setItem('liveStudio_roomId', roomId);
    deviceSection.classList.remove('hidden');
    await loadDevices();
  });

  async function loadDevices() {
    const { getDevices, getLocalStream } = await import('./webrtc.js');
    const { cameras, microphones } = await getDevices();
    selectCamera.innerHTML = cameras.map((c) => `<option value="${c.deviceId}">${c.label || 'Camera ' + (selectCamera.options.length + 1)}</option>`).join('');
    selectMicrophone.innerHTML = microphones.map((m) => `<option value="${m.deviceId}">${m.label || 'Microphone ' + (selectMicrophone.options.length + 1)}</option>`).join('');
    try {
      const stream = await getLocalStream(selectCamera.value || null, selectMicrophone.value || null);
      previewVideo.srcObject = stream;
    } catch (e) {
      console.error(e);
    }
  }

  selectCamera.addEventListener('change', async () => {
    const { getLocalStream } = await import('./webrtc.js');
    try {
      const stream = await getLocalStream(selectCamera.value || null, selectMicrophone.value || null);
      previewVideo.srcObject = stream;
    } catch (e) { console.error(e); }
  });

  selectMicrophone.addEventListener('change', async () => {
    const { getLocalStream } = await import('./webrtc.js');
    try {
      const stream = await getLocalStream(selectCamera.value || null, selectMicrophone.value || null);
      previewVideo.srcObject = stream;
    } catch (e) { console.error(e); }
  });

  btnJoinBackstage.addEventListener('click', async () => {
    const name = (displayName.value || 'Guest').trim().slice(0, 32);
    const roomId = sessionStorage.getItem('liveStudio_roomId');
    if (!roomId) {
      alert('Missing room. Start from the join page with a room link.');
      return;
    }
    try {
      const uid = await ensureAuth();
      if (!uid) throw new Error('Auth failed');
      await setParticipant(roomId, uid, {
        name,
        role: 'guest',
        status: 'backstage',
        mic: true,
        cam: true
      });
      sessionStorage.setItem('liveStudio_displayName', name);
      sessionStorage.setItem('liveStudio_userId', uid);
      window.location.href = `studio.html?room=${roomId}`;
    } catch (e) {
      console.error(e);
      alert('Could not join. Try again.');
    }
  });
}
