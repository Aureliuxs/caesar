interface HeaderProps {
  active: "home" | "about" | "projects";
}

export default function Header({ active }: HeaderProps) {
  const handleNavClick = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-slate-900/70 supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
      <div className="container">
        <div className="flex h-16 items-center">
          {/* Left-aligned cluster */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick('home')}
              className="focus-ring text-xl font-bold text-white hover:text-slate-200 transition-colors"
            >
              Caesar
            </button>

            <nav className="flex items-center gap-4">
              <button
                onClick={() => handleNavClick('about')}
                className={`focus-ring transition-colors relative ${
                  active === 'about'
                    ? 'text-white after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-white'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                About
              </button>
              <button
                onClick={() => handleNavClick('projects')}
                className={`focus-ring transition-colors relative ${
                  active === 'projects'
                    ? 'text-white after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-white'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                Projects
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}