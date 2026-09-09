type SaveFn = () => Promise<unknown>;
type ChangeListener = () => void;

let saveFn: SaveFn | null = null;
let changeListener: ChangeListener | null = null;

export function registerEditorSave(fn: SaveFn): void {
  saveFn = fn;
}

export function unregisterEditorSave(): void {
  saveFn = null;
}

export function saveEditor(): Promise<unknown> | undefined {
  return saveFn?.();
}

export function registerEditorChange(fn: ChangeListener): void {
  changeListener = fn;
}

export function unregisterEditorChange(): void {
  changeListener = null;
}

export function notifyEditorChange(): void {
  changeListener?.();
}