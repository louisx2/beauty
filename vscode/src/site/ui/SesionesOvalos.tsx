import './SesionesOvalos.css';

const MAX = 10; // más de 10 sesiones se dicen con el número, sin llenar la fila

interface Props { sesiones: number; conTexto?: boolean; className?: string }

/** Sesiones de un paquete en óvalos, como los letreros del salón (spec §3.4). Sin texto es decorativo. */
export default function SesionesOvalos({ sesiones, conTexto = true, className = '' }: Props) {
  return (
    <div className={`s-ovalos ${className}`} aria-hidden={conTexto ? undefined : true}>
      {Array.from({ length: Math.min(sesiones, MAX) }, (_, k) => <i key={k} aria-hidden="true" />)}
      {conTexto && <span>{sesiones} {sesiones === 1 ? 'sesión' : 'sesiones'}</span>}
    </div>
  );
}
