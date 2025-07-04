
// This is the service worker file for Firebase Cloud Messaging.
// It runs in the background and listens for push notifications.

// Scripts for Firebase
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// --- IMPORTANT ---
// This configuration MUST match the one in your `src/lib/firebase.ts` file.
const firebaseConfig = {
  apiKey: "AIzaSyD7yQnrlu9wP8HEGexMdFkiAe5B3t3nAdA",
  authDomain: "glaciensupport.firebaseapp.com",
  projectId: "glaciensupport",
  storageBucket: "glaciensupport.appspot.com",
  messagingSenderId: "626560116670",
  appId: "1:626560116670:web:9a176fd7311114d8f5fbef"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handler will be called when a push message is received
// while the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico' // You can add an icon here
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
