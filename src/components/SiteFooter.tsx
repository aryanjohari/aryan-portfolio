"use client";

import { usePathname } from "next/navigation";

import { HomeFooterChrome } from "@/components/motion/HomeFooterChrome";

const contactLinks = [
  { href: "mailto:johari.aryan16@gmail.com", label: "email" },
  { href: "https://github.com/aryanjohari", label: "github" },
  {
    href: "https://www.linkedin.com/in/aryan-johari-627b4023a/",
    label: "linkedin",
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {isHome ? (
          <HomeFooterChrome />
        ) : (
          contactLinks.map((link, index) => (
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
          ))
        )}
      </div>
    </footer>
  );
}
