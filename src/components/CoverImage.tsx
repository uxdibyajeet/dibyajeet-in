"use client";

import { useEffect, useRef, useState } from "react";
import {
  registerCoverProvider,
  unregisterCoverProvider,
  type CoverSnapshot,
} from "@/lib/coverStore";
import { compressImage } from "@/lib/compressImage";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const revokeIfBlobUrl = (url: string | null) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

export default function CoverImage({ initial }: { initial?: CoverSnapshot | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.dataUrl ?? null);
  const [dataUrl, setDataUrl] = useState<string | null>(initial?.dataUrl ?? null);
  const [position, setPosition] = useState(initial?.position ?? { x: 50, y: 50 });
  const [repositioning, setRepositioning] = useState(false);
  const [lockPosition, setLockPosition] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const movedRef = useRef(false);

  useEffect(() => {
    registerCoverProvider(() =>
      imageUrl && dataUrl ? { dataUrl, position } : null,
    );
    return unregisterCoverProvider;
  }, [imageUrl, dataUrl, position]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRepositioning(false);
        setLockPosition(false);
        setLinkMode(false);
        setLinkUrl("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyPointer = (clientX: number, clientY: number) => {
    const el = coverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const upload = await compressImage(file);
    const body = new FormData();
    body.append("file", upload, upload.name);

    let url: string;
    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const payload = (await res.json()) as { url?: string };
      if (!res.ok || !payload.url) throw new Error("Upload failed");
      url = payload.url;
    } catch {
      return;
    }

    revokeIfBlobUrl(imageUrl);
    setImageUrl(url);
    setDataUrl(url);
    setPosition({ x: 50, y: 50 });
  };

  const handleRemove = () => {
    revokeIfBlobUrl(imageUrl);
    setImageUrl(null);
    setDataUrl(null);
    setPosition({ x: 50, y: 50 });
    setRepositioning(false);
    setLockPosition(false);
    setLinkMode(false);
    setLinkUrl("");
  };

  const applyLink = () => {
    const value = linkUrl.trim();
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
      revokeIfBlobUrl(imageUrl);
      setImageUrl(url.href);
      setDataUrl(url.href);
      setPosition({ x: 50, y: 50 });
      setLinkMode(false);
      setLinkUrl("");
    } catch {
      /* invalid URL — leave the field for correction */
    }
  };

  const gestureStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!repositioning || lockPosition || !imageUrl) return;
    if ((e.target as HTMLElement).closest(".cover-controls, .cover-link")) return;
    draggingRef.current = true;
    movedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointer(e.clientX, e.clientY);
  };

  const gestureMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    applyPointer(e.clientX, e.clientY);
  };

  const gestureEnd = () => {
    if (draggingRef.current && movedRef.current) {
      setLockPosition(true);
    }
    draggingRef.current = false;
    movedRef.current = false;
  };

  const armed = repositioning && !lockPosition;

  return (
    <div
      ref={coverRef}
      id="cover-image"
      className={`cover-image full-bleed${armed ? " repositioning" : ""}`}
      style={{
        backgroundImage: imageUrl ? `url("${imageUrl}")` : undefined,
        backgroundSize: imageUrl ? "cover" : undefined,
        backgroundPosition: imageUrl ? `${position.x}% ${position.y}%` : undefined,
      }}
      onPointerDown={gestureStart}
      onPointerMove={gestureMove}
      onPointerUp={gestureEnd}
      onPointerCancel={gestureEnd}
    >
      <span className="badge-info cover-image-badge">
        Cover Image: Used on card &amp; case study
      </span>

      <div className="cover-controls">
        <input
          ref={inputRef}
          id="cover-image-input"
          type="file"
          accept="image/*"
          className="cover-image-input"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="cover-btn"
          onClick={() => inputRef.current?.click()}
        >
          <i className="bi bi-image" aria-hidden="true" />
          <span>Upload Image</span>
        </button>
        <button
          type="button"
          className={`cover-btn${linkMode ? " is-active" : ""}`}
          onClick={() => {
            setLinkMode((value) => !value);
            setLinkUrl("");
          }}
        >
          <i className="bi bi-link-45deg" aria-hidden="true" />
          <span>Link</span>
        </button>
        <button
          type="button"
          className={`cover-btn${armed ? " is-active" : ""}`}
          disabled={!imageUrl}
          onClick={() => {
            if (repositioning) {
              setRepositioning(false);
              setLockPosition(false);
            } else {
              setRepositioning(true);
              setLockPosition(false);
            }
          }}
        >
          <i
            className={`bi ${lockPosition ? "bi-check" : "bi-arrows-move"}`}
            aria-hidden="true"
          />
          <span>{lockPosition ? "Done" : "Reposition"}</span>
        </button>
        <button
          type="button"
          className="cover-btn cover-btn-icon"
          aria-label="Remove image"
          title="Remove image"
          disabled={!imageUrl}
          onClick={handleRemove}
        >
          <i className="bi bi-trash" aria-hidden="true" />
        </button>
      </div>

      {linkMode ? (
        <div className="cover-link">
          <input
            id="cover-link-input"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                setLinkMode(false);
                setLinkUrl("");
              }
            }}
            placeholder="https://example.com/image.jpg"
            aria-label="Cover image URL"
          />
          <button
            type="button"
            className="cover-btn"
            onClick={applyLink}
            disabled={!linkUrl.trim()}
          >
            Apply
          </button>
          <button
            type="button"
            className="cover-btn cover-btn-icon"
            aria-label="Close link input"
            title="Close"
            onClick={() => {
              setLinkMode(false);
              setLinkUrl("");
            }}
          >
            <i className="bi bi-x" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}