import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <>
      <p className="label">404</p>
      <h1 className="page-heading">No project with that name</h1>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </>
  );
}
