// Enlaces para escribirle o llamar a una clienta desde el panel.
//
// WhatsApp se abre de una de dos formas, a elegir en cada equipo (Ajustes → Preferencias, o en Recordatorios):
// - 'web' (lo de siempre): api.whatsapp.com en una pestaña nueva. En el teléfono y la tableta abre la app; en la
//   computadora, WhatsApp Web o la página que pregunta si abrir la app.
// - 'app': la app de WhatsApp instalada en la computadora (whatsapp://), sin abrir pestañas. Si la app no está
//   instalada, no pasa nada: por eso no es lo de entrada.
// No se usa wa.me: al redirigir a WhatsApp Web los emojis llegaban como "�". Y por si acaso, los mensajes salen sin
// emojis.

export type ModoWhatsApp = 'web' | 'app';
const GUARDADO = 'anadsll-whatsapp';

/** Cómo se abre WhatsApp en este equipo. Si el navegador no deja leerlo, 'web'. */
export function modoWhatsApp(): ModoWhatsApp {
  try { return localStorage.getItem(GUARDADO) === 'app' ? 'app' : 'web'; } catch { return 'web'; }
}

export function guardarModoWhatsApp(modo: ModoWhatsApp): void {
  try { localStorage.setItem(GUARDADO, modo); } catch { /* sin guardar: queda 'web' */ }
}

/** Número para WhatsApp: solo dígitos; con 10 (como se guardan en RD, "829-322-4014") se antepone el 1 del país. */
export function numeroWhatsApp(telefono: string): string {
  const d = telefono.replace(/\D/g, '');
  return d.length === 10 ? `1${d}` : d;
}

/** El texto sin emojis (ni sus uniones), que en WhatsApp de la computadora pueden salir como "�". */
export function sinEmojis(texto: string): string {
  return texto
    .replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|\u{20E3}/gu, '')
    .replace(/[\uD800-\uDFFF]/g, '') // y lo que quede fuera de los caracteres comunes (mitades sueltas incluidas)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();
}

/** WhatsApp a ese número con el mensaje ya escrito (para revisarlo y enviarlo). */
export function enlaceWhatsApp(telefono: string, texto: string, modo: ModoWhatsApp = modoWhatsApp()): string {
  const n = numeroWhatsApp(telefono);
  const t = encodeURIComponent(sinEmojis(texto));
  return modo === 'app' ? `whatsapp://send?phone=${n}&text=${t}` : `https://api.whatsapp.com/send?phone=${n}&text=${t}`;
}

/** Dónde se abre el enlace: con la app, en la misma página (la app toma el enlace y la página se queda); con la web,
 *  en una pestaña nueva. Va en el `target` del enlace. */
export function destinoWhatsApp(modo: ModoWhatsApp = modoWhatsApp()): '_blank' | undefined {
  return modo === 'app' ? undefined : '_blank';
}

/** Abrir WhatsApp desde un botón (no un enlace). */
export function abrirWhatsApp(telefono: string, texto: string): void {
  const modo = modoWhatsApp();
  const url = enlaceWhatsApp(telefono, texto, modo);
  if (modo === 'app') window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/** Llamar: solo los dígitos. */
export function enlaceLlamar(telefono: string): string {
  return `tel:${telefono.replace(/\D/g, '')}`;
}
