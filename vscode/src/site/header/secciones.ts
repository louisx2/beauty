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

/** La activa es la última (en orden de la página) cuyo borde de arriba ya cruzó la línea. */
export function seccionActiva(marcas: MarcaSeccion[], linea: number): string | null {
  let activa: string | null = marcas.length ? marcas[0].id : null;
  for (const m of marcas) if (m.top <= linea) activa = m.id;
  return activa;
}
