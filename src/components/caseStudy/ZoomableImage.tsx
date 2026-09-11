"use client";

import { useRef, useState } from "react";

const LOUPE_SIZE = 200;
const ZOOM = 2.5;
const GAP = 14;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Case-study image block with a hover loupe: a 200×200px circular zoom
 * preview that follows the pointer beside the cursor. Attaches only to the
 * `cdx-image` blocks rendered on the case study page.
 */
export default function ZoomableImage({
  src,
  alt,
  caption,
  stretched = false,
}: {
  src: string;
  alt?: string;
  caption?: string;
  stretched?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [view, setView] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const handleMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setCursor({ x: e.clientX, y: e.clientY });
    setView({
      x: clampPercent(((e.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((e.clientY - rect.top) / rect.height) * 100),
      w: rect.width * ZOOM,
      h: rect.height * ZOOM,
    });
  };

  let left = cursor.x + GAP;
  let top = cursor.y + GAP;
  if (typeof window !== "undefined") {
    if (left + LOUPE_SIZE > window.innerWidth - GAP) left = cursor.x - LOUPE_SIZE - GAP;
    if (top + LOUPE_SIZE > window.innerHeight - GAP) top = cursor.y - LOUPE_SIZE - GAP;
  }

  return (
    <figure className={`cdx-image${stretched ? " is-stretched" : ""}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        onMouseEnter={(e) => {
          setVisible(true);
          handleMove(e);
        }}
        onMouseLeave={() => setVisible(false)}
        onMouseMove={handleMove}
      />
      {caption ? (
        <figcaption className="cdx-image__caption text-caption">{caption}</figcaption>
      ) : null}
      {visible && view.w > 0 ? (
        <div
          className="image-loupe"
          role="presentation"
          style={{
            left,
            top,
            width: LOUPE_SIZE,
            height: LOUPE_SIZE,
            backgroundImage: `url("${src}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${view.w}px ${view.h}px`,
            backgroundPosition: `${view.x}% ${view.y}%`,
          }}
        />
      ) : null}
    </figure>
  );
}