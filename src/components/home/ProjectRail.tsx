"use client";

import { useLayoutEffect, useRef } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { caseStudyDescription, caseStudyDocTitle } from "@/lib/caseStudy";
import type { CaseStudyDoc } from "@/lib/caseStudy";

gsap.registerPlugin(ScrollTrigger);

export default function ProjectRail({ docs }: { docs: CaseStudyDoc[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const rail = railRef.current;
    if (!section || !viewport || !rail) return;

    const items = Array.from(rail.querySelectorAll<HTMLLIElement>(".rail-item"));
    const cards = Array.from(
      rail.querySelectorAll<HTMLAnchorElement>(".rail-card"),
    );
    if (items.length === 0) return;

    const itemHeight = items[0].offsetHeight;
    const pitch =
      items.length > 1 ? items[1].offsetTop - items[0].offsetTop : itemHeight;

    // Match the scroll-driver height to the measured rail travel.
    const totalTravel = (items.length - 1) * pitch;
    section.style.height = `calc(100vh + ${totalTravel}px)`;

    // Focused card spans ~8/12 of the page, compact cards ~5-6/12.
    const focusedW = Math.min(Math.max(section.clientWidth * 0.68, 320), 1128);
    const compactW = focusedW * 0.6;

    // Anchor card 0 at the vertical center of the pinned viewport.
    const y0 = (viewport.clientHeight - itemHeight) / 2;

    // Set an initial focused-first layout before first paint (avoids flash).
    items.forEach((item, index) => {
      gsap.set(item, { width: index === 0 ? focusedW : compactW });
      item.style.zIndex = String(1000 - index * 120);
    });

    const mm = gsap.matchMedia();
    const cleanup: Array<() => void> = [];

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const applySizes = () => {
        const rect = viewport.getBoundingClientRect();
        const viewCenter = rect.top + rect.height / 2;

        for (let i = 0; i < items.length; i += 1) {
          const itemRect = items[i].getBoundingClientRect();
          const dist = Math.abs(itemRect.top + itemRect.height / 2 - viewCenter);
          const p = Math.min(1, dist / (pitch * 1.6));
          const smooth = p * p * (3 - 2 * p);

          const width = focusedW - (focusedW - compactW) * smooth;
          gsap.set(items[i], { width });
          items[i].style.zIndex = String(1000 - Math.round(smooth * 950));
          gsap.set(cards[i], {
            scale: 1 - smooth * 0.16,
            opacity: 1 - smooth * 0.35,
            transformOrigin: "center bottom",
          });
        }
      };

      applySizes();

      // Cards start spaced apart (card 0 anchored at viewport center) and
      // only overlap as the rail travels during scroll.
      gsap.fromTo(
        rail,
        { y: y0 },
        {
          y: y0 - totalTravel,
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

      // Hover overlay: fade + slide up on enter, reverse on leave.
      // Plus a subtle 3D tilt that follows the cursor (rotateX/Y/Z with
      // perspective), returning to flat on leave.
      const tiltMax = 4.2;
      const rotateZMax = 0.9;
      cards.forEach((card) => {
        const overlay = card.querySelector<HTMLElement>(".rail-card__overlay");
        if (!overlay) return;

        const tl = gsap.timeline({ paused: true });
        tl.fromTo(
          overlay,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" },
        );

        const show = () => tl.play();
        const hide = () => tl.reverse();
        card.addEventListener("pointerenter", show);
        card.addEventListener("pointerleave", hide);

        const tilt = (rx: number, ry: number, rz: number) => {
          gsap.to(card, {
            rotateX: rx,
            rotateY: ry,
            rotateZ: rz,
            transformPerspective: 900,
            transformOrigin: "center center",
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        const onTiltMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          tilt((0.5 - py) * 2 * tiltMax, (px - 0.5) * 2 * tiltMax, (px - 0.5) * 2 * rotateZMax);
        };
        const onTiltLeave = () => tilt(0, 0, 0);

        card.addEventListener("pointermove", onTiltMove);
        card.addEventListener("pointerleave", onTiltLeave);

        cleanup.push(() => {
          card.removeEventListener("pointerenter", show);
          card.removeEventListener("pointerleave", hide);
          card.removeEventListener("pointermove", onTiltMove);
          card.removeEventListener("pointerleave", onTiltLeave);
        });
      });

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
      cleanup.push(() => window.removeEventListener("load", onLoad));
    });

    return () => {
      cleanup.forEach((fn) => fn());
      mm.revert();
    };
  }, [docs]);

  return (
    <section
      ref={sectionRef}
      className="rail-section full-bleed"
      style={{
        height: `calc(100vh + ${Math.max(docs.length - 1, 0) * 56}vh)`,
      }}
    >
      <div ref={viewportRef} className="rail-viewport">
        <ul ref={railRef} className="rail">
          {docs.map((doc) => {
            const title = caseStudyDocTitle(doc);
            const metaDesc = doc.meta?.projectDescription?.trim();
            const description = metaDesc || caseStudyDescription(doc);
            const readingTime = doc.meta?.readingTime ?? 1;
            const cover = doc.cover?.dataUrl ?? null;
            const position = doc.cover?.position ?? { x: 50, y: 50 };
            const tags =
              (doc.meta?.projectType ?? []).length > 0
                ? (doc.meta?.projectType ?? [])
                : (doc.meta?.tools ?? []);
            const role = doc.meta?.role?.trim();

            return (
              <li className="rail-item" key={doc.id}>
                <Link
                  href={`/case-study/${doc.id}`}
                  className="rail-card"
                  data-link=""
                >
                  {cover ? (
                    <ViewTransition
                      name={`case-cover-${doc.id}`}
                      share="morph"
                      default="none"
                    >
                      <span
                        className="rail-card__media"
                        style={{
                          backgroundImage: `url("${cover}")`,
                          backgroundPosition: `${position.x}% ${position.y}%`,
                        }}
                        aria-hidden="true"
                      />
                    </ViewTransition>
                  ) : (
                    <span
                      className="rail-card__media rail-card__media--empty"
                      aria-hidden="true"
                    >
                      <i className="bi bi-image" />
                    </span>
                  )}

                  <span className="rail-card__overlay">
                    <span className="rail-card__body">
                      <span className="rail-card__meta">
                        {role ? (
                          <span className="rail-card__chip text-caption">{role}</span>
                        ) : null}
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            className="rail-card__chip rail-card__chip--tag text-caption"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                      <h3 className="rail-card__title text-headline-2">{title}</h3>
                      {description ? (
                        <p className="rail-card__desc text-base">{description}</p>
                      ) : null}
                      <span className="rail-card__reading text-caption">
                        <i className="bi bi-clock" aria-hidden="true" />
                        ~{readingTime} min read
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}