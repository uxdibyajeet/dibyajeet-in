import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CaseStudy from "@/components/caseStudy/CaseStudy";
import MoreProjects from "@/components/MoreProjects";
import { auth } from "@/auth";
import { readCaseStudy, listCaseStudies } from "@/lib/caseStudyServer";

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

  if (doc.status !== "published") {
    const session = await auth();
    if (!session?.user) redirect("/login");
  }

  const allDocs = await listCaseStudies();

  return (
    <main className="main">
      <CaseStudy doc={doc} />
      <MoreProjects docs={allDocs} currentSlug={slug} />
    </main>
  );
}