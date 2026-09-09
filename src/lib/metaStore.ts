export interface MetaFormSnapshot {
  title: string;
  role: string;
  duration: { start: string | null; end: string | null };
  tools: string[];
}

type MetaProvider = () => MetaFormSnapshot;

let provider: MetaProvider | null = null;

export function registerMetaProvider(fn: MetaProvider): void {
  provider = fn;
}

export function unregisterMetaProvider(): void {
  provider = null;
}

export function getMetaSnapshot(): MetaFormSnapshot {
  return (
    provider?.() ?? {
      title: "",
      role: "",
      duration: { start: null, end: null },
      tools: [],
    }
  );
}