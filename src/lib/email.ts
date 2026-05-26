import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { queueEmail } from "@/lib/firebase";

// Lazy transporter — created on first use so Render env vars are guaranteed available
let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[EMAIL] SMTP_USER or SMTP_PASS not set — emails will not be sent");
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  });

  console.log(`[EMAIL] SMTP transporter initialized for ${user}`);
  return _transporter;
}

const FROM_NAME = "Portfolio Security";

// Lazy getters — evaluated at call time, not module load
function getFromEmail(): string {
  return process.env.SMTP_USER || "noreply@portfolio.local";
}

function getNotifyEmail(): string {
  return process.env.NOTIFY_EMAIL || process.env.WINER_EMAIL || "";
}

// Unified email sender: tries SMTP first, logs to Firebase as backup
async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: string;
  replyTo?: string;
}): Promise<boolean> {
  // Always log to Firebase as audit trail
  queueEmail({
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    type: options.type,
  }).catch(() => {});

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] SMTP not configured. Type: ${options.type}, Subject: ${options.subject}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${getFromEmail()}>`,
      to: sanitizeEmailHeader(options.to),
      replyTo: options.replyTo ? sanitizeEmailHeader(options.replyTo) : undefined,
      subject: sanitizeEmailHeader(options.subject),
      text: options.text,
      html: options.html,
    });
    console.log(`[EMAIL] Sent: ${options.type} to ${options.to} (messageId: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed (${options.type}):`, error);
    // Reset transporter on auth/connection errors so it retries fresh
    if (error instanceof Error && (error.message.includes("auth") || error.message.includes("ECONNREFUSED"))) {
      _transporter = null;
    }
    return false;
  }
}

/**
 * Contact form notification
 */
export async function sendContactNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const notifyEmail = getNotifyEmail();
  if (!notifyEmail) {
    console.warn("[EMAIL] NOTIFY_EMAIL/WINER_EMAIL not set — contact notification skipped");
    return false;
  }

  return sendEmail({
    to: notifyEmail,
    replyTo: data.email,
    subject: `[Portfolio Contact] ${data.subject}`,
    type: "contact_notification",
    text: `New contact form submission\n\nFrom: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\nMessage:\n${data.message}\n\nReceived: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 30px; border-radius: 8px;">
        <div style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0;">New Contact Message</h2>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Portfolio Contact Form</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #22c55e; padding: 8px 15px 8px 0;">From:</td><td style="color: #e0e0e0; padding: 8px 0;">${esc(data.name)}</td></tr>
          <tr><td style="color: #22c55e; padding: 8px 15px 8px 0;">Email:</td><td style="color: #e0e0e0; padding: 8px 0;"><a href="mailto:${esc(data.email)}" style="color: #60a5fa;">${esc(data.email)}</a></td></tr>
          <tr><td style="color: #22c55e; padding: 8px 15px 8px 0;">Subject:</td><td style="color: #e0e0e0; padding: 8px 0;">${esc(data.subject)}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #111; border: 1px solid #222; border-radius: 6px;">
          <p style="color: #22c55e; margin: 0 0 10px 0; font-size: 12px;">Message:</p>
          <p style="color: #d4d4d4; margin: 0; line-height: 1.6; white-space: pre-wrap;">${esc(data.message)}</p>
        </div>
        <p style="color: #555; font-size: 11px; margin-top: 20px;">Received: ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

/**
 * Password reset link email
 */
export async function sendPasswordResetEmail(
  email: string,
  _resetToken: string,
  resetUrl: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Password Reset Request - Portfolio Security",
    type: "password_reset",
    text: `Password Reset Request\n\nReset your password: ${resetUrl}\n\nExpires in ${process.env.PASSWORD_RESET_EXPIRY_MINUTES || "15"} minutes.\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 30px; border-radius: 8px; max-width: 600px;">
        <div style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0;">Password Reset Request</h2>
        </div>
        <p style="color: #d4d4d4;">A password reset was requested for your portfolio account.</p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="${esc(resetUrl)}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #888; font-size: 12px;">Or copy: <span style="color: #60a5fa; word-break: break-all;">${esc(resetUrl)}</span></p>
        <div style="margin-top: 25px; padding: 15px; background: #111; border: 1px solid #222; border-radius: 6px;">
          <p style="color: #ef4444; margin: 0 0 8px 0; font-size: 12px;">&#9888; Security:</p>
          <ul style="color: #888; font-size: 11px; margin: 0; padding-left: 20px;">
            <li>Expires in ${process.env.PASSWORD_RESET_EXPIRY_MINUTES || "15"} minutes</li>
            <li>Single use only</li>
            <li>Never share this link</li>
          </ul>
        </div>
      </div>
    `,
  });
}

/**
 * Password changed notification
 */
