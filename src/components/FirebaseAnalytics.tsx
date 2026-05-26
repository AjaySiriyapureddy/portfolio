"use client";

import { useEffect } from "react";

export default function FirebaseAnalytics() {
  useEffect(() => {
    async function initAnalytics() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

        // Skip if keys are missing, empty, or contain placeholder asterisks
        if (!apiKey || !appId || apiKey.includes("*") || appId.includes("*") || apiKey.length < 20) {
          return;
        }

        const { initializeApp, getApps } = await import("firebase/app");
        const { getAnalytics, logEvent } = await import("firebase/analytics");

        const firebaseConfig = {
          apiKey,
          authDomain: "portfolio-cb3b6.firebaseapp.com",
          projectId: "portfolio-cb3b6",
          storageBucket: "portfolio-cb3b6.firebasestorage.app",
          messagingSenderId: "496114221615",
          appId,
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QG4FGEDDR2",
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const analytics = getAnalytics(app);
        logEvent(analytics, "page_view");
      } catch {
        // Firebase analytics not critical — fail silently
      }
    }

    if (typeof window !== "undefined") {
      initAnalytics();
    }
  }, []);

  return null;
}
