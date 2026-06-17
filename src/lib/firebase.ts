// Firebase Admin SDK — server-side only, never exposed to the browser.
// Requires FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string of service account key).
// Falls back gracefully to null (JSON file storage) when not configured.

import type { Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;
let _initialized = false;

export async function getAdminDb(): Promise<Firestore | null> {
  if (_initialized) return _db;
  _initialized = true;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) return null;

    const serviceAccount = JSON.parse(serviceAccountJson);

    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    _db = getFirestore();
    return _db;
  } catch {
    return null;
  }
}

export async function queueEmail(data: {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: string;
}): Promise<boolean> {
  try {
    const db = await getAdminDb();
    if (!db) return false;
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("mail").add({
      to: data.to,
      message: { subject: data.subject, text: data.text, html: data.html },
      type: data.type,
      createdAt: FieldValue.serverTimestamp(),
      status: "pending",
    });
    return true;
  } catch {
    return false;
  }
}

export async function logToFirestore(eventType: string, details: Record<string, unknown>): Promise<void> {
  try {
    const db = await getAdminDb();
    if (!db) return;
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("security_logs").add({
      event: eventType,
      ...details,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch { /* silent */ }
}
