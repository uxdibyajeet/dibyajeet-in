import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EditorFlow from "@/components/EditorFlow";
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
      <EditorFlow slug={slug} initialDoc={doc} />
    </main>
  );
}