import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CoverImage from "@/components/CoverImage";
import Editor from "@/components/Editor";
import MetadataPanel from "@/components/MetadataPanel";
import { caseStudyDocTitle } from "@/lib/caseStudy";
import { readCaseStudy } from "@/lib/caseStudyServer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await readCaseStudy(slug);
  return {
    title: `${doc ? caseStudyDocTitle(doc) : slug} · Page Editor`,
  };
}

export default async function ProjectEditorPage({ params }: Props) {
  const { slug } = await params;
  const doc = await readCaseStudy(slug);
  if (!doc) notFound();

  return (
    <main className="main">
      <CoverImage key={`cover-${slug}`} initial={doc.cover} />
      <MetadataPanel key={`meta-${slug}`} initial={doc.meta} />
      <Editor key={`editor-${slug}`} initialData={doc.content} />
    </main>
  );
}