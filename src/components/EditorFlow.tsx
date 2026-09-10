"use client";

import { useEffect, useState } from "react";
import CoverImage from "@/components/CoverImage";
import MetadataPanel from "@/components/MetadataPanel";
import Editor from "@/components/Editor";
import CardEditorModal from "@/components/CardEditorModal";
import { getStep, setStep, watchStep, STEP_CASE_STUDY, STEP_CARD } from "@/lib/stepperStore";
import type { CaseStudyDoc } from "@/lib/caseStudy";

export default function EditorFlow({
  slug,
  initialDoc,
}: {
  slug: string;
  initialDoc: CaseStudyDoc | null;
}) {
  const [step, setStepState] = useState(() => getStep());

  useEffect(() => {
    return watchStep((next) => setStepState(next));
  }, []);

  return (
    <>
      <div className="editor-stepper span-12" role="tablist" aria-label="Editor steps">
        <button
          type="button"
          role="tab"
          aria-selected={step === STEP_CASE_STUDY}
          className={`editor-stepper__step${step === STEP_CASE_STUDY ? " is-active" : ""}`}
          onClick={() => setStep(STEP_CASE_STUDY)}
        >
          <span className="editor-stepper__num">1</span>
          <span className="editor-stepper__label">Page / Case Study</span>
        </button>
        <span className="editor-stepper__line" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          aria-selected={step === STEP_CARD}
          className={`editor-stepper__step${step === STEP_CARD ? " is-active" : ""}`}
          onClick={() => setStep(STEP_CARD)}
        >
          <span className="editor-stepper__num">2</span>
          <span className="editor-stepper__label">Card</span>
        </button>
      </div>

      <CoverImage key={`cover-${slug}`} initial={initialDoc?.cover} />

      <div className="editor-flow-step span-12" hidden={step === STEP_CARD}>
        <MetadataPanel key={`meta-${slug}`} initial={initialDoc?.meta} />
        <Editor key={`editor-${slug}`} initialData={initialDoc?.content} />
      </div>

      {step === STEP_CARD ? <CardEditorModal slug={slug} /> : null}
    </>
  );
}