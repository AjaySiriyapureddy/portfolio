import { NextRequest, NextResponse } from "next/server";
import {
  rateLimit,
  generateToken,
  sanitizeInput,
  logSecurityEvent,
  getClientIp,
} from "@/lib/security";
import { verifyAdminCredentials } from "@/lib/password";
import { sendSuspiciousActivityAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const email = sanitizeInput(body.email || "");
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = verifyAdminCredentials(email, password);

    if (!result.success) {
      logSecurityEvent("LOGIN_FAILED", { ip, email });

      // Alert on lockout (5 failed attempts)
      if (result.error?.includes("locked")) {
        sendSuspiciousActivityAlert({
          event: "ACCOUNT_LOCKOUT",
          ip,
          description: `Account locked after multiple failed login attempts. Attempted email: ${email}`,
        }).catch(() => {});
      }

      return NextResponse.json(
        { error: result.error || "Invalid credentials" },
        { status: 401 }
      );
    }

    logSecurityEvent("LOGIN_SUCCESS", { ip, email });
    const token = generateToken({ email, role: "admin" });

    return NextResponse.json({ token, expiresIn: "2h" });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
