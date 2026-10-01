// Habla con la función mi-suscripcion (que a su vez habla con el cobro de SellAlleS). Nunca ve la clave de
// conexión. El comprobante se sube directo al almacenamiento de SellAlleS con el permiso de un solo uso que
// entrega el puente; la huella (sha-256) se saca del archivo ORIGINAL, así el mismo comprobante enviado dos
// veces se reconoce aunque se comprima distinto.
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { reducirFoto } from './fotos';
import {
  TAMANO_MAXIMO, cuentaDesdeJson,
  type BancoSuscripcion, type CuentaSuscripcion, type PagoSuscripcion, type ReporteSuscripcion,
} from './suscripcion';

export class ErrorSuscripcion extends Error {
  readonly sinConexion: boolean;
  constructor(mensaje: string, sinConexion = false) {
    super(mensaje);
    this.sinConexion = sinConexion;
  }
}

export interface DatosSuscripcion {
  empresa: string;
  cuenta: CuentaSuscripcion;
  bancos: BancoSuscripcion[];
  reportes: ReporteSuscripcion[];
  pagos: PagoSuscripcion[];
}

const URL_FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mi-suscripcion`;

async function llamar(cuerpo: Record<string, unknown>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErrorSuscripcion('Tu sesión terminó. Vuelve a entrar al panel.');
  let r: Response;
  try {
    r = await fetch(URL_FUNCION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorSuscripcion('No pudimos conectar. Revisa tu internet e intenta de nuevo.', true);
  }
  if (r.ok) return r;
  let mensaje = '';
  try { mensaje = String((await r.json())?.error ?? ''); } catch { /* sin cuerpo */ }
  if (r.status === 503 || mensaje === 'sin conexion') throw new ErrorSuscripcion('No pudimos cargar tu suscripción ahora.', true);
  if (r.status === 403 || r.status === 401) throw new ErrorSuscripcion('Solo la administración puede ver la suscripción.');
  throw new ErrorSuscripcion(mensaje || 'Algo salió mal. Intenta de nuevo.');
}

export async function cargarSuscripcion(): Promise<DatosSuscripcion> {
  const j = await (await llamar({ accion: 'estado' })).json();
  return {
    empresa: String(j?.empresa?.nombre ?? ''),
    cuenta: cuentaDesdeJson(j?.cuenta),
    bancos: Array.isArray(j?.bancos) ? j.bancos : [],
    reportes: Array.isArray(j?.reportes) ? j.reportes : [],
    pagos: Array.isArray(j?.pagos) ? j.pagos : [],
  };
}

async function huella(blob: Blob): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function tipoDe(archivo: File): string {
  if (archivo.type) return archivo.type;
  if (/\.pdf$/i.test(archivo.name)) return 'application/pdf';
  if (/\.heic$/i.test(archivo.name)) return 'image/heic';
  if (/\.heif$/i.test(archivo.name)) return 'image/heif';
  return 'image/jpeg';
}

export async function reportarPago(d: {
  monto: number; fecha: string; bancoId: string | null; referencia: string; nota: string; archivo: File;
}): Promise<void> {
  const sha256 = await huella(d.archivo);
  let blob: Blob = d.archivo;
  let mime = tipoDe(d.archivo);
  if (mime !== 'application/pdf') {
    // una foto se achica para que pese poco y el número de referencia se siga leyendo; un HEIC que el
    // navegador no sabe abrir se sube tal cual (SellAlleS lo acepta)
    const reducida = await reducirFoto(d.archivo, 2000, 0.85);
    blob = reducida;
    mime = reducida.type || mime;
  }
  if (blob.size > TAMANO_MAXIMO) {
    throw new ErrorSuscripcion('El archivo pesa más de 10 MB. Sube una captura de pantalla o un PDF más liviano.');
  }

  const permiso = await (await llamar({ accion: 'subida', nombre: d.archivo.name, mime, tamano: blob.size })).json();
  const sellalles = createClient(String(permiso.url), String(permiso.apikey), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await sellalles.storage.from('comprobantes-de-pago')
    .uploadToSignedUrl(String(permiso.path), String(permiso.token), blob, { contentType: mime });
  if (error) throw new ErrorSuscripcion(`No se pudo subir el comprobante: ${error.message}`);

  await llamar({
    accion: 'reportar', monto: d.monto, fecha: d.fecha, banco_id: d.bancoId, referencia: d.referencia,
    nota: d.nota, path: permiso.path, nombre: d.archivo.name, mime, sha256,
  });
}

export async function retirarReporte(id: string): Promise<void> {
  await llamar({ accion: 'retirar', reporte_id: id });
}

export async function urlComprobante(id: string): Promise<string> {
  const j = await (await llamar({ accion: 'comprobante', reporte_id: id })).json();
  return String(j.url);
}

export async function obtenerFactura(pagoId: string): Promise<{ blob: Blob; nombre: string }> {
  const r = await llamar({ accion: 'factura', pago_id: pagoId });
  const nombre = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') ?? '')?.[1] ?? 'factura.pdf';
  return { blob: await r.blob(), nombre };
}
