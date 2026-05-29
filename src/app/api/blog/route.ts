import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimit,
  requireAuth,
  sanitizeInput,
  logSecurityEvent,
  getClientIp,
  stripDangerousKeys,
} from "@/lib/security";
import { sendContentChangeNotification } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");

  // Public: only published posts. Admin (?all=1 + auth): all posts
  if (all === "1") {
    const authError = requireAuth(req);
    if (authError) return authError;
    return NextResponse.json(db.blog.getAll());
  }

  return NextResponse.json(db.blog.getPublished());
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    const post = {
      id: uuidv4(),
      title: sanitizeInput((body.title || "").trim()),
      excerpt: sanitizeInput((body.excerpt || "").trim()),
      content: sanitizeInput((body.content || "").trim()),
      date: new Date().toISOString().split("T")[0],
      tags: (body.tags || []).map((t: string) => sanitizeInput(t.trim())),
      readTime: sanitizeInput((body.readTime || "5 min").trim()),
      published: Boolean(body.published),
      createdAt: new Date().toISOString(),
    };

    if (!post.title || !post.excerpt) {
      return NextResponse.json(
        { error: "Title and excerpt are required" },
        { status: 400 }
      );
    }

    db.blog.create(post);
    logSecurityEvent("BLOG_CREATED", { id: post.id, ip: getClientIp(req) });
    sendContentChangeNotification({ action: "created", contentType: "Blog Post", title: post.title, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, ...unsafeData } = body;
    if (!id) {
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }

    const rawData = stripDangerousKeys(unsafeData);
    const data: Record<string, unknown> = {};
    if (rawData.title) data.title = sanitizeInput(rawData.title as string);
    if (rawData.excerpt) data.excerpt = sanitizeInput(rawData.excerpt as string);
    if (rawData.content !== undefined) data.content = sanitizeInput(rawData.content as string);
    if (rawData.tags) data.tags = (rawData.tags as string[]).map((t: string) => sanitizeInput(t));
    if (rawData.readTime) data.readTime = sanitizeInput(rawData.readTime as string);
    if (typeof rawData.published === "boolean") data.published = rawData.published;

    const updated = db.blog.update(id, data);
    if (!updated) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    logSecurityEvent("BLOG_UPDATED", { id, ip: getClientIp(req) });
    sendContentChangeNotification({ action: "updated", contentType: "Blog Post", title: (data.title as string) || id, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
  }

  const deleted = db.blog.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  }

  logSecurityEvent("BLOG_DELETED", { id, ip: getClientIp(req) });
  sendContentChangeNotification({ action: "deleted", contentType: "Blog Post", title: id, ip: getClientIp(req) }).catch(() => {});
  return NextResponse.json({ success: true });
}
