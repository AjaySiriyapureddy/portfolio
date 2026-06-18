import fs from "fs";
import path from "path";
import { getAdminDb } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface CTFEntry {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  category: string;
  platform: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  readTime: string;
  published: boolean;
  createdAt: string;
}

export interface Profile {
  name: string;
  title: string;
  bio: string;
  email: string;
  location: string;
  avatar: string;
  social: { github: string; linkedin: string; twitter: string };
  resumeUrl: string;
}

// ─── Local JSON fallback (dev / no Firebase) ─────────────────────────────────

const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const VALID_FILES = new Set([
  "projects.json", "skills.json", "messages.json",
  "profile.json", "admin.json", "ctf.json", "blog.json",
]);

const DEFAULTS: Record<string, string> = {
  "projects.json": "[]",
  "skills.json": "[]",
  "messages.json": "[]",
  "ctf.json": "[]",
  "blog.json": "[]",
  "profile.json": JSON.stringify({
    name: "Ajaya Siriyapureddy",
    title: "Security Analyst & Researcher",
    bio: "Cybersecurity professional specializing in VAPT, Red Teaming, and secure development.",
    email: process.env.CONTACT_EMAIL || "",
    location: "",
    avatar: "/avatar.png",
    social: { github: "", linkedin: "", twitter: "" },
    resumeUrl: "",
  }, null, 2),
};

function readJsonFile<T>(filename: string): T {
  if (!VALID_FILES.has(filename)) throw new Error("Invalid data file");
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath) && DEFAULTS[filename]) {
    fs.writeFileSync(filePath, DEFAULTS[filename], "utf-8");
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function writeJsonFile<T>(filename: string, data: T): void {
  if (!VALID_FILES.has(filename)) throw new Error("Invalid data file");
  const filePath = path.join(dataDir, filename);
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

function sortNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Firestore Admin helpers ──────────────────────────────────────────────────

async function fsGetAll<T>(col: string): Promise<T[] | null> {
  try {
    const db = await getAdminDb();
    if (!db) return null;
    const snap = await db.collection(col).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  } catch { return null; }
}

async function fsSet(col: string, id: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const db = await getAdminDb();
    if (!db) return false;
    await db.collection(col).doc(id).set(data);
    return true;
  } catch { return false; }
}

async function fsUpdate(col: string, id: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const db = await getAdminDb();
    if (!db) return false;
    await db.collection(col).doc(id).update(data);
    return true;
  } catch { return false; }
}

async function fsDelete(col: string, id: string): Promise<boolean> {
  try {
    const db = await getAdminDb();
    if (!db) return false;
    await db.collection(col).doc(id).delete();
    return true;
  } catch { return false; }
}


// ─── db API (all async) ───────────────────────────────────────────────────────

