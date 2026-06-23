importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Config should match firebase.config.ts config settings
const firebaseConfig = {
  apiKey: "AIzaSyB_RzQg1H0xSisDHzkzP4Az9yWMAe5QbhY",
  authDomain: "lostai.firebaseapp.com",
  projectId: "lostai",
  storageBucket: "lostai.firebasestorage.app",
  messagingSenderId: "1047818046234",
  appId: "1:1047818046234:web:b8b44b7d76968f5d6dfaa3"
};

if (firebaseConfig.apiKey !== 'PLACEHOLDER_API_KEY' && firebaseConfig.apiKey.trim() !== '') {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'LostAI Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || '',
      icon: '/favicon.ico',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
