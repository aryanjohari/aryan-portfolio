import type { Profile } from "@/lib/profile-schema";

export function SiteFooter({ links }: { links: Profile["links"] }) {
  const contactLinks = [
    { href: `mailto:${links.email}`, label: "Email" },
    { href: links.github, label: "GitHub" },
    { href: links.linkedin, label: "LinkedIn" },
  ];

  return (
    <footer className="site-footer">
      <ul className="site-footer-links">
        {contactLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