export const db = {
  projects: {
    getAll: async (): Promise<Project[]> => {
      const rows = await fsGetAll<Project>("projects");
      if (rows) return sortNewest(rows);
      return sortNewest(readJsonFile<Project[]>("projects.json"));
    },
    getById: async (id: string): Promise<Project | undefined> => {
      const all = await db.projects.getAll();
      return all.find((p) => p.id === id);
    },
    create: async (project: Project): Promise<void> => {
      const ok = await fsSet("projects", project.id, project as unknown as Record<string, unknown>);
      if (!ok) {
        const items = readJsonFile<Project[]>("projects.json");
        items.push(project);
        writeJsonFile("projects.json", items);
      }
    },
    update: async (id: string, data: Partial<Project>): Promise<Project | null> => {
      const ok = await fsUpdate("projects", id, data as Record<string, unknown>);
      if (ok) return (await db.projects.getById(id)) ?? null;
      const items = readJsonFile<Project[]>("projects.json");
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      writeJsonFile("projects.json", items);
      return items[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      const ok = await fsDelete("projects", id);
      if (ok) return true;
      const items = readJsonFile<Project[]>("projects.json");
      const filtered = items.filter((p) => p.id !== id);
      if (filtered.length === items.length) return false;
      writeJsonFile("projects.json", filtered);
      return true;
    },
  },

  skills: {
    getAll: async (): Promise<Skill[]> => {
      const rows = await fsGetAll<Skill>("skills");
      if (rows) return rows;
      return readJsonFile<Skill[]>("skills.json");
    },
    create: async (skill: Skill): Promise<void> => {
      const ok = await fsSet("skills", skill.id, skill as unknown as Record<string, unknown>);
      if (!ok) {
        const items = readJsonFile<Skill[]>("skills.json");
        items.push(skill);
        writeJsonFile("skills.json", items);
      }
    },
    update: async (id: string, data: Partial<Skill>): Promise<Skill | null> => {
      const ok = await fsUpdate("skills", id, data as Record<string, unknown>);
      if (ok) {
        const all = await db.skills.getAll();
        return all.find((s) => s.id === id) ?? null;
      }
      const items = readJsonFile<Skill[]>("skills.json");
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      writeJsonFile("skills.json", items);
      return items[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      const ok = await fsDelete("skills", id);
      if (ok) return true;
      const items = readJsonFile<Skill[]>("skills.json");
      const filtered = items.filter((s) => s.id !== id);
      if (filtered.length === items.length) return false;
      writeJsonFile("skills.json", filtered);
      return true;
    },
  },

  messages: {
    getAll: async (): Promise<ContactMessage[]> => {
      const rows = await fsGetAll<ContactMessage>("messages");
      if (rows) return sortNewest(rows);
      return sortNewest(readJsonFile<ContactMessage[]>("messages.json"));
    },
    create: async (msg: ContactMessage): Promise<void> => {
      const ok = await fsSet("messages", msg.id, msg as unknown as Record<string, unknown>);
      if (!ok) {
        const items = readJsonFile<ContactMessage[]>("messages.json");
        items.push(msg);
        writeJsonFile("messages.json", items);
      }
    },
    markRead: async (id: string): Promise<boolean> => {
      const ok = await fsUpdate("messages", id, { read: true });
      if (ok) return true;
      const items = readJsonFile<ContactMessage[]>("messages.json");
      const msg = items.find((m) => m.id === id);
      if (!msg) return false;
      msg.read = true;
      writeJsonFile("messages.json", items);
      return true;
    },
    delete: async (id: string): Promise<boolean> => {
      const ok = await fsDelete("messages", id);
      if (ok) return true;
      const items = readJsonFile<ContactMessage[]>("messages.json");
      const filtered = items.filter((m) => m.id !== id);
      if (filtered.length === items.length) return false;
      writeJsonFile("messages.json", filtered);
      return true;
    },
    purgeOld: async (): Promise<number> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const all = await db.messages.getAll();
      const old = all.filter((m) => new Date(m.createdAt) <= cutoff);
      for (const m of old) await db.messages.delete(m.id);
      return old.length;
    },
    deleteByEmail: async (email: string): Promise<number> => {
      const all = await db.messages.getAll();
      const targets = all.filter((m) => m.email === email);
      for (const m of targets) await db.messages.delete(m.id);
      return targets.length;
    },
  },

  ctf: {
    getAll: async (): Promise<CTFEntry[]> => {
      const rows = await fsGetAll<CTFEntry>("ctf");
      if (rows) return sortNewest(rows);
      return sortNewest(readJsonFile<CTFEntry[]>("ctf.json"));
    },
    getById: async (id: string): Promise<CTFEntry | undefined> => {
      const all = await db.ctf.getAll();
      return all.find((c) => c.id === id);
    },
    create: async (entry: CTFEntry): Promise<void> => {
      const ok = await fsSet("ctf", entry.id, entry as unknown as Record<string, unknown>);
      if (!ok) {
        const items = readJsonFile<CTFEntry[]>("ctf.json");
        items.push(entry);
        writeJsonFile("ctf.json", items);
      }
    },
    update: async (id: string, data: Partial<CTFEntry>): Promise<CTFEntry | null> => {
      const ok = await fsUpdate("ctf", id, data as Record<string, unknown>);
      if (ok) return (await db.ctf.getById(id)) ?? null;
      const items = readJsonFile<CTFEntry[]>("ctf.json");
      const idx = items.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      writeJsonFile("ctf.json", items);
      return items[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      const ok = await fsDelete("ctf", id);
      if (ok) return true;
      const items = readJsonFile<CTFEntry[]>("ctf.json");
      const filtered = items.filter((c) => c.id !== id);
      if (filtered.length === items.length) return false;
      writeJsonFile("ctf.json", filtered);
      return true;
    },
  },

  blog: {
    getAll: async (): Promise<BlogPost[]> => {
      const rows = await fsGetAll<BlogPost>("blog");
      if (rows) return sortNewest(rows);
      return sortNewest(readJsonFile<BlogPost[]>("blog.json"));
    },
    getPublished: async (): Promise<BlogPost[]> => {
      const all = await db.blog.getAll();
      return all.filter((b) => b.published);
    },
    getById: async (id: string): Promise<BlogPost | undefined> => {
      const all = await db.blog.getAll();
      return all.find((b) => b.id === id);
    },
    create: async (post: BlogPost): Promise<void> => {
      const ok = await fsSet("blog", post.id, post as unknown as Record<string, unknown>);
      if (!ok) {
        const items = readJsonFile<BlogPost[]>("blog.json");
        items.push(post);
        writeJsonFile("blog.json", items);
      }
    },
    update: async (id: string, data: Partial<BlogPost>): Promise<BlogPost | null> => {
      const ok = await fsUpdate("blog", id, data as Record<string, unknown>);
      if (ok) return (await db.blog.getById(id)) ?? null;
      const items = readJsonFile<BlogPost[]>("blog.json");
      const idx = items.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      writeJsonFile("blog.json", items);
      return items[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      const ok = await fsDelete("blog", id);
      if (ok) return true;
      const items = readJsonFile<BlogPost[]>("blog.json");
      const filtered = items.filter((b) => b.id !== id);
      if (filtered.length === items.length) return false;
      writeJsonFile("blog.json", filtered);
      return true;
    },
  },

  profile: {
    get: async (): Promise<Profile> => {
      try {
        const db = await getAdminDb();
        if (db) {
          const snap = await db.collection("profile").doc("main").get();
          if (snap.exists) return snap.data() as Profile;
        }
      } catch { /* fallback */ }
      return readJsonFile<Profile>("profile.json");
    },
    update: async (data: Partial<Profile>): Promise<Profile> => {
      const current = await db.profile.get();
      const updated = { ...current, ...data };
      const adminDb = await getAdminDb();
      if (adminDb) {
        await adminDb.collection("profile").doc("main").set(updated);
      } else {
        writeJsonFile("profile.json", updated);
      }
      return updated;
    },
  },
};
