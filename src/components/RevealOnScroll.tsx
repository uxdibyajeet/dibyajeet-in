"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface RevealGroup {
  selector: string;
  from: { opacity: number; y?: number };
  duration?: number;
  stagger?: number;
  /** When true, each matched element gets its own ScrollTrigger. */
  individually?: boolean;
}

export const HOME_REVEAL_GROUPS: RevealGroup[] = [
  {
    selector: ".hero-section .greet-text",
    from: { opacity: 0, y: 32 },
    duration: 0.7,
  },
  {
    selector: ".hero-section .greet-content",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".hero-section .status-badge",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".hero-section .illustration",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".rail-section",
    from: { opacity: 0 },
    duration: 0.9,
  },
];

export const ABOUT_REVEAL_GROUPS: RevealGroup[] = [
  {
    selector: ".about-context h2",
    from: { opacity: 0, y: 32 },
    duration: 0.7,
  },
  {
    selector: ".about-context > .about-text > p",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
    stagger: 0.1,
  },
  {
    selector: ".about-context .about-email",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".about-context .about-buttons",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".about-context .about-photo",
    from: { opacity: 0, y: 24 },
    duration: 0.7,
  },
  {
    selector: ".about-hobbies h2",
    from: { opacity: 0, y: 32 },
    duration: 0.7,
  },
  {
    selector: ".about-hobbies > p",
    from: { opacity: 0, y: 24 },
    duration: 0.6,
  },
  {
    selector: ".about-hobbies .about-frame",
    from: { opacity: 0, y: 36 },
    duration: 0.6,
    stagger: 0.1,
  },
];

export const CASE_STUDY_REVEAL_GROUPS: RevealGroup[] = [
  {
    selector: ".case-study-cover",
    from: { opacity: 0 },
    duration: 0.9,
  },
  {
    selector: ".case-study-header h1",
    from: { opacity: 0, y: 32 },
    duration: 0.7,
  },
  {
    selector: ".case-study-meta__item",
    from: { opacity: 0, y: 24 },
    duration: 0.5,
    stagger: 0.08,
  },
  {
    selector: ".case-study-content > *",
    from: { opacity: 0, y: 36 },
    duration: 0.7,
    individually: true,
  },
  {
    selector: ".more-projects__header",
    from: { opacity: 0, y: 32 },
    duration: 0.7,
  },
  {
    selector: ".more-projects__viewport",
    from: { opacity: 0 },
    duration: 0.9,
  },
];

export default function RevealOnScroll({ groups }: { groups: RevealGroup[] }) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    const onLoad = () => ScrollTrigger.refresh();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      for (const group of groups) {
        const targets = document.querySelectorAll(group.selector);
        if (targets.length === 0) continue;

        const to = {
          opacity: 1,
          y: 0,
          duration: group.duration ?? 0.7,
          ease: "power2.out",
        };

        if (group.individually) {
          targets.forEach((el) => {
            gsap.fromTo(el, group.from, {
              ...to,
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                once: true,
              },
            });
          });
          continue;
        }

        gsap.fromTo(targets, group.from, {
          ...to,
          stagger: group.stagger ?? 0,
          scrollTrigger: {
            trigger: targets[0],
            start: "top 88%",
            once: true,
          },
        });
      }

      window.addEventListener("load", onLoad);
    });

    return () => {
      window.removeEventListener("load", onLoad);
      mm.revert();
    };
  }, [groups]);

  return null;
}