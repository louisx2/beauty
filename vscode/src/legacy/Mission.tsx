import { Target, Eye, ShieldCheck, HeartHandshake, Compass, Sparkles, ShieldAlert, Award } from 'lucide-react';
import './Mission.css';

const valuesList = [
  { icon: <HeartHandshake size={20} />, title: 'Atención personalizada', desc: 'Tratamientos adaptados a las necesidades únicas de tu piel.' },
  { icon: <Award size={20} />, title: 'Excelencia con Calidez', desc: 'Altos estándares profesionales con un trato humano y cercano.' },
  { icon: <ShieldCheck size={20} />, title: 'Confianza y Bienestar', desc: 'Un ambiente seguro diseñado para tu relajación y seguridad.' },
  { icon: <Compass size={20} />, title: 'Compromiso Real', desc: 'Diagnósticos honestos y responsables basados en la ciencia estética.' },
  { icon: <Sparkles size={20} />, title: 'Eficiencia', desc: 'Resultados visibles y satisfactorios en cada uno de nuestros tratamientos.' },
  { icon: <ShieldAlert size={20} />, title: 'Seguridad', desc: 'Equipos de alta tecnología y protocolos estrictos de cuidado.' },
];

export default function Mission() {
  return (
    <section className="mission-vision" id="mision">
      <div className="mission-vision__inner">
        <div className="mission-vision__grid">
          {/* Mision Card */}
          <div className="mission-vision__card glass">
            <div className="mission-vision__card-header">
              <div className="mission-vision__icon-box">
                <Target size={32} />
              </div>
              <h3 className="mission-vision__card-title">Misión</h3>
            </div>
            <p className="mission-vision__card-text">
              "Ofrecer una experiencia superior de cuidado personal y bienestar, transformando la salud de la piel de nuestros clientes a través de tratamientos estéticos avanzados y tecnología de vanguardia. Nos comprometemos a brindar un diagnóstico profesional y honesto, respaldado por la ciencia estética, en un ambiente exclusivo que inspire confianza, seguridad y relajación."
            </p>
          </div>

          {/* Vision Card */}
          <div className="mission-vision__card glass">
            <div className="mission-vision__card-header">
              <div className="mission-vision__icon-box">
                <Eye size={32} />
              </div>
              <h3 className="mission-vision__card-title">Visión</h3>
            </div>
            <p className="mission-vision__card-text">
              "Ser el centro estético líder en la región sur y nuestra provincia San José de Ocoa, reconocidos por nuestra excelencia en servicios, innovación en tratamientos y compromiso con la satisfacción del cliente. Aspiramos a ser el referente en belleza y bienestar, ofreciendo soluciones integrales que promuevan la autoestima y el bienestar de nuestros clientes."
            </p>
          </div>
        </div>

        {/* Valores Sub-section */}
        <div className="mission-values">
          <div className="mission-values__header">
            <span className="section-tag">Nuestros Pilares</span>
            <h2 className="mission-values__title">Nuestros Valores</h2>
            <p className="mission-values__subtitle">Los principios fundamentales que guían cada uno de nuestros tratamientos y relaciones.</p>
          </div>

          <div className="mission-values__grid">
            {valuesList.map((val, idx) => (
              <div className="value-card glass" key={idx}>
                <div className="value-card__icon">{val.icon}</div>
                <h4 className="value-card__title">{val.title}</h4>
                <p className="value-card__desc">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
