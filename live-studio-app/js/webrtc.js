/**
 * WebRTC: getUserMedia, RTCPeerConnection, ICE/offer/answer via Firebase
 */
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const offerOptions = { offerToReceiveAudio: true, offerToReceiveVideo: true };

let localStream = null;
let localScreenStream = null;
const peers = new Map();
let onAddRemoteStream;
let onRemoveRemoteStream;
let localUserId;
let roomId;
let sendSignaling;

function setCallbacks(addStream, removeStream) {
  onAddRemoteStream = addStream;
  onRemoveRemoteStream = removeStream;
}

function setContext(userId, rId, sendFn) {
  localUserId = userId;
  roomId = rId;
  sendSignaling = sendFn;
}

async function getLocalStream(cameraId, microphoneId) {
  const constraints = {
    video: cameraId ? { deviceId: { exact: cameraId } } : true,
    audio: microphoneId ? { deviceId: { exact: microphoneId } } : true
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  localStream = stream;
  return stream;
}

async function getDevices() {
  const devs = await navigator.mediaDevices.enumerateDevices();
  return {
    cameras: devs.filter((d) => d.kind === 'videoinput'),
    microphones: devs.filter((d) => d.kind === 'audioinput')
  };
}

function getLocalStreamRef() {
  return localStream;
}

function createPeerConnection(remoteId, isInitiator) {
  if (peers.has(remoteId)) return peers.get(remoteId);
  const pc = new RTCPeerConnection(config);

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }
  if (localScreenStream) {
    localScreenStream.getTracks().forEach((track) => pc.addTrack(track, localScreenStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate && sendSignaling) {
      sendSignaling(remoteId, 'ice', e.candidate);
    }
  };

  pc.ontrack = (e) => {
    if (onAddRemoteStream) onAddRemoteStream(remoteId, e.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      if (onRemoveRemoteStream) onRemoveRemoteStream(remoteId);
    }
  };

  peers.set(remoteId, pc);
  return pc;
}

async function handleOffer(remoteId, offer) {
  const pc = createPeerConnection(remoteId, false);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  if (sendSignaling) sendSignaling(remoteId, 'answer', answer);
}

async function handleAnswer(remoteId, answer) {
  const pc = peers.get(remoteId);
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIce(remoteId, candidate) {
  const pc = peers.get(remoteId);
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

async function createOfferFor(remoteId) {
  const pc = createPeerConnection(remoteId, true);
  const offer = await pc.createOffer(offerOptions);
  await pc.setLocalDescription(offer);
  if (sendSignaling) sendSignaling(remoteId, 'offer', offer);
}

function removePeer(remoteId) {
  const pc = peers.get(remoteId);
  if (pc) {
    pc.close();
    peers.delete(remoteId);
  }
  if (onRemoveRemoteStream) onRemoveRemoteStream(remoteId);
}

function replaceTrack(kind, newTrack) {
  peers.forEach((pc) => {
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
    if (sender) sender.replaceTrack(newTrack);
  });
}

function getLocalVideoTrack() {
  return localStream ? localStream.getVideoTracks()[0] : null;
}

function toggleLocalTrack(kind, enabled) {
  if (!localStream) return;
  localStream.getTracks().filter((t) => t.kind === kind).forEach((t) => { t.enabled = enabled; });
}

function addScreenStream(stream) {
  localScreenStream = stream;
  peers.forEach((pc) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  });
}

function removeScreenStream() {
  if (localScreenStream) {
    localScreenStream.getTracks().forEach((t) => t.stop());
    localScreenStream = null;
  }
}

function getConnectionQuality() {
  let worst = 'good';
  peers.forEach((pc) => {
    if (pc.connectionState !== 'connected') worst = 'poor';
  });
  return worst;
}

export {
  getLocalStream,
  getDevices,
  getLocalStreamRef,
  getLocalVideoTrack,
  setCallbacks,
  setContext,
  createOfferFor,
  handleOffer,
  handleAnswer,
  handleIce,
  removePeer,
  replaceTrack,
  toggleLocalTrack,
  addScreenStream,
  removeScreenStream,
  getConnectionQuality
};
