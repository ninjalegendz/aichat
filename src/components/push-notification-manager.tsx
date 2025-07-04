
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, auth } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import { saveFcmToken } from '@/lib/firestore-service';

// This component manages the entire lifecycle of push notifications for an admin.
// It requests permission, gets the token, and saves it to Firestore.
export function PushNotificationManager() {
  const user = useUser();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user) {
      return;
    }

    const initMessaging = async () => {
      try {
        const messaging = getMessaging(app);

        // --- 1. PASTE YOUR VAPID KEY HERE ---
        // Replace the placeholder string with the "Web Push certificate" key
        // you generated in your Firebase project settings.
        const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (currentToken) {
          // Save the token to Firestore so the backend can use it.
          // This function is "idempotent" - it won't create duplicate tokens.
          await saveFcmToken(user.uid, currentToken);
        } else {
          console.log('No registration token available. Request permission to generate one.');
          // You might want to show a UI element to the user to request permission.
          // For now, we'll log it.
        }

        // Also handle incoming messages while the app is in the foreground
        onMessage(messaging, (payload) => {
          console.log('Message received. ', payload);
          // You could show an in-app toast notification here.
          // For simplicity, we just log it.
        });

      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }
    };

    // We need to wait for the service worker to be ready.
    navigator.serviceWorker.ready.then(() => {
        initMessaging();
    });

  }, [user]);

  return null; // This component does not render anything.
}

// A simple hook to get the current Firebase user.
function useUser() {
    const [user, setUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    return user;
}
