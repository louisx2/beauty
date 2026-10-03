// Fecha "AAAA-MM-DD" según el reloj del equipo (el del salón).
// No usar toISOString() para esto: da la fecha en hora universal y en Santo Domingo (UTC-4), desde las 8:00 p. m.,
// ya es el día siguiente — una clienta atendida a las 8:30 p. m. quedaba con la fecha de mañana.
export function fechaLocal(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
