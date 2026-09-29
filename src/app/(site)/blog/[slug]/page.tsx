import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogMarkdown } from "@/components/BlogMarkdown";
import { formatBlogDate, getBlogPost, getBlogPosts } from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "Not Found" };
  }

  return {
    title: `${post.title} — Aryan Johari`,
    description: post.description,
    alternates: {
      canonical: post.canonical,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const showModified = post.modified !== post.published;

  return (
    <article className="about-page" data-void-scroll>
      <header className="about-intro">
        <h1 className="page-heading">{post.title}</h1>
        <p className="about-lede">
          <time dateTime={post.published}>{formatBlogDate(post.published)}</time>
          {showModified ? (
            <>
              <span className="about-bridge-sep" aria-hidden="true">
                ·
              </span>
              <time dateTime={post.modified}>
                updated {formatBlogDate(post.modified)}
              </time>
            </>
          ) : null}
        </p>
      </header>
      <div className="about-body about-essay">
        <p>{post.question}</p>
        {post.body ? <BlogMarkdown source={post.body} /> : null}
      </div>
    </article>
  );
}
