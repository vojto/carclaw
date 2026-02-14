import { getSnapshot } from "mobx-keystone";

function isModelSnapshot(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "$modelType" in (value as Record<string, unknown>)
  );
}

/**
 * Builds a filtered snapshot of a store, only including:
 * - Keys returned by the store's `persistKeys()` method (raw values)
 * - Child stores (detected by `$modelType` in snapshot), recursed automatically
 * - `$modelType` and `$modelId` metadata
 */
export function getFilteredSnapshot(
  model: { persistKeys?: () => string[] } & object,
): Record<string, unknown> {
  const snapshot = getSnapshot(model) as Record<string, unknown>;
  const keys: string[] =
    typeof model.persistKeys === "function" ? model.persistKeys() : [];

  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(snapshot)) {
    if (key === "$modelType" || key === "$modelId") {
      filtered[key] = value;
    } else if (isModelSnapshot(value)) {
      const childModel = (model as Record<string, unknown>)[key];
      if (
        childModel &&
        typeof childModel === "object" &&
        "persistKeys" in childModel &&
        typeof (childModel as { persistKeys: unknown }).persistKeys ===
          "function"
      ) {
        filtered[key] = getFilteredSnapshot(
          childModel as { persistKeys: () => string[] } & object,
        );
      } else {
        filtered[key] = value;
      }
    } else if (keys.includes(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}
