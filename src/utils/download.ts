/**
 * Triggers a native browser download.
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Derives a download filename from a Cloudinary public_id, preserving the
 * actual format so downloads get the correct extension (not always .jpg).
 */
export function filenameFromItem(publicId: string, format: string): string {
  const base = publicId.split('/').pop() ?? publicId;
  // Normalise common aliases
  const ext = format === 'jpeg' ? 'jpg' : format;
  return `${base}.${ext}`;
}
