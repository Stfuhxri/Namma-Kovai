/**
 * Firebase service initialization for Namma Kovai.
 *
 * ⚠️  REQUIRED: Replace the firebaseConfig values below with your actual
 * Firebase project credentials from:
 * https://console.firebase.google.com → Project Settings → Your Apps → SDK setup
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, collection, CollectionReference } from 'firebase/firestore';
import { getDatabase, ref } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase Config ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCm-CDgzoShexUJMaRdcZfgsRl1SZ-Asxk',
  authDomain: 'namma-kovai-a6512.firebaseapp.com',
  databaseURL: 'https://namma-kovai-a6512-default-rtdb.firebaseio.com',
  projectId: 'namma-kovai-a6512',
  storageBucket: 'namma-kovai-a6512.firebasestorage.app',
  messagingSenderId: '246217496919',
  appId: '1:246217496919:android:335c4433a0dc3f43420612',
};

// ─── App Initialization ───────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Auth Initialization with Persistence ───────────────────────────────────
// IMPORTANT: We must compute the persistence value *before* passing it to
// initializeAuth. If getReactNativePersistence resolves to undefined (e.g.
// Metro picks the browser bundle), calling it inside initializeAuth's argument
// list throws a TypeError mid-registration — leaving Firebase auth in a
// corrupted partial state where neither initializeAuth nor getAuth can succeed.
let authInstance: ReturnType<typeof getAuth>;

// Step 1: Safely resolve persistence
let persistence: any = inMemoryPersistence;
try {
  if (typeof getReactNativePersistence === 'function') {
    persistence = getReactNativePersistence(AsyncStorage);
  }
} catch {
  // getReactNativePersistence not available (browser bundle) — use in-memory
  persistence = inMemoryPersistence;
}

// Step 2: Initialize auth exactly once
try {
  authInstance = initializeAuth(app, { persistence });
} catch (e: any) {
  if (e?.code === 'auth/already-initialized') {
    // Hot reload or duplicate module evaluation — auth is already registered.
    authInstance = getAuth(app);
  } else {
    // Any other error (e.g. bad persistence, missing module) should be surfaced.
    throw e;
  }
}

export function getFirebaseAuth(): ReturnType<typeof getAuth> {
  return authInstance;
}

export const auth = authInstance;


// ─── Firestore ────────────────────────────────────────────────────────────────
export const db = getFirestore(app);

// ─── Realtime Database ────────────────────────────────────────────────────────
export const rtdb = getDatabase(app);

// ─── Typed Collection References ─────────────────────────────────────────────

export interface Route {
  routeId: string;
  routeNumber: string;
  routeName: string;
  stops: Stop[];
  active: boolean;
  polyline?: LatLng[]; // ⚠️ PLACEHOLDER: supply real route polyline coords
}

export interface Stop {
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export interface Bus {
  busId: string;
  routeId: string;
  busNumber?: string; // e.g. "TN-38-XXXX"
  status: 'active' | 'idle' | 'unknown' | 'MOVING' | 'STOPPED';
  lastKnownLat: number;
  lastKnownLng: number;
  lastUpdated: number; // Unix timestamp ms
  contributingUsers: number;
}


export interface LiveLocationReport {
  busId: string;
  userId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  name?: string;
  phone: string;
  favoriteRoutes: string[]; // routeId[]
  currentlyRidingBusId?: string | null;
  fcmToken?: string;
  language: 'en' | 'ta';
}

export interface LatLng {
  lat: number;
  lng: number;
}

// Typed collection helpers
export const routesCol = collection(db, 'routes') as CollectionReference<Route>;
export const busesCol = collection(db, 'buses') as CollectionReference<Bus>;
export const usersCol = collection(db, 'users') as CollectionReference<UserProfile>;

// Realtime DB refs
export const busesRtdbRef = ref(rtdb, 'buses');
export const liveReportsRef = (busId: string) =>
  ref(rtdb, `liveLocationReports/${busId}`);
