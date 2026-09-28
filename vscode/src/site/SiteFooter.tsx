import { LOGO_CLARO } from './brand';
import { site } from '../config/site';

export default function SiteFooter({ inerte = false }: { inerte?: boolean }) {
  return (
    <footer className="s-foot" inert={inerte}>
      <div className="s-wrap s-foot-in">
        <img src={LOGO_CLARO} alt={site.name} />
        <span>© {new Date().getFullYear()} {site.name} · San José de Ocoa</span>
      </div>
    </footer>
  );
}
