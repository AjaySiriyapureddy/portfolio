"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MatrixBackground from "@/components/MatrixBackground";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  readTime: string;
}

export default function BlogDetail() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => r.json())
      .then((posts: BlogPost[]) => {
        const found = posts.find((p) => p.id === params.id);
        setPost(found || null);
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

  if (!post) {
    return (
      <main className="relative min-h-screen">
        <MatrixBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-red-400 font-[family-name:var(--font-mono)] text-sm">
            Post not found
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
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-[family-name:var(--font-mono)] text-xs mb-8 transition-colors"
          >
            <span>←</span>
            <span>cd ~/blog</span>
          </Link>

          {/* Header */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8 mb-6">
            <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-4">
              {`$ cat blog/${post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40)}.md`}
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-[family-name:var(--font-mono)] text-gray-500">{post.date}</span>
              <span className="text-gray-800">|</span>
              <span className="text-xs font-[family-name:var(--font-mono)] text-gray-500">{post.readTime} read</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-3 py-1 rounded font-[family-name:var(--font-mono)] bg-green-500/10 text-green-400/80 border border-green-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Excerpt */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8 mb-6">
            <h2 className="text-sm font-[family-name:var(--font-mono)] text-green-400 mb-4">
              ## Summary
            </h2>
            <p className="text-gray-400 leading-relaxed italic">
              {post.excerpt}
            </p>
          </div>

          {/* Full Content */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-8">
            <h2 className="text-sm font-[family-name:var(--font-mono)] text-green-400 mb-4">
              ## Content
            </h2>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {post.content || post.excerpt}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
