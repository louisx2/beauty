// Aviso de SellAlleS: cambió un comprobante o un pago del salón. Aquí solo se deja una fila en avisos_cobro; el
// panel de la administración la escucha por Realtime y vuelve a pedir su suscripción por mi-suscripcion.
//
// El aviso no trae datos, así que lo único que hay que asegurar es que venga de SellAlleS: trae la hora
// (x-aviso-en) y su firma HMAC-SHA256 (x-firma-cobro) con el hash de la clave de conexión como llave. SellAlleS
// guarda ese hash; aquí se calcula desde la clave que está en Vault. Un aviso de hace más de 5 minutos se descarta.
//
// Se despliega con verify_jwt = false: la seguridad es la firma.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VENTANA_S = 300;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(texto: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

async function hmacHex(llave: string, mensaje: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(llave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(mensaje)));
}

/** Compara sin cortar en la primera diferencia, para no dar pistas por el tiempo de respuesta. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  const en = req.headers.get('x-aviso-en') ?? '';
  const firma = (req.headers.get('x-firma-cobro') ?? '').toLowerCase();
  const segundos = Number(en);
  if (!/^\d+$/.test(en) || Math.abs(Date.now() / 1000 - segundos) > VENTANA_S || !/^[0-9a-f]{64}$/.test(firma)) {
    return new Response(null, { status: 401 });
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: filas, error: errorConexion } = await db.rpc('_conexion_sellalles');
  if (errorConexion) console.error('aviso-cobro: no se pudo leer la conexión:', errorConexion.message);
  // sin espacios: fetch los quita del encabezado al llamar al puente, así que el hash tiene que ser el de la clave limpia
  const clave = ((filas ?? [])[0] as { clave: string | null } | undefined)?.clave?.trim();
  if (!clave) return new Response(null, { status: 503 });

  const esperada = await hmacHex(await sha256Hex(clave), en);
  if (!iguales(firma, esperada)) return new Response(null, { status: 401 });

  const { error } = await db.from('avisos_cobro').insert({});
  if (error) {
    console.error('aviso-cobro: no se pudo guardar el aviso:', error.message);
    return new Response(null, { status: 500 });
  }
  // los avisos solo sirven en el momento: se borran los de hace más de un día
  await db.from('avisos_cobro').delete().lt('creado', new Date(Date.now() - UN_DIA_MS).toISOString());
  return new Response(null, { status: 204 });
});
