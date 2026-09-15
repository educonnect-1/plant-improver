// ============================================
// Firebase Client Configuration
// Replace placeholder values with your real Firebase project config.
// These are PUBLIC values (safe for browser).
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDomYXDXxOZuuVzPTyvmfJKgjifu8g6IzE",
  authDomain: "soil-improver.firebaseapp.com",
  databaseURL: "https://soil-improver-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "soil-improver",
  storageBucket: "soil-improver.firebasestorage.app",
  messagingSenderId: "243334230438",
  appId: "1:243334230438:web:49b2c76bfe97105aa45f67"
};

  
  // Initialize Firebase (compat SDK via CDN)
  firebase.initializeApp(firebaseConfig);
  
  const db   = firebase.firestore();
  const auth = firebase.auth();
