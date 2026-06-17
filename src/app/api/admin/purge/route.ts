import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/security";
import { getAdminDb } from "@/lib/firebase";

// One-time purge endpoint — deletes all documents from content collections
export async function DELETE(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "Firestore not connected" }, { status: 503 });

  const collections = ["projects", "skills", "ctf", "blog"];
  const results: Record<string, number> = {};

  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    results[col] = snap.size;
  }

  return NextResponse.json({ success: true, deleted: results });
}
