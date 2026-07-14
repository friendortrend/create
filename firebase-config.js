// Friend Or Trend? - Firebase configuration (shared across all sites)
// IMPORTANT: replace "YOUR_FIREBASE_API_KEY" with the real Web API key
// from Firebase Console > Project Settings > General > Web API Key.
const firebaseConfig = {
  apiKey: "AIzaSyDPK-NPgHs9CK4BnCgJNVvK9E7novNOI2w",
  authDomain: "friendortrend2.firebaseapp.com",
  databaseURL: "https://friendortrend2-default-rtdb.firebaseio.com",
  projectId: "friendortrend2",
  storageBucket: "friendortrend2.firebasestorage.app",
  messagingSenderId: "405203029307",
  appId: "1:405203029307:web:497af09aa05cca3b00bb1e",
  measurementId: "G-G95WK12DET",
};

firebase.initializeApp(firebaseConfig);

const FOT = {
  ASSETS: "https://assets.friendortrend.dedyn.io",
  CREATE_URL: "https://create.friendortrend.dedyn.io",
  SIGN_URL: "https://signature.friendortrend.dedyn.io",
  FUNTEST_URL: "https://funtest.friendortrend.dedyn.io",
  LEADERBOARD_URL: "https://leaderboard.friendortrend.dedyn.io",
  FINB_URL: "https://finbgold.netlify.app",
};
