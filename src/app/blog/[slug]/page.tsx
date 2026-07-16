import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostContent } from "@/components/dreelio/BlogPostContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { BLOG_POSTS, getAdjacentPosts, getBlogPost } from "@/components/dreelio/blog-data";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Blog — Velora Vault" };

  return {
    title: `${post.title} — Velora Vault`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const { prev, next } = getAdjacentPosts(slug);

  return (
    <PublicPageShell>
      <BlogPostContent post={post} prev={prev} next={next} />
    </PublicPageShell>
  );
}
