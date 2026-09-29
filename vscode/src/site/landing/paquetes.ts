// Paquetes en la página principal: sus 3 estilos (spec §6.4), foto, precio por sesión y % de ahorro. Puro para probarlo.
import { FOTOS } from '../brand.ts';

/** precioServicio: precio de una sesión suelta del servicio del paquete; 0 si no tiene precio cargado. */
export interface PaquetePublico {
  id: string;
  nombre: string;
  sesiones: number;
  precio: number;
  servicio: string | null;
  precioServicio: number;
}

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

/** Estilos de la sección de paquetes, elegibles en el panel (spec §6.4). */
export const ESTILOS_PAQUETES = ['membresia', 'menu', 'ahorro'] as const;
export type EstiloPaquetes = (typeof ESTILOS_PAQUETES)[number];
export const ESTILO_POR_DEFECTO: EstiloPaquetes = 'menu';

/** Lo que venga de la base; si no es un estilo conocido, "Menú con foto". */
export function estiloValido(valor: unknown): EstiloPaquetes {
  return (ESTILOS_PAQUETES as readonly unknown[]).includes(valor) ? (valor as EstiloPaquetes) : ESTILO_POR_DEFECTO;
}

type ConPrecios = Pick<PaquetePublico, 'precio' | 'sesiones' | 'precioServicio'>;

/**
 * % que se ahorra frente a pagar cada sesión suelta (spec §6.4-C):
 * (precio del servicio × sesiones − precio del paquete) / (precio del servicio × sesiones).
 * null = sin sello: el servicio o el paquete no tienen precio, no hay sesiones o el ahorro no llega a 1 %.
 */
export function porcentajeAhorro(p: ConPrecios): number | null {
  if (p.precioServicio <= 0 || p.sesiones <= 0 || p.precio <= 0) return null;
  const suelto = p.precioServicio * p.sesiones;
  const ratio = (suelto - p.precio) / suelto;
  return ratio >= 0.01 ? Math.round(ratio * 100) : null;
}

/** Cuántos paquetes saldrían sin sello en el estilo Ahorro (para el aviso del panel). */
export function paquetesSinSello(paquetes: ConPrecios[]): number {
  return paquetes.filter((p) => porcentajeAhorro(p) === null).length;
}
