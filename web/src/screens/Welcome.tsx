import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissor, Search, ShieldCheck, WarningTriangle } from 'iconoir-react';
import { api } from '../api/client';
import { useApp } from '../App';

export default function Welcome() {
  const { setDetection, setProfile, setDryrun } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.detect();
      setDetection(d);
      setProfile(null);
      setDryrun(null);
      navigate(d.os === 'unsupported' || d.desktop === 'unsupported' ? '/non-pris-en-charge' : '/profil');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center">
      <div className="rounded-2xl bg-indigo-700 p-5 text-white">
        <Scissor width={48} height={48} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold">Un bureau Linux taillé pour vous</h1>
      <p className="text-slate-700">
        LinXtailor analyse votre système, vous pose quelques questions, puis vous montre chaque
        modification avant de l’appliquer. Tout peut être annulé.
      </p>
      <button type="button" className="btn-primary text-lg" onClick={() => void analyse()} disabled={loading}>
        <Search aria-hidden="true" /> {loading ? 'Analyse en cours…' : 'Analyser mon système'}
      </button>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-left text-red-900">
          <WarningTriangle aria-hidden="true" className="shrink-0" /> {error}
        </p>
      )}
      <p className="flex items-center gap-2 text-sm text-slate-700">
        <ShieldCheck aria-hidden="true" /> Tout se passe sur votre ordinateur : aucune donnée n’est envoyée.
      </p>
    </section>
  );
}
