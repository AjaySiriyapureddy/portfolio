import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/security";
import nodemailer from "nodemailer";

/**
 * Protected email diagnostic endpoint.
 * GET /api/auth/test-email — checks SMTP config and sends a test email.
 * Requires auth token (only accessible from winer panel).
 */
export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    smtp_user_set: !!process.env.SMTP_USER,
    smtp_pass_set: !!process.env.SMTP_PASS,
    smtp_host: process.env.SMTP_HOST || "smtp.gmail.com (default)",
    smtp_port: process.env.SMTP_PORT || "587 (default)",
    notify_email_set: !!process.env.NOTIFY_EMAIL,
    winer_email_set: !!process.env.WINER_EMAIL,
    notify_target: process.env.NOTIFY_EMAIL || process.env.WINER_EMAIL || "(EMPTY - this is why emails fail!)",
  };

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({
      ...diagnostics,
      status: "FAIL",
      error: "SMTP_USER or SMTP_PASS not set. Add them in Render → Environment.",
    });
  }

  // Try SMTP connection
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    diagnostics.smtp_connection = "OK";

    // Send test email
    const target = process.env.NOTIFY_EMAIL || process.env.WINER_EMAIL;
    if (target) {
      const info = await transporter.sendMail({
        from: `"Portfolio Test" <${process.env.SMTP_USER}>`,
        to: target,
        subject: "[TEST] Email system working - " + new Date().toISOString(),
        text: "If you see this, your portfolio email system is working correctly.",
        html: `
          <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 20px; border-radius: 8px;">
            <h2 style="color: #22c55e;">&#10003; Email System Working</h2>
            <p>Test email sent at ${new Date().toISOString()}</p>
            <p style="color: #888;">You can delete this test endpoint after confirming emails work.</p>
          </div>
        `,
      });
      diagnostics.test_email_sent = true;
      diagnostics.message_id = info.messageId;
    } else {
      diagnostics.test_email_sent = false;
      diagnostics.warning = "No NOTIFY_EMAIL or WINER_EMAIL set — no recipient to send to";
    }

    return NextResponse.json({ ...diagnostics, status: "OK" });
  } catch (error) {
    return NextResponse.json({
      ...diagnostics,
      status: "FAIL",
      error: error instanceof Error ? error.message : "Unknown SMTP error",
      hint: error instanceof Error && error.message.includes("535")
        ? "Authentication failed. Check: 1) SMTP_PASS is a Gmail App Password (not your regular password), 2) 2FA is enabled on the Gmail account, 3) No extra spaces in the password"
        : error instanceof Error && error.message.includes("ECONNREFUSED")
        ? "Cannot connect to SMTP server. Check SMTP_HOST and SMTP_PORT values."
        : "Check Render logs for more details",
    });
  }
}
