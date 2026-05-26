"use client";

import { useState, useEffect } from "react";
import Terminal from "./Terminal";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [termOpen, setTermOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "Home", href: "#" },
    { label: "Projects", href: "#projects" },
    { label: "Skills", href: "#skills" },
    { label: "VAPT", href: "#vapt" },
    { label: "CTF", href: "#ctf" },
    { label: "Blog", href: "#blog" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a0a0a]/95 backdrop-blur-md shadow-lg shadow-red-900/10 border-b border-red-900/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Terminal prompt — clickable to toggle terminal */}
            <button
              onClick={() => setTermOpen(!termOpen)}
              className="font-[family-name:var(--font-mono)] text-sm group flex items-center gap-1 hover:opacity-80 transition-opacity"
              title="Toggle Terminal"
            >
              <span className="text-red-500">root</span>
              <span className="text-gray-600">@</span>
              <span className="text-green-400">ajaya</span>
              <span className="text-gray-600">:~$</span>
              <span className="text-white animate-pulse ml-1">_</span>
              {!termOpen && (
                <span className="text-gray-700 text-[10px] ml-2 font-[family-name:var(--font-mono)] opacity-0 group-hover:opacity-100 transition-opacity">
                  [click to open terminal]
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-400 hover:text-green-400 transition-colors text-sm font-[family-name:var(--font-mono)] relative group"
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-400/50 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-gray-400 hover:text-green-400"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {isOpen && (
            <div className="md:hidden pb-4 space-y-1 border-t border-red-900/20">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-gray-400 hover:text-green-400 py-2 text-sm font-[family-name:var(--font-mono)]"
                >
                  <span className="text-red-500 mr-2">&gt;</span>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Terminal overlay */}
      <Terminal isOpen={termOpen} onClose={() => setTermOpen(false)} />
    </>
  );
}
