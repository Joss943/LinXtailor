import { useNavigate } from 'react-router-dom';
import { Cpu, InfoCircle, Laptop, MinusCircle, Palette, Spark, Terminal, WarningTriangle } from 'iconoir-react';
import type { Persona } from '../types';
import PersonaCard from '../components/PersonaCard';
import { profileMock } from '../components/BeforeAfter';
import { PERSONAS, isWeakMachine, personaProfile, randomProfile } from '../profile';
import { useApp } from '../App';

const ICONS: Record<Persona, JSX.Element> = {
  migrator: <Laptop />,
  aesthete: <Palette />,
  tinkerer: <Terminal />,
  minimalist: <MinusCircle />,
};

const OS_NAMES = { ubuntu: 'Ubuntu', fedora: 'Fedora', debian: 'Debian', unsupported: '' };

export default function PersonaScreen() {
  const { detection, setProfile, setDryrun } = useApp();
  const navigate = useNavigate();
  const d = detection!;

  const choose = (persona: Persona) => {
    setProfile(personaProfile(persona, d));
    setDryrun(null);
    navigate('/personnaliser');
  };

  const surprise = () => {
    setProfile(randomProfile(d));
    setDryrun(null);
    navigate('/apercu');
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
        <span className="flex items-center gap-1">
          <Laptop aria-hidden="true" /> {OS_NAMES[d.os]} {d.osVersion} · {d.desktop}
        </span>
        <span className="flex items-center gap-1">
          <Cpu aria-hidden="true" /> {d.ramGb} Go de mémoire · {d.diskFreeGb} Go libres
        </span>
      </div>
      {d.eol && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-orange-900">
          <WarningTriangle aria-hidden="true" className="shrink-0" />
          Cette version de {OS_NAMES[d.os]} ne reçoit plus de mises à jour de sécurité. Pensez à la mettre à niveau.
        </p>
      )}
      {isWeakMachine(d) && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-slate-800">
          <InfoCircle aria-hidden="true" className="shrink-0" />
          Machine modeste détectée : les animations complètes ne seront pas proposées.
        </p>
      )}
      <h1 className="text-2xl font-semibold">Qui êtes-vous ?</h1>
      <p className="mt-1 text-slate-700">Choisissez le profil le plus proche : tout est pré-réglé, vous pourrez ajuster sur une seule page.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PERSONAS.map((p) => (
          <PersonaCard
            key={p.id}
            icon={ICONS[p.id]}
            name={p.name}
            origin={p.origin}
            description={p.description}
            preview={profileMock(personaProfile(p.id, d), d.desktop)}
            onSelect={() => choose(p.id)}
          />
        ))}
      </div>
      <div className="mt-6 text-center">
        <button type="button" className="btn-secondary" onClick={surprise}>
          <Spark aria-hidden="true" /> Surprends-moi
        </button>
      </div>
    </section>
  );
}
