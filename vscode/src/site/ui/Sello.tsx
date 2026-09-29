import { useId } from 'react';
import { MONOGRAMA } from '../brand';
import './Sello.css';

/** Sello que gira despacio con la frase de la marca y la N al centro (spec §3.4). Decorativo. */
export default function Sello({ className = '' }: { className?: string }) {
  const id = `s-sello-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div className={`s-sello ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs><path id={id} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" /></defs>
        <text><textPath href={`#${id}`} textLength="280">Belleza y bienestar con responsabilidad ·</textPath></text>
      </svg>
      <img src={MONOGRAMA} alt="" />
    </div>
  );
}
