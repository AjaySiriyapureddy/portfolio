"use client";

import { useEffect, useState } from "react";

interface CTFEntry {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  category: string;
  platform: string;
}

export default function CTFSection() {
  const [entries, setEntries] = useState<CTFEntry[]>([]);

  useEffect(() => {
    fetch("/api/ctf")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {});
  }, []);

  const diffColor = (d: string) => {
    const lower = d.toLowerCase();
    if (lower === "advanced") return "red";
    if (lower === "intermediate") return "yellow";
    return "green";
  };

  return (
    <section id="ctf" className="py-24 px-4 bg-[#080808]/75">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== CTF_WRITEUPS =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            CTF <span className="text-green-400">Challenges</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Areas of expertise in Capture The Flag competitions and security challenges.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => {
            const color = diffColor(entry.difficulty);
            return (
              <div
                key={entry.id}
                className="bg-[#111] border border-gray-800/50 rounded-xl p-5 hover:border-green-900/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors font-[family-name:var(--font-mono)]">
                    {entry.name}
                  </h3>
                  <span
                    className={`text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded border ${
                      color === "red"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : color === "yellow"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {entry.difficulty}
                  </span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed mb-2">
                  {entry.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                    {entry.category}
                  </span>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-green-500/60 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10">
                    {entry.platform}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal-style stats */}
        <div className="mt-12 bg-[#111] border border-gray-800/50 rounded-xl p-6 font-[family-name:var(--font-mono)] text-xs">
          <div className="text-green-500/60 mb-3">$ cat ~/ctf_stats.txt</div>
          <div className="space-y-1 text-gray-400">
            <div>
              <span className="text-red-400">Platforms:</span> HackTheBox, TryHackMe,
              CTFtime, PicoCTF
            </div>
            <div>
              <span className="text-red-400">Focus Areas:</span> Web Exploitation,
              Privilege Escalation, OSINT
            </div>
            <div>
              <span className="text-red-400">Philosophy:</span> Break things to understand
              how to build them securely
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
