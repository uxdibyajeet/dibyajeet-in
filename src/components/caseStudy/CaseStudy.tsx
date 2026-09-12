import {
  caseStudyDocTitle,
  DEFAULT_META,
  type CaseStudyDoc,
  type CaseStudyDuration,
} from "@/lib/caseStudy";
import { ViewTransition } from "react";
import BlockRenderer from "./BlockRenderer";

function dateToken(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function durationLabel(duration: CaseStudyDuration): string | null {
  const { start, end } = duration;
  if (start && end) return `${dateToken(start)} — ${dateToken(end)}`;
  if (start) return `${dateToken(start)} — Present`;
  return end ? dateToken(end) : null;
}

export default function CaseStudy({ doc }: { doc: CaseStudyDoc }) {
  const { cover, content } = doc;
  const meta = doc.meta ?? DEFAULT_META;
  const role = meta.role.trim();
  const duration = durationLabel(meta.duration);
  const tools = meta.tools ?? [];

  return (
    <>
      {cover ? (
        <ViewTransition
          name={`case-cover-${doc.id}`}
          share="morph"
          default="none"
        >
          <div
            className="case-study-cover full-bleed"
            style={{
              backgroundImage: `url("${cover.dataUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: `${cover.position?.x ?? 50}% ${cover.position?.y ?? 50}%`,
            }}
          />
        </ViewTransition>
      ) : null}

      <article className="span-12 case-study-header" aria-label="Project details">
        <h1 className="text-hero">{caseStudyDocTitle(doc)}</h1>

        <dl className="case-study-meta">
          {role ? (
            <div className="case-study-meta__item">
              <dt>Role</dt>
              <dd>{role}</dd>
            </div>
          ) : null}

          {duration ? (
            <div className="case-study-meta__item">
              <dt>Duration</dt>
              <dd>{duration}</dd>
            </div>
          ) : null}

          {tools.length > 0 ? (
            <div className="case-study-meta__item">
              <dt>Tools used</dt>
              <dd>{tools.join(", ")}</dd>
            </div>
          ) : null}

          <div className="case-study-meta__item">
            <dt>Reading time</dt>
            <dd>~{meta.readingTime ?? 1} min</dd>
          </div>
        </dl>
      </article>

      <article className="span-12 case-study-content">
        <BlockRenderer blocks={content?.blocks ?? []} />
      </article>
    </>
  );
}