/**
 * Recording: capture the live stage canvas and record to a file (download).
 * Uses an offscreen canvas that mirrors the video grid and MediaRecorder.
 */
let canvas;
let ctx;
let stream;
let mediaRecorder;
let chunks = [];
let animationId;
let videoGridEl;
const FPS = 30;

function setStageElement(element) {
  videoGridEl = element;
}

function startRecording() {
  if (!videoGridEl) return null;
  const layout = parseInt(videoGridEl.dataset.layout || '1', 10);
  const slots = videoGridEl.querySelectorAll('.video-slot');
  if (slots.length === 0) return null;

  const width = 1280;
  const height = 720;
  canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  ctx = canvas.getContext('2d');

  stream = canvas.captureStream(FPS);
  const audioTracks = getMixedAudioTracks();
  if (audioTracks.length) stream.addTrack(audioTracks[0]);

  const options = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2500000 };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'video/webm';
  }
  mediaRecorder = new MediaRecorder(stream, options);
  chunks = [];
  mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  mediaRecorder.start(1000);

  function draw() {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const cols = layout === 1 ? 1 : layout <= 2 ? 2 : layout <= 4 ? 2 : layout <= 6 ? 3 : 4;
    const rows = Math.ceil(layout / cols) || 1;
    const cellW = width / cols;
    const cellH = height / rows;
    for (let i = 0; i < slots.length && i < layout; i++) {
      const video = slots[i].querySelector('video');
      if (video && video.srcObject && video.readyState >= 2) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellW;
        const y = row * cellH;
        try {
          ctx.drawImage(video, x, y, cellW, cellH);
        } catch (_) {}
      }
    }
    animationId = requestAnimationFrame(draw);
  }
  draw();
  return stream;
}

function getMixedAudioTracks() {
  const tracks = [];
  if (!videoGridEl) return tracks;
  videoGridEl.querySelectorAll('video').forEach((v) => {
    if (v.srcObject) {
      v.srcObject.getAudioTracks().forEach((t) => tracks.push(t));
    }
  });
  return tracks.length ? [tracks[0]] : [];
}

function stopRecording() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getVideoTracks().forEach((t) => t.stop());
    stream = null;
  }
  canvas = null;
  ctx = null;
  return chunks;
}

function isRecording() {
  return mediaRecorder && mediaRecorder.state === 'recording';
}

function downloadRecording() {
  if (chunks.length === 0) return null;
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `live-studio-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
  chunks = [];
  return blob;
}

export { setStageElement, startRecording, stopRecording, isRecording, downloadRecording };
