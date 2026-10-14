// Fecha "AAAA-MM-DD" según el reloj del equipo (el del salón).
// No usar toISOString() para esto: da la fecha en hora universal y en Santo Domingo (UTC-4), desde las 8:00 p. m.,
// ya es el día siguiente — una clienta atendida a las 8:30 p. m. quedaba con la fecha de mañana.
export function fechaLocal(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Lo que viene de la base como fecha con hora ("2026-09-05T02:10:00+00:00", p. ej. la compra de un paquete) →
 *  el día "AAAA-MM-DD" en el reloj del salón. Una fecha sola se queda igual; lo que no es fecha, vacío. */
export function soloFecha(valor: string | null | undefined): string {
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '' : fechaLocal(d);
}
