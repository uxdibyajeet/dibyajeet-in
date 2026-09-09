import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudy from "@/components/caseStudy/CaseStudy";
import { readCaseStudy } from "@/lib/caseStudyServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await readCaseStudy(slug);
  return { title: doc ? `Case Study · ${slug}` : "Case Study" };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await readCaseStudy(slug);
  if (!doc) notFound();

  return (
    <main className="main">
      <CaseStudy doc={doc} />
    </main>
  );
}