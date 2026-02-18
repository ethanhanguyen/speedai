// Phase 1 — Manifest System

export interface AssetSourceConfig {
  /** Short identifier, used as the root folder ID and as a tag on every asset. */
  readonly id: string;
  /** Human-readable label shown in the asset browser. */
  readonly label: string;
  /**
   * Absolute filesystem path to the directory to scan.
   * Also added to Vite's `server.fs.allow` list (see vite.config.ts).
   */
  readonly root: string;
  /** Additional tags applied to every asset found under this source. */
  readonly tags: readonly string[];
  /** Only files whose names match this pattern are included. */
  readonly includeFiles: RegExp;
  /** Files whose names match this pattern are skipped. */
  readonly excludeFiles: RegExp;
  /**
   * Directory *names* (not full paths) matching this pattern are skipped
   * and not recursed into.  Use this to exclude authoring-only sub-folders.
   */
  readonly excludeDirs?: RegExp;
}
