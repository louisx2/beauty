import type { ReactNode } from 'react';
import './Desplegable.css';

interface Props { id: string; abierto: boolean; children: ReactNode; className?: string }

/**
 * Despliegue con la altura animada (0fr → 1fr) y el contenido con fundido (spec §3.7).
 * Cerrado queda inerte: ni Tab ni lector de pantalla entran. El botón que lo abre usa aria-controls={id}.
 */
export default function Desplegable({ id, abierto, children, className = '' }: Props) {
  return (
    <div id={id} className={`s-despl ${abierto ? 'is-abierto' : ''} ${className}`} inert={!abierto}>
      <div className="s-despl-in">{children}</div>
    </div>
  );
}
