'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';
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
        // We need to wait for the service worker to be ready.
        const registration = await navigator.serviceWorker.ready;
        const messaging = getMessaging(app);

        // --- 1. VAPID KEY IS ADDED HERE ---
        const VAPID_KEY = 'BFCIcNgw72v48h8taIQgSA22zfOUdetSjnNqPpGMLQpuCApVeERFr2vwAQh4xyledw6fEiHrk29ocWwUY6560Y0';

        const currentToken = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (currentToken) {
          // Save the token to Firestore so the backend can use it.
          await saveFcmToken(user.uid, currentToken);
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }

        // Also handle incoming messages while the app is in the foreground
        onMessage(messaging, (payload) => {
          console.log('Foreground message received.', payload);
          // You could show an in-app toast notification here.
        });

      } catch (err) {
        console.error('An error occurred while retrieving token for push notifications.', err);
      }
    };

    initMessaging();
      
  }, [user]);

  return null; // This component does not render anything.
}
