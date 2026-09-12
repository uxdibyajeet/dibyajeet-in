import Image from "next/image";
import { ViewTransition } from "react";
import ProjectRail from "@/components/home/ProjectRail";
import RevealOnScroll, {
  HOME_REVEAL_GROUPS,
} from "@/components/RevealOnScroll";
import { CASE_STUDY_PREVIEW_SLUG } from "@/lib/caseStudy";
import { listCaseStudies } from "@/lib/caseStudyServer";
import "./home.css";

export const dynamic = "force-dynamic";

const directional = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

export default async function Home() {
  const docs = (await listCaseStudies())
    .filter((doc) => doc.id !== CASE_STUDY_PREVIEW_SLUG && doc.status === "published")
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        b.savedAt.localeCompare(a.savedAt),
    );

  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      <main className="main">
      <section className="span-12">
        <div className="hero-section">
          <span className="text-col">
            <h1 className="greet-text text-hero">Hey there! I&apos;m Dibyajeet</h1>
            <p className="greet-content text-hero-subtitle">
              Turning complex business problems into simple, useful features.
            </p>
            <span className="status-badge">
              <span className="dot" />
              <p>2+ Years experience</p>
            </span>
          </span>
          <span className="illustration">
            <Image
              src="/image-hero.svg"
              alt="Illustration of a pencil"
              className="hero-image"
              width={271}
              height={163}
              priority
            />
          </span>
        </div>
      </section>
      <ProjectRail docs={docs} />
      <RevealOnScroll groups={HOME_REVEAL_GROUPS} />
      </main>
    </ViewTransition>
  );
}