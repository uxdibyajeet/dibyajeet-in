/**
 * Module-level stepper state for the page editor. Both the global editor nav
 * and the in-page stepper/flow (step content) read and write this without
 * prop drilling, mirroring the editorStore/metaStore pattern already used here.
 */
export const STEP_CASE_STUDY = 0;
export const STEP_CARD = 1;

let step = STEP_CASE_STUDY;
let subscriber: ((next: number) => void) | null = null;

export function getStep(): number {
  return step;
}

export function setStep(next: number): void {
  if (next === step) return;
  step = next;
  subscriber?.(step);
}

export function watchStep(fn: (next: number) => void): () => void {
  subscriber = fn;
  return () => {
    if (subscriber === fn) subscriber = null;
  };
}