/**
 * Firebase configuration for Live Studio App
 * Replace with your Firebase project credentials from Firebase Console
 */
const firebaseConfig = {
  apiKey: "AIzaSyBxGoTbDE2CrIlhHqYMB0h0UNInoc8U5Mo",
  authDomain: "neverstreaming-2c15c.firebaseapp.com",
  projectId: "neverstreaming-2c15c",
  storageBucket: "neverstreaming-2c15c.firebasestorage.app",
  messagingSenderId: "395215830063",
  appId: "1:395215830063:web:4f6dff2238d447a96a9ada"
};

// Export for use in modules (if using bundler) or assign to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
