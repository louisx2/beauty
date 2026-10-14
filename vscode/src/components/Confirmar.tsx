import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import './Confirmar.css';

interface Props {
  titulo: string;
  children: ReactNode;
  /** el texto del botón que hace la acción, p. ej. "Eliminar servicio" */
  boton: string;
  /** en rojo: borra o no se puede deshacer */
  peligro?: boolean;
  /** mientras se guarda: el botón queda quieto */
  ocupado?: boolean;
  onSi: () => void;
  onNo: () => void;
}

/** Pregunta antes de algo que no se deshace (en lugar del aviso del navegador, que en la tableta se ve fuera de lugar
 *  y no dice qué se pierde). Escape o tocar fuera = no. */
export default function Confirmar({ titulo, children, boton, peligro = false, ocupado = false, onSi, onNo }: Props) {
  const no = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    no.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onNo(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onNo]);

  return (
    <div className="modal-overlay confirmar__fondo" onClick={onNo}>
      <div className="modal confirmar" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-tit" aria-describedby="confirmar-txt"
        onClick={(e) => e.stopPropagation()}>
        <div className={`confirmar__icono ${peligro ? 'is-peligro' : ''}`} aria-hidden="true"><AlertTriangle size={24} /></div>
        <h2 id="confirmar-tit" className="confirmar__titulo">{titulo}</h2>
        <div id="confirmar-txt" className="confirmar__texto">{children}</div>
        <div className="confirmar__botones">
          <button ref={no} type="button" className="confirmar__btn" onClick={onNo}>Volver</button>
          <button type="button" className={`confirmar__btn ${peligro ? 'confirmar__btn--peligro' : 'confirmar__btn--principal'}`}
            onClick={onSi} disabled={ocupado}>
            {ocupado ? 'Un momento…' : boton}
          </button>
        </div>
      </div>
    </div>
  );
}
