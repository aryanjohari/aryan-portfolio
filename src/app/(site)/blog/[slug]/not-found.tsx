import Link from "next/link";

export default function BlogPostNotFound() {
  return (
    <article className="about-page" data-void-scroll>
      <h1 className="page-heading">not found</h1>
      <div className="about-body about-essay">
        <p>
          No post matches that slug. <Link href="/blog">view blog</Link>
          {" · "}
          <Link href="/">return home</Link>.
        </p>
      </div>
    </article>
  );
}
