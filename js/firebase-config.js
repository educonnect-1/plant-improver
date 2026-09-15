// ============================================
// Firebase Client Configuration
// Replace placeholder values with your real Firebase project config.
// These are PUBLIC values (safe for browser).
// ============================================

const firebaseConfig = {
    apiKey:            "YOUR_FIREBASE_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
  };
  
  // Initialize Firebase (compat SDK via CDN)
  firebase.initializeApp(firebaseConfig);
  
  const db   = firebase.firestore();
  const auth = firebase.auth();