/**
 * Screen sharing: getDisplayMedia, optional audio, broadcast to peers
 */
import { getLocalStreamRef, addScreenStream, removeScreenStream } from './webrtc.js';

let screenShareVideoEl;
let overlayEl;

function setElements(videoEl, overlayElement) {
  screenShareVideoEl = videoEl;
  overlayEl = overlayElement;
}

async function startScreenShare() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    if (screenShareVideoEl) {
      screenShareVideoEl.srcObject = stream;
      screenShareVideoEl.muted = true;
    }
    if (overlayEl) overlayEl.classList.remove('hidden');
    addScreenStream(stream);
    stream.getVideoTracks()[0].onended = () => stopScreenShare();
    return stream;
  } catch (e) {
    console.error('Screen share failed:', e);
    return null;
  }
}

function stopScreenShare() {
  if (screenShareVideoEl && screenShareVideoEl.srcObject) {
    screenShareVideoEl.srcObject.getTracks().forEach((t) => t.stop());
    screenShareVideoEl.srcObject = null;
  }
  if (overlayEl) overlayEl.classList.add('hidden');
  removeScreenStream();
}

export { setElements, startScreenShare, stopScreenShare };
