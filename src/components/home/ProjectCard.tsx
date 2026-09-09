import Link from "next/link";
import { caseStudyDocTitle } from "@/lib/caseStudy";
import type { CaseStudyDoc } from "@/lib/caseStudy";

const STRIP_TAGS = /<[^>]*>/g;

export function caseStudyDescription(doc: Pick<CaseStudyDoc, "content">): string {
  const paragraph = doc.content.blocks.find((block) => block.type === "paragraph");
  if (!paragraph || !("text" in paragraph.data)) return "";
  return String(paragraph.data.text).replace(STRIP_TAGS, " ").replace(/\s+/g, " ").trim();
}

export default function ProjectCard({ doc }: { doc: CaseStudyDoc }) {
  const title = caseStudyDocTitle(doc);
  const desc = caseStudyDescription(doc);
  const cover = doc.cover?.dataUrl ?? null;
  const position = doc.cover?.position ?? { x: 50, y: 50 };
  const tags = doc.meta.tools ?? [];

  return (
    <Link href={`/case-study/${doc.id}`} className="project-card" data-link="">
      {cover ? (
        <span
          className="project-card__cover"
          style={{
            backgroundImage: `url("${cover}")`,
            backgroundPosition: `${position.x}% ${position.y}%`,
          }}
          aria-hidden="true"
        />
      ) : (
        <span className="project-card__cover project-card__cover--empty" aria-hidden="true">
          <i className="bi bi-image" />
        </span>
      )}
      <span className="project-card__body">
        <h3 className="project-card__title text-headline-2">{title}</h3>
        {desc ? <p className="project-card__desc text-base">{desc}</p> : null}
        {tags.length > 0 ? (
          <span className="project-card__tags">
            {tags.map((tag) => (
              <span key={tag} className="project-card__tag text-caption">
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}