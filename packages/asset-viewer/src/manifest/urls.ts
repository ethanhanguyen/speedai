// Phase 1 — Manifest System

/**
 * Convert an absolute filesystem path to a Vite dev-server URL.
 *
 * Vite serves files outside the project root via the `/@fs/` prefix when
 * `server.fs.strict` is false and the directory is listed in `server.fs.allow`.
 *
 * Example:
 *   "/Users/hoang/Downloads/craftpix/pack1/Hull_01.png"
 *   → "/@fs/Users/hoang/Downloads/craftpix/pack1/Hull_01.png"
 */
export function toDevUrl(fsPath: string): string {
  // fsPath starts with '/', so `/@fs` + fsPath produces `/@fs/absolute/path`.
  return `/@fs${fsPath}`;
}
