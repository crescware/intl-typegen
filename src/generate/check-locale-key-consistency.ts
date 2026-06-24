export interface LocaleFileKeys {
  /** Locale file name (e.g. "en-US.json"). */
  file: string;
  /** Map from dotted key path to the 1-based line where the key is declared. */
  keyLines: Map<string, number>;
}

export interface KeyDefinition {
  file: string;
  line: number;
}

export interface KeyDiscrepancy {
  /** Locale file that is missing the key. */
  file: string;
  /** Dotted path of the missing key. */
  key: string;
  /** Locale files that do define the key, with the line it appears on. */
  definedIn: KeyDefinition[];
}

function parentPath(path: string): string | null {
  const index = path.lastIndexOf(".");
  return index === -1 ? null : path.slice(0, index);
}

/**
 * Compare the key sets of every locale file and report keys that are not present
 * in all of them. A key is reported against each file that lacks it, together
 * with the files that do define it (and where). When an entire subtree is
 * missing from a file, only the topmost missing key is reported; its descendants
 * are implied and would be noise.
 */
export function findKeyDiscrepancies(files: LocaleFileKeys[]): KeyDiscrepancy[] {
  if (files.length < 2) {
    return [];
  }

  const sortedFiles = [...files].sort((a, b) => a.file.localeCompare(b.file));

  const union = new Set<string>();
  for (const { keyLines } of sortedFiles) {
    for (const key of keyLines.keys()) {
      union.add(key);
    }
  }
  const allKeys = [...union].sort((a, b) => a.localeCompare(b));

  const discrepancies: KeyDiscrepancy[] = [];

  for (const { file, keyLines } of sortedFiles) {
    for (const key of allKeys) {
      if (keyLines.has(key)) {
        continue;
      }

      // Skip descendants of an already-missing subtree: only report the boundary
      // key whose parent is still present in this file (or a top-level key).
      // The parent must be a real key defined in some locale; a phantom parent
      // (e.g. the "a.b" implied by a flat dotted key "a.b.c") exists in no file
      // and must not suppress the genuine mismatch.
      const parent = parentPath(key);
      if (parent !== null && union.has(parent) && !keyLines.has(parent)) {
        continue;
      }

      const definedIn: KeyDefinition[] = [];
      for (const other of sortedFiles) {
        if (other.file === file) {
          continue;
        }
        const line = other.keyLines.get(key);
        if (line != null) {
          definedIn.push({ file: other.file, line });
        }
      }

      discrepancies.push({ file, key, definedIn });
    }
  }

  return discrepancies;
}

/**
 * Render discrepancies as a single, AI-agent-friendly block for stderr. One line
 * per missing key, each carrying the offending file and the `file:line` location
 * of every locale that does define the key.
 */
export function formatKeyDiscrepancies(
  inputPath: string,
  fileCount: number,
  discrepancies: KeyDiscrepancy[],
): string {
  const header = `[intl-typegen] Translation key mismatch across ${fileCount} locale files in ${inputPath}:`;
  const lines = discrepancies.map(({ file, key, definedIn }) => {
    const defined = definedIn.map((d) => `${d.file}:${d.line}`).join(", ");
    return `  ${file}: missing key "${key}" (defined in ${defined})`;
  });
  return [header, ...lines].join("\n");
}
