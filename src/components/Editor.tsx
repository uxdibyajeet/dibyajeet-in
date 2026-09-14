"use client";

import { useEffect, useRef } from "react";
import type { OutputData } from "@editorjs/editorjs";
import Caption from "@/lib/editorjs/caption";
import Eyebrow from "@/lib/editorjs/eyebrow";
import { compressImage } from "@/lib/compressImage";
import {
  notifyEditorChange,
  registerEditorSave,
  unregisterEditorChange,
  unregisterEditorSave,
} from "@/lib/editorStore";

const uploadByFile = async (file: File) => {
  const upload = await compressImage(file);
  const body = new FormData();
  body.append("file", upload, upload.name);
  const res = await fetch("/api/upload", { method: "POST", body });
  const payload = (await res.json()) as { url?: string };
  if (!res.ok || !payload.url) throw new Error("Upload failed");
  return { success: 1, file: { url: payload.url } };
};

const uploadByUrl = async (url: string) => ({
  success: 1,
  file: { url },
});

type EditorWithBlocks = { blocks: { getCurrentBlockIndex: () => number } };

/**
 * EditorJS computes the toolbar `top` relative to the block's *first
 * input* (so the plus button rides tall headings or tall media).
 * We pin it back to the top edge of the hovered/current block so the
 * plus + settings buttons always float beside the start of the block
 * content. Desktop only — mobile lays the toolbar out differently.
 */
function pinToolbarToCurrentBlock(holder: HTMLElement, editor: EditorWithBlocks): () => void {
  const toolbar = holder.querySelector<HTMLElement>(".ce-toolbar");
  const redactor = holder.querySelector<HTMLElement>(".codex-editor__redactor");
  if (!toolbar || !redactor || window.matchMedia("(max-width: 650px)").matches) {
    return () => {};
  }

  let hovered = holder.querySelector<HTMLElement>(".ce-block");
  let raf = 0;

  const onOver = (event: Event) => {
    const el = (event.target as Element | null)?.closest?.(".ce-block");
    hovered = el instanceof HTMLElement ? el : null;
  };

  const pin = () => {
    raf = 0;
    if (!toolbar.classList.contains("ce-toolbar--opened")) return;
    const index = editor.blocks.getCurrentBlockIndex();
    const block =
      hovered ??
      (index >= 0 ? holder.querySelectorAll<HTMLElement>(".ce-block")[index] : undefined);
    if (!block) return;
    const top = block.offsetTop;
    if (parseInt(toolbar.style.top ?? "", 10) !== top) {
      toolbar.style.top = `${top}px`;
    }
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(pin);
  };

  redactor.addEventListener("mouseover", onOver, { passive: true });

  const observer = new MutationObserver(schedule);
  observer.observe(toolbar, { attributes: true, attributeFilter: ["class", "style"] });

  schedule();

  return () => {
    redactor.removeEventListener("mouseover", onOver);
    observer.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}

export default function Editor({
  initialData,
}: {
  initialData?: OutputData;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const initialRef = useRef<OutputData | undefined>(initialData);

  useEffect(() => {
    let disposed = false;
    const toolbarCleanup = { run: () => {} };

    async function init() {
      const [
        { default: EditorJS },
        { default: Header },
        { default: Paragraph },
        { default: ListTool },
        { default: TableTool },
        { default: ImageTool },
        { default: EmbedTool },
        { default: Delimiter },
        { default: ChecklistTool },
        { default: Quote },
        { default: CodeTool },
        { default: Marker },
        { default: InlineCode },
      ] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/header"),
        import("@editorjs/paragraph"),
        import("@editorjs/list"),
        import("@editorjs/table"),
        import("@editorjs/image"),
        import("@editorjs/embed"),
        import("@editorjs/delimiter"),
        import("@editorjs/checklist"),
        import("@editorjs/quote"),
        import("@editorjs/code"),
        import("@editorjs/marker"),
        import("@editorjs/inline-code"),
      ]);

      if (disposed || !holderRef.current) return;

      let initialData: OutputData | undefined = initialRef.current;
      if (!initialData) {
        try {
          const stored = window.localStorage.getItem("editor-content");
          if (stored) initialData = JSON.parse(stored) as OutputData;
        } catch {
          initialData = undefined;
        }
      }

      const editor = new EditorJS({
        holder: holderRef.current,
        data:
          initialData ?? {
            time: Date.now(),
            version: "2.30.0",
            blocks: [
              { type: "header", data: { text: "Start editing", level: 2 } },
              {
                type: "paragraph",
                data: { text: "Your page content lives here." },
              },
            ],
          },
        placeholder: "Start writing…",
        tools: {
          header: {
            class: Header,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+H",
            config: { levels: [1, 2, 3], defaultLevel: 2 },
          },
          paragraph: { class: Paragraph as never, inlineToolbar: true },
          caption: { class: Caption, inlineToolbar: true },
          eyebrow: { class: Eyebrow, inlineToolbar: true },
          list: { class: ListTool, inlineToolbar: true },
          checklist: { class: ChecklistTool, inlineToolbar: true },
          table: {
            class: TableTool as never,
            inlineToolbar: true,
            config: { withHeadings: true, rows: 2, cols: 3 },
          },
          image: {
            class: ImageTool,
            config: {
              uploader: { uploadByFile, uploadByUrl },
              captionPlaceholder: "Image caption",
            },
          },
          embed: { class: EmbedTool, inlineToolbar: true },
          delimiter: { class: Delimiter },
          quote: { class: Quote, inlineToolbar: true, shortcut: "CMD+SHIFT+O" },
          code: { class: CodeTool },
          marker: { class: Marker, shortcut: "CMD+SHIFT+M" },
          inlineCode: { class: InlineCode, shortcut: "CMD+SHIFT+C" },
        },
      });

      editorRef.current = editor;

      const holderEl = holderRef.current;
      if (holderEl) {
        editor.isReady
          .then(() => {
            if (disposed || !holderRef.current) return;
            toolbarCleanup.run = pinToolbarToCurrentBlock(
              holderRef.current,
              editor as EditorWithBlocks,
            );
          })
          .catch(() => {
            /* editor failed to init; nothing to pin */
          });
      }

      const editors = editor as never as {
        on?: (event: string, callback: () => void) => void;
        off?: (event: string, callback: () => void) => void;
      };
      editors.on?.("change", notifyEditorChange);

      registerEditorSave(() =>
        editor.save().then((data: unknown) => {
          try {
            window.localStorage.setItem("editor-content", JSON.stringify(data));
          } catch {
            /* storage unavailable */
          }
          return data;
        }),
      );
    }

    init();

    return () => {
      disposed = true;
      toolbarCleanup.run();
      unregisterEditorSave();
      unregisterEditorChange();
      const instance = editorRef.current as { destroy?: () => void } | null;
      if (instance?.destroy) {
        try {
          instance.destroy();
        } catch {
          /* already destroyed */
        }
      }
      editorRef.current = null;
    };
  }, []);

  return (
    <div
      id="editorjs"
      className="span-12 editor-container"
      ref={holderRef}
    />
  );
}