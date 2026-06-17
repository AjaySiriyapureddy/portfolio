import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimit,
  sanitizeInput,
  requireAuth,
  logSecurityEvent,
  getClientIp,
} from "@/lib/security";
import { validateContactForm } from "@/lib/validation";
import { sendContactNotification, sendSuspiciousActivityAlert } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

// Contact-specific rate limit with LRU eviction
const MAX_CONTACT_ENTRIES = 5000;
const contactRateMap = new Map<string, number>();
const CONTACT_COOLDOWN_MS = parseInt(process.env.CONTACT_RATE_LIMIT_SECONDS || "10", 10) * 1000;

function evictContactOldest() {
  if (contactRateMap.size > MAX_CONTACT_ENTRIES) {
    const firstKey = contactRateMap.keys().next().value;
    if (firstKey !== undefined) contactRateMap.delete(firstKey);
  }
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  await db.messages.purgeOld();
  const messages = await db.messages.getAll();
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const ip = getClientIp(req);
  const lastSent = contactRateMap.get(ip);
  if (lastSent && Date.now() - lastSent < CONTACT_COOLDOWN_MS) {
    const waitSec = Math.ceil((CONTACT_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds between messages` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // DPDPA: Require explicit consent
    if (!body.consent) {
      return NextResponse.json(
        { error: "You must consent to data processing before submitting your message." },
        { status: 400 }
      );
    }

    const validationResults = validateContactForm({
      name: body.name || "",
      email: body.email || "",
      subject: body.subject || "",
      message: body.message || "",
    });

    const failures = validationResults.filter((r) => !r.valid);
    if (failures.length > 0) {
      const injections = failures.filter((f) => f.injectionDetected);
      if (injections.length > 0) {
        logSecurityEvent("INJECTION_ATTEMPT", {
          ip,
          fields: injections.map((i) => i.field),
        });

        // Alert admin about injection attempt
        sendSuspiciousActivityAlert({
          event: "INJECTION_ATTEMPT",
          ip,
          description: `Injection pattern detected in fields: ${injections.map((i) => i.field).join(", ")}`,
        }).catch(() => {});
      }

      return NextResponse.json(
        {
          error: failures[0].error,
          details: failures.map((f) => ({
            field: f.field,
            error: f.error,
            injectionDetected: f.injectionDetected || false,
          })),
        },
        { status: 400 }
      );
    }

    const name = sanitizeInput(body.name.trim());
    const email = sanitizeInput(body.email.trim());
    const subject = sanitizeInput(body.subject.trim());
    const message = sanitizeInput(body.message.trim());

    const contactMessage = {
      id: uuidv4(),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await db.messages.create(contactMessage);
    evictContactOldest();
    contactRateMap.set(ip, Date.now());

    logSecurityEvent("CONTACT_MESSAGE", { ip, email: "[redacted]" });

    // Send email notification (non-blocking)
    sendContactNotification({
      name: body.name.trim(),
      email: body.email.trim(),
      subject: body.subject.trim(),
      message: body.message.trim(),
    }).catch((err) => {
      console.error("[EMAIL] Notification failed:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully. You will receive a confirmation shortly.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// Mark as read
export async function PATCH(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const success = await db.messages.markRead(id);
    if (!success) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Message ID is required" },
      { status: 400 }
    );
  }

  const deleted = await db.messages.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  logSecurityEvent("MESSAGE_DELETED", { id, ip: getClientIp(req) });
  return NextResponse.json({ success: true });
}
