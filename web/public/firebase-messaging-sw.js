importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyD_FZrEF4UXg3JUg1wVIeFFo9I67mpPCFs",
  authDomain: "eteams-app-8d6ec.firebaseapp.com",
  projectId: "eteams-app-8d6ec",
  storageBucket: "eteams-app-8d6ec.firebasestorage.app",
  messagingSenderId: "527743421664",
  appId: "1:527743421664:web:bca454a25356af746f5485"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
  // Firebase SDK automatically displays the notification when 'notification' payload is present.
  // We do not need to call self.registration.showNotification here to avoid duplicates.
});
