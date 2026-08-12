import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/security";
import { getJobView } from "@/lib/bughunt/runner";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const job = await getJobView(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}
