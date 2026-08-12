"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import Link from "next/link";
import BugHuntPanel from "@/components/BugHuntPanel";

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface CTFEntry {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  category: string;
  platform: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  readTime: string;
  published: boolean;
}

// ─── Sudo delete confirmation modal ───
function SudoConfirm({
  itemName,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const expected = `sudo rm ${itemName}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0c0c0c] border border-red-500/30 rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-500 text-xs font-[family-name:var(--font-mono)] ml-2">sudo verification</span>
        </div>
        <div className="font-[family-name:var(--font-mono)] text-xs space-y-3">
          <p className="text-red-400">[WARN] Destructive operation requires sudo verification.</p>
          <p className="text-gray-400">
            To confirm deletion of <span className="text-white">&quot;{itemName}&quot;</span>, type:
          </p>
          <div className="bg-[#111] border border-gray-800 rounded-lg px-4 py-3">
            <span className="text-green-400/60">$ </span>
            <span className="text-yellow-400">{expected}</span>
          </div>
          <div className="flex items-center bg-[#111] border border-gray-800 rounded-lg px-4 py-3">
            <span className="text-red-500">root</span>
            <span className="text-gray-600">@</span>
            <span className="text-green-400">ajaya</span>
            <span className="text-gray-600">:~$ </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typed.trim() === expected) onConfirm();
                if (e.key === "Escape") onCancel();
              }}
              className="flex-1 bg-transparent outline-none text-gray-200 caret-green-400 ml-1 text-xs font-[family-name:var(--font-mono)]"
              spellCheck={false}
            />
          </div>
          {typed.length > 0 && typed.trim() !== expected && (
            <p className="text-red-400/70 text-[10px]">Command does not match. Type exactly: {expected}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              disabled={typed.trim() !== expected}
              className="flex-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white py-2 rounded-lg text-xs font-[family-name:var(--font-mono)] transition-colors"
            >
              Execute
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg text-xs font-[family-name:var(--font-mono)] transition-colors"
            >
              Cancel [ESC]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic Edit Modal ───
function EditModal({
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  const mono = "font-[family-name:var(--font-mono)]";
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0c0c0c] border border-gray-700/50 rounded-xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-white text-sm font-semibold ${mono}`}>
            <span className="text-yellow-400">~</span> {title}
          </h3>
          <button onClick={onClose} className={`text-gray-500 hover:text-white text-xs ${mono} transition-colors`}>
            [ESC]
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            disabled={saving}
            className={`flex-1 bg-yellow-600/80 hover:bg-yellow-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs ${mono} transition-colors`}
          >
            {saving ? "Saving..." : "$ git commit --amend"}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg text-xs ${mono} transition-colors`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecurePanel() {
  const [token, setToken] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [loginForm, setLoginForm] = useState({ accessId: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotMsg, setForgotMsg] = useState("");
  const [tab, setTab] = useState<"projects" | "skills" | "ctf" | "blog" | "messages" | "security" | "bughunt">("projects");
  const [changePw, setChangePw] = useState({ current: "", newPw: "", confirm: "" });
  const [changePwStatus, setChangePwStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [changePwMsg, setChangePwMsg] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ctfEntries, setCtfEntries] = useState<CTFEntry[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // Sudo delete state
  const [sudoTarget, setSudoTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Edit modal state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [editCtf, setEditCtf] = useState<CTFEntry | null>(null);
  const [editBlog, setEditBlog] = useState<BlogPost | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit form buffers (tags as string for editing)
  const [editProjectForm, setEditProjectForm] = useState({ title: "", description: "", tags: "", liveUrl: "", githubUrl: "", featured: false });
  const [editSkillForm, setEditSkillForm] = useState({ name: "", category: "", proficiency: 80 });
  const [editCtfForm, setEditCtfForm] = useState({ name: "", description: "", difficulty: "Intermediate", category: "", platform: "" });
  const [editBlogForm, setEditBlogForm] = useState({ title: "", excerpt: "", content: "", tags: "", readTime: "5 min", published: true });

  // New item forms
  const [newProject, setNewProject] = useState({ title: "", description: "", tags: "", liveUrl: "", githubUrl: "", featured: false });
  const [newSkill, setNewSkill] = useState({ name: "", category: "", proficiency: 80 });
  const [newCtf, setNewCtf] = useState({ name: "", description: "", difficulty: "Intermediate", category: "", platform: "" });
  const [newBlog, setNewBlog] = useState({ title: "", excerpt: "", content: "", tags: "", readTime: "5 min", published: true });

  useEffect(() => {
    if (!isAuth || !token) return;
    const interval = setInterval(() => {
      fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (!data.valid) handleLogout(); })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, token]);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }), [token]);

  const loadData = useCallback(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
    fetch("/api/skills").then((r) => r.json()).then(setSkills).catch(() => {});
    fetch("/api/contact", { headers: authHeaders() }).then((r) => r.json()).then(setMessages).catch(() => {});
    fetch("/api/ctf").then((r) => r.json()).then(setCtfEntries).catch(() => {});
    fetch("/api/blog?all=1", { headers: authHeaders() }).then((r) => r.json()).then(setBlogPosts).catch(() => {});
  }, [authHeaders]);

  useEffect(() => {
    if (isAuth) loadData();
  }, [isAuth, loadData]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginForm.accessId, password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error); return; }
      setToken(data.token);
      setIsAuth(true);
    } catch {
      setLoginError("Network error");
    }
  };

  const handleLogout = () => { setToken(""); setIsAuth(false); };

  // ─── ADD handlers ───
  const addProject = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ...newProject, tags: newProject.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) { setNewProject({ title: "", description: "", tags: "", liveUrl: "", githubUrl: "", featured: false }); loadData(); }
  };

  const addSkill = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/skills", { method: "POST", headers: authHeaders(), body: JSON.stringify(newSkill) });
    if (res.ok) { setNewSkill({ name: "", category: "", proficiency: 80 }); loadData(); }
  };

  const addCtf = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ctf", { method: "POST", headers: authHeaders(), body: JSON.stringify(newCtf) });
    if (res.ok) { setNewCtf({ name: "", description: "", difficulty: "Intermediate", category: "", platform: "" }); loadData(); }
  };

  const addBlog = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/blog", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ...newBlog, tags: newBlog.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) { setNewBlog({ title: "", excerpt: "", content: "", tags: "", readTime: "5 min", published: true }); loadData(); }
  };

  // ─── EDIT openers ───
  const openEditProject = (p: Project) => {
    setEditProject(p);
    setEditProjectForm({ title: p.title, description: p.description, tags: p.tags.join(", "), liveUrl: p.liveUrl, githubUrl: p.githubUrl, featured: p.featured });
  };
  const openEditSkill = (s: Skill) => {
    setEditSkill(s);
    setEditSkillForm({ name: s.name, category: s.category, proficiency: s.proficiency });
  };
  const openEditCtf = (c: CTFEntry) => {
    setEditCtf(c);
    setEditCtfForm({ name: c.name, description: c.description, difficulty: c.difficulty, category: c.category, platform: c.platform });
  };
  const openEditBlog = (b: BlogPost) => {
    setEditBlog(b);
    setEditBlogForm({ title: b.title, excerpt: b.excerpt, content: b.content, tags: b.tags.join(", "), readTime: b.readTime, published: b.published });
  };

  // ─── SAVE handlers ───
  const saveProject = async () => {
    if (!editProject) return;
    setEditSaving(true);
    await fetch("/api/projects", {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ id: editProject.id, ...editProjectForm, tags: editProjectForm.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    setEditSaving(false);
    setEditProject(null);
    loadData();
  };

  const saveSkill = async () => {
    if (!editSkill) return;
    setEditSaving(true);
    await fetch("/api/skills", {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ id: editSkill.id, ...editSkillForm }),
    });
    setEditSaving(false);
    setEditSkill(null);
    loadData();
  };

  const saveCtf = async () => {
    if (!editCtf) return;
    setEditSaving(true);
    await fetch("/api/ctf", {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ id: editCtf.id, ...editCtfForm }),
    });
    setEditSaving(false);
    setEditCtf(null);
    loadData();
  };

  const saveBlog = async () => {
    if (!editBlog) return;
    setEditSaving(true);
    await fetch("/api/blog", {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ id: editBlog.id, ...editBlogForm, tags: editBlogForm.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    setEditSaving(false);
    setEditBlog(null);
    loadData();
  };

  // ─── DELETE ───
  const requestDelete = (type: string, id: string, name: string) => setSudoTarget({ type, id, name });

  const executeDelete = async () => {
    if (!sudoTarget) return;
    const endpoints: Record<string, string> = { project: "projects", skill: "skills", ctf: "ctf", blog: "blog", message: "contact" };
    await fetch(`/api/${endpoints[sudoTarget.type]}?id=${sudoTarget.id}`, { method: "DELETE", headers: authHeaders() });
    setSudoTarget(null);
    loadData();
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setForgotMsg(data.error); setForgotStatus("error"); return; }
      setForgotMsg(data.message); setForgotStatus("sent");
    } catch { setForgotMsg("Network error"); setForgotStatus("error"); }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setChangePwStatus("sending"); setChangePwMsg("");
    if (changePw.newPw !== changePw.confirm) { setChangePwMsg("Passwords do not match"); setChangePwStatus("error"); return; }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ currentPassword: changePw.current, newPassword: changePw.newPw, confirmPassword: changePw.confirm }),
      });
      const data = await res.json();
      if (!res.ok) { setChangePwMsg(data.error); setChangePwStatus("error"); return; }
      setChangePwMsg(data.message); setChangePwStatus("success");
      setChangePw({ current: "", newPw: "", confirm: "" });
      setTimeout(() => handleLogout(), 2000);
    } catch { setChangePwMsg("Network error"); setChangePwStatus("error"); }
  };

  const inputCls = "w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-mono)]";
  const inputClsEdit = "w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 font-[family-name:var(--font-mono)]";
  const mono = "font-[family-name:var(--font-mono)]";

  // ─── LOGIN SCREEN ───
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className={`${mono} text-xs text-green-500/60 mb-4`}>
              <span className="text-red-500">$</span> sudo verify --access
            </div>
            <h1 className="text-2xl font-bold text-white">Secure Access</h1>
            <p className={`text-gray-600 text-xs mt-2 ${mono}`}>Authorized personnel only</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
            <div>
              <label className={`block text-xs text-gray-500 mb-1.5 ${mono}`}>Access ID</label>
              <input type="text" required autoComplete="off" maxLength={32} spellCheck={false}
                placeholder="Enter your 16-character access ID"
                value={loginForm.accessId}
                onChange={(e) => setLoginForm({ ...loginForm, accessId: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={`block text-xs text-gray-500 mb-1.5 ${mono}`}>Access Key</label>
              <input type="password" required autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className={inputCls} />
            </div>
            {loginError && (
              <p className={`text-red-400 text-xs ${mono}`}>
                <span className="text-gray-600">[DENIED]</span> Authentication failed. Verify your credentials.
              </p>
            )}
            <button type="submit" className={`w-full bg-red-600/90 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors text-sm ${mono}`}>
              $ verify_access
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setShowForgot(true)} className={`text-gray-600 hover:text-red-400 text-xs ${mono} transition-colors`}>
                Forgot password?
              </button>
            </div>
          </form>
          {showForgot && (
            <div className="mt-4 bg-[#111] border border-red-900/30 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`text-sm text-white ${mono}`}><span className="text-red-500">$</span> password_reset</h3>
                <button onClick={() => { setShowForgot(false); setForgotStatus("idle"); }} className="text-gray-600 hover:text-white text-xs">&#10005;</button>
              </div>
              {forgotStatus === "sent" ? (
                <p className={`text-green-400 text-xs ${mono}`}>{forgotMsg}</p>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-gray-500 text-xs">Enter your registered identifier to receive a reset link.</p>
                  <input type="text" required placeholder="Registered identifier" autoComplete="off" spellCheck={false}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={inputCls} />
                  {forgotStatus === "error" && <p className={`text-red-400 text-xs ${mono}`}>{forgotMsg}</p>}
                  <button type="submit" disabled={forgotStatus === "sending"}
                    className={`w-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs ${mono} transition-colors`}>
                    {forgotStatus === "sending" ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = ["projects", "skills", "ctf", "blog", "messages", "security", "bughunt"] as const;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Modals */}
      {sudoTarget && (
        <SudoConfirm itemName={sudoTarget.name} onConfirm={executeDelete} onCancel={() => setSudoTarget(null)} />
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <EditModal title={`Edit Project: ${editProject.title}`} onClose={() => setEditProject(null)} onSave={saveProject} saving={editSaving}>
          <div className="grid sm:grid-cols-2 gap-4">
            <input placeholder="Title" value={editProjectForm.title}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
              className={inputClsEdit} />
            <input placeholder="Tags (comma-separated)" value={editProjectForm.tags}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, tags: e.target.value })}
              className={inputClsEdit} />
          </div>
          <textarea placeholder="Description" rows={3} value={editProjectForm.description}
            onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
            className={`${inputClsEdit} resize-none`} />
          <div className="grid sm:grid-cols-2 gap-4">
            <input placeholder="Live URL" value={editProjectForm.liveUrl}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, liveUrl: e.target.value })}
              className={inputClsEdit} />
            <input placeholder="GitHub URL" value={editProjectForm.githubUrl}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, githubUrl: e.target.value })}
              className={inputClsEdit} />
          </div>
          <label className={`flex items-center gap-2 text-xs text-gray-500 ${mono}`}>
            <input type="checkbox" checked={editProjectForm.featured}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, featured: e.target.checked })}
              className="rounded" />
            Featured
          </label>
        </EditModal>
      )}

      {/* Edit Skill Modal */}
      {editSkill && (
        <EditModal title={`Edit Skill: ${editSkill.name}`} onClose={() => setEditSkill(null)} onSave={saveSkill} saving={editSaving}>
          <div className="grid sm:grid-cols-2 gap-4">
            <input placeholder="Skill Name" value={editSkillForm.name}
              onChange={(e) => setEditSkillForm({ ...editSkillForm, name: e.target.value })}
              className={inputClsEdit} />
            <input list="skill-categories-edit" placeholder="Category (type or pick)" value={editSkillForm.category}
              onChange={(e) => setEditSkillForm({ ...editSkillForm, category: e.target.value })}
              className={inputClsEdit} />
            <datalist id="skill-categories-edit">
              <option value="Cybersecurity" />
              <option value="Security Tools" />
              <option value="Development" />
              <option value="Business &amp; Ops" />
              <option value="Networking" />
              <option value="Cloud" />
              <option value="DevOps" />
              <option value="Other" />
            </datalist>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs text-gray-500 ${mono} shrink-0`}>Proficiency</span>
            <input type="range" min={0} max={100} value={editSkillForm.proficiency}
              onChange={(e) => setEditSkillForm({ ...editSkillForm, proficiency: parseInt(e.target.value, 10) })}
              className="flex-1" />
            <span className={`text-white text-xs ${mono} w-10 shrink-0`}>{editSkillForm.proficiency}%</span>
          </div>
        </EditModal>
      )}

      {/* Edit CTF Modal */}
      {editCtf && (
        <EditModal title={`Edit CTF: ${editCtf.name}`} onClose={() => setEditCtf(null)} onSave={saveCtf} saving={editSaving}>
          <div className="grid sm:grid-cols-2 gap-4">
            <input placeholder="Challenge Name" value={editCtfForm.name}
              onChange={(e) => setEditCtfForm({ ...editCtfForm, name: e.target.value })}
              className={inputClsEdit} />
            <input placeholder="Category" value={editCtfForm.category}
              onChange={(e) => setEditCtfForm({ ...editCtfForm, category: e.target.value })}
              className={inputClsEdit} />
          </div>
          <textarea placeholder="Description" rows={2} value={editCtfForm.description}
            onChange={(e) => setEditCtfForm({ ...editCtfForm, description: e.target.value })}
            className={`${inputClsEdit} resize-none`} />
          <div className="grid sm:grid-cols-2 gap-4">
            <select value={editCtfForm.difficulty}
              onChange={(e) => setEditCtfForm({ ...editCtfForm, difficulty: e.target.value })}
              className={inputClsEdit}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <input placeholder="Platform" value={editCtfForm.platform}
              onChange={(e) => setEditCtfForm({ ...editCtfForm, platform: e.target.value })}
              className={inputClsEdit} />
          </div>
        </EditModal>
      )}

      {/* Edit Blog Modal */}
      {editBlog && (
        <EditModal title={`Edit Post: ${editBlog.title}`} onClose={() => setEditBlog(null)} onSave={saveBlog} saving={editSaving}>
          <input placeholder="Post Title" value={editBlogForm.title}
            onChange={(e) => setEditBlogForm({ ...editBlogForm, title: e.target.value })}
            className={inputClsEdit} />
          <textarea placeholder="Excerpt" rows={2} value={editBlogForm.excerpt}
            onChange={(e) => setEditBlogForm({ ...editBlogForm, excerpt: e.target.value })}
            className={`${inputClsEdit} resize-none`} />
          <textarea placeholder="Full Content" rows={5} value={editBlogForm.content}
            onChange={(e) => setEditBlogForm({ ...editBlogForm, content: e.target.value })}
            className={`${inputClsEdit} resize-none`} />
          <div className="grid sm:grid-cols-3 gap-4">
            <input placeholder="Tags (comma-separated)" value={editBlogForm.tags}
              onChange={(e) => setEditBlogForm({ ...editBlogForm, tags: e.target.value })}
              className={inputClsEdit} />
            <input placeholder="Read Time" value={editBlogForm.readTime}
              onChange={(e) => setEditBlogForm({ ...editBlogForm, readTime: e.target.value })}
              className={inputClsEdit} />
            <label className={`flex items-center gap-2 text-xs text-gray-500 ${mono}`}>
              <input type="checkbox" checked={editBlogForm.published}
                onChange={(e) => setEditBlogForm({ ...editBlogForm, published: e.target.checked })}
                className="rounded" />
              Published
            </label>
          </div>
        </EditModal>
      )}

      <header className="border-b border-gray-800/50 bg-[#0a0a0a]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className={`${mono} text-xs text-green-400`}>&lt;/&gt;</Link>
            <span className={`text-gray-700 text-xs ${mono}`}>[SECURE_PANEL]</span>
          </div>
          <button onClick={handleLogout} className={`text-gray-500 hover:text-red-400 text-xs transition-colors ${mono}`}>
            $ logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs ${mono} transition-all capitalize ${
                tab === t ? "bg-red-600/90 text-white" : "bg-[#111] text-gray-500 hover:text-white border border-gray-800/50"
              }`}>
              {t}
              {t === "messages" && messages.filter((m) => !m.read).length > 0 && (
                <span className="ml-2 bg-green-500 text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {messages.filter((m) => !m.read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════ PROJECTS TAB ═══════ */}
        {tab === "projects" && (
          <div className="space-y-6">
            <form onSubmit={addProject} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}><span className="text-red-500">+</span> New Project</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Title" required value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} className={inputCls} />
                <input placeholder="Tags (comma-separated)" value={newProject.tags}
                  onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })} className={inputCls} />
              </div>
              <textarea placeholder="Description" required rows={3} value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className={`${inputCls} resize-none`} />
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Live URL (https://...)" value={newProject.liveUrl}
                  onChange={(e) => setNewProject({ ...newProject, liveUrl: e.target.value })} className={inputCls} />
                <input placeholder="GitHub URL (https://...)" value={newProject.githubUrl}
                  onChange={(e) => setNewProject({ ...newProject, githubUrl: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-center justify-between">
                <label className={`flex items-center gap-2 text-xs text-gray-500 ${mono}`}>
                  <input type="checkbox" checked={newProject.featured}
                    onChange={(e) => setNewProject({ ...newProject, featured: e.target.checked })} className="rounded" />
                  Featured
                </label>
                <button type="submit" className={`bg-red-600/90 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-xs ${mono} transition-colors`}>
                  + Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="bg-[#111] border border-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-white text-sm ${mono}`}>{p.title}</h4>
                    <p className={`text-gray-600 text-xs ${mono}`}>{p.tags.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <button onClick={() => openEditProject(p)}
                      className={`text-yellow-400/60 hover:text-yellow-400 text-xs ${mono} transition-colors`}>
                      [edit]
                    </button>
                    <button onClick={() => requestDelete("project", p.id, p.title)}
                      className={`text-red-400/60 hover:text-red-400 text-xs ${mono} transition-colors`}>
                      [sudo rm]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ SKILLS TAB ═══════ */}
        {tab === "skills" && (
          <div className="space-y-6">
            <form onSubmit={addSkill} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}><span className="text-green-400">+</span> New Skill</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <input placeholder="Skill Name" required value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className={inputCls.replace("red-500", "green-500")} />
                <input list="skill-categories-new" placeholder="Category (type or pick)" required value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className={inputCls.replace("red-500", "green-500")} />
                <datalist id="skill-categories-new">
                  <option value="Cybersecurity" />
                  <option value="Security Tools" />
                  <option value="Development" />
                  <option value="Business &amp; Ops" />
                  <option value="Networking" />
                  <option value="Cloud" />
                  <option value="DevOps" />
                  <option value="Other" />
                </datalist>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} value={newSkill.proficiency}
                    onChange={(e) => setNewSkill({ ...newSkill, proficiency: parseInt(e.target.value, 10) })}
                    className="flex-1" />
                  <span className={`text-white text-xs ${mono} w-10`}>{newSkill.proficiency}%</span>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={`bg-green-600/80 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-xs ${mono} transition-colors`}>
                  + Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {skills.map((s) => (
                <div key={s.id} className="bg-[#111] border border-gray-800/50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className={`text-white text-xs ${mono} truncate`}>{s.name}</span>
                    <span className={`text-gray-700 text-xs ${mono} shrink-0`}>{s.category}</span>
                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.proficiency}%` }} />
                    </div>
                    <span className={`text-gray-500 text-[10px] ${mono} shrink-0`}>{s.proficiency}%</span>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <button onClick={() => openEditSkill(s)}
                      className={`text-yellow-400/60 hover:text-yellow-400 text-xs ${mono} transition-colors`}>
                      [edit]
                    </button>
                    <button onClick={() => requestDelete("skill", s.id, s.name)}
                      className={`text-red-400/60 hover:text-red-400 text-xs ${mono} transition-colors`}>
                      [sudo rm]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ CTF TAB ═══════ */}
        {tab === "ctf" && (
          <div className="space-y-6">
            <form onSubmit={addCtf} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}><span className="text-yellow-400">+</span> New CTF Challenge</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Challenge Name" required value={newCtf.name}
                  onChange={(e) => setNewCtf({ ...newCtf, name: e.target.value })} className={inputCls} />
                <input placeholder="Category (e.g., Offensive, Crypto, Forensics)" required value={newCtf.category}
                  onChange={(e) => setNewCtf({ ...newCtf, category: e.target.value })} className={inputCls} />
              </div>
              <textarea placeholder="Description" required rows={2} value={newCtf.description}
                onChange={(e) => setNewCtf({ ...newCtf, description: e.target.value })}
                className={`${inputCls} resize-none`} />
              <div className="grid sm:grid-cols-2 gap-4">
                <select value={newCtf.difficulty}
                  onChange={(e) => setNewCtf({ ...newCtf, difficulty: e.target.value })} className={inputCls}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <input placeholder="Platform (HackTheBox, TryHackMe...)" value={newCtf.platform}
                  onChange={(e) => setNewCtf({ ...newCtf, platform: e.target.value })} className={inputCls} />
              </div>
              <div className="flex justify-end">
                <button type="submit" className={`bg-yellow-600/80 hover:bg-yellow-600 text-white px-5 py-2 rounded-lg text-xs ${mono} transition-colors`}>
                  + Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {ctfEntries.map((c) => (
                <div key={c.id} className="bg-[#111] border border-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className={`text-white text-sm ${mono}`}>{c.name}</h4>
                      <span className={`text-[10px] ${mono} px-2 py-0.5 rounded border ${
                        c.difficulty === "Advanced" ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : c.difficulty === "Intermediate" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                      }`}>{c.difficulty}</span>
                    </div>
                    <p className={`text-gray-600 text-xs ${mono} mt-1`}>{c.category} — {c.platform}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <button onClick={() => openEditCtf(c)}
                      className={`text-yellow-400/60 hover:text-yellow-400 text-xs ${mono} transition-colors`}>
                      [edit]
                    </button>
                    <button onClick={() => requestDelete("ctf", c.id, c.name)}
                      className={`text-red-400/60 hover:text-red-400 text-xs ${mono} transition-colors`}>
                      [sudo rm]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ BLOG TAB ═══════ */}
        {tab === "blog" && (
          <div className="space-y-6">
            <form onSubmit={addBlog} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}><span className="text-red-500">+</span> New Blog Post</h3>
              <input placeholder="Post Title" required value={newBlog.title}
                onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })} className={inputCls} />
              <textarea placeholder="Excerpt (short summary)" required rows={2} value={newBlog.excerpt}
                onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                className={`${inputCls} resize-none`} />
              <textarea placeholder="Full Content (optional)" rows={4} value={newBlog.content}
                onChange={(e) => setNewBlog({ ...newBlog, content: e.target.value })}
                className={`${inputCls} resize-none`} />
              <div className="grid sm:grid-cols-3 gap-4">
                <input placeholder="Tags (comma-separated)" value={newBlog.tags}
                  onChange={(e) => setNewBlog({ ...newBlog, tags: e.target.value })} className={inputCls} />
                <input placeholder="Read Time (e.g., 5 min)" value={newBlog.readTime}
                  onChange={(e) => setNewBlog({ ...newBlog, readTime: e.target.value })} className={inputCls} />
                <label className={`flex items-center gap-2 text-xs text-gray-500 ${mono}`}>
                  <input type="checkbox" checked={newBlog.published}
                    onChange={(e) => setNewBlog({ ...newBlog, published: e.target.checked })} className="rounded" />
                  Published
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={`bg-red-600/90 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-xs ${mono} transition-colors`}>
                  + Publish
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {blogPosts.map((b) => (
                <div key={b.id} className="bg-[#111] border border-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className={`text-white text-sm ${mono} truncate`}>{b.title}</h4>
                      {!b.published && (
                        <span className={`text-[10px] ${mono} px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 shrink-0`}>Draft</span>
                      )}
                    </div>
                    <p className={`text-gray-600 text-xs ${mono} mt-1`}>{b.date} — {b.tags.join(", ")} — {b.readTime}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <button onClick={() => openEditBlog(b)}
                      className={`text-yellow-400/60 hover:text-yellow-400 text-xs ${mono} transition-colors`}>
                      [edit]
                    </button>
                    <button onClick={() => requestDelete("blog", b.id, b.title)}
                      className={`text-red-400/60 hover:text-red-400 text-xs ${mono} transition-colors`}>
                      [sudo rm]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ MESSAGES TAB ═══════ */}
        {tab === "messages" && (
          <div className="space-y-3">
            {messages.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className={`text-gray-500 text-xs ${mono}`}>
                  {messages.filter(m => !m.read).length} unread / {messages.length} total
                </span>
                {messages.some(m => !m.read) && (
                  <button
                    onClick={async () => {
                      const unread = messages.filter(m => !m.read);
                      for (const m of unread) {
                        await fetch("/api/contact", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: m.id }) });
                      }
                      loadData();
                    }}
                    className={`text-green-400/70 hover:text-green-400 text-xs ${mono} transition-colors`}>
                    [mark all as read]
                  </button>
                )}
              </div>
            )}
            {messages.length === 0 && (
              <p className={`text-gray-600 text-center py-12 ${mono} text-xs`}>No messages in queue.</p>
            )}
            {messages.map((m) => (
              <div key={m.id}
                onClick={async () => {
                  if (!m.read) {
                    await fetch("/api/contact", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: m.id }) });
                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, read: true } : msg));
                  }
                }}
                className={`bg-[#111] border rounded-lg p-5 cursor-pointer transition-all ${
                  m.read ? "border-gray-800/50" : "border-green-500/30 hover:border-green-500/50"
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {!m.read && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />}
                    <div>
                      <h4 className={`text-white text-sm ${mono}`}>{m.subject}</h4>
                      <p className={`text-gray-600 text-xs ${mono}`}>From: {m.name} ({m.email})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-gray-700 text-[10px] ${mono}`}>{new Date(m.createdAt).toLocaleDateString()}</span>
                    {!m.read && <span className={`text-green-400 text-[10px] ${mono} bg-green-500/10 px-1.5 py-0.5 rounded`}>NEW</span>}
                    <button onClick={(e) => { e.stopPropagation(); requestDelete("message", m.id, m.subject); }}
                      className={`text-red-400/60 hover:text-red-400 text-xs ${mono} transition-colors`}>
                      [sudo rm]
                    </button>
                  </div>
                </div>
                <p className={`text-gray-400 text-xs leading-relaxed ${mono}`}>{m.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══════ SECURITY TAB ═══════ */}
        {tab === "security" && (
          <div className="space-y-6">
            <form onSubmit={handleChangePassword} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}><span className="text-red-500">&#9888;</span> Change Password</h3>
              <p className="text-gray-500 text-xs">After changing, you will be logged out.</p>
              <div>
                <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>Current Password</label>
                <input type="password" required autoComplete="current-password" value={changePw.current}
                  onChange={(e) => setChangePw({ ...changePw, current: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>New Password</label>
                <input type="password" required autoComplete="new-password" value={changePw.newPw}
                  onChange={(e) => setChangePw({ ...changePw, newPw: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>Confirm New Password</label>
                <input type="password" required autoComplete="new-password" value={changePw.confirm}
                  onChange={(e) => setChangePw({ ...changePw, confirm: e.target.value })} className={inputCls} />
              </div>
              <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-lg p-3">
                <p className={`text-[10px] text-gray-500 ${mono} mb-1`}>Password Requirements:</p>
                <ul className={`text-[10px] text-gray-600 ${mono} space-y-0.5`}>
                  <li>&#8226; Min 12 characters with uppercase, lowercase, number, and special char</li>
                  <li>&#8226; No common patterns (password, admin, 123456, etc.)</li>
                  <li>&#8226; Must differ from current password</li>
                </ul>
              </div>
              {changePwStatus === "error" && (
                <p className={`text-red-400 text-xs ${mono}`}><span className="text-gray-600">[ERROR]</span> {changePwMsg}</p>
              )}
              {changePwStatus === "success" && (
                <p className={`text-green-400 text-xs ${mono}`}><span className="text-gray-600">[OK]</span> {changePwMsg}</p>
              )}
              <button type="submit" disabled={changePwStatus === "sending"}
                className={`bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-xs ${mono} transition-colors`}>
                {changePwStatus === "sending" ? "Updating..." : "$ passwd --change"}
              </button>
            </form>

            <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6">
              <h3 className={`text-sm font-semibold text-white ${mono} mb-4`}><span className="text-green-400">&#9679;</span> Security Status</h3>
              <div className={`space-y-3 text-xs ${mono}`}>
                {[
                  ["JWT Token Expiry", "2 hours (auto-logout)"],
                  ["Idle Timeout", "30 min inactivity → session killed"],
                  ["Token Storage", "In-memory only (no persistence)"],
                  ["Session Revalidation", "Server check every 5 min"],
                  ["Brute Force Protection", "5 attempts / 15min lockout"],
                  ["API Rate Limiting", "60 req / 15min window"],
                  ["Contact Form Limit", "1 req / 10 sec cooldown"],
                  ["Input Sanitization", "XSS / SQLi / template injection blocked"],
                  ["Password Reset", "15min token / single-use"],
                  ["Delete Protection", "sudo command verification"],
                  ["HSTS", "Enabled (2yr max-age)"],
                  ["DPDPA Compliance", "90-day retention / erasure portal"],
                  ["Email Alerts", "Password change / suspicious activity / lockout"],
                  ["DevTools Blocking", "F12 / Ctrl+Shift+I / right-click disabled"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-gray-400">
                    <span>{label}</span>
                    <span className="text-green-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BUG HUNTING TAB ═══════ */}
        {tab === "bughunt" && <BugHuntPanel authHeaders={authHeaders} />}
      </div>
    </div>
  );
}
