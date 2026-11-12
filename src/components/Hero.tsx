import type { Profile } from "@/lib/profile-schema";

export function Hero({ profile }: { profile: Profile }) {
  const { links } = profile;

  return (
    <header className="hero">
      <p className="label">{profile.headline}</p>
      <h1 className="hero-name">{profile.name}</h1>
      <p className="hero-tagline">{profile.tagline}</p>
      <ul className="hero-links">
        <li>
          <a href={links.cv}>CV</a>
        </li>
        <li>
          <a href={`mailto:${links.email}`}>{links.email}</a>
        </li>
        <li>
          <a href={links.github}>GitHub</a>
        </li>
        <li>
          <a href={links.linkedin}>LinkedIn</a>
        </li>
      </ul>
    </header>
  );
}
