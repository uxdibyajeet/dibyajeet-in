import CoverImage from "@/components/CoverImage";
import Editor from "@/components/Editor";
import MetadataPanel from "@/components/MetadataPanel";

export default function PageEditor() {
  return (
    <main className="main">
      <CoverImage />

      <MetadataPanel />

      <Editor />
    </main>
  );
}