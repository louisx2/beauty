// Tema de la web de la clienta: marrón por defecto, beige opcional (spec §3.2).
// Va aparte del tema del panel (html[data-theme] / themeStore): uno no afecta al otro.
export const TEMAS = ['oscuro', 'claro'] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_POR_DEFECTO: Tema = 'oscuro';
export const CLAVE_TEMA = 'anadsll-site-tema';

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

/** Tema guardado en el teléfono de la clienta; marrón si no hay nada o si el almacén falla. */
export function leerTema(almacen: Almacen | null | undefined): Tema {
  try {
    const v = almacen?.getItem(CLAVE_TEMA) ?? '';
    return (TEMAS as readonly string[]).includes(v) ? (v as Tema) : TEMA_POR_DEFECTO;
  } catch {
    return TEMA_POR_DEFECTO;
  }
}

export function guardarTema(almacen: Almacen | null | undefined, tema: Tema): void {
  try {
    almacen?.setItem(CLAVE_TEMA, tema);
  } catch {
    // modo privado o almacenamiento bloqueado: el tema dura solo esta visita
  }
}
