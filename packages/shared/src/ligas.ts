/** Catálogos de las ligas. Los códigos se guardan en la base; los nombres son solo de presentación. */

export const UNIVERSIDADES = {
  uni: "UNI · Universidad Nacional de Ingeniería",
  pucp: "PUCP · Pontificia Universidad Católica del Perú",
  unmsm: "UNMSM · Universidad Nacional Mayor de San Marcos",
  upc: "UPC · Universidad Peruana de Ciencias Aplicadas",
  urp: "URP · Universidad Ricardo Palma",
  usmp: "USMP · Universidad de San Martín de Porres",
  ulima: "ULima · Universidad de Lima",
  unfv: "UNFV · Universidad Nacional Federico Villarreal",
  utp: "UTP · Universidad Tecnológica del Perú",
  upn: "UPN · Universidad Privada del Norte",
  ucv: "UCV · Universidad César Vallejo",
  usil: "USIL · Universidad San Ignacio de Loyola",
  ucsur: "UCSUR · Universidad Científica del Sur",
  unalm: "UNALM · Universidad Nacional Agraria La Molina",
  unsa: "UNSA · Universidad Nacional de San Agustín",
  ucsm: "UCSM · Universidad Católica de Santa María",
  ucsp: "UCSP · Universidad Católica San Pablo",
  unsaac: "UNSAAC · Universidad Nacional San Antonio Abad del Cusco",
  unt: "UNT · Universidad Nacional de Trujillo",
  upao: "UPAO · Universidad Privada Antenor Orrego",
  unprg: "UNPRG · Universidad Nacional Pedro Ruiz Gallo",
  unp: "UNP · Universidad Nacional de Piura",
  udep: "UDEP · Universidad de Piura",
  unc: "UNC · Universidad Nacional de Cajamarca",
  uncp: "UNCP · Universidad Nacional del Centro del Perú",
  upla: "UPLA · Universidad Peruana Los Andes",
  una: "UNA · Universidad Nacional del Altiplano",
  uancv: "UANCV · Universidad Andina Néstor Cáceres Velásquez",
  unjbg: "UNJBG · Universidad Nacional Jorge Basadre Grohmann",
  unasam: "UNASAM · Universidad Nacional Santiago Antúnez de Mayolo",
  unsch: "UNSCH · Universidad Nacional de San Cristóbal de Huamanga",
  otra: "Otra universidad o instituto",
} as const;
export type Universidad = keyof typeof UNIVERSIDADES;
/** Nombre corto para rankings ("UNI", "PUCP"…). */
export const siglaUniversidad = (u: Universidad) => (u === "otra" ? "Otras" : UNIVERSIDADES[u].split(" · ")[0]!);

export const REGIONES = {
  amazonas: "Amazonas",
  ancash: "Áncash",
  apurimac: "Apurímac",
  arequipa: "Arequipa",
  ayacucho: "Ayacucho",
  cajamarca: "Cajamarca",
  callao: "Callao",
  cusco: "Cusco",
  huancavelica: "Huancavelica",
  huanuco: "Huánuco",
  ica: "Ica",
  junin: "Junín",
  la_libertad: "La Libertad",
  lambayeque: "Lambayeque",
  lima: "Lima",
  loreto: "Loreto",
  madre_de_dios: "Madre de Dios",
  moquegua: "Moquegua",
  pasco: "Pasco",
  piura: "Piura",
  puno: "Puno",
  san_martin: "San Martín",
  tacna: "Tacna",
  tumbes: "Tumbes",
  ucayali: "Ucayali",
} as const;
export type Region = keyof typeof REGIONES;

/** Divisiones semanales, de menor a mayor. */
export const DIVISIONES = [
  { codigo: "adobe", nombre: "Adobe", emoji: "🧱", color: "#B07A4F" },
  { codigo: "albanileria", nombre: "Albañilería", emoji: "🏠", color: "#C2553D" },
  { codigo: "concreto", nombre: "Concreto", emoji: "🪨", color: "#8A9199" },
  { codigo: "concreto_armado", nombre: "Concreto Armado", emoji: "🏗️", color: "#3B5174" },
  { codigo: "acero", nombre: "Acero", emoji: "🔩", color: "#4F6D8A" },
  { codigo: "postensado", nombre: "Postensado", emoji: "🌉", color: "#FF8A1F" },
] as const;
export type Division = (typeof DIVISIONES)[number]["codigo"];

/** Títulos de carrera por puntos de obra acumulados. */
export const TITULOS = [
  { desde: 0, nombre: "Practicante" },
  { desde: 100, nombre: "Asistente de Obra" },
  { desde: 300, nombre: "Ingeniero de Campo" },
  { desde: 700, nombre: "Residente de Obra" },
  { desde: 1500, nombre: "Supervisor" },
  { desde: 3000, nombre: "Gerente de Proyecto" },
  { desde: 6000, nombre: "Ingeniero de la Norma" },
] as const;

export function tituloDe(puntos: number) {
  let i = 0;
  while (i + 1 < TITULOS.length && puntos >= TITULOS[i + 1]!.desde) i++;
  return { actual: TITULOS[i]!.nombre, siguiente: TITULOS[i + 1] ?? null };
}

/** Fuentes de puntos de obra. */
export const XP_SOURCES = ["review", "daily_question", "duel"] as const;
export type XpSource = (typeof XP_SOURCES)[number];

export type FilaRanking = { posicion: number; nombre: string; puntos: number; soyYo?: boolean; esMio?: boolean };

export type EstadoLiga = {
  /** Lunes de la semana (Lima). */
  semana: string;
  /** "3 d 5 h" para el cierre de la semana. */
  cierraEn: string;
  division: Division;
  /** Mi grupo de la división esta semana, ordenado. */
  tabla: FilaRanking[];
  miPosicion: number;
  misPuntosSemana: number;
  /** Puestos que suben y bajan al cierre. */
  suben: number;
  bajan: number;
  puntosTotales: number;
  titulo: string;
  siguienteTitulo: { nombre: string; desde: number } | null;
  /** Lo que ya gané hoy y el tope diario. */
  puntosHoy: number;
  topeDiario: number;
  universidad: Universidad | null;
  region: Region | null;
  /** Mi universidad y mi región en sus rankings de la semana. */
  miUniversidad: FilaRanking | null;
  miRegion: FilaRanking | null;
  /** Resultado de la semana anterior al cambiar de semana. */
  cambioDivision: "subio" | "bajo" | "igual" | null;
};
