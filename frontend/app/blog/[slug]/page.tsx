import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "../../../src/data/blogPosts";
import { JsonLd } from "../../../src/seo/JsonLd";
import { metadataFor } from "../../../src/seo/next-metadata";
import { BlogPostPage } from "../../../src/views/BlogPostPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return metadataFor("/not-found");
  }
  return metadataFor(`/blog/${slug}`);
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    notFound();
  }

  return (
    <>
      <JsonLd path={`/blog/${slug}`} />
      <BlogPostPage slug={slug} />
    </>
  );
}
