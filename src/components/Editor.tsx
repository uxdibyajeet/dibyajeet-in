"use client";

import { useEffect, useRef } from "react";
import type { OutputData } from "@editorjs/editorjs";
import Caption from "@/lib/editorjs/caption";
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
            config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 },
          },
          paragraph: { class: Paragraph as never, inlineToolbar: true },
          caption: { class: Caption, inlineToolbar: true },
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