import { LineCounter, isMap, isScalar, parseDocument } from "yaml";

/**
 * Build a map from dotted key path to the 1-based line number where that key is
 * declared. JSON is a subset of YAML, so we reuse the `yaml` parser (already a
 * dependency) purely to recover the source positions that JSON.parse discards.
 *
 * Only object members are recorded; array elements and scalar values are not
 * descended into. Callers are expected to have validated the content as JSON
 * first, so on any parse failure an empty map is returned and line information
 * degrades gracefully instead of throwing.
 *
 * Keys are assumed not to contain a literal "." (next-intl uses "." as the
 * message-path separator); a literal dot would collide with the nesting
 * separator. Duplicate keys within a file are resolved last-wins to match
 * JSON.parse: the earlier occurrence's subtree is discarded.
 */
export function collectKeyLines(content: string): Map<string, number> {
  const result = new Map<string, number>();
  const lineCounter = new LineCounter();

  try {
    const doc = parseDocument(content, { lineCounter, uniqueKeys: false });
    if (doc.errors.length > 0) {
      return result;
    }

    const walk = (node: unknown, prefix: string): void => {
      if (!isMap(node)) {
        return;
      }

      for (const pair of node.items) {
        const keyNode = pair.key;
        if (!isScalar(keyNode)) {
          continue;
        }

        const path = prefix === "" ? String(keyNode.value) : `${prefix}.${String(keyNode.value)}`;

        // Last-wins for duplicate keys, matching JSON.parse: drop the subtree
        // collected from an earlier occurrence before recording this one.
        if (result.has(path)) {
          const descendantPrefix = `${path}.`;
          for (const existing of [...result.keys()]) {
            if (existing.startsWith(descendantPrefix)) {
              result.delete(existing);
            }
          }
        }

        const offset = keyNode.range?.[0];
        if (offset != null) {
          result.set(path, lineCounter.linePos(offset).line);
        }

        walk(pair.value, path);
      }
    };

    walk(doc.contents, "");
  } catch {
    return result;
  }

  return result;
}
