import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="site-main site-main--project">
      <h1 className="page-heading">not found</h1>
      <p>
        No project matches that slug.{" "}
        <Link href="/projects">view projects</Link>
        {" · "}
        <Link href="/">return home</Link>.
      </p>
    </main>
  );
}
