// Mi suscripción: el panel de Anadsll habla con el cobro de SellAlleS a través de aquí.
//
// Solo deja pasar a la administración del salón (public.staff_role() = 'admin', por el correo de la sesión).
// La dirección de SellAlleS y la clave de conexión salen de Vault (_conexion_sellalles) y nunca llegan al
// navegador. Cada acción se reenvía tal cual a la función cobro-externo de SellAlleS y su respuesta se devuelve
// igual (también el PDF de la factura). Si falta la conexión, SellAlleS no responde o la clave fue revocada, el
// panel recibe 503 "sin conexion": para la dueña es lo mismo, y el resto del panel sigue funcionando.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ACCIONES = new Set(['estado', 'subida', 'reportar', 'retirar', 'comprobante', 'factura']);

// El panel en su dominio y en desarrollo: localhost, o la red de la casa cuando Louis prueba desde el teléfono
// (el servidor local corre con --host y se abre por la IP de la computadora).
const ORIGENES =
  /^(https:\/\/(www\.)?anadsllbeautyesthetic\.com|http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?)$/;

function corsPara(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENES.test(origen) ? origen : 'https://anadsllbeautyesthetic.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'content-disposition',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const cors = corsPara(req);
  const json = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rol, error: errorRol } = await usuario.rpc('staff_role');
  if (errorRol || rol !== 'admin') return json(403, { error: 'no autorizado' });

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return json(400, { error: 'Cuerpo inválido.' });
  }
  if (!ACCIONES.has(String(cuerpo.accion))) return json(400, { error: 'Acción desconocida.' });

  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: filas } = await servicio.rpc('_conexion_sellalles');
  const conexion = (filas ?? [])[0] as { url: string | null; clave: string | null } | undefined;
  if (!conexion?.url || !conexion?.clave) return json(503, { error: 'sin conexion' });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${conexion.url}/functions/v1/cobro-externo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clave-cobro': conexion.clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return json(503, { error: 'sin conexion' });
  }
  if (respuesta.status === 401 || respuesta.status >= 500) {
    console.error('mi-suscripcion: SellAlleS respondió', respuesta.status);
    return json(503, { error: 'sin conexion' });
  }

  const headers = new Headers(cors);
  headers.set('Content-Type', respuesta.headers.get('Content-Type') ?? 'application/json');
  const disposicion = respuesta.headers.get('Content-Disposition');
  if (disposicion) headers.set('Content-Disposition', disposicion);
  return new Response(respuesta.body, { status: respuesta.status, headers });
});
