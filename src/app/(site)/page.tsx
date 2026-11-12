import { ExperienceList } from "@/components/ExperienceList";
import { Hero } from "@/components/Hero";
import { ProjectEntry } from "@/components/ProjectEntry";
import { getProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";

export default function Home() {
  const profile = getProfile();
  const projects = getProjects();
  const featured = projects.filter((project) => project.tier === "featured");
  const inProgress = projects.filter((project) => project.tier === "in-progress");

  return (
    <>
      <Hero profile={profile} />

      {featured.length > 0 && (
        <section className="section" aria-labelledby="work-heading">
          <h2 id="work-heading" className="section-heading">
            Selected work
          </h2>
          <ol className="entries">
            {featured.map((project, index) => (
              <ProjectEntry key={project.slug} project={project} number={index + 1} />
            ))}
          </ol>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="section" aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="section-heading">
            In progress
          </h2>
          <ol className="entries">
            {inProgress.map((project, index) => (
              <ProjectEntry key={project.slug} project={project} number={featured.length + index + 1} />
            ))}
          </ol>
        </section>
      )}

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
