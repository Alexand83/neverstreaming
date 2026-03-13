/**
 * Firebase initialization and Firestore helpers for Live Studio
 * Uses Firebase v9+ modular SDK
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = typeof window !== 'undefined' && window.firebaseConfig
  ? window.firebaseConfig
  : { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' };

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init failed (missing config?):', e.message);
}

const ROOM_ID_LENGTH = 6;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomId() {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}

async function ensureAuth() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

function roomRef(roomId) {
  return doc(db, 'rooms', roomId);
}

function participantsRef(roomId) {
  return collection(db, 'rooms', roomId, 'participants');
}

function participantRef(roomId, userId) {
  return doc(db, 'rooms', roomId, 'participants', userId);
}

function chatRef(roomId) {
  return collection(db, 'rooms', roomId, 'chat');
}

function signalingRef(roomId, fromId, toId) {
  const path = [fromId, toId].sort();
  return collection(db, 'rooms', roomId, 'signaling', path[0], path[1]);
}

async function createRoom(hostUid) {
  const roomId = generateRoomId();
  const ref = roomRef(roomId);
  await setDoc(ref, {
    host: hostUid,
    createdAt: serverTimestamp(),
    layout: 1,
    scene: 'default',
    stageOrder: [hostUid]
  });
  await setDoc(participantRef(roomId, hostUid), {
    name: 'Host',
    role: 'host',
    status: 'on_stage',
    mic: true,
    cam: true,
    order: 0
  });
  return roomId;
}

async function getRoom(roomId) {
  const ref = roomRef(roomId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: roomId, ...snap.data() } : null;
}

function subscribeRoom(roomId, callback) {
  const ref = roomRef(roomId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: roomId, ...snap.data() } : null);
  });
}

function subscribeParticipants(roomId, callback) {
  const ref = collection(db, 'rooms', roomId, 'participants');
  return onSnapshot(ref, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

async function setParticipant(roomId, userId, data) {
  await setDoc(participantRef(roomId, userId), data, { merge: true });
}

async function updateRoom(roomId, data) {
  await updateDoc(roomRef(roomId), data);
}

async function addChatMessage(roomId, userId, name, text) {
  const ref = chatRef(roomId);
  await addDoc(ref, {
    userId,
    name,
    text,
    timestamp: serverTimestamp()
  });
}

function subscribeChat(roomId, callback) {
  const ref = chatRef(roomId);
  const q = query(ref, orderBy('timestamp', 'asc'), limit(200));
  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

function signalingPath(roomId, fromId, toId) {
  const ids = [fromId, toId].sort();
  return `rooms/${roomId}/signaling/${ids[0]}/${ids[1]}`;
}

async function addSignalingDoc(roomId, fromId, toId, type, payload) {
  const ref = collection(db, 'rooms', roomId, 'signaling', [fromId, toId].sort()[0], [fromId, toId].sort()[1]);
  await addDoc(ref, { from: fromId, to: toId, type, payload, at: serverTimestamp() });
}

function subscribeSignalingBetween(roomId, peerA, peerB, callback) {
  const [a, b] = [peerA, peerB].sort();
  const ref = collection(db, 'rooms', roomId, 'signaling', a, b);
  const q = query(ref, orderBy('at', 'asc'));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') callback(change.doc.data());
    });
  });
}

async function addSignalingMessage(roomId, fromId, toId, type, payload) {
  const [a, b] = [fromId, toId].sort();
  const ref = collection(db, 'rooms', roomId, 'signaling', a, b);
  await addDoc(ref, { from: fromId, to: toId, type, payload, at: serverTimestamp() });
}

export {
  db,
  auth,
  ensureAuth,
  generateRoomId,
  roomRef,
  participantRef,
  participantsRef,
  chatRef,
  createRoom,
  getRoom,
  subscribeRoom,
  subscribeParticipants,
  setParticipant,
  updateRoom,
  addChatMessage,
  subscribeChat,
  addSignalingMessage,
  subscribeSignalingBetween,
  signalingPath
};
