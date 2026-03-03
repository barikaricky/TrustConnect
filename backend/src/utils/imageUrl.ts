import { Request } from 'express';

/**
 * Convert a stored image path to a fully-qualified URL.
 *
 * Stored paths are one of:
 *   - Already a full URL:  "https://..." or "http://..."   → returned as-is
 *   - Relative server path: "/uploads/selfie-123.jpg"       → prefixed with server origin
 *   - Local device URI (fallback): "file:///..."            → treated as missing
 *   - Placeholder text: "placeholder-selfie"               → treated as missing
 *
 * @param path  – value coming from the database
 * @param req   – Express request (used to derive the server origin)
 * @returns full URL string or null when no real image is available
 */
export function normalizeImageUrl(
  path: string | undefined | null,
  req: Request
): string | null {
  if (!path) return null;

  // Already a proper HTTP(S) URL – return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Local device URI stored from a failed upload fallback – nothing the server can serve
  if (path.startsWith('file://') || path.startsWith('content://')) {
    return null;
  }

  // Placeholder text from dev shortcuts
  if (path.startsWith('placeholder')) {
    return null;
  }

  // Relative server path like "/uploads/selfie-123.jpg"
  // Build the server origin from the incoming request
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const origin = `${protocol}://${host}`;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

/**
 * Normalise an array of photo paths (e.g. portfolioPhotos).
 * Filters out nulls so the result is always string[].
 */
export function normalizeImageUrls(
  paths: (string | undefined | null)[] | undefined | null,
  req: Request
): string[] {
  if (!paths || !Array.isArray(paths)) return [];
  return paths
    .map((p) => normalizeImageUrl(p, req))
    .filter((p): p is string => p !== null);
}
