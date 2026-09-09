const MAX_DIMENSION = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

function extensionFor(type: string): string {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  return "jpg";
}

/**
 * Downscales and re-encodes a client image before upload so case-study
 * documents stay small (a 1600px WebP is usually <150 KB vs multi-MB base64).
 * Returns the original file unchanged for SVG/GIF/tiny images.
 */
export async function compressImage(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = 0.85,
): Promise<File> {
  if (
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    file.size < 64 * 1024
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let blob = await canvasToBlob(canvas, quality, "image/webp");
    if (!blob) blob = await canvasToBlob(canvas, quality, "image/jpeg");
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]*$/, "");
    return new File([blob], `${baseName}.${extensionFor(blob.type)}`, {
      type: blob.type,
    });
  } catch {
    return file;
  }
}