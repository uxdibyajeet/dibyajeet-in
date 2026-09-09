"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateProgress = () => {
      const progressBar = barRef.current;
      if (!progressBar) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      progressBar.style.width =
        scrollHeight > 0 ? `${(scrollTop / scrollHeight) * 100}%` : "0%";
    };

    let lenis: Lenis | undefined;

    import("lenis").then(({ default: LenisClass }) => {
      lenis = new LenisClass({ autoRaf: true });
      lenis.on("scroll", updateProgress);
      updateProgress();
    });

    return () => {
      lenis?.destroy();
    };
  }, []);

  return (
    <div
      id="scroll-progress-bar"
      ref={barRef}
      className="scroll-progress-bar"
      aria-hidden="true"
    />
  );
}