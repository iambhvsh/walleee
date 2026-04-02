/**
 * Triggers a native browser download by creating and clicking a temporary anchor.
 * Avoids blob URLs and prevents RAM spikes on mobile.
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
 * Derives a download filename from a Cloudinary public_id or URL.
 */
export function filenameFromPublicId(publicId: string): string {
  const base = publicId.split('/').pop() ?? publicId;
  return `${base}.jpg`;
}
