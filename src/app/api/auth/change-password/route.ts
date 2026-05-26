import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  rateLimit,
  requireAuth,
  logSecurityEvent,
  getClientIp,
} from "@/lib/security";
import { validatePasswordStrength } from "@/lib/password";
import { sendPasswordChangedNotification, sendSuspiciousActivityAlert } from "@/lib/email";

const ADMIN_FILE = path.join(process.cwd(), "data", "admin.json");

interface AdminData {
  email: string;
  passwordHash: string;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  resetTokenUsed: boolean;
  lastPasswordChange: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const currentPassword = body.currentPassword || "";
    const newPassword = body.newPassword || "";
    const confirmPassword = body.confirmPassword || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    let admin: AdminData;
    try {
      const raw = fs.readFileSync(ADMIN_FILE, "utf-8");
      admin = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "System error. Please try again later." },
        { status: 500 }
      );
    }

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, admin.passwordHash)) {
      logSecurityEvent("CHANGE_PASSWORD_WRONG_CURRENT", { ip });

      // Alert: someone tried wrong password from authenticated session
      sendSuspiciousActivityAlert({
        event: "WRONG_PASSWORD_IN_SESSION",
        ip,
        description: "Failed password change attempt with incorrect current password from an authenticated session.",
      }).catch(() => {});

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    if (bcrypt.compareSync(newPassword, admin.passwordHash)) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 }
      );
    }

    // Update password
    admin.passwordHash = bcrypt.hashSync(newPassword, 12);
    admin.lastPasswordChange = new Date().toISOString();

    const tempPath = ADMIN_FILE + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(admin, null, 2), "utf-8");
    fs.renameSync(tempPath, ADMIN_FILE);

    logSecurityEvent("PASSWORD_CHANGED", { ip });

    // Send email notification about password change
    sendPasswordChangedNotification(admin.email, ip).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
