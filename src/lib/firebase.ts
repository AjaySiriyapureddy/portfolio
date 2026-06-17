// Firebase integration — gracefully handles missing/invalid keys
// All functions are no-ops when Firebase is not configured

import type { Firestore } from "firebase/firestore";

let _db: Firestore | null = null;
let _initialized = false;

export async function getFirestoreDb(): Promise<Firestore | null> {
  if (_initialized) return _db;
  _initialized = true;

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    if (!apiKey || !appId || apiKey.includes("*") || appId.includes("*") || apiKey.length < 20) {
      return null;
    }

    const { initializeApp, getApps } = await import("firebase/app");
    const { getFirestore } = await import("firebase/firestore");

    const firebaseConfig = {
      apiKey,
      authDomain: "portfolio-cb3b6.firebaseapp.com",
      projectId: "portfolio-cb3b6",
      storageBucket: "portfolio-cb3b6.firebasestorage.app",
      messagingSenderId: "496114221615",
      appId,
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _db = getFirestore(app);
    return _db;
  } catch {
    return null;
  }
}

/**
 * Queue an email via Firestore (for Firebase Trigger Email extension)
 */
export async function queueEmail(data: {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: string;
}) {
  try {
    const fireDb = await getFirestoreDb();
    if (!fireDb) return false;

    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(fireDb, "mail"), {
      to: data.to,
      message: { subject: data.subject, text: data.text, html: data.html },
      type: data.type,
      createdAt: serverTimestamp(),
      status: "pending",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Log security events to Firestore
 */
export async function logToFirestore(eventType: string, details: Record<string, unknown>) {
  try {
    const fireDb = await getFirestoreDb();
    if (!fireDb) return;

    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(fireDb, "security_logs"), {
      event: eventType,
      ...details,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Silent fail
  }
}
