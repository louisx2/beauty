// Ingresos a partir de las citas (la facturación con NCF está apagada: la dueña factura en Alegra).
// Puro: lo usan Reportes y el Dashboard, y se prueba con node --test.

interface LineaCita { serviceName: string; employee: string; price: number }
interface CitaConServicios { service: string; employee: string; services: LineaCita[] }
interface ServicioCatalogo { name: string; price: number }

export interface ServicioConPrecio { nombre: string; empleada: string; precio: number }

/** Servicios de una cita con su precio: el guardado en la cita y, si no tiene, el del catálogo.
 *  Una cita puede llevar varios, cada uno de una especialista; las antiguas sin líneas cuentan como uno solo. */
export function serviciosConPrecio(cita: CitaConServicios, catalogo: ServicioCatalogo[]): ServicioConPrecio[] {
  const precioDe = (nombre: string, guardado: number) =>
    guardado > 0 ? guardado : (catalogo.find((s) => s.name === nombre)?.price ?? 0);
  if (cita.services.length === 0) {
    return [{ nombre: cita.service, empleada: cita.employee, precio: precioDe(cita.service, 0) }];
  }
  return cita.services.map((l) => ({ nombre: l.serviceName, empleada: l.employee, precio: precioDe(l.serviceName, l.price) }));
}

/** Lo cobrado en un mes ("2026-10"): la suma de las citas completadas de ese mes. */
export function ingresosDelMes(citas: (CitaConServicios & { date: string; status: string })[], catalogo: ServicioCatalogo[], mes: string): number {
  return citas
    .filter((c) => c.status === 'completed' && c.date.startsWith(mes))
    .reduce((total, c) => total + serviciosConPrecio(c, catalogo).reduce((t, s) => t + s.precio, 0), 0);
}
