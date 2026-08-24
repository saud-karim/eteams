importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAQ2uisN34aKHiMpNjysOycupBUXW03PLY",
  authDomain: "delivery-app-79bf7.firebaseapp.com",
  projectId: "delivery-app-79bf7",
  storageBucket: "delivery-app-79bf7.firebasestorage.app",
  messagingSenderId: "879649532829",
  appId: "1:879649532829:web:c8c6fbfc330d51d85add74"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
  // Firebase SDK automatically displays the notification when 'notification' payload is present.
  // We do not need to call self.registration.showNotification here to avoid duplicates.
});
