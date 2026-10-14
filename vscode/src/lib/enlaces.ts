// Enlaces para escribirle o llamar a una clienta desde el panel. Puro.

/** WhatsApp con el número de RD (10 dígitos → 1 delante) y el mensaje ya escrito. */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  const d = telefono.replace(/\D/g, '');
  return `https://wa.me/${d.length === 10 ? `1${d}` : d}?text=${encodeURIComponent(texto)}`;
}

/** Llamar: solo los dígitos. */
export function enlaceLlamar(telefono: string): string {
  return `tel:${telefono.replace(/\D/g, '')}`;
}
