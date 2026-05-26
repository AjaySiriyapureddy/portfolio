"use client";

import { useEffect, useState } from "react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  readTime: string;
}

export default function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => {});
  }, []);

  return (
    <section id="blog" className="py-24 px-4 bg-[#0a0a0a]/75">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== SECURITY_BLOG =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Security <span className="text-red-500">Blog</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Insights, writeups, and research on cybersecurity, penetration testing,
            and secure development practices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-[#111] border border-gray-800/50 rounded-xl p-6 hover:border-red-900/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-gray-600">
                  {post.date}
                </span>
                <span className="text-gray-800">|</span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-gray-600">
                  {post.readTime} read
                </span>
              </div>

              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-red-400 transition-colors leading-snug">
                {post.title}
              </h3>

              <p className="text-gray-500 text-sm leading-relaxed mb-3">
                {post.excerpt.split(" ").length > 60
                  ? post.excerpt.split(" ").slice(0, 60).join(" ") + "..."
                  : post.excerpt}
              </p>
              <a
                href={`/blog/${post.id}`}
                className="inline-block mb-4 text-xs font-[family-name:var(--font-mono)] text-red-400 hover:text-red-300 transition-colors"
              >
                [Read More →]
              </a>

              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-mono)] bg-green-500/10 text-green-400/80 border border-green-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
