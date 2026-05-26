import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

// Allowlist of valid data files (CWE-22 path traversal prevention)
const VALID_FILES = new Set([
  "projects.json",
  "skills.json",
  "messages.json",
  "profile.json",
  "admin.json",
  "ctf.json",
  "blog.json",
]);

function readJson<T>(filename: string): T {
  if (!VALID_FILES.has(filename) || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid data file access");
  }
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJson<T>(filename: string, data: T): void {
  if (!VALID_FILES.has(filename)) {
    throw new Error("Invalid data file access");
  }
  const filePath = path.join(dataDir, filename);
  // Atomic write: write to temp file, then rename (prevents corruption)
  const tempPath = filePath + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);
}

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
  social: {
    github: string;
    linkedin: string;
    twitter: string;
  };
  resumeUrl: string;
}

export const db = {
  projects: {
    getAll: (): Project[] => readJson<Project[]>("projects.json"),
    getById: (id: string): Project | undefined =>
      readJson<Project[]>("projects.json").find((p) => p.id === id),
    create: (project: Project): void => {
      const projects = readJson<Project[]>("projects.json");
      projects.push(project);
      writeJson("projects.json", projects);
    },
    update: (id: string, data: Partial<Project>): Project | null => {
      const projects = readJson<Project[]>("projects.json");
      const index = projects.findIndex((p) => p.id === id);
      if (index === -1) return null;
      projects[index] = { ...projects[index], ...data };
      writeJson("projects.json", projects);
      return projects[index];
    },
    delete: (id: string): boolean => {
      const projects = readJson<Project[]>("projects.json");
      const filtered = projects.filter((p) => p.id !== id);
      if (filtered.length === projects.length) return false;
      writeJson("projects.json", filtered);
      return true;
    },
  },
  skills: {
    getAll: (): Skill[] => readJson<Skill[]>("skills.json"),
    create: (skill: Skill): void => {
      const skills = readJson<Skill[]>("skills.json");
      skills.push(skill);
      writeJson("skills.json", skills);
    },
    update: (id: string, data: Partial<Skill>): Skill | null => {
      const skills = readJson<Skill[]>("skills.json");
      const index = skills.findIndex((s) => s.id === id);
      if (index === -1) return null;
      skills[index] = { ...skills[index], ...data };
      writeJson("skills.json", skills);
      return skills[index];
    },
    delete: (id: string): boolean => {
      const skills = readJson<Skill[]>("skills.json");
      const filtered = skills.filter((s) => s.id !== id);
      if (filtered.length === skills.length) return false;
      writeJson("skills.json", filtered);
      return true;
    },
  },
  messages: {
    getAll: (): ContactMessage[] => readJson<ContactMessage[]>("messages.json"),
    create: (msg: ContactMessage): void => {
      const messages = readJson<ContactMessage[]>("messages.json");
      messages.push(msg);
      writeJson("messages.json", messages);
    },
    markRead: (id: string): boolean => {
      const messages = readJson<ContactMessage[]>("messages.json");
      const msg = messages.find((m) => m.id === id);
      if (!msg) return false;
      msg.read = true;
      writeJson("messages.json", messages);
      return true;
    },
    delete: (id: string): boolean => {
      const messages = readJson<ContactMessage[]>("messages.json");
      const filtered = messages.filter((m) => m.id !== id);
      if (filtered.length === messages.length) return false;
      writeJson("messages.json", filtered);
      return true;
    },
    // DPDPA: Data retention - auto-purge messages older than 90 days
    purgeOld: (): number => {
      const messages = readJson<ContactMessage[]>("messages.json");
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const filtered = messages.filter(
        (m) => new Date(m.createdAt) > cutoff
      );
      const purged = messages.length - filtered.length;
      if (purged > 0) writeJson("messages.json", filtered);
      return purged;
    },
    // DPDPA: Right to erasure - delete by email
    deleteByEmail: (email: string): number => {
      const messages = readJson<ContactMessage[]>("messages.json");
      const filtered = messages.filter((m) => m.email !== email);
      const removed = messages.length - filtered.length;
      if (removed > 0) writeJson("messages.json", filtered);
      return removed;
    },
  },
  ctf: {
    getAll: (): CTFEntry[] => readJson<CTFEntry[]>("ctf.json"),
    getById: (id: string): CTFEntry | undefined =>
      readJson<CTFEntry[]>("ctf.json").find((c) => c.id === id),
    create: (entry: CTFEntry): void => {
      const entries = readJson<CTFEntry[]>("ctf.json");
      entries.push(entry);
      writeJson("ctf.json", entries);
    },
    update: (id: string, data: Partial<CTFEntry>): CTFEntry | null => {
      const entries = readJson<CTFEntry[]>("ctf.json");
      const index = entries.findIndex((c) => c.id === id);
      if (index === -1) return null;
      entries[index] = { ...entries[index], ...data };
      writeJson("ctf.json", entries);
      return entries[index];
    },
    delete: (id: string): boolean => {
      const entries = readJson<CTFEntry[]>("ctf.json");
      const filtered = entries.filter((c) => c.id !== id);
      if (filtered.length === entries.length) return false;
      writeJson("ctf.json", filtered);
      return true;
    },
  },
  blog: {
    getAll: (): BlogPost[] => readJson<BlogPost[]>("blog.json"),
    getPublished: (): BlogPost[] =>
      readJson<BlogPost[]>("blog.json").filter((b) => b.published),
    getById: (id: string): BlogPost | undefined =>
      readJson<BlogPost[]>("blog.json").find((b) => b.id === id),
    create: (post: BlogPost): void => {
      const posts = readJson<BlogPost[]>("blog.json");
      posts.push(post);
      writeJson("blog.json", posts);
    },
    update: (id: string, data: Partial<BlogPost>): BlogPost | null => {
      const posts = readJson<BlogPost[]>("blog.json");
      const index = posts.findIndex((b) => b.id === id);
      if (index === -1) return null;
      posts[index] = { ...posts[index], ...data };
      writeJson("blog.json", posts);
      return posts[index];
    },
    delete: (id: string): boolean => {
      const posts = readJson<BlogPost[]>("blog.json");
      const filtered = posts.filter((b) => b.id !== id);
      if (filtered.length === posts.length) return false;
      writeJson("blog.json", filtered);
      return true;
    },
  },
  profile: {
    get: (): Profile => readJson<Profile>("profile.json"),
    update: (data: Partial<Profile>): Profile => {
      const profile = readJson<Profile>("profile.json");
      const updated = { ...profile, ...data };
      writeJson("profile.json", updated);
      return updated;
    },
  },
};
