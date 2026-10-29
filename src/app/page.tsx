import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import VAPTSection from "@/components/VAPTSection";
import CTFSection from "@/components/CTFSection";
import BlogSection from "@/components/BlogSection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MatrixBackground from "@/components/MatrixBackground";
import CommunitySection from "@/components/CommunitySection";

export default function Home() {
  return (
    <main className="relative">
      <MatrixBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <CommunitySection />
        <Projects />
        <Skills />
        <VAPTSection />
        <CTFSection />
        <BlogSection />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}
