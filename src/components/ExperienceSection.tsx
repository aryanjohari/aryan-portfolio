import { Epigraph } from "@/components/Epigraph";
import { Picture } from "@/components/Picture";
import type { ExperienceRow } from "@/lib/home-sections";
import type { ProfileEpigraph } from "@/lib/profile-schema";

/** One line per job; each opens in place with <details>, so it works with JS off. */
export function ExperienceSection({ rows, epigraph }: { rows: ExperienceRow[]; epigraph?: ProfileEpigraph }) {
  return (
    <section className="experience grid" id="experience" aria-labelledby="experience-heading">
      <div className="left-3">
        <h2 id="experience-heading" className="section-no">
          No. 03 · Experience
        </h2>
        <Epigraph epigraph={epigraph} />
      </div>
      <div className="mid-7">
        {rows.map((row) => (
          <details key={`${row.org}-${row.dates}`} className="job">
            <summary>
              <span className="job-dates">{row.dates}</span>
              <span className="job-title">
                {row.title} <span className="job-org">· {row.org}</span>
              </span>
            </summary>
            <div className="job-body">
              <Picture label={row.org} detail={row.title} className="land job-photo" />
              {row.did.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="industry">
                Taught me: <span className="industry-text">{row.taught}</span>
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
