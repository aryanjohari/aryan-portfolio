import { AdaptiveBackground } from "@/components/background/AdaptiveBackground";

export default function Home() {
  return (
    <div className="relative min-h-dvh bg-black">
      <AdaptiveBackground />
      <main className="relative z-10 min-h-dvh pointer-events-auto">
        <div className="flex min-h-dvh justify-start p-4 sm:p-6 md:p-8">
          <h1 className="floating-title select-none text-left">
            <span className="floating-title-line">Aryan</span>
            <span className="floating-title-line">Johari</span>
          </h1>
        </div>
        <nav className="game-nav" aria-label="Main navigation">
          <a href="#about" className="game-nav-link">
            about
          </a>
          <a href="#projects" className="game-nav-link">
            projects
          </a>
          <a href="#blog" className="game-nav-link">
            blog
          </a>
          <a href="#contact" className="game-nav-link">
            contact
          </a>
        </nav>
      </main>
    </div>
  );
}
