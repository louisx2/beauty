// Equipo en la web (spec §6.5): quién sale en "Nuestro equipo" y cómo. Sin imports: se prueba con Node.

/** Fila de `staff` tal como la lee la página (solo columnas autorizadas a anon). */
export interface FilaEquipo {
  id: string;
  name: string | null;
  role: string | null;
  active: boolean | null;
  avatar_url: string | null;
  mostrar_en_web: boolean | null;
  cargo_web: string | null;
  especialidades_web: string | null;
}

export interface MiembroPublico {
  id: string;
  nombre: string;
  cargo: string | null;
  especialidades: string | null;
  foto: string | null;
  /** para el arco sin foto; vacío si el nombre no deja ninguna (entonces va la N) */
  iniciales: string;
}

/** Texto libre del panel: sin espacios de sobra y null si queda vacío, así nunca se guarda "". */
export function textoONull(valor: string | null | undefined): string | null {
  const t = (valor ?? '').replace(/\s+/g, ' ').trim();
  return t || null;
}

// tratamientos que no cuentan para las iniciales ("Dra. Nadieska Soto" → NS)
const TITULOS = new Set(['dr', 'dra', 'lic', 'licda', 'licdo', 'lcda', 'lcdo', 'mtra', 'dña', 'ing', 'sr', 'sra', 'srta']);

/** Primera letra del primer nombre y del último apellido, sin paréntesis ni títulos. */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}]/gu, ''))
    .filter((p) => p && !TITULOS.has(p.toLocaleLowerCase('es')));
  if (!palabras.length) return '';
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : '';
  return (primera + ultima).toLocaleUpperCase('es');
}

/**
 * Quienes salen en la web: marcadas, activas y con nombre. Primero la administración (la dueña) y
 * después por nombre, como en el boceto.
 */
export function equipoPublico(filas: readonly FilaEquipo[]): MiembroPublico[] {
  return filas
    .filter((f) => f.mostrar_en_web === true && f.active === true)
    .map((f) => ({ f, nombre: textoONull(f.name) }))
    .filter((x): x is { f: FilaEquipo; nombre: string } => x.nombre !== null)
    .sort((a, b) =>
      Number(b.f.role === 'admin') - Number(a.f.role === 'admin') ||
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    .map(({ f, nombre }) => ({
      id: String(f.id),
      nombre,
      cargo: textoONull(f.cargo_web),
      especialidades: textoONull(f.especialidades_web),
      foto: textoONull(f.avatar_url),
      iniciales: iniciales(nombre),
    }));
}
