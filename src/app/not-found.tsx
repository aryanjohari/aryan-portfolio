import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-main">
      <h1 className="page-heading">not found</h1>
      <p>
        Page not found.{" "}
        <Link href="/">return home</Link>
        {" · "}
        <Link href="/projects">view projects</Link>.
      </p>
    </main>
  );
}
