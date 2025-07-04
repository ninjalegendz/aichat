'use client';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';

// A simple hook to get the current Firebase user.
export function useUser() {
    const [user, setUser] = useState<User | null>(auth.currentUser);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    return user;
}
