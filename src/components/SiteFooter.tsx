const contactLinks = [
  { href: "mailto:aryan@example.com", label: "email" },
  { href: "https://github.com/aryanjohari", label: "github" },
  { href: "https://linkedin.com/in/aryanjohari", label: "linkedin" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {contactLinks.map((link, index) => (
          <span key={link.href} className="site-footer-item">
            {index > 0 && <span className="site-footer-sep" aria-hidden="true"> · </span>}
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </span>
        ))}
      </div>
    </footer>
  );
}
