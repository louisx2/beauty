// Opiniones de la página principal. Son de ejemplo hasta tener reseñas reales (spec §9).
// Si la lista queda vacía, la sección Opiniones no aparece ni en la página ni en el menú.
export interface Testimonio { nombre: string; servicio: string; texto: string; estrellas: number }

export const testimonios: Testimonio[] = [
  {
    nombre: 'María G.', servicio: 'Depilación láser', estrellas: 5,
    texto: 'Increíble el resultado después de solo 3 sesiones. El equipo es súper profesional y el ambiente te hace sentir en confianza.',
  },
  {
    nombre: 'Laura S.', servicio: 'Limpieza facial', estrellas: 5,
    texto: 'Mi piel nunca había lucido tan bien. La limpieza profunda me cambió la vida. 100% recomendado.',
  },
  {
    nombre: 'Carolina P.', servicio: 'Blanqueamiento corporal', estrellas: 5,
    texto: 'Los tratamientos realmente funcionan. Noté diferencia desde la segunda sesión. ¡Estoy encantada!',
  },
];
