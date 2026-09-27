// Regla para descontar sesiones de paquete cuando se completa una cita.
// Vive aparte del store para poder probarla sin Supabase (tests/packageMatch.test.ts).

/** Paquete activo de la clienta con lo que queda por usar. */
export interface SaldoPaquete {
  /** id de client_packages */
  id: string;
  packageName: string;
  /** servicio al que pertenece el paquete (session_packages.service_id) */
  serviceId: string | null;
  serviceName: string | null;
  used: number;
  total: number;
}

export interface LineaCita {
  serviceId: string | null;
  serviceName: string;
}

/** "Paquete: Facial x5 " -> "facial x5". Las citas de paquete del walk-in y de
 *  la web llevan ese prefijo delante del nombre. */
const normalizar = (s: string | null | undefined) =>
  (s ?? '').trim().replace(/^paquete:\s*/i, '').replace(/\s+/g, ' ').toLowerCase();

/** Cada servicio de la cita descuenta una sesión del primer paquete que le
 *  corresponde y aún tiene saldo. Devuelve un id de client_packages por sesión.
 *  Si la línea trae service_id, manda el id; el nombre solo se usa para citas
 *  viejas o walk-in, que se guardaron sin él. */
export function sesionesADescontar(lineas: LineaCita[], saldos: SaldoPaquete[]): string[] {
  const tomadas = new Map<string, number>();
  const libres = (p: SaldoPaquete) => p.total - p.used - (tomadas.get(p.id) ?? 0);
  const resultado: string[] = [];

  for (const linea of lineas) {
    const nombre = normalizar(linea.serviceName);
    const paquete = saldos.find((p) => {
      if (libres(p) <= 0) return false;
      if (linea.serviceId) return p.serviceId === linea.serviceId;
      return nombre !== '' && (nombre === normalizar(p.serviceName) || nombre === normalizar(p.packageName));
    });
    if (paquete) {
      tomadas.set(paquete.id, (tomadas.get(paquete.id) ?? 0) + 1);
      resultado.push(paquete.id);
    }
  }
  return resultado;
}
