"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navRoutes, routes } from "@/lib/routes";
import { renderIcon } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import {
  buildCaseStudyDoc,
  caseStudyDocTitle,
  CASE_STUDY_PREVIEW_SLUG,
  type CaseStudyStatus,
} from "@/lib/caseStudy";

function Logo() {
  return renderIcon("img-logo", "logo");
}

function DefaultNav() {
  const pathname = usePathname();

  return (
    <nav className="global-nav" id="site-navigation">
      <div className="left-div">
        <Logo />
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

function EditorNav() {
  const pathname = usePathname();
  const [status, setStatus] = useState<CaseStudyStatus | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const slug = slugFromPath(pathname) ?? CASE_STUDY_PREVIEW_SLUG;

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

  const persistDoc = async (status: CaseStudyStatus): Promise<boolean> => {
    try {
      const doc = await buildCaseStudyDoc(slug, status);
      const res = await fetch(`/api/case-studies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error("Failed to save case study");
      setProjectTitle(caseStudyDocTitle(doc));
      setStatus(status);
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      return false;
    }
  };

  const handlePublish = async () => {
    await persistDoc("published");
  };

  const handleSaveAndPreview = async () => {
    setPreviewing(true);
    try {
      const ok = await persistDoc(status ?? "published");
      if (!ok) throw new Error("Failed to save case study");
      window.open(`/case-study/${slug}`, "_blank");
    } finally {
      setPreviewing(false);
    }
  };

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
        {status ? (
          <span
            className={`editor-nav-badge${status === "published" ? " is-published" : ""}`}
          >
            {status === "published" ? "Published" : "Saved"}
          </span>
        ) : null}
      </div>

      <div className="btn-group">
        <button
          id="preview-btn"
          className="btn primary-btn"
          onClick={handleSaveAndPreview}
          disabled={previewing}
          type="button"
        >
          {previewing ? "Previewing…" : "Save and Preview"}
        </button>
        <button
          id="save-editor-btn"
          className="btn secondary-btn"
          onClick={handlePublish}
          type="button"
        >
          Save
        </button>
      </div>
    </nav>
  );
}

function DashboardNav() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreateProject = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/case-studies", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
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