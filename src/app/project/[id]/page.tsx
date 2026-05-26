"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MatrixBackground from "@/components/MatrixBackground";

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
  createdAt: string;
}

export default function ProjectDetail() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((projects: Project[]) => {
        const found = projects.find((p) => p.id === params.id);
        setProject(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <MatrixBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-green-400 font-[family-name:var(--font-mono)] text-sm animate-pulse">
            Loading...
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="relative min-h-screen">
        <MatrixBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-red-400 font-[family-name:var(--font-mono)] text-sm">
            Project not found
          </div>
          <Link href="/" className="text-green-400 hover:text-green-300 font-[family-name:var(--font-mono)] text-xs underline">
            ← Back to portfolio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <MatrixBackground />
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* Back navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-[family-name:var(--font-mono)] text-xs mb-8 transition-colors"
          >
            <span>←</span>
            <span>cd ~/projects</span>
          </Link>

          {/* Header */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8 mb-6">
            <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-4">
              {`$ cat projects/${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`}
            </div>

            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-white">{project.title}</h1>
              {project.featured && (
                <span className="text-[10px] font-[family-name:var(--font-mono)] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                  FEATURED
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-3 py-1 rounded font-[family-name:var(--font-mono)] bg-green-500/10 text-green-400/80 border border-green-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="text-[11px] font-[family-name:var(--font-mono)] text-gray-600">
              Created: {project.createdAt}
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8 mb-6">
            <h2 className="text-sm font-[family-name:var(--font-mono)] text-green-400 mb-4">
              ## Description
            </h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>
          </div>

          {/* Links */}
          {(project.liveUrl || project.githubUrl) && (
            <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8">
              <h2 className="text-sm font-[family-name:var(--font-mono)] text-green-400 mb-4">
                ## Links
              </h2>
              <div className="flex gap-4">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-lg font-[family-name:var(--font-mono)] text-xs transition-colors"
                  >
                    <span>[</span>LIVE DEMO<span>]</span>
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white px-4 py-2 rounded-lg font-[family-name:var(--font-mono)] text-xs transition-colors"
                  >
                    <span>[</span>SOURCE CODE<span>]</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
