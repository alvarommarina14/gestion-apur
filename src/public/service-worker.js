importScripts(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
        apiKey: "AIzaSyCY7Drv1lNbi8NfSJ3AseP3IPVpJ1xei9c",
        authDomain: "gestion-apur.firebaseapp.com",
        projectId: "gestion-apur",
        storageBucket: "gestion-apur.firebasestorage.app",
        messagingSenderId: "43346834046",
        appId: "1:43346834046:web:e10bf11482fe421184de2f",
});

const messaging = firebase.messaging();

/**
 * 🔔 FCM background messages
 */
messaging.onBackgroundMessage((payload) => {
        console.log("📩 Background FCM message:", payload);

        const notificationTitle =
                payload.notification?.title || "Nueva notificación";

        const notificationOptions = {
                body: payload.notification?.body || "",
                tag: payload.data?.tag || "default",
                requireInteraction: false,
                data: {
                        url: payload.data?.url || "/",
                },
        };

        self.registration.showNotification(
                notificationTitle,
                notificationOptions,
        );
});

/**
 * 👉 Click en notificación
 */
self.addEventListener("notificationclick", (event) => {
        event.notification.close();

        const url = event.notification.data?.url || "/";

        event.waitUntil(
                clients
                        .matchAll({ type: "window", includeUncontrolled: true })
                        .then((clientList) => {
                                for (const client of clientList) {
                                        if (
                                                client.url.includes(url) &&
                                                "focus" in client
                                        ) {
                                                return client.focus();
                                        }
                                }
                                if (clients.openWindow) {
                                        return clients.openWindow(url);
                                }
                        }),
        );
});
