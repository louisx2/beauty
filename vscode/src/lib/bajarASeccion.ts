/** Lleva la vista a una sección de la página (suave, salvo que la persona prefiera menos movimiento) y le pasa el
 *  foco a su título, así el lector de pantalla también llega. Devuelve false si la sección todavía no existe. */
export function bajarASeccion(id: string): boolean {
  const seccion = document.getElementById(id);
  if (!seccion) return false;
  const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  seccion.scrollIntoView({ behavior: menosMovimiento ? 'auto' : 'smooth', block: 'start' });
  const titulo = seccion.querySelector<HTMLElement>('h2');
  if (titulo) {
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  }
  return true;
}
