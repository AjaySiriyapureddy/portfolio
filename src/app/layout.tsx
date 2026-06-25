import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";
import DevToolsBlocker from "@/components/DevToolsBlocker";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  title: "Ajaya Siriyapureddy | Security Analyst & Developer",
  description:
    "Portfolio of Ajaya Siriyapureddy — Business Development, Developer, Security Analyst & Researcher. Specializing in VAPT, Red Teaming, and secure application development.",
  keywords: [
    "cybersecurity",
    "VAPT",
    "red teaming",
    "penetration testing",
    "developer",
    "security analyst",
  ],
  authors: [{ name: "Ajaya Siriyapureddy" }],
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${inter.variable} scroll-smooth`}>
      <body className="bg-[#0a0a0a] text-gray-200 antialiased font-[family-name:var(--font-inter)]">
        <DevToolsBlocker />
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
