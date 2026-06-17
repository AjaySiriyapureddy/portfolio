import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimit,
  sanitizeInput,
  validateEmail,
  logSecurityEvent,
  getClientIp,
} from "@/lib/security";

// DPDPA Section 8: Right to Erasure
// Users can request deletion of their data by email
export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = sanitizeInput(body.email || "");

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address required" },
        { status: 400 }
      );
    }

    const removed = await db.messages.deleteByEmail(email);

    logSecurityEvent("DPDPA_ERASURE_REQUEST", {
      ip: getClientIp(req),
      recordsRemoved: removed,
    });

    return NextResponse.json({
      success: true,
      message: `Data erasure request processed. ${removed} record(s) removed.`,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
