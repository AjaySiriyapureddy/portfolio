import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("key") !== "diagx9k3") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.WINER_EMAIL || "";

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    resend_key_set: !!process.env.RESEND_API_KEY,
    notify_email_set: !!notifyEmail,
    notify_target: notifyEmail || "(EMPTY — set NOTIFY_EMAIL in Render)",
  };

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ...diagnostics, status: "FAIL", error: "RESEND_API_KEY not set in Render environment." });
  }

  if (!notifyEmail) {
    return NextResponse.json({ ...diagnostics, status: "FAIL", error: "NOTIFY_EMAIL not set in Render environment." });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>",
      to: [notifyEmail],
      subject: `[TEST] Portfolio email working — ${new Date().toISOString()}`,
      text: "If you see this, your portfolio email system is working correctly via Resend.",
      html: `<div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:20px;border-radius:8px;"><h2 style="color:#22c55e;">&#10003; Email Working</h2><p>Test sent via Resend at ${new Date().toISOString()}</p></div>`,
    });

    if (error) {
      return NextResponse.json({ ...diagnostics, status: "FAIL", error: error.message });
    }

    return NextResponse.json({ ...diagnostics, status: "OK", message_id: data?.id });
  } catch (err) {
    return NextResponse.json({ ...diagnostics, status: "FAIL", error: err instanceof Error ? err.message : "Unknown error" });
  }
}
