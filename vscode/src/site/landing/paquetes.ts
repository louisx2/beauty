// Paquetes en la página principal, estilo "Menú con foto" (spec §6.4-B). Puro para probarlo.
import { FOTOS } from '../brand.ts';

export interface PaquetePublico { id: string; nombre: string; sesiones: number; precio: number; servicio: string | null }

/** "Paquete Facial Profunda x5" → "Facial Profunda" */
export function nombreCorto(nombre: string): string {
  const limpio = nombre.replace(/^paquete\s+(de\s+)?/i, '').replace(/\s+x\s?\d+\s*$/i, '').trim();
  return limpio || nombre.trim();
}

/** Precio de cada sesión, redondeado al peso. */
export function precioPorSesion(precio: number, sesiones: number): number | null {
  return sesiones > 0 ? Math.round(precio / sesiones) : null;
}

/** Con 3 o más paquetes, el del medio (van por precio) lleva "Más elegido", como en el sitio actual. */
export function indiceDestacado(total: number): number {
  return total >= 3 ? Math.floor(total / 2) : -1;
}

// en orden: la primera palabra que aparezca decide la foto
const FOTO_POR_PALABRA: [RegExp, string][] = [
  [/peeling/i, FOTOS.anabelGuantes],
  [/microderm|hifu|radiofrecuencia|aparatolog/i, FOTOS.servicio.aparatologia],
  [/l[aá]ser/i, FOTOS.servicio.laser],
  [/cera/i, FOTOS.servicio.cera],
  [/blanque/i, FOTOS.servicio.blanqueamiento],
  [/tatuaje/i, FOTOS.servicio.tatuaje],
  [/lips|labio/i, FOTOS.servicio.lips],
  [/pesta|ceja/i, FOTOS.servicio.pestanas],
  [/maquillaje/i, FOTOS.servicio.maquillaje],
  [/facial|limpieza|hidra|dermaplaning|microneedling|exosomas/i, FOTOS.servicio.limpieza],
];

/** Foto del paquete según su nombre y, si no dice nada, según su servicio. null = se muestra la N. */
export function fotoDePaquete(nombre: string, servicio: string | null): string | null {
  for (const texto of [nombre, servicio ?? '']) {
    for (const [palabra, foto] of FOTO_POR_PALABRA) if (palabra.test(texto)) return foto;
  }
  return null;
}
