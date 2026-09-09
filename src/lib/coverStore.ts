export interface CoverSnapshot {
  dataUrl: string;
  position: { x: number; y: number };
}

type CoverProvider = () => CoverSnapshot | null;

let provider: CoverProvider | null = null;

export function registerCoverProvider(fn: CoverProvider): void {
  provider = fn;
}

export function unregisterCoverProvider(): void {
  provider = null;
}

export function getCoverSnapshot(): CoverSnapshot | null {
  return provider?.() ?? null;
}