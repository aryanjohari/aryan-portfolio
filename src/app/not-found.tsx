import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-main">
      <h1 className="page-heading">not found</h1>
      <p>
        No project matches that slug.{" "}
        <Link href="/">Return to index</Link>.
      </p>
    </main>
  );
}
