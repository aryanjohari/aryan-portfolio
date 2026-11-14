import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main id="main" className="site-main">
      <p className="label">404</p>
      <h1 className="page-heading">No project with that name</h1>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </main>
  );
}
