// Must mirror the backend (apps/api/app/routes/ingest.py):
//   - filename must end with ".zip"   (case-sensitive there)
//   - MAX_UPLOAD_BYTES = 200 MB
// Validating in the browser gives instant feedback and saves the user from
// uploading 190 MB only to be rejected. The backend still re-checks
// everything — client-side validation is UX, never security.
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Returns an error message, or null when the file is acceptable. */
export function validateArchive(file: File): string | null {
  if (!file.name.endsWith(".zip")) {
    return "Only .zip archives are supported."
  }
  if (file.size === 0) {
    return "That file is empty."
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That archive is ${formatBytes(file.size)} — the limit is 200 MB.`
  }
  return null
}
