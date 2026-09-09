"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OutputData } from "@editorjs/editorjs";
import {
  registerMetaProvider,
  unregisterMetaProvider,
} from "@/lib/metaStore";
import {
  DEFAULT_META,
  readingTimeFromBlocks,
  type CaseStudyMeta,
} from "@/lib/caseStudy";
import {
  registerEditorChange,
  unregisterEditorChange,
  saveEditor,
} from "@/lib/editorStore";

export default function MetadataPanel({
  initial,
}: {
  initial?: Partial<CaseStudyMeta> | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [start, setStart] = useState(initial?.duration?.start ?? "");
  const [end, setEnd] = useState(initial?.duration?.end ?? "");
  const [tools, setTools] = useState<string[]>(initial?.tools ?? []);
  const [toolInput, setToolInput] = useState("");
  const [readingTime, setReadingTime] = useState(
    initial?.readingTime ?? DEFAULT_META.readingTime,
  );
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    registerMetaProvider(() => ({
      title,
      role,
      duration: { start: start || null, end: end || null },
      tools,
    }));
    return unregisterMetaProvider;
  }, [title, role, start, end, tools]);

  const refreshReadingTime = useCallback(async () => {
    try {
      const content = (await saveEditor()) as OutputData | undefined;
      if (!content?.blocks) return;
      setReadingTime(readingTimeFromBlocks(content.blocks));
    } catch {
      /* editor not ready yet */
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(refreshReadingTime, 800);
    };
    timerRef.current = window.setTimeout(refreshReadingTime, 0);
    registerEditorChange(onChange);
    return () => {
      unregisterEditorChange();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refreshReadingTime]);

  const addTool = () => {
    const value = toolInput.trim();
    if (value && !tools.includes(value)) {
      setTools([...tools, value]);
    }
    setToolInput("");
  };

  const handleToolKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTool();
    } else if (e.key === "Backspace" && toolInput === "" && tools.length > 0) {
      setTools(tools.slice(0, -1));
    }
  };

  const removeTool = (tool: string) => {
    setTools(tools.filter((t) => t !== tool));
  };

  return (
    <section className="span-12 meta-panel" aria-label="Project details">
      <div className="meta-panel__head">
        <h3 className="text-headline-3">Project details</h3>
        <span
          className="badge-info meta-panel__reading"
          title="Auto-generated from the writing below"
        >
          <i className="bi bi-clock-history" aria-hidden="true" />
          ~{readingTime} min read
        </span>
      </div>

      <div className="meta-panel__grid">
        <label className="meta-field" id="meta-title-field">
          <span className="meta-field__label">Project title</span>
          <input
            id="meta-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled project"
          />
        </label>

        <label className="meta-field" id="meta-role-field">
          <span className="meta-field__label">My role</span>
          <input
            id="meta-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Designer"
          />
        </label>

        <div className="meta-field" id="meta-duration-field">
          <span className="meta-field__label">Duration</span>
          <div className="meta-field__row">
            <input
              id="meta-start"
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
              aria-label="Start date"
            />
            <span className="meta-field__sep" aria-hidden="true">
              to
            </span>
            <input
              id="meta-end"
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="End date"
            />
          </div>
        </div>

        <div className="meta-field" id="meta-tools-field">
          <span className="meta-field__label">Tools used</span>
          <div className="meta-tools">
            <input
              id="meta-tools"
              type="text"
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              onKeyDown={handleToolKey}
              placeholder="Add a tool and press Enter"
            />
            {tools.length > 0 ? (
              <ul className="meta-tools__list">
                {tools.map((tool) => (
                  <li key={tool} className="meta-tools__chip">
                    <span>{tool}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${tool}`}
                      onClick={() => removeTool(tool)}
                    >
                      <i className="bi bi-x" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}