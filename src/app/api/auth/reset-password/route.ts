import { NextRequest, NextResponse } from "next/server";
import { rateLimit, logSecurityEvent, getClientIp } from "@/lib/security";
import { resetPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const token = (body.token || "").trim();
    const newPassword = body.newPassword || "";
    const confirmPassword = body.confirmPassword || "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const result = resetPassword(token, newPassword);

    if (!result.success) {
      logSecurityEvent("PASSWORD_RESET_FAILED", { ip, reason: result.error });
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logSecurityEvent("PASSWORD_RESET_SUCCESS", { ip });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
