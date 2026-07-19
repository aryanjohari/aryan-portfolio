"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const contactLinks = [
  { href: "mailto:johari.aryan16@gmail.com", label: "email" },
  { href: "https://github.com/aryanjohari", label: "github" },
  {
    href: "https://www.linkedin.com/in/aryan-johari-627b4023a/",
    label: "linkedin",
  },
];

const softLinks = [
  { href: "/workshop", label: "workshop", title: "Full project catalog" },
  { href: "/about", label: "about", title: "Bio and background" },
  { href: "/resume.pdf", label: "resume.pdf", title: "Download PDF resume" },
];

export function SiteFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {isHome &&
          softLinks.map((link, index) => (
            <span key={link.href} className="site-footer-soft-item">
              {index > 0 && (
                <span className="site-footer-sep" aria-hidden="true">
                  {" "}
                  ·{" "}
                </span>
              )}
              <Link href={link.href} title={link.title}>
                {link.label}
              </Link>
            </span>
          ))}
        {isHome && (
          <span className="site-footer-sep site-footer-soft-gap" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
        )}
        {contactLinks.map((link, index) => (
          <span key={link.href} className="site-footer-item">
            {index > 0 && (
              <span className="site-footer-sep" aria-hidden="true">
                {" "}
                ·{" "}
              </span>
            )}
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </span>
        ))}
      </div>
    </footer>
  );
}
