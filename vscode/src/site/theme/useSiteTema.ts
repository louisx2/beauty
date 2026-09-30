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
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready?: Promise<unknown>; finished?: Promise<unknown> } | undefined;
    };
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reducir) {
      const vt = doc.startViewTransition(() => flushSync(() => setEstado(t)));
      // con la pestaña oculta la transición se cancela y sus promesas se rechazan: el tema ya cambió, no es un error
      vt?.ready?.catch(() => {});
      vt?.finished?.catch(() => {});
    } else {
      setEstado(t);
    }
  }, []);
  return [tema, setTema];
}
