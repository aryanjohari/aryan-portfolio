"use client";

const contactLinks = [
  { href: "mailto:johari.aryan16@gmail.com", label: "email" },
  { href: "https://github.com/aryanjohari", label: "github" },
  {
    href: "https://www.linkedin.com/in/aryan-johari-627b4023a/",
    label: "linkedin",
  },
];

/**
 * Home footer: contacts only (always visible). Section links live in
 * VoidChrome (home glyph rail / site top nav).
 */
export function HomeFooterChrome() {
  return (
    <div className="site-footer-chrome site-footer-chrome--contacts is-revealed">
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
  );
}
