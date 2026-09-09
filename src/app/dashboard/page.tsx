import type { Metadata } from "next";
import DashboardBoard from "@/components/dashboard/DashboardBoard";
import { CASE_STUDY_PREVIEW_SLUG } from "@/lib/caseStudy";
import { listCaseStudies } from "@/lib/caseStudyServer";

export const metadata: Metadata = {
  title: "Dashboard · Portfolio",
};

export default async function DashboardPage() {
  const docs = (await listCaseStudies()).filter(
    (doc) => doc.id !== CASE_STUDY_PREVIEW_SLUG,
  );

  return (
    <main className="main">
      <DashboardBoard initial={docs} />
    </main>
  );
}