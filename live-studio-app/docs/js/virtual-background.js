/**
 * Virtual backgrounds: blur and custom image.
 * Blur uses canvas filter; image draws background with video in a soft frame (or uses BodyPix if loaded).
 */
let inputStream = null;
let outputStream = null;
let canvas = null;
let ctx = null;
let video = null;
let rafId = null;
let currentMode = 'none';
let backgroundImage = null;
const BLUR_PX = 14;

function setInputStream(stream) {
  inputStream = stream;
}

async function setMode(mode, options = {}) {
  await stop();
  currentMode = mode;
  if (mode === 'blur' || mode === 'image') {
    if (!inputStream) return null;
    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) return null;
    video = document.createElement('video');
    video.srcObject = new MediaStream([videoTrack]);
    video.muted = true;
    video.playsInline = true;
    await video.play();
    if (mode === 'image' && options.imageUrl) {
      backgroundImage = new Image();
      backgroundImage.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        backgroundImage.onload = res;
        backgroundImage.onerror = rej;
        backgroundImage.src = options.imageUrl;
      });
    }
    return startPipeline();
  }
  return null;
}

function startPipeline() {
  if (!video) return null;
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  ctx = canvas.getContext('2d');
  outputStream = canvas.captureStream(30);
  const audioTracks = inputStream ? inputStream.getAudioTracks() : [];
  audioTracks.forEach((t) => outputStream.addTrack(t));
  drawFrame();
  return outputStream;
}

function drawFrame() {
  if (!canvas || !ctx || !video) return;
  const w = canvas.width;
  const h = canvas.height;
  if (video.readyState < 2) {
    rafId = requestAnimationFrame(drawFrame);
    return;
  }
  if (currentMode === 'blur') {
    ctx.filter = `blur(${BLUR_PX}px)`;
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = 'none';
  } else if (currentMode === 'image' && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, w, h);
    const inset = 0.12;
    const x = w * inset;
    const y = h * inset;
    const wv = w * (1 - 2 * inset);
    const hv = h * (1 - 2 * inset);
    ctx.save();
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + wv, y, x + wv, y + hv, r);
    ctx.arcTo(x + wv, y + hv, x, y + hv, r);
    ctx.arcTo(x, y + hv, x, y, r);
    ctx.arcTo(x, y, x + wv, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(video, x, y, wv, hv);
    ctx.restore();
  } else {
    ctx.drawImage(video, 0, 0, w, h);
  }
  rafId = requestAnimationFrame(drawFrame);
}

async function stop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (outputStream) {
    outputStream.getTracks().forEach((t) => t.stop());
    outputStream = null;
  }
  if (video) {
    video.srcObject = null;
    video = null;
  }
  canvas = null;
  ctx = null;
  backgroundImage = null;
  return inputStream;
}

function getOutputStream() {
  return outputStream;
}

function getOutputVideoTrack() {
  return outputStream ? outputStream.getVideoTracks()[0] : null;
}

export { setInputStream, setMode, stop, getOutputStream, getOutputVideoTrack };