export async function sendPasswordChangedNotification(email: string, ip: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "[SECURITY ALERT] Password Changed - Portfolio Security",
    type: "password_changed",
    text: `Your portfolio password was changed.\n\nTime: ${new Date().toISOString()}\nIP: ${ip}\n\nIf this wasn't you, your account may be compromised. Request a password reset immediately.`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 30px; border-radius: 8px; max-width: 600px;">
        <div style="border-bottom: 1px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0;">&#9888; Password Changed</h2>
        </div>
        <p style="color: #d4d4d4;">Your portfolio password was successfully changed.</p>
        <div style="margin: 20px 0; padding: 15px; background: #111; border: 1px solid #222; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: #22c55e; padding: 5px 15px 5px 0;">Time:</td><td style="color: #e0e0e0;">${new Date().toISOString()}</td></tr>
            <tr><td style="color: #22c55e; padding: 5px 15px 5px 0;">IP Address:</td><td style="color: #e0e0e0;">${esc(ip)}</td></tr>
            <tr><td style="color: #22c55e; padding: 5px 15px 5px 0;">Action:</td><td style="color: #fbbf24;">Password Change</td></tr>
          </table>
        </div>
        <p style="color: #ef4444; font-size: 12px; font-weight: bold;">If this wasn't you, your account may be compromised. Request a password reset immediately.</p>
      </div>
    `,
  });
}

/**
 * Suspicious activity alert
 */
export async function sendSuspiciousActivityAlert(details: {
  event: string;
  ip: string;
  description: string;
}): Promise<boolean> {
  const notifyEmail = getNotifyEmail();
  if (!notifyEmail) return false;

  return sendEmail({
    to: notifyEmail,
    subject: `[SECURITY ALERT] ${details.event} - Portfolio`,
    type: "suspicious_activity",
    text: `Suspicious Activity Detected\n\nEvent: ${details.event}\nIP: ${details.ip}\nDescription: ${details.description}\nTime: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 30px; border-radius: 8px; max-width: 600px;">
        <div style="border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0;">&#128680; Suspicious Activity Detected</h2>
        </div>
        <div style="padding: 15px; background: #111; border: 1px solid #ef4444; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: #ef4444; padding: 5px 15px 5px 0; font-weight: bold;">Event:</td><td style="color: #fbbf24;">${esc(details.event)}</td></tr>
            <tr><td style="color: #ef4444; padding: 5px 15px 5px 0; font-weight: bold;">IP:</td><td style="color: #e0e0e0;">${esc(details.ip)}</td></tr>
            <tr><td style="color: #ef4444; padding: 5px 15px 5px 0; font-weight: bold;">Details:</td><td style="color: #e0e0e0;">${esc(details.description)}</td></tr>
            <tr><td style="color: #ef4444; padding: 5px 15px 5px 0; font-weight: bold;">Time:</td><td style="color: #e0e0e0;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 11px; margin-top: 15px;">Review your security panel and logs for more details.</p>
      </div>
    `,
  });
}

/**
 * Content change notification (project/skill/ctf/blog CRUD)
 */
export async function sendContentChangeNotification(details: {
  action: "created" | "updated" | "deleted";
  contentType: string;
  title: string;
  ip: string;
}): Promise<boolean> {
  const notifyEmail = getNotifyEmail();
  if (!notifyEmail) return false;

  const actionColors: Record<string, string> = {
    created: "#22c55e",
    updated: "#fbbf24",
    deleted: "#ef4444",
  };
  const actionEmoji: Record<string, string> = {
    created: "&#10133;",
    updated: "&#9998;",
    deleted: "&#128465;",
  };
  const color = actionColors[details.action] || "#e0e0e0";

  return sendEmail({
    to: notifyEmail,
    subject: `[Portfolio] ${details.contentType} ${details.action}: ${details.title}`,
    type: "content_change",
    text: `Content Change Notification\n\nAction: ${details.action.toUpperCase()}\nType: ${details.contentType}\nTitle: ${details.title}\nIP: ${details.ip}\nTime: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 30px; border-radius: 8px; max-width: 600px;">
        <div style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: ${color}; margin: 0;">${actionEmoji[details.action]} Content ${esc(details.action.charAt(0).toUpperCase() + details.action.slice(1))}</h2>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Portfolio Winer Panel</p>
        </div>
        <div style="padding: 15px; background: #111; border: 1px solid #222; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: ${color}; padding: 5px 15px 5px 0; font-weight: bold;">Action:</td><td style="color: #e0e0e0;">${esc(details.action.toUpperCase())}</td></tr>
            <tr><td style="color: ${color}; padding: 5px 15px 5px 0; font-weight: bold;">Type:</td><td style="color: #e0e0e0;">${esc(details.contentType)}</td></tr>
            <tr><td style="color: ${color}; padding: 5px 15px 5px 0; font-weight: bold;">Title:</td><td style="color: #e0e0e0;">${esc(details.title)}</td></tr>
            <tr><td style="color: ${color}; padding: 5px 15px 5px 0; font-weight: bold;">IP:</td><td style="color: #e0e0e0;">${esc(details.ip)}</td></tr>
            <tr><td style="color: ${color}; padding: 5px 15px 5px 0; font-weight: bold;">Time:</td><td style="color: #e0e0e0;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 11px; margin-top: 15px;">This is an automated notification from your portfolio winer panel.</p>
      </div>
    `,
  });
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Strip CRLF to prevent email header injection (CWE-93)
function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n]/g, "");
}
