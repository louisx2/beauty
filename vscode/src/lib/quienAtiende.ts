// Quién atiende clientas y qué servicios puede hacer, en la reserva en línea y en el panel.
// - La especialista hace lo que tiene marcado; sin nada marcado, puede hacer todos.
// - La administración (la dueña) solo hace lo que tiene marcado. Sin servicios es una cuenta para manejar el
//   negocio o darle soporte, y no sale para atender.
// - Recepción no atiende.
export interface ConServicios { role: string; serviceIds?: readonly string[] | null }

export function atiendeClientas(m: ConServicios): boolean {
  return m.role === 'specialist' || (m.role === 'admin' && (m.serviceIds ?? []).length > 0);
}

export function puedeHacer(m: ConServicios, serviceId: string): boolean {
  if (!atiendeClientas(m)) return false;
  const ids = m.serviceIds ?? [];
  return ids.includes(serviceId) || (m.role === 'specialist' && ids.length === 0);
}
