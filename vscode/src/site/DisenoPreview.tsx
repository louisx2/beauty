import SiteLayout from './SiteLayout';
import { SECCIONES } from './header/secciones';
import { useIrAlHash } from './header/navegacion';

/** Vista previa del caparazón con secciones de relleno. Solo existe en `npm run dev`. */
export default function DisenoPreview() {
  useIrAlHash();
  return (
    <SiteLayout conSecciones>
      {SECCIONES.map((s, i) => (
        <section key={s.id} id={s.id} data-spy="" style={{ minHeight: '90vh', padding: 'calc(var(--s-nav-h) + 40px) 0 60px', background: i % 2 ? 'var(--s-bg-alt)' : 'var(--s-tex)' }}>
          <div className="s-wrap">
            <p className="s-eyebrow">Sección {i + 1}</p>
            <h2 className="s-display" style={{ fontSize: 42, margin: '16px 0' }}>{s.etiqueta} <em>de prueba</em></h2>
            <p className="s-lead">Relleno para probar la barra, las pestañas, el menú y el tema.</p>
          </div>
        </section>
      ))}
    </SiteLayout>
  );
}
