import { Epigraph } from "@/components/Epigraph";
import type { ExperienceRow } from "@/lib/home-sections";
import type { ProfileEpigraph } from "@/lib/profile-schema";

/**
 * One entry per job: the first line and what it taught stay visible, so a scan gets the
 * point without a click; any further lines open in place with <details> (works with JS off).
 */
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
        {rows.map((row) => {
          const [lead, ...more] = row.did;
          return (
            <article key={`${row.org}-${row.dates}`} className="job">
              <h3 className="job-head">
                <span className="job-dates">{row.dates}</span>
                <span className="job-title">
                  {row.title} <span className="job-org">· {row.org}</span>
                </span>
              </h3>
              {lead && <p className="job-lead">{lead}</p>}
              <p className="industry">
                Taught me: <span className="industry-text">{row.taught}</span>
              </p>
              {more.length > 0 && (
                <details className="job-more">
                  <summary>More</summary>
                  {more.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
