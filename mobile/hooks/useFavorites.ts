/**
 * useFavorites — Manage favorite routes for the current user
 */

import { useEffect, useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db, usersCol } from '@/services/firebase';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const loadFavorites = async () => {
      try {
        const userRef = doc(usersCol, user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setFavorites(snap.data().favoriteRoutes ?? []);
        }
      } catch (err) {
        console.error('useFavorites load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  const addFavorite = async (routeId: string) => {
    if (!user) return;
    const userRef = doc(usersCol, user.uid);
    await updateDoc(userRef, { favoriteRoutes: arrayUnion(routeId) });
    setFavorites((prev) => [...new Set([...prev, routeId])]);
  };

  const removeFavorite = async (routeId: string) => {
    if (!user) return;
    const userRef = doc(usersCol, user.uid);
    await updateDoc(userRef, { favoriteRoutes: arrayRemove(routeId) });
    setFavorites((prev) => prev.filter((id) => id !== routeId));
  };

  const isFavorite = (routeId: string) => favorites.includes(routeId);

  return { favorites, loading, addFavorite, removeFavorite, isFavorite };
}
