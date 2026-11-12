import type { ProfileExperience } from "@/lib/profile-schema";

export function ExperienceList({ experience }: { experience: ProfileExperience[] }) {
  return (
    <ol className="entries">
      {experience.map((job) => (
        <li key={`${job.org}-${job.dates}`} className="entry">
          <p className="label">{job.dates}</p>
          <h3 className="entry-title">
            {job.role}, {job.org}
            {job.org_note && <span className="entry-note"> ({job.org_note})</span>}
          </h3>
          <ul className="entry-points">
            {job.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
