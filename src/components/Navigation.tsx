"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navRoutes, routes } from "@/lib/routes";
import { renderIcon } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import { getStep, setStep, watchStep, STEP_CARD, STEP_CASE_STUDY } from "@/lib/stepperStore";
import {
  buildCaseStudyDoc,
  caseStudyDocTitle,
  CASE_STUDIES_CHANGED_KEY,
  CASE_STUDY_PREVIEW_SLUG,
  readPendingFromStorage,
  writePendingToStorage,
  type CaseStudyDoc,
  type CaseStudyStatus,
  type PendingCard,
} from "@/lib/caseStudy";

function Logo() {
  return renderIcon("img-logo", "logo");
}

function DefaultNav() {
  const pathname = usePathname();

  return (
    <nav className="global-nav" id="site-navigation">
      <div className="left-div">
        <Link
          href="/"
          data-link=""
          aria-label="Home"
          transitionTypes={["nav-back"]}
        >
          <Logo />
        </Link>
      </div>

      <div className="right-div">
        {navRoutes.map((route) => {
          const active =
            route.path === "/"
              ? pathname === "/"
              : pathname.startsWith(route.path);
          return (
            <Link
              key={route.path}
              href={route.path}
              data-link=""
              className={`text-base nav-link${active ? " active" : ""}`}
              transitionTypes={
                route.path === "/about" ? ["nav-forward"] : undefined
              }
            >
              {route.label ?? route.path}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/pageEditor\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface SaveToast {
  kind: "success" | "error";
  message: string;
}

function EditorNav() {
  const pathname = usePathname();
  const [status, setStatus] = useState<CaseStudyStatus | null>(null);
  const [existingOrder, setExistingOrder] = useState<number>(0);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [toast, setToast] = useState<SaveToast | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [step, setStepState] = useState(() => getStep());
  const slug = slugFromPath(pathname) ?? CASE_STUDY_PREVIEW_SLUG;

  useEffect(() => {
    return watchStep((next) => setStepState(next));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/case-studies/${slug}`);
        if (!res.ok) {
          if (!cancelled) setProjectTitle(null);
          return;
        }
        const doc = await res.json();
        if (!cancelled) {
          setProjectTitle(caseStudyDocTitle(doc));
          setStatus(doc.status);
          setExistingOrder(typeof doc.order === "number" ? doc.order : 0);
          setLastSaved(doc.savedAt ?? null);
        }
      } catch {
        if (!cancelled) setProjectTitle(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const persistDoc = async (): Promise<CaseStudyDoc | null> => {
    setSaving(true);
    try {
      const doc = await buildCaseStudyDoc(slug, status ?? "archived");
      const res = await fetch(`/api/case-studies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...doc, status: undefined }),
      });
      if (!res.ok) throw new Error("Failed to save case study");
      const saved: CaseStudyDoc = await res.json();
      setProjectTitle(caseStudyDocTitle(saved));
      setStatus(saved.status);
      setLastSaved(saved.savedAt);
      setToast({ kind: "success", message: "Saved" });
      if (typeof window !== "undefined") {
        const entry: PendingCard = {
          kind: "set",
          id: slug,
          status: saved.status,
          order: existingOrder,
          savedAt: saved.savedAt,
          title: caseStudyDocTitle(saved),
          cover: saved.cover,
          at: Date.now(),
        };
        writePendingToStorage({ ...readPendingFromStorage(), [slug]: entry });
        localStorage.setItem(CASE_STUDIES_CHANGED_KEY, Date.now().toString());
      }
      return saved;
    } catch (error) {
      console.error("Save failed:", error);
      setToast({ kind: "error", message: "Save failed — try again" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    await persistDoc();
  };

  const handlePreview = async () => {
    if (saving || previewing) return;
    setPreviewing(true);
    try {
      const saved = await persistDoc();
      if (!saved) throw new Error("Failed to save case study");
      window.open(`/case-study/${slug}`, "_blank");
    } finally {
      setPreviewing(false);
    }
  };

  const handleNext = async () => {
    if (saving) return;
    const saved = await persistDoc();
    if (saved) setStep(STEP_CARD);
  };

  const handleSaveRef = useRef<() => void>(() => {});
  useEffect(() => {
    handleSaveRef.current = () => {
      if (saving) return;
      void persistDoc();
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav className="editor-header" id="site-navigation">
      <Link href="/dashboard" data-link="" className="text-base back-btn">
        <i className="bi bi-arrow-left-short" aria-hidden="true" />
        back to dashboard
      </Link>

      <div className="editor-nav-title-group">
        <p
          className="text-headline-2 editor-nav-title"
          title={projectTitle ?? "Untitled"}
        >
          {projectTitle ?? "Untitled"}
        </p>
        {lastSaved ? (
          <span className="editor-nav-saved">
            <i className="bi bi-clock" aria-hidden="true" />
            saved {formatSavedAt(lastSaved)}
          </span>
        ) : null}
      </div>

      <div className="btn-group">
        {step === STEP_CARD ? (
          <button
            id="back-editor-btn"
            className="btn secondary-btn"
            onClick={() => setStep(STEP_CASE_STUDY)}
            type="button"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
            back
          </button>
        ) : null}
        <button
          id="save-btn"
          className="btn secondary-btn"
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          <i className="bi bi-check-lg" aria-hidden="true" />
          {saving ? "Saving…" : "save"}
        </button>
        {step === STEP_CASE_STUDY ? (
          <button
            id="preview-btn"
            className="btn secondary-btn"
            onClick={handlePreview}
            disabled={previewing || saving}
            type="button"
          >
            <i className="bi bi-eye" aria-hidden="true" />
            {previewing ? "Opening…" : "preview"}
          </button>
        ) : null}
        {step === STEP_CASE_STUDY ? (
          <button
            id="next-btn"
            className="btn primary-btn"
            onClick={handleNext}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving…" : "next"}
            {!saving ? <i className="bi bi-arrow-right" aria-hidden="true" /> : null}
          </button>
        ) : null}
      </div>

      {toast ? (
        <div className={`editor-toast editor-toast--${toast.kind}`} role="status" aria-live="polite">
          <i
            className={`bi ${toast.kind === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      ) : null}
    </nav>
  );
}

function DashboardNav() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CASE_STUDIES_CHANGED_KEY) refresh();
    };
    const onFocus = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  const handleCreateProject = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/case-studies", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      if (typeof window !== "undefined") {
        const entry: PendingCard = {
          kind: "set",
          id: data.slug,
          status: "archived",
          order: typeof data.order === "number" ? data.order : 0,
          savedAt: data.savedAt ?? new Date().toISOString(),
          title: "Untitled",
          cover: null,
          at: Date.now(),
        };
        writePendingToStorage({ ...readPendingFromStorage(), [data.slug]: entry });
        localStorage.setItem(CASE_STUDIES_CHANGED_KEY, Date.now().toString());
      }
      window.open(`/pageEditor/${data.slug}`, "_blank");
      router.refresh();
    } catch (error) {
      console.error("Create project failed:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <nav className="editor-header" id="site-navigation">
      <Link href="/" data-link="" className="text-base back-btn">
        <i className="bi bi-arrow-left-short" aria-hidden="true" />
        back to home
      </Link>

      <p className="text-headline-2 editor-nav-title">dashboard</p>

      <div className="btn-group">
        <button
          id="create-project-btn"
          className="btn primary-btn"
          onClick={handleCreateProject}
          disabled={creating}
          type="button"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          {creating ? "Creating…" : "create new project"}
        </button>
        <LogoutButton />
      </div>
    </nav>
  );
}

export default function Navigation({
  mode,
}: {
  mode?: "default" | "editor" | "dashboard";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedMode =
    mode ??
    routes[pathname]?.view ??
    (pathname.startsWith("/pageEditor") ? "editor" : "default");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (resolvedMode === "editor") return <EditorNav />;
  if (resolvedMode === "dashboard") return <DashboardNav />;
  return <DefaultNav />;
}