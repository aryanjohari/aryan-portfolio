"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "home" },
  { href: "/workshop", label: "workshop" },
  { href: "/about", label: "about" },
  { href: "/resume.pdf", label: "resume" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="site-header">
      <div className="site-header-accent" aria-hidden="true" />
      <div className="site-header-inner">
        {isHome ? (
          <p className="site-header-identity">
            <Link href="/" className="site-name">
              aryan johari
            </Link>
            <span className="site-header-identity-sep" aria-hidden="true">
              {" "}
              ·{" "}
            </span>
            <span className="site-header-role">
              graduate engineer · auckland · sept 2026
            </span>
          </p>
        ) : (
          <>
            <Link href="/" className="site-name">
              aryan johari
            </Link>
            <nav className="site-nav" aria-label="Main">
              {navItems.map((item, index) => (
                <span key={item.href} className="site-nav-item">
                  {index > 0 && (
                    <span className="site-nav-sep" aria-hidden="true">
                      {" "}
                      ·{" "}
                    </span>
                  )}
                  <Link href={item.href}>{item.label}</Link>
                </span>
              ))}
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
