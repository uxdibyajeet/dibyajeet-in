import Link from "next/link";
import { caseStudyDescription, caseStudyDocTitle } from "@/lib/caseStudy";
import type { CaseStudyDoc } from "@/lib/caseStudy";

export default function ProjectCard({ doc }: { doc: CaseStudyDoc }) {
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
        <span className="project-card__reading text-caption">
          <i className="bi bi-clock" aria-hidden="true" />
          ~{readingTime} min read
        </span>
        <h3 className="project-card__title text-headline-2">{title}</h3>
        {description ? <p className="project-card__desc text-base">{description}</p> : null}
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