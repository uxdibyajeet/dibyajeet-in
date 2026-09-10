"use client";

import { useRef } from "react";
import ProjectCard from "@/components/home/ProjectCard";
import type { CaseStudyDoc } from "@/lib/caseStudy";

export default function MoreProjects({
  docs,
  currentSlug,
}: {
  docs: CaseStudyDoc[];
  currentSlug: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = docs.filter(
    (d) => d.id !== currentSlug && d.status === "published",
  );

  if (filtered.length === 0) return null;

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="more-projects span-12">
      <div className="more-projects__header">
        <h2 className="text-headline-1">More projects</h2>
        <div className="more-projects__nav">
          <button
            type="button"
            className="more-projects__btn"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <i className="bi bi-arrow-left" />
          </button>
          <button
            type="button"
            className="more-projects__btn"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <i className="bi bi-arrow-right" />
          </button>
        </div>
      </div>
      <div className="more-projects__track" ref={scrollRef}>
        {filtered.map((doc) => (
          <div className="more-projects__slide" key={doc.id}>
            <ProjectCard doc={doc} />
          </div>
        ))}
      </div>
    </section>
  );
}