import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";

interface Block {
  type: string;
  data?: Record<string, unknown>;
  tunes?: Record<string, unknown>;
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function isStretched(block: Block): boolean {
  const tuneStretch = block.tunes?.stretch;
  if (tuneStretch === true || tuneStretch === "true") return true;
  return block.data?.stretched === true;
}

/* Only image and table blocks honor the stretch setting
   (@editorjs/image and @editorjs/table persist it as data.stretched);
   text blocks always stay at the readable measure. */
function wantsStretch(block: Block): boolean {
  return isStretched(block) && (block.type === "image" || block.type === "table");
}

function rawHtml(text: unknown): { __html: string } | undefined {
  return typeof text === "string" && text.length > 0 ? { __html: text } : undefined;
}

function renderListItems(items: unknown): ReactNode[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      return <li key={index} dangerouslySetInnerHTML={rawHtml(item)} />;
    }

    const entry = item as Record<string, unknown>;
    const children =
      Array.isArray(entry.items) && entry.items.length > 0 ? (
        <ul>{renderListItems(entry.items)}</ul>
      ) : null;

    return (
      <li key={index}>
        <span dangerouslySetInnerHTML={rawHtml(entry.content ?? entry.text)} />
        {children}
      </li>
    );
  });
}

function renderTableCell(cell: unknown, cellIndex: number, tag: "th" | "td") {
  if (tag === "th") {
    return <th key={cellIndex} dangerouslySetInnerHTML={rawHtml(cell)} />;
  }
  return <td key={cellIndex} dangerouslySetInnerHTML={rawHtml(cell)} />;
}

function renderTableRow(cells: unknown, withHeadings: boolean, rowIndex: number) {
  if (!Array.isArray(cells)) return null;
  const tag = withHeadings && rowIndex === 0 ? "th" : "td";
  return (
    <tr>
      {cells.map((cell, cellIndex) => renderTableCell(cell, cellIndex, tag))}
    </tr>
  );
}

function renderBlockContent(block: Block): ReactNode {
  const data = block.data ?? {};

  switch (block.type) {
    case "header": {
      const index = Math.min(Math.max(Number(data.level) || 2, 1), 6) - 1;
      const Tag = HEADINGS[index] ?? "h2";
      return <Tag className="ce-header" dangerouslySetInnerHTML={rawHtml(data.text)} />;
    }

    case "paragraph":
      return <p className="ce-paragraph" dangerouslySetInnerHTML={rawHtml(data.text)} />;

    case "caption":
      return <div className="caption-tool text-caption" dangerouslySetInnerHTML={rawHtml(data.text)} />;

    case "list": {
      const ListTag = data.style === "ordered" ? "ol" : "ul";
      return <ListTag className="cdx-list">{renderListItems(data.items)}</ListTag>;
    }

    case "checklist": {
      const rows = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
      return (
        <ul className="cdx-checklist cdx-checklist-render">
          {rows.map((item, index) => (
            <li key={index} className={item.checked ? "is-checked" : undefined}>
              <i
                className={`bi ${item.checked ? "bi-check-circle-fill" : "bi-circle"}`}
                aria-hidden="true"
              />
              <span dangerouslySetInnerHTML={rawHtml(item.text)} />
            </li>
          ))}
        </ul>
      );
    }

    case "table": {
      const content = Array.isArray(data.content) ? data.content : [];
      return (
        <table className="tc-table">
          <tbody>
            {content.map((row, rowIndex) => (
              <Fragment key={rowIndex}>
                {renderTableRow(row, Boolean(data.withHeadings), rowIndex)}
              </Fragment>
            ))}
          </tbody>
        </table>
      );
    }

    case "image": {
      const file = (data.file as Record<string, unknown> | undefined) ?? {};
      const src = typeof file.url === "string" ? file.url : data.url;
      if (typeof src !== "string") return null;
      const caption = typeof data.caption === "string" ? data.caption : "";
      return (
        <figure className="cdx-image">
          <img src={src} alt={caption} loading="lazy" />
          {caption ? (
            <figcaption className="cdx-image__caption text-caption">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "embed": {
      const src = data.embed;
      if (typeof src !== "string") return null;
      return (
        <div className="cdx-embed">
          <iframe
            src={src}
            width={typeof data.width === "number" ? String(data.width) : "100%"}
            height={typeof data.height === "number" ? String(data.height) : "360"}
            title={typeof data.source === "string" ? data.source : "Embedded content"}
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );
    }

    case "delimiter":
      return <hr className="ce-delimiter" />;

    case "quote": {
      return (
        <blockquote className="cdx-quote">
          <p className="cdx-quote__text" dangerouslySetInnerHTML={rawHtml(data.text)} />
          {typeof data.caption === "string" && data.caption ? (
            <cite className="cdx-quote__caption" dangerouslySetInnerHTML={rawHtml(data.caption)} />
          ) : null}
        </blockquote>
      );
    }

    case "code": {
      const code = typeof data.code === "string" ? data.code : "";
      return (
        <pre className="ce-code">
          <code>{code}</code>
        </pre>
      );
    }

    case "warning": {
      return (
        <aside className="callout-banner" role="note">
          <span className="callout-banner__icon" aria-hidden="true">
            ℹ
          </span>
          <div className="callout-banner__content">
            {typeof data.title === "string" && data.title ? (
              <h4 className="callout-banner__title" dangerouslySetInnerHTML={rawHtml(data.title)} />
            ) : null}
            {typeof data.message === "string" && data.message ? (
              <div className="callout-banner__message" dangerouslySetInnerHTML={rawHtml(data.message)} />
            ) : null}
          </div>
        </aside>
      );
    }

    case "metricGrid": {
      const items = Array.isArray(data.items)
        ? (data.items as Array<Record<string, unknown>>)
        : [];
      return (
        <section className="metric-grid-container" aria-label="Key Metrics">
          <div className="metric-grid">
            {items.map((item, index) => (
              <article key={index} className="metric-card">
                {typeof item.value === "string" && item.value ? (
                  <span className="metric-card__value">{item.value}</span>
                ) : null}
                {typeof item.label === "string" && item.label ? (
                  <span className="metric-card__label">{item.label}</span>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      );
    }

    default: {
      return (
        <div className={`ce-block-fallback ce-block-${block.type}`}>
          {typeof data.text === "string" ? (
            <div dangerouslySetInnerHTML={rawHtml(data.text)} />
          ) : null}
        </div>
      );
    }
  }
}

function renderBlock(block: Block): ReactNode {
  const node = renderBlockContent(block);
  if (!wantsStretch(block)) return node;

  if (isValidElement(node)) {
    const element = node as ReactElement<{ className?: unknown }>;
    const baseClass = typeof element.props.className === "string" ? element.props.className : "";
    return cloneElement(element, { className: `${baseClass} is-stretched` });
  }
  return node;
}

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => (
    <Fragment key={index}>{renderBlock(block)}</Fragment>
  ));
}