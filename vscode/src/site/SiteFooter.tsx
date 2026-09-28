import { LOGO_CLARO } from './brand';
import { site } from '../config/site';

export default function SiteFooter() {
  return (
    <footer className="s-foot">
      <div className="s-wrap s-foot-in">
        <img src={LOGO_CLARO} alt={site.name} />
        <span>© {new Date().getFullYear()} {site.name} · San José de Ocoa</span>
      </div>
    </footer>
  );
}
