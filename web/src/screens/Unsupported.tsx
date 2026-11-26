import { useNavigate } from 'react-router-dom';
import { Refresh, WarningTriangle } from 'iconoir-react';
import { useApp } from '../App';

const SYSTEMS = ['Fedora 40 ou plus récent', 'Ubuntu 22.04 ou plus récent', 'Debian 12 ou plus récent'];
const DESKTOPS = ['GNOME', 'KDE Plasma', 'XFCE'];

export default function Unsupported() {
  const { detection, setDetection } = useApp();
  const navigate = useNavigate();
  const osKo = detection?.os === 'unsupported';
  const deKo = detection?.desktop === 'unsupported';

  return (
    <section className="card mx-auto max-w-xl p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <WarningTriangle className="text-orange-700" aria-hidden="true" /> Système non pris en charge
      </h1>
      <p className="mt-3 text-slate-700">
        {osKo && deKo
          ? 'Ni votre distribution ni votre environnement de bureau ne sont pris en charge.'
          : osKo
            ? 'Votre distribution n’est pas prise en charge.'
            : deKo
              ? 'Votre environnement de bureau n’est pas pris en charge.'
              : 'Votre système n’a pas pu être analysé.'}{' '}
        Aucune modification ne sera proposée.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">Distributions acceptées</h2>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            {SYSTEMS.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Bureaux acceptés</h2>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            {DESKTOPS.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>
      <button
        type="button"
        className="btn-primary mt-6"
        onClick={() => {
          setDetection(null);
          navigate('/');
        }}
      >
        <Refresh aria-hidden="true" /> Recommencer
      </button>
    </section>
  );
}
