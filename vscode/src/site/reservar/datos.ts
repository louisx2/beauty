// Paso 3 de /reservar: el teléfono con guiones y qué falta para poder enviar. Puro: se prueba con Node.

/** "8295550102" → "829-555-0102"; nunca más de 10 dígitos. */
export function formatoTelefono(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export interface ErroresDatos { nombre?: string; telefono?: string }

/** Nombre escrito y los 10 dígitos del WhatsApp: con eso la clienta verá sus citas en "Mis citas". */
export function validarDatos(nombre: string, telefono: string): ErroresDatos {
  const errores: ErroresDatos = {};
  if (!nombre.trim()) errores.nombre = 'Escribe tu nombre.';
  if (telefono.replace(/\D/g, '').length !== 10) errores.telefono = 'Escribe los 10 dígitos de tu WhatsApp.';
  return errores;
}

/** Número para wa.me: solo dígitos; con 10 dígitos (como lo guarda el panel, "829-322-4014") se antepone el 1 del país. */
export function numeroWhatsApp(raw: string): string {
  const digitos = raw.replace(/\D/g, '');
  return digitos.length === 10 ? `1${digitos}` : digitos;
}
