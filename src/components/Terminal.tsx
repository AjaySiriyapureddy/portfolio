"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface TermLine {
  type: "input" | "output" | "error" | "system";
  text: string;
}

interface Project { id: string; title: string; description: string; tags: string[]; }
interface SkillItem { id: string; name: string; category: string; proficiency: number; }
interface CTFEntry { id: string; name: string; description: string; difficulty: string; category: string; platform: string; }
interface BlogPost { id: string; title: string; excerpt: string; date: string; tags: string[]; }
interface Profile { name: string; title: string; bio: string; email: string; social: { github: string; linkedin: string; twitter: string; }; }

export default function Terminal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [lines, setLines] = useState<TermLine[]>([
    { type: "system", text: "Linux ajaya-sec 6.1.0-kali9-amd64 #1 SMP x86_64 GNU/Linux" },
    { type: "system", text: "" },
    { type: "system", text: "Welcome to Ajaya's Security Portfolio Terminal" },
    { type: "system", text: 'Type "help" for available commands. Tab to autocomplete.' },
    { type: "system", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cwd, setCwd] = useState("~");

  // Cached API data
  const cache = useRef<{
    profile?: Profile; projects?: Project[]; skills?: SkillItem[];
    ctf?: CTFEntry[]; blog?: BlogPost[];
  }>({});

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, isMinimized]);

  const add = (type: TermLine["type"], text: string) => setLines(p => [...p, { type, text }]);
  const addMany = (ls: TermLine[]) => setLines(p => [...p, ...ls]);

  const fetchApi = async (endpoint: string) => {
    try { const r = await fetch(`/api/${endpoint}`); return await r.json(); } catch { return null; }
  };

  const ensureProjects = async () => { if (!cache.current.projects) cache.current.projects = await fetchApi("projects"); return cache.current.projects || []; };
  const ensureSkills = async () => { if (!cache.current.skills) cache.current.skills = await fetchApi("skills"); return cache.current.skills || []; };
  const ensureCtf = async () => { if (!cache.current.ctf) cache.current.ctf = await fetchApi("ctf"); return cache.current.ctf || []; };
  const ensureBlog = async () => { if (!cache.current.blog) cache.current.blog = await fetchApi("blog"); return cache.current.blog || []; };
  const ensureProfile = async () => { if (!cache.current.profile) cache.current.profile = await fetchApi("profile"); return cache.current.profile; };

  const COMMANDS = [
    "help","whoami","ls","cat","cd","pwd","clear","uname","neofetch",
    "skills","projects","ctf","blog","contact","social","history",
    "date","uptime","ping","nmap","sudo","exit","echo","id","hostname","ifconfig",
  ];

  // Dynamic filesystem — directories resolve from API
  const staticDirs = new Set(["~","~/projects","~/skills","~/ctf","~/blog","~/.ssh"]);

  const resolveDir = (dir: string): string => {
    if (!dir || dir === "~") return "~";
    const clean = dir.replace(/\/$/, "");
    if (clean.startsWith("~/")) return clean;
    if (clean.startsWith("/home/ajaya")) return clean.replace("/home/ajaya", "~");
    if (cwd === "~") return `~/${clean}`;
    return `${cwd}/${clean}`;
  };

  const isValidDir = (target: string) => staticDirs.has(target);

  // List contents of a directory — returns file entries from API
  const listDir = async (target: string): Promise<string[] | null> => {
    switch (target) {
      case "~":
        return ["projects/","skills/","ctf/","blog/","contact.txt","README.md",".ssh/",".bash_history"];
      case "~/.ssh":
        return ["authorized_keys","known_hosts"];
      case "~/projects": {
        const projs = await ensureProjects();
        return projs.map(p => p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".txt");
      }
      case "~/skills": {
        const sk = await ensureSkills();
        const cats = [...new Set(sk.map(s => s.category))];
        return cats.map(c => c.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".txt");
      }
      case "~/ctf": {
        const entries = await ensureCtf();
        return [...entries.map(e => e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".txt"), "stats.txt"];
      }
      case "~/blog": {
        const posts = await ensureBlog();
        return posts.map(p => p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40) + ".txt");
      }
      default:
        return null;
    }
  };

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    add("input", `root@ajaya:${cwd}$ ${trimmed}`);
    setHistory(p => [...p, trimmed]);
    setHistIndex(-1);

    // Support chained commands with && and ;
    const cmds = trimmed.split(/\s*&&\s*|\s*;\s*/);
    for (const singleCmd of cmds) {
      await execSingle(singleCmd.trim());
    }
  };

  const execSingle = async (trimmed: string) => {
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case "help":
        addMany([
          { type: "output", text: "" },
          { type: "system", text: "  ╔══════════════════════════════════════════════════════╗" },
          { type: "system", text: "  ║      AJAYA'S SECURITY TERMINAL — COMMANDS            ║" },
          { type: "system", text: "  ╚══════════════════════════════════════════════════════╝" },
          { type: "output", text: "" },
          { type: "output", text: "  Navigation:                   Portfolio:" },
          { type: "output", text: "    ls [dir]     List files        whoami    About me" },
          { type: "output", text: "    cd <dir>     Change dir        projects  All projects" },
          { type: "output", text: "    cat <file>   Read file         skills    Skill matrix" },
          { type: "output", text: "    pwd          Print path        ctf       CTF entries" },
          { type: "output", text: "                                   blog      Blog posts" },
          { type: "output", text: "  System:                          contact   Contact info" },
          { type: "output", text: "    neofetch     System info        social    Social links" },
          { type: "output", text: "    uname -a     Kernel info" },
          { type: "output", text: "    id / hostname / date / uptime / ifconfig" },
          { type: "output", text: "    clear        Clear screen     Hacker:" },
          { type: "output", text: "    history      Cmd history        nmap <target>" },
          { type: "output", text: "    exit / close  Close terminal    ping <host>" },
          { type: "output", text: "                                    sudo <cmd>  ;)" },
          { type: "output", text: "" },
          { type: "output", text: "  Tip: Use && to chain: cd projects && ls" },
          { type: "output", text: "" },
        ]);
        break;

      case "whoami": {
        const p = await ensureProfile();
        if (p) {
          addMany([
            { type: "output", text: "" },
            { type: "system", text: `  ┌── ${p.name} ──┐` },
            { type: "output", text: `  │ Role     : ${p.title}` },
            { type: "output", text: `  │ Email    : ${p.email}` },
            { type: "output", text: `  │ GitHub   : ${p.social.github}` },
            { type: "output", text: `  │ LinkedIn : ${p.social.linkedin}` },
            { type: "output", text: `  │ X        : ${p.social.twitter}` },
            { type: "output", text: `  └───────────────────────┘` },
            { type: "output", text: "" },
          ]);
        } else add("output", "root");
        break;
      }

      case "ls": {
        const target = args[0] ? resolveDir(args[0]) : cwd;
        const contents = await listDir(target);
        if (contents) {
          const formatted = contents.map(f => {
            if (f.endsWith("/")) return `\x1b[1;34m${f}\x1b[0m`;
            if (f.startsWith(".")) return `\x1b[90m${f}\x1b[0m`;
            return f;
          });
          // Display in columns
          const colWidth = 30;
          const perRow = 3;
          for (let i = 0; i < formatted.length; i += perRow) {
            const row = formatted.slice(i, i + perRow).map(f => f.padEnd(colWidth)).join("");
            add("output", "  " + row);
          }
        } else {
          add("error", `ls: cannot access '${args[0] || target}': No such file or directory`);
        }
        break;
      }

      case "cd": {
        if (!args[0] || args[0] === "~" || args[0] === "/home/ajaya") {
          setCwd("~");
        } else if (args[0] === "..") {
          if (cwd !== "~") {
            const parent = cwd.split("/").slice(0, -1).join("/") || "~";
            setCwd(parent);
          }
        } else if (args[0] === "-") {
          // cd - (go back) - simplified, just go home
          setCwd("~");
        } else {
          const target = resolveDir(args[0]);
          if (isValidDir(target)) {
            setCwd(target);
          } else {
            add("error", `bash: cd: ${args[0]}: No such file or directory`);
          }
        }
        break;
      }

      case "pwd":
        add("output", `/home/ajaya${cwd === "~" ? "" : cwd.replace("~", "")}`);
        break;

      case "cat": {
        if (!args[0]) { add("error", "cat: missing operand"); break; }
        await handleCat(args[0]);
        break;
      }

      case "projects": {
        const projs = await ensureProjects();
        const out: TermLine[] = [{ type: "output", text: "" }, { type: "system", text: "  ══════ PROJECTS ══════" }, { type: "output", text: "" }];
        projs.forEach(p => {
          out.push({ type: "output", text: `  [*] ${p.title}` });
          out.push({ type: "output", text: `      Tags: ${p.tags.join(", ")}` });
          out.push({ type: "output", text: `      ${p.description.substring(0, 100)}` });
          out.push({ type: "output", text: "" });
        });
        out.push({ type: "output", text: `  Total: ${projs.length} projects.` }, { type: "output", text: "" });
        addMany(out);
        break;
      }

      case "skills": {
        const sk = await ensureSkills();
        const cats = [...new Set(sk.map(s => s.category))];
        const out: TermLine[] = [{ type: "output", text: "" }, { type: "system", text: "  ══════ SKILL MATRIX ══════" }, { type: "output", text: "" }];
        cats.forEach(cat => {
          out.push({ type: "output", text: `  ┌─ ${cat} ─┐` });
          sk.filter(s => s.category === cat).forEach(s => {
            const filled = Math.floor(s.proficiency / 5);
            const bar = "█".repeat(filled) + "░".repeat(20 - filled);
            out.push({ type: "output", text: `  │ ${s.name.padEnd(24)} ${bar} ${s.proficiency}%` });
          });
          out.push({ type: "output", text: "  └───────────────────┘" }, { type: "output", text: "" });
        });
        addMany(out);
        break;
      }

      case "ctf": {
        const entries = await ensureCtf();
        const out: TermLine[] = [{ type: "output", text: "" }, { type: "system", text: "  ══════ CTF CHALLENGES ══════" }, { type: "output", text: "" }];
        entries.forEach(e => {
          const tag = e.difficulty === "Advanced" ? "[!!!]" : e.difficulty === "Intermediate" ? "[!!]" : "[!]";
          out.push({ type: "output", text: `  ${tag} ${e.name}  (${e.platform})` });
          out.push({ type: "output", text: `      └─ ${e.description.substring(0, 90)}` });
          out.push({ type: "output", text: "" });
        });
        out.push({ type: "output", text: `  Total: ${entries.length} challenge areas.` }, { type: "output", text: "" });
        addMany(out);
        break;
      }

      case "blog": {
        const posts = await ensureBlog();
        const out: TermLine[] = [{ type: "output", text: "" }, { type: "system", text: "  ══════ SECURITY BLOG ══════" }, { type: "output", text: "" }];
        posts.forEach(p => {
          out.push({ type: "output", text: `  [${p.date}] ${p.title}` });
          out.push({ type: "output", text: `            Tags: ${p.tags.join(", ")}` });
          out.push({ type: "output", text: "" });
        });
        out.push({ type: "output", text: `  Total: ${posts.length} posts.` }, { type: "output", text: "" });
        addMany(out);
        break;
      }

      case "contact": {
        const p = await ensureProfile();
        addMany([
          { type: "output", text: "" },
          { type: "system", text: "  ══════ CONTACT ══════" },
          { type: "output", text: `  Email    : ${p?.email || "vluninf0o@gmail.com"}` },
          { type: "output", text: `  GitHub   : ${p?.social?.github || ""}` },
          { type: "output", text: `  LinkedIn : ${p?.social?.linkedin || ""}` },
          { type: "output", text: `  X        : ${p?.social?.twitter || ""}` },
          { type: "output", text: "" },
        ]);
        break;
      }

      case "social": {
        const p = await ensureProfile();
        addMany([
          { type: "output", text: "" },
          { type: "output", text: `  GitHub   : ${p?.social?.github || "N/A"}` },
          { type: "output", text: `  LinkedIn : ${p?.social?.linkedin || "N/A"}` },
          { type: "output", text: `  X        : ${p?.social?.twitter || "N/A"}` },
          { type: "output", text: "" },
        ]);
        break;
      }

      case "neofetch":
        addMany([
          { type: "output", text: "" },
          { type: "system", text: "         ██╗  ██╗  █████╗        root@ajaya" },
          { type: "system", text: "         ██║  ██║ ██╔══██╗       ──────────────────" },
          { type: "system", text: "         ███████║ ███████║       OS: AjayaSec Linux x86_64" },
          { type: "system", text: "         ██╔══██║ ██╔══██║       Host: Portfolio v2.0" },
          { type: "system", text: "         ██║  ██║ ██║  ██║       Kernel: Next.js 16.2.6" },
          { type: "system", text: "         ╚═╝  ╚═╝ ╚═╝  ╚═╝       Uptime: Always Online" },
          { type: "output", text: "                                  Shell: bash 5.2.15" },
          { type: "output", text: "  Role: Security Analyst &        Theme: Hacker [Dark/Red/Green]" },
          { type: "output", text: "        Researcher                Terminal: xterm-256color" },
          { type: "output", text: "  Specs:                          CPU: VAPT Engine @ 100%" },
          { type: "output", text: "   - VAPT & Red Teaming           Memory: Ideas (Unlimited)" },
          { type: "output", text: "   - Full-Stack Dev" },
          { type: "output", text: "   - Business Development         ███████████████████████" },
          { type: "output", text: "" },
        ]);
        break;

      case "uname":
        add("output", args[0] === "-a" ? "Linux ajaya-sec 6.1.0-kali9-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux" : "Linux");
        break;

      case "id": add("output", "uid=0(root) gid=0(root) groups=0(root),27(sudo),1000(ajaya)"); break;
      case "hostname": add("output", "ajaya-sec"); break;
      case "date": add("output", new Date().toString()); break;
      case "uptime": add("output", ` ${new Date().toLocaleTimeString()} up 365 days, 0:00, 1 user, load average: 0.42, 0.31, 0.28`); break;
      case "ifconfig":
        addMany([
          { type: "output", text: "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500" },
          { type: "output", text: "        inet 10.0.0.42  netmask 255.255.255.0  broadcast 10.0.0.255" },
          { type: "output", text: "        inet6 fe80::1337:dead:beef:cafe  prefixlen 64" },
          { type: "output", text: "        ether de:ad:be:ef:ca:fe  txqueuelen 1000" },
          { type: "output", text: "" },
          { type: "output", text: "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536" },
          { type: "output", text: "        inet 127.0.0.1  netmask 255.0.0.0" },
          { type: "output", text: "" },
        ]); break;

      case "ping":
        if (!args[0]) { add("error", "ping: usage error: Destination address required"); break; }
        addMany([
          { type: "output", text: `PING ${args[0]} (10.0.0.42) 56(84) bytes of data.` },
          { type: "output", text: `64 bytes from ${args[0]}: icmp_seq=1 ttl=64 time=0.042 ms` },
          { type: "output", text: `64 bytes from ${args[0]}: icmp_seq=2 ttl=64 time=0.038 ms` },
          { type: "output", text: `64 bytes from ${args[0]}: icmp_seq=3 ttl=64 time=0.041 ms` },
          { type: "output", text: "" },
          { type: "output", text: `--- ${args[0]} ping statistics ---` },
          { type: "output", text: "3 packets transmitted, 3 received, 0% packet loss" },
          { type: "output", text: "" },
        ]); break;

      case "nmap":
        if (!args[0]) { add("error", "Usage: nmap <target>"); break; }
        addMany([
          { type: "output", text: `Starting Nmap 7.94 ( https://nmap.org )` },
          { type: "output", text: `Nmap scan report for ${args[0]}` },
          { type: "output", text: "Host is up (0.0042s latency)." },
          { type: "output", text: "" },
          { type: "output", text: "PORT     STATE  SERVICE      VERSION" },
          { type: "output", text: "22/tcp   open   ssh          OpenSSH 9.2" },
          { type: "output", text: "80/tcp   open   http         Next.js 16.2.6" },
          { type: "output", text: "443/tcp  open   https        TLS 1.3" },
          { type: "output", text: "3000/tcp closed http-proxy" },
          { type: "output", text: "" },
          { type: "output", text: "Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds" },
          { type: "output", text: "" },
        ]); break;

      case "sudo":
        addMany([
          { type: "error", text: "" },
          { type: "error", text: "  ⚠ Nice try! This incident will be reported." },
          { type: "error", text: "  [sudo] password for visitor: " },
          { type: "error", text: "  Sorry, user 'visitor' is not in the sudoers file." },
          { type: "error", text: "" },
        ]); break;

      case "rm":
        if (args.includes("-rf") && (args.includes("/") || args.includes("/*"))) {
          addMany([
            { type: "error", text: "" },
            { type: "error", text: "  ██████╗  █████╗ ███╗   ██╗ ██████╗ ███████╗██████╗ " },
            { type: "error", text: "  ██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔════╝██╔══██╗" },
            { type: "error", text: "  ██║  ██║███████║██╔██╗ ██║██║  ███╗█████╗  ██████╔╝" },
            { type: "error", text: "  ██║  ██║██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██╔══██╗" },
            { type: "error", text: "  ██████╔╝██║  ██║██║ ╚████║╚██████╔╝███████╗██║  ██║" },
            { type: "error", text: "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝" },
            { type: "error", text: "  Nice try. This portfolio is protected." },
            { type: "error", text: "" },
          ]);
        } else add("error", "rm: operation not permitted in visitor mode");
        break;

      case "echo": add("output", args.join(" ").replace(/^["']|["']$/g, "")); break;
      case "clear": setLines([]); break;
      case "history": history.forEach((h, i) => add("output", `  ${(i + 1).toString().padStart(4)}  ${h}`)); break;
      case "exit": case "close": onClose(); break;

      default:
        add("error", `bash: ${command}: command not found. Type 'help' for commands.`);
    }
  };

  const handleCat = async (file: string) => {
    // Determine which directory context we're in
    const fullPath = file.startsWith("~/") || file.startsWith("/") ? file : (cwd === "~" ? file : `${cwd.replace("~/", "")}/${file}`);

    // Normalize for matching
    const norm = fullPath.replace(/^~\//, "").replace(/\.txt$/, "");

    if (file === "README.md" || fullPath === "README.md") {
      addMany([
        { type: "output", text: "" },
        { type: "system", text: "# Ajaya Siriyapureddy — Security Portfolio" },
        { type: "output", text: "" },
        { type: "output", text: "Business Dev | Developer | Security Analyst & Researcher" },
        { type: "output", text: "Specializing in VAPT & Red Teaming" },
        { type: "output", text: "" },
        { type: "output", text: "Hardened against OWASP Top 10, SANS guidelines, DPDPA Act." },
        { type: "output", text: "Navigate using commands or scroll the visual portfolio." },
        { type: "output", text: "" },
      ]);
      return;
    }

    if (file === "contact.txt" || fullPath === "contact.txt") {
      const p = await ensureProfile();
      addMany([
        { type: "output", text: `Email   : ${p?.email || "vluninf0o@gmail.com"}` },
        { type: "output", text: `GitHub  : ${p?.social?.github || ""}` },
        { type: "output", text: `LinkedIn: ${p?.social?.linkedin || ""}` },
        { type: "output", text: `X       : ${p?.social?.twitter || ""}` },
      ]);
      return;
    }

    if (file === ".bash_history") {
      addMany([
        { type: "output", text: "nmap -sV -A 10.10.10.42" },
        { type: "output", text: "gobuster dir -u http://target -w /usr/share/wordlists/dirb/big.txt" },
        { type: "output", text: "sqlmap -u http://target/page?id=1 --dbs" },
        { type: "output", text: "hashcat -m 1000 hashes.txt rockyou.txt" },
        { type: "output", text: "msfconsole -q" },
        { type: "output", text: "python3 exploit.py --target 10.10.10.42 --port 4444" },
      ]);
      return;
    }

    if (norm === "ctf/stats" || fullPath === "ctf/stats.txt") {
      addMany([
        { type: "output", text: "Platforms : HackTheBox, TryHackMe, CTFtime, PicoCTF" },
        { type: "output", text: "Focus     : Web Exploitation, Privilege Escalation, OSINT" },
        { type: "output", text: "Philosophy: Break things to build them securely" },
      ]);
      return;
    }

    // Try to match project files
    if (cwd === "~/projects" || norm.startsWith("projects/")) {
      const projs = await ensureProjects();
      const target = file.replace(/\.txt$/, "");
      const proj = projs.find(p => p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target);
      if (proj) {
        addMany([
          { type: "output", text: "" },
          { type: "system", text: `  ═══ ${proj.title} ═══` },
          { type: "output", text: `  ${proj.description}` },
          { type: "output", text: `  Tags: ${proj.tags.join(", ")}` },
          { type: "output", text: "" },
        ]);
        return;
      }
    }

    // Try to match skill category files
    if (cwd === "~/skills" || norm.startsWith("skills/")) {
      const sk = await ensureSkills();
      const target = file.replace(/\.txt$/, "");
      const catSkills = sk.filter(s => s.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target);
      if (catSkills.length > 0) {
        addMany([
          { type: "output", text: "" },
          { type: "system", text: `  ═══ ${catSkills[0].category} ═══` },
          ...catSkills.map(s => {
            const filled = Math.floor(s.proficiency / 5);
            return { type: "output" as const, text: `  ${s.name.padEnd(24)} ${"█".repeat(filled)}${"░".repeat(20-filled)} ${s.proficiency}%` };
          }),
          { type: "output", text: "" },
        ]);
        return;
      }
    }

    // Try CTF files
    if (cwd === "~/ctf" || norm.startsWith("ctf/")) {
      const entries = await ensureCtf();
      const target = file.replace(/\.txt$/, "");
      const entry = entries.find(e => e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target);
      if (entry) {
        addMany([
          { type: "output", text: "" },
          { type: "system", text: `  ═══ ${entry.name} [${entry.difficulty}] ═══` },
          { type: "output", text: `  ${entry.description}` },
          { type: "output", text: `  Category: ${entry.category} | Platform: ${entry.platform}` },
          { type: "output", text: "" },
        ]);
        return;
      }
    }

    // Try blog files
    if (cwd === "~/blog" || norm.startsWith("blog/")) {
      const posts = await ensureBlog();
      const target = file.replace(/\.txt$/, "");
      const post = posts.find(p => p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40) === target);
      if (post) {
        addMany([
          { type: "output", text: "" },
          { type: "system", text: `  ═══ ${post.title} ═══` },
          { type: "output", text: `  Date: ${post.date} | Tags: ${post.tags.join(", ")}` },
          { type: "output", text: `  ${post.excerpt}` },
          { type: "output", text: "" },
        ]);
        return;
      }
    }

    add("error", `cat: ${file}: No such file or directory`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { handleCommand(input); setInput(""); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const idx = histIndex === -1 ? history.length - 1 : Math.max(0, histIndex - 1);
        setHistIndex(idx); setInput(history[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex >= 0) {
        const idx = histIndex + 1;
        if (idx >= history.length) { setHistIndex(-1); setInput(""); }
        else { setHistIndex(idx); setInput(history[idx]); }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const partial = input.toLowerCase();
      const matches = COMMANDS.filter(c => c.startsWith(partial));
      if (matches.length === 1) setInput(matches[0]);
      else if (matches.length > 1) {
        add("input", `root@ajaya:${cwd}$ ${input}`);
        add("output", matches.join("  "));
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault(); setLines([]);
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <button onClick={() => setIsMinimized(false)}
          className="bg-[#111] border border-green-500/30 rounded-lg px-4 py-2 flex items-center gap-2 hover:border-green-500/60 transition-all shadow-lg">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-400 font-[family-name:var(--font-mono)] text-xs">terminal — bash</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:bottom-6 md:right-6 md:left-auto md:w-[720px]">
      <div className="bg-[#0c0c0c] border border-gray-700/50 md:rounded-xl overflow-hidden shadow-2xl shadow-black/80">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" aria-label="Close terminal" title="Close" />
            <button onClick={() => setIsMinimized(true)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" aria-label="Minimize" title="Minimize" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-500 text-xs font-[family-name:var(--font-mono)]">
            root@ajaya: {cwd} — bash
          </span>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xs font-[family-name:var(--font-mono)] transition-colors" title="Close terminal">
            ✕
          </button>
        </div>

        {/* Terminal output */}
        <div ref={scrollRef} onClick={() => inputRef.current?.focus()}
          className="h-[350px] md:h-[420px] overflow-y-auto p-4 font-[family-name:var(--font-mono)] text-sm leading-6 cursor-text select-text">
          {lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${
              line.type === "error" ? "text-red-400"
              : line.type === "system" ? "text-green-400"
              : line.type === "input" ? "text-gray-300"
              : "text-gray-400"
            }`}>
              {line.text}
            </div>
          ))}

          <div className="flex items-center text-gray-300">
            <span className="text-red-500">root</span>
            <span className="text-gray-600">@</span>
            <span className="text-green-400">ajaya</span>
            <span className="text-gray-600">:</span>
            <span className="text-blue-400">{cwd}</span>
            <span className="text-gray-600">$ </span>
            <input ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-200 caret-green-400 ml-1"
              spellCheck={false} autoComplete="off" autoCapitalize="off" />
          </div>
        </div>
      </div>
    </div>
  );
}
