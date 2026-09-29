// Secciones de la página principal: menú, pestañas y sección activa (spec §4.1).
export interface Seccion { id: string; etiqueta: string }

export const SECCIONES: Seccion[] = [
  { id: 's-inicio', etiqueta: 'Inicio' },
  { id: 's-servicios', etiqueta: 'Servicios' },
  { id: 's-paquetes', etiqueta: 'Paquetes' },
  { id: 's-nosotros', etiqueta: 'Nosotros' },
  { id: 's-equipo', etiqueta: 'Equipo' },
  { id: 's-opiniones', etiqueta: 'Opiniones' },
  { id: 's-contacto', etiqueta: 'Contacto' },
];

export interface MarcaSeccion { id: string; top: number }

/**
 * La activa es la última (en orden de la página) cuyo borde de arriba ya cruzó la línea.
 * Al llegar al fondo manda la última: una sección corta al final nunca alcanzaría la línea.
 */
export function seccionActiva(marcas: MarcaSeccion[], linea: number, alFondo = false): string | null {
  if (alFondo && marcas.length) return marcas[marcas.length - 1].id;
  let activa: string | null = marcas.length ? marcas[0].id : null;
  for (const m of marcas) if (m.top <= linea) activa = m.id;
  return activa;
}

/**
 * Un tercio de la pantalla, pero nunca por encima de donde queda una sección al tocarla
 * (barra + 56 px de margen + 1). Así, en un celular acostado, la que se tocó queda marcada.
 */
export function lineaDeSeccion(altoVentana: number, altoBarra: number): number {
  return Math.max(altoVentana * 0.33, altoBarra + 57);
}

/** Solo las secciones que la página tiene de verdad (sin paquetes u opiniones vacías); sin lista, todas. */
export function seccionesVisibles(presentes?: readonly string[]): Seccion[] {
  return presentes ? SECCIONES.filter((s) => presentes.includes(s.id)) : SECCIONES;
}

/** Lo que la página tiene hoy: estas secciones dependen de datos y solo están si hay qué mostrar. */
export interface Presencia { paquetes: boolean; equipo: boolean; opiniones: boolean }

const OPCIONALES: Record<string, keyof Presencia> = {
  's-paquetes': 'paquetes',
  's-equipo': 'equipo',
  's-opiniones': 'opiniones',
};

/** Ids de las secciones presentes, en el orden de la página. La misma lista pinta la página y arma el menú. */
export function seccionesPresentes(p: Presencia): string[] {
  return SECCIONES.map((s) => s.id).filter((id) => {
    const clave = OPCIONALES[id];
    return clave ? p[clave] : true;
  });
}
