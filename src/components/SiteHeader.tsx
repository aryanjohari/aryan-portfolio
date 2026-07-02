import Link from "next/link";

const navItems = [
  { href: "/", label: "index" },
  { href: "/about", label: "about" },
  { href: "/resume.pdf", label: "resume" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-accent" aria-hidden="true" />
      <div className="site-header-inner">
        <Link href="/" className="site-name">
          aryan johari
        </Link>
        <nav className="site-nav" aria-label="Main">
          {navItems.map((item, index) => (
            <span key={item.href} className="site-nav-item">
              {index > 0 && <span className="site-nav-sep" aria-hidden="true"> · </span>}
              <Link href={item.href}>{item.label}</Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
