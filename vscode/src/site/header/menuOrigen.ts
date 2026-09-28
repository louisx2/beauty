export interface Punto { x: number; y: number }

/** Centro de las dos líneas del botón MENÚ (a 21 px de su borde derecho): ahí nace el círculo. */
export function origenDesdeBoton(r: { right: number; top: number; height: number }): Punto {
  return { x: Math.round(r.right - 21), y: Math.round(r.top + r.height / 2) };
}
