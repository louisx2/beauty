// Nombres de personas en el panel. Sin imports: se prueba con Node.

/** Mayúscula al empezar cada palabra (tras espacio o guion), con tildes y ñ: "maría-josé díaz" → "María-José Díaz". */
export function capitalizarNombre(valor: string): string {
  return valor.replace(/(^|[\s-])(\p{Ll})/gu, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('es'));
}
