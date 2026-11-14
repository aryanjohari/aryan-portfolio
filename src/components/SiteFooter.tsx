import type { Profile } from "@/lib/profile-schema";

const SOURCE_URL = "https://github.com/aryanjohari/aryan-portfolio";

export function SiteFooter({ links }: { links: Profile["links"] }) {
  const footerLinks = [
    { href: SOURCE_URL, label: "View source" },
    { href: `mailto:${links.email}`, label: "Email" },
    { href: links.github, label: "GitHub" },
    { href: links.linkedin, label: "LinkedIn" },
  ];

  return (
    <footer className="site-footer">
      <ul className="site-footer-links">
        {footerLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
