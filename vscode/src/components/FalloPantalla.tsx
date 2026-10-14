import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import './FalloPantalla.css';

interface Props {
  children: ReactNode;
  /** la ruta: si cambia después de un fallo, se intenta de nuevo */
  ruta: string;
}
interface State { error: Error | null }

/**
 * Si una pantalla del panel falla al dibujarse, en lugar de quedar todo en blanco se ve un aviso con "Volver a
 * intentar"; el menú sigue funcionando para ir a otra pantalla, y al moverse se intenta de nuevo.
 */
export default class FalloPantalla extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(antes: Props) {
    if (this.state.error && antes.ruta !== this.props.ruta) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[panel] la pantalla falló:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fallo" role="alert">
        <AlertTriangle size={36} aria-hidden="true" />
        <h1>Algo falló en esta pantalla</h1>
        <p>No se perdió nada de lo guardado. Vuelve a intentar o usa el menú para ir a otra parte; si se repite, avísale a soporte.</p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          <RotateCcw size={18} aria-hidden="true" /> Volver a intentar
        </button>
        <small>{this.state.error.message}</small>
      </div>
    );
  }
}
