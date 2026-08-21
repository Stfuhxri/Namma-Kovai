/**
 * useAuth — Firebase Auth state hook for Namma Kovai
 *
 * Returns current Firebase user and loading state.
 * Used by screens that need to check authentication.
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const firebaseAuth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(
        firebaseAuth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        },
        (error) => {
          console.warn('onAuthStateChanged error:', error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('useAuth error:', err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated: user !== null };
}

