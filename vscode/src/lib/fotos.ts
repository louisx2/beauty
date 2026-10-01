// Fotos del equipo: se reducen antes de subirlas al almacenamiento. Sin imports: se prueba con Node.
// Nada aquí toca `document` ni `createImageBitmap` fuera de `reducirFoto`.

/** La foto se muestra a 150–300 px en la web; 800 px de lado mayor alcanza y sobra para pantallas de alta densidad. */
export const LADO_MAXIMO_FOTO = 800;

/** Medidas con el lado mayor en `maximo` como tope, proporcionales; si ya cabe (o la medida no sirve), las mismas. */
export function medidaReducida(ancho: number, alto: number, maximo = LADO_MAXIMO_FOTO): { ancho: number; alto: number } {
  if (ancho <= 0 || alto <= 0) return { ancho, alto };
  const mayor = Math.max(ancho, alto);
  if (mayor <= maximo) return { ancho, alto };
  const escala = maximo / mayor;
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/**
 * Reduce la foto a JPEG (calidad 0.82) de a lo más `LADO_MAXIMO_FOTO` px. Devuelve el archivo original tal cual si el
 * navegador no la puede decodificar (p. ej. HEIC en Chrome), si no se pudo exportar o si el resultado pesa más
 * (los comprobantes de pago usan 2000 px y 0.85 para que el número de referencia se lea).
 */
export async function reducirFoto(archivo: File, maximo = LADO_MAXIMO_FOTO, calidad = 0.82): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(archivo);
    const { ancho, alto } = medidaReducida(bitmap.width, bitmap.height, maximo);
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return archivo;
    // achicado de mejor calidad (sin esto algunos navegadores usan el más rápido y la foto sale con dientes)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // fondo blanco primero: un PNG con transparencia no debe quedar negro al pasar a JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return archivo;
  } finally {
    bitmap?.close();
  }
}
