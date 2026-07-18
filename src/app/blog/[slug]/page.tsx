import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BlogPostContent } from "@/components/dreelio/BlogPostContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { BLOG_POSTS, getAdjacentPosts, getBlogPost } from "@/components/dreelio/blog-data";
import { DEFAULT_OG_IMAGE, SITE_URL, pageMetadata } from "@/lib/seo";

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
  if (!post) return { title: "Blog" };

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
  });
}

function articleJsonLd(post: NonNullable<ReturnType<typeof getBlogPost>>) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.date,
    inLanguage: "en",
    image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Velora Vault" },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Velora Vault",
      logo: { "@type": "ImageObject", url: `${SITE_URL}${DEFAULT_OG_IMAGE}`, width: 512, height: 512 },
    },
  };
}

function breadcrumbJsonLd(post: NonNullable<ReturnType<typeof getBlogPost>>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
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
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

  return (
    <PublicPageShell>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleJsonLd(post), breadcrumbJsonLd(post)]),
        }}
      />
      <BlogPostContent post={post} prev={prev} next={next} />
    </PublicPageShell>
  );
}
