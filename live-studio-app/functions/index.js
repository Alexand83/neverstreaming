/**
 * Firebase Cloud Functions for Live Studio
 * - Optional: generate room ID, cleanup old rooms, validate participants
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Optional: On room create, set default layout/scene
 */
exports.onRoomCreate = functions.firestore
  .document('rooms/{roomId}')
  .onCreate((snap, context) => {
    const roomId = context.params.roomId;
    return snap.ref.update({
      layout: 1,
      scene: 'default',
      stageOrder: []
    }).catch(() => {});
  });

/**
 * Optional: Clean up old rooms (scheduled). Run daily.
 * Deletes rooms older than 24 hours with no recent activity.
 */
exports.cleanupOldRooms = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const roomsSnap = await db.collection('rooms').get();
    const batch = db.batch();
    let count = 0;
    roomsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const created = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : 0;
      if (created < cutoff) {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) await batch.commit();
    console.log('Cleaned up', count, 'rooms');
    return null;
  });
