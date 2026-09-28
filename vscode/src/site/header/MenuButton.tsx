import type { Ref } from 'react';
import './MenuButton.css';

interface Props {
  cerrar?: boolean;
  onClick: () => void;
  controla: string;
  expandido?: boolean;
  className?: string;
  /** nombre fijo para lectores de pantalla (el Cerrar del menú no debe decir "Abrir menú" mientras gira) */
  etiqueta?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** "MENÚ" + dos líneas finas; en modo cerrar las líneas se cruzan en X y la palabra rueda a "CERRAR". */
export default function MenuButton({ cerrar = false, onClick, controla, expandido, className = '', etiqueta, ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      className={`s-menu-btn ${cerrar ? 'is-x' : ''} ${className}`}
      onClick={onClick}
      aria-label={etiqueta ?? (cerrar ? 'Cerrar menú' : 'Abrir menú')}
      aria-controls={controla}
      aria-expanded={expandido}
    >
      <span className="s-mb-label" aria-hidden="true">
        <span className="s-mb-open">Menú</span>
        <span className="s-mb-close">Cerrar</span>
      </span>
      <span className="s-mb-lines" aria-hidden="true"><i /><i /></span>
    </button>
  );
}
