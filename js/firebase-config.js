// =====================================================
// FIREBASE CONFIG — CR Dashboard project
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyA_xu4yRaGSVxgr-vQB-EkOFMbgw9hJalA",
  authDomain: "cr-dashboard-25567.firebaseapp.com",
  projectId: "cr-dashboard-25567",
  storageBucket: "cr-dashboard-25567.firebasestorage.app",
  messagingSenderId: "1057141493235",
  appId: "1:1057141493235:web:73a25c7f97d6c3c03b5686"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
