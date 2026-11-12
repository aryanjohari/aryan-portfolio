import type { Project } from "@/lib/portfolio-schema";

const STATE_LABELS: Record<Project["status"]["state"], string> = {
  live: "LIVE",
  frozen: "FROZEN",
  wip: "IN PROGRESS",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-23" → "23 Oct 2026", without a locale or time zone shifting the day. */
function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function StatusStamp({ status }: { status: Project["status"] }) {
  return (
    <p className="stamp">
      <span className="stamp-state">{STATE_LABELS[status.state]}</span> · as of{" "}
      <time dateTime={status.as_of}>{formatDay(status.as_of)}</time>
      {status.note && <span className="stamp-note"> · {status.note}</span>}
    </p>
  );
}
