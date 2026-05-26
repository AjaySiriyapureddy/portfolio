"use client";

import { useEffect, useState } from "react";

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
}

function getProjectIcon(title: string) {
  const lower = title.toLowerCase();

  // Business/Analytics icon — matches BD Tracker
  if (lower.includes("bd") || lower.includes("tracker") || lower.includes("business")) {
    return (
      <svg className="w-10 h-10 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="36" height="30" rx="3" />
        <line x1="6" y1="18" x2="42" y2="18" />
        <rect x="12" y="24" width="4" height="10" fill="currentColor" opacity="0.5" />
        <rect x="20" y="22" width="4" height="12" fill="currentColor" opacity="0.7" />
        <rect x="28" y="26" width="4" height="8" fill="currentColor" opacity="0.4" />
        <line x1="16" y1="40" x2="32" y2="40" />
        <rect x="38" y="28" width="20" height="24" rx="2" />
        <line x1="42" y1="35" x2="54" y2="35" />
        <line x1="42" y1="39" x2="54" y2="39" />
        <line x1="42" y1="43" x2="50" y2="43" />
        <circle cx="50" cy="52" r="8" />
        <text x="47" y="56" fontSize="10" fill="currentColor" fontWeight="bold">$</text>
      </svg>
    );
  }

  // Team/CRM icon — matches CRM / ODOO
  if (lower.includes("crm") || lower.includes("odoo") || lower.includes("admin")) {
    return (
      <svg className="w-10 h-10 text-green-400" viewBox="0 0 64 64" fill="currentColor">
        <circle cx="32" cy="10" r="6" opacity="0.9" />
        <path d="M24 22a8 8 0 0116 0v2H24v-2z" opacity="0.7" />
        <circle cx="14" cy="18" r="5" opacity="0.7" />
        <path d="M7 28a7 7 0 0114 0v1H7v-1z" opacity="0.5" />
        <circle cx="50" cy="18" r="5" opacity="0.7" />
        <path d="M43 28a7 7 0 0114 0v1H43v-1z" opacity="0.5" />
        <circle cx="32" cy="42" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="32" cy="42" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M32 36v-4M38 42h4" stroke="currentColor" strokeWidth="2" />
        <path d="M29 39l6 6" stroke="currentColor" strokeWidth="2.5" />
        <line x1="32" y1="32" x2="32" y2="24" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  // Location/Tracking icon — matches Remote Attendance
  if (lower.includes("remote") || lower.includes("attendance") || lower.includes("gps") || lower.includes("tracking")) {
    return (
      <svg className="w-10 h-10 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 38c0-8 7-16 7-16s7 8 7 16a7 7 0 01-14 0z" fill="rgba(34,197,94,0.3)" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="23" cy="37" r="3" fill="currentColor" opacity="0.5" />
        <path d="M38 20c0-5 4.5-10 4.5-10S47 15 47 20a4.5 4.5 0 01-9 0z" fill="rgba(34,197,94,0.2)" stroke="currentColor" strokeWidth="2" opacity="0.7" />
        <circle cx="42.5" cy="19.5" r="2" fill="currentColor" opacity="0.4" />
        <path d="M48 42c0-4.5 3.5-9 3.5-9s3.5 4.5 3.5 9a3.5 3.5 0 01-7 0z" fill="rgba(34,197,94,0.15)" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <circle cx="51.5" cy="41.5" r="1.8" fill="currentColor" opacity="0.35" />
        <path d="M27 34 Q33 28 40 22" strokeDasharray="3 3" strokeWidth="2.5" stroke="currentColor" opacity="0.3" />
        <path d="M45 23 Q48 32 49 38" strokeDasharray="3 3" strokeWidth="2.5" stroke="currentColor" opacity="0.3" />
      </svg>
    );
  }

  // Default: Code/Dev icon
  return (
    <svg className="w-10 h-10 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="8" width="40" height="32" rx="3" />
      <line x1="6" y1="16" x2="46" y2="16" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
      <rect x="26" y="11" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <polyline points="16,26 10,30 16,34" />
      <polyline points="30,26 36,30 30,34" />
      <line x1="21" y1="36" x2="25" y2="24" />
      <circle cx="50" cy="44" r="10" />
      <path d="M50 38v6h4" />
      <rect x="46" y="40" width="8" height="8" rx="1" fill="none" />
      <path d="M47 43h6M47 46h4" strokeWidth="1.5" />
    </svg>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  return (
    <section id="projects" className="py-24 px-4 bg-[#0a0a0a]/75">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== PROJECTS =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Featured <span className="text-red-500">Projects</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Systems and applications I&apos;ve built, secured, and deployed in production
            environments.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-[#111] border border-gray-800/50 rounded-xl overflow-hidden hover:border-red-900/40 transition-all duration-300 hover:shadow-lg hover:shadow-red-900/10"
            >
              <div className="h-40 bg-gradient-to-br from-red-900/10 via-[#111] to-green-900/10 flex items-center justify-center relative">
                {getProjectIcon(project.title)}
                {project.featured && (
                  <span className="absolute top-3 right-3 text-[10px] font-[family-name:var(--font-mono)] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                    FEATURED
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-mono)] bg-green-500/10 text-green-400/80 border border-green-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                  {project.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {project.description}
                </p>

                {(project.liveUrl || project.githubUrl) && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800/50">
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-[family-name:var(--font-mono)] transition-colors"
                      >
                        <span className="text-gray-600">[</span>LIVE<span className="text-gray-600">]</span>
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-[family-name:var(--font-mono)] transition-colors"
                      >
                        <span className="text-gray-600">[</span>SOURCE<span className="text-gray-600">]</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
