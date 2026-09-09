import Image from "next/image";
import ProjectCard from "@/components/home/ProjectCard";
import { CASE_STUDY_PREVIEW_SLUG } from "@/lib/caseStudy";
import { listCaseStudies } from "@/lib/caseStudyServer";
import "./home.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const docs = (await listCaseStudies())
    .filter((doc) => doc.id !== CASE_STUDY_PREVIEW_SLUG && doc.status === "published")
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        b.savedAt.localeCompare(a.savedAt),
    );

  return (
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
              src="/hero-image.svg"
              alt="Illustration of a pencil"
              className="hero-image"
              width={271}
              height={163}
              priority
            />
          </span>
        </div>
      </section>
      <section className="span-12">
        <div className="project-grid">
          {docs.map((doc) => (
            <ProjectCard key={doc.id} doc={doc} />
          ))}
        </div>
      </section>
    </main>
  );
}