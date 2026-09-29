import type { Metadata } from "next";
import Link from "next/link";

import { formatBlogDate, getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Aryan Johari",
  description: "Notes on builds, lessons, and research.",
};

export default function BlogIndexPage() {
  const posts = getBlogPosts();

  return (
    <article className="about-page" data-void-scroll>
      <header className="about-intro">
        <h1 className="page-heading">blog</h1>
      </header>
      {posts.length === 0 ? (
        <div className="about-body about-essay">
          <p>No posts yet.</p>
        </div>
      ) : (
        <div className="about-body">
          {posts.map((post) => (
            <section key={post.slug} className="about-section">
              <h2 className="page-heading">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.question}</p>
              <p className="about-lede">
                <time dateTime={post.published}>
                  {formatBlogDate(post.published)}
                </time>
              </p>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
