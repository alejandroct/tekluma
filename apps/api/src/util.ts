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

/** Orders article numbers as the standard does: 2.1 before 10.1, and 7.1 before 7.1.1. */
export const compararNumeros = (a: string, b: string): number =>
  a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
