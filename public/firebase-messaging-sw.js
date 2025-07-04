// This file must be in the public folder.

importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// This config must match the one in `src/lib/firebase.ts`
const firebaseConfig = {
  apiKey: "AIzaSyD7yQnrlu9wP8HEGexMdFkiAe5B3t3nAdA",
  authDomain: "glaciensupport.firebaseapp.com",
  projectId: "glaciensupport",
  storageBucket: "glaciensupport.appspot.com",
  messagingSenderId: "626560116670",
  appId: "1:626560116670:web:9a176fd7311114d8f5fbef",
  measurementId: "G-6XKRBZFX7H"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handler will be called when the app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
