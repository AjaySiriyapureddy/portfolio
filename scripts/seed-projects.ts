/**
 * One-time script to seed projects into Firestore.
 * Run with: npx tsx scripts/seed-projects.ts
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */
import { config } from "dotenv";
import { resolve } from "path";
import projects from "../data/projects.json";

config({ path: resolve(process.cwd(), ".env.local") });

async function seed() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON not set in .env.local");
    process.exit(1);
  }

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }

  const db = getFirestore();
  const col = db.collection("projects");

  for (const project of projects) {
    const existing = await col.doc(project.id).get();
    if (existing.exists) {
      console.log(`SKIP  ${project.title} (already exists)`);
      continue;
    }
    await col.doc(project.id).set(project);
    console.log(`ADD   ${project.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
