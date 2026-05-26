// Firebase integration — gracefully handles missing/invalid keys
// All functions are no-ops when Firebase is not configured

let db: ReturnType<typeof import("firebase/firestore").getFirestore> | null = null;
let isInitialized = false;

async function getDb() {
  if (isInitialized) return db;
  isInitialized = true;

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
    db = getFirestore(app);
    return db;
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
    const fireDb = await getDb();
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
    const fireDb = await getDb();
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
