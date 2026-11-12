import { ExperienceList } from "@/components/ExperienceList";
import { Hero } from "@/components/Hero";
import { getProfile } from "@/lib/profile";

export default function Home() {
  const profile = getProfile();

  return (
    <>
      <Hero profile={profile} />

      <section className="section" aria-labelledby="experience-heading">
        <h2 id="experience-heading" className="section-heading">
          Experience
        </h2>
        <ExperienceList experience={profile.experience} />
      </section>

      <section className="section" aria-labelledby="about-heading">
        <h2 id="about-heading" className="section-heading">
          About
        </h2>
        <p className="about-pitch">{profile.pitch}</p>
        <ol className="entries">
          {profile.education.map((school) => (
            <li key={school.degree} className="entry">
              <p className="label">{school.dates}</p>
              <h3 className="entry-title">
                {school.degree}, {school.school}
              </h3>
              {school.note && <p className="entry-note">{school.note}</p>}
            </li>
          ))}
        </ol>
        <dl className="facts">
          <dt className="label">Certification</dt>
          <dd>{profile.certifications.join(", ")}</dd>
          <dt className="label">Work rights</dt>
          <dd>{profile.work_rights}</dd>
          <dt className="label">Location</dt>
          <dd>{profile.location}</dd>
          <dt className="label">Referees</dt>
          <dd>{profile.referees}</dd>
        </dl>
      </section>
    </>
  );
}
