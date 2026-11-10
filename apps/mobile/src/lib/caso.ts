import type { ContenidoTarjeta } from "@tekluma/shared";

type Caso = Extract<ContenidoTarjeta, { tipo: "caso_numerico" }>;

/** Funciones permitidas en las fórmulas de las tarjetas (las normas usan √f′c, potencias, etc.). */
const FUNCIONES: Record<string, (x: number) => number> = { sqrt: Math.sqrt, abs: Math.abs };

/** Evalúa expresiones aritméticas (+ - * / ^, paréntesis, sqrt y abs) sin usar eval. */
export function evaluar(expr: string, vars: Record<string, number>): number {
  const tokens = expr.match(/\d+(\.\d+)?|[A-Za-z_]\w*|[()+\-*/^]/g) ?? [];
  let i = 0;
  const ver = () => tokens[i];
  const tomar = () => tokens[i++];

  const primario = (): number => {
    const t = tomar();
    if (t === "(") {
      const v = suma();
      tomar();
      return v;
    }
    if (t === "-") return -primario();
    if (t !== undefined && t in FUNCIONES && ver() === "(") {
      tomar();
      const v = suma();
      tomar();
      return FUNCIONES[t]!(v);
    }
    if (t !== undefined && /^\d/.test(t)) return Number(t);
    if (t !== undefined && t in vars) return vars[t]!;
    throw new Error(`Símbolo desconocido: ${t}`);
  };
  const potencia = (): number => {
    const base = primario();
    return ver() === "^" ? (tomar(), base ** potencia()) : base;
  };
  const producto = (): number => {
    let v = potencia();
    while (ver() === "*" || ver() === "/") v = tomar() === "*" ? v * potencia() : v / potencia();
    return v;
  };
  const suma = (): number => {
    let v = producto();
    while (ver() === "+" || ver() === "-") v = tomar() === "+" ? v + producto() : v - producto();
    return v;
  };
  return suma();
}

export function generarCaso(caso: Caso) {
  const valores: Record<string, number> = {};
  for (const [nombre, def] of Object.entries(caso.variables)) {
    valores[nombre] = def.valores[Math.floor(Math.random() * def.valores.length)]!;
  }
  const enunciado = caso.enunciado.replace(/\{(\w+)\}/g, (_, n: string) => String(valores[n] ?? `{${n}}`));
  return { enunciado, resultado: evaluar(caso.formula, valores) };
}
