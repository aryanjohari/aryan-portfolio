import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="site-main">
      <p className="label">404</p>
      <h1 className="page-heading">Page not found</h1>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </main>
  );
}
