import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/security";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  // Don't leak email in response (CWE-639)
  return NextResponse.json({ valid: true });
}
