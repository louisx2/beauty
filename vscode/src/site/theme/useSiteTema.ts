import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { guardarTema, leerTema, type Tema } from './tema';

const almacen = () => {
  try { return window.localStorage; } catch { return null; }
};

/** Tema actual y cómo cambiarlo, con transición suave si el navegador la soporta. */
export function useSiteTema(): [Tema, (t: Tema) => void] {
  const [tema, setEstado] = useState<Tema>(() => leerTema(almacen()));
  const setTema = useCallback((t: Tema) => {
    guardarTema(almacen(), t);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reducir) doc.startViewTransition(() => flushSync(() => setEstado(t)));
    else setEstado(t);
  }, []);
  return [tema, setTema];
}
