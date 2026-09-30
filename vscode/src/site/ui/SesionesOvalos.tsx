import './SesionesOvalos.css';

const MAX = 10; // más de 10 sesiones se dicen con el número, sin llenar la fila

interface Props { sesiones: number; usadas?: number; conTexto?: boolean; className?: string }

/** Sesiones de un paquete en óvalos (llenos los usados), como los letreros del salón (spec §3.4). Sin texto es decorativo. */
export default function SesionesOvalos({ sesiones, usadas = 0, conTexto = true, className = '' }: Props) {
  // con más de MAX sesiones solo se dibujan MAX óvalos: los llenos van en proporción
  const llenos = sesiones > MAX ? Math.round((usadas / sesiones) * MAX) : usadas;
  return (
    <div className={`s-ovalos ${className}`} aria-hidden={conTexto ? undefined : true}>
      {Array.from({ length: Math.min(sesiones, MAX) }, (_, k) => <i key={k} className={k < llenos ? 'is-usado' : undefined} aria-hidden="true" />)}
      {conTexto && <span>{sesiones} {sesiones === 1 ? 'sesión' : 'sesiones'}</span>}
    </div>
  );
}
