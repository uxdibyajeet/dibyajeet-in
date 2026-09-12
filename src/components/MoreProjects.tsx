"use client";

import { useLayoutEffect, useRef } from "react";
import ProjectCard from "@/components/home/ProjectCard";
import type { CaseStudyDoc } from "@/lib/caseStudy";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function MoreProjects({
  docs,
  currentSlug,
}: {
  docs: CaseStudyDoc[];
  currentSlug: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const countRef = useRef(0);

  const filtered = docs.filter(
    (d) => d.id !== currentSlug && d.status === "published",
  );

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !viewport || !track) return;

    const slides = Array.from(
      track.querySelectorAll<HTMLElement>("[data-rail-slide]"),
    );
    countRef.current = slides.length;
    if (slides.length < 2) return;

    const pitch =
      slides[1].offsetLeft - slides[0].offsetLeft || slides[0].offsetWidth;
    const travel = pitch * (slides.length - 1);

    // Scroll driver: viewport pins while the track travels horizontally.
    section.style.height = `calc(100vh + ${travel}px)`;

    const mm = gsap.matchMedia();
    const x0 =
      viewport.clientWidth / 2 -
      (slides[0].offsetLeft + slides[0].offsetWidth / 2);

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const applySizes = () => {
        const vr = viewport.getBoundingClientRect();
        const center = vr.left + vr.width / 2;

        for (let i = 0; i < slides.length; i += 1) {
          const r = slides[i].getBoundingClientRect();
          const dist = Math.abs(r.left + r.width / 2 - center);
          const p = Math.min(1, dist / (pitch * 1.8));
          const smooth = p * p * (3 - 2 * p);

          slides[i].style.zIndex = String(Math.round(1000 - smooth * 900));
          gsap.set(slides[i], {
            scale: 1 - smooth * 0.12,
            opacity: 1 - smooth * 0.25,
          });
        }
      };

      const tween = gsap.fromTo(
        track,
        { x: x0 },
        {
          x: x0 - travel,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            onUpdate: applySizes,
          },
        },
      );
      triggerRef.current = tween.scrollTrigger ?? null;

      applySizes();

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    });

    return () => {
      triggerRef.current = null;
      mm.revert();
    };
  }, [docs, currentSlug]);

  if (filtered.length === 0) return null;

  function stepRail(direction: "left" | "right") {
    const st = triggerRef.current;
    if (!st || countRef.current < 2) return;
    const step = 1 / (countRef.current - 1);
    const delta = direction === "left" ? -step : step;
    const progress = gsap.utils.clamp(0, 1, (st.progress ?? 0) + delta);
    const top = st.start + progress * (st.end - st.start);
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} className="more-projects span-12">
      <div className="more-projects__header">
        <h2 className="text-headline-1">More projects</h2>
        <div className="more-projects__nav">
          <button
            type="button"
            className="more-projects__btn"
            onClick={() => stepRail("left")}
            aria-label="Scroll left"
          >
            <i className="bi bi-arrow-left" />
          </button>
          <button
            type="button"
            className="more-projects__btn"
            onClick={() => stepRail("right")}
            aria-label="Scroll right"
          >
            <i className="bi bi-arrow-right" />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="more-projects__viewport">
        <div ref={trackRef} className="more-projects__track">
          {filtered.map((doc) => (
            <div className="more-projects__slide" data-rail-slide key={doc.id}>
              <ProjectCard doc={doc} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}