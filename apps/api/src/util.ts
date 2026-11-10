/** JSON with sorted keys: jsonb does not keep key order, so plain stringify would not match. */
export const canonico = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonico).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
