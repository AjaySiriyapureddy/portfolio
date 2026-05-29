import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * Email diagnostic endpoint.
 * GET /api/auth/test-email?key=diagx9k3 — checks SMTP config and sends a test.
 * Protected by a secret query param (temporary diagnostic tool).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("key") !== "diagx9k3") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    smtp_user_set: !!process.env.SMTP_USER,
    smtp_pass_set: !!process.env.SMTP_PASS,
    smtp_pass_length: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
    smtp_host: process.env.SMTP_HOST || "smtp.gmail.com (default)",
    smtp_port_env: process.env.SMTP_PORT || "(not set)",
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

  // Try both port 465 and 587
  const portsToTry = [465, 587];

  for (const port of portsToTry) {
    const isSecure = port === 465;
    diagnostics[`trying_port_${port}`] = true;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // Verify SMTP connection
      await transporter.verify();
      diagnostics[`port_${port}_connection`] = "OK";

      // Send test email
      const target = process.env.NOTIFY_EMAIL || process.env.WINER_EMAIL;
      if (target) {
        const info = await transporter.sendMail({
          from: `"Portfolio Test" <${process.env.SMTP_USER}>`,
          to: target,
          subject: `[TEST] Email working on port ${port} - ${new Date().toISOString()}`,
          text: `If you see this, your portfolio email system is working on port ${port}.`,
          html: `
            <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 20px; border-radius: 8px;">
              <h2 style="color: #22c55e;">&#10003; Email System Working</h2>
              <p>Test email sent via port ${port} at ${new Date().toISOString()}</p>
              <p style="color: #888;">You can remove the test-email endpoint after confirming.</p>
            </div>
          `,
        });
        diagnostics[`port_${port}_email_sent`] = true;
        diagnostics[`port_${port}_message_id`] = info.messageId;
        diagnostics.working_port = port;

        return NextResponse.json({ ...diagnostics, status: "OK", working_port: port });
      }
    } catch (error) {
      diagnostics[`port_${port}_error`] = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return NextResponse.json({
    ...diagnostics,
    status: "FAIL",
    error: "Both port 465 and 587 failed. See individual port errors above.",
    hint: "Check: 1) SMTP_PASS is a 16-char Gmail App Password (not regular password), 2) 2FA is enabled on Gmail, 3) No extra spaces in the password value on Render",
  });
}
