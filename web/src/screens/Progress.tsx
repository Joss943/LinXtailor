import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Rewind, WarningTriangle, Xmark } from 'iconoir-react';
import { api } from '../api/client';
import { useApp } from '../App';
import ProgressBar from '../components/ProgressBar';
import type { ApplyLine } from '../types';

type Status = 'running' | 'success' | 'error';

export default function Progress() {
  const { profile, dryrun, setDryrun, notify } = useApp();
  const navigate = useNavigate();
  const [lines, setLines] = useState<ApplyLine[]>([]);
  const [status, setStatus] = useState<Status>('running');
  const [failure, setFailure] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const started = useRef(false);
  const actions = dryrun!.actions;

  useEffect(() => {
    if (started.current) return; // le jeton n'est utilisable qu'une fois
    started.current = true;
    let error = false;
    api
      .apply(profile!, dryrun!.token, (line) => {
        if (line.status === 'error') error = true;
        setLines((l) => [...l, line]);
      })
      .then(() => {
        if (error) {
          setStatus('error');
          setFailure('Une action a échoué : l’application s’est arrêtée.');
        } else {
          setStatus('success');
          setDryrun(null);
          navigate('/termine');
        }
      })
      .catch((e: Error) => {
        setStatus('error');
        setFailure(e.message);
      });
  }, [profile, dryrun, navigate, setDryrun]);

  const restore = async () => {
    setRestoring(true);
    try {
      const r = await api.rollback();
      notify(
        r.restored
          ? { kind: 'success', text: 'L’état précédent a été restauré.' }
          : { kind: 'error', text: 'La restauration est incomplète : consultez le journal.' },
      );
      if (r.restored) {
        setDryrun(null);
        navigate('/profil');
      }
    } catch (e) {
      notify({ kind: 'error', text: (e as Error).message });
    } finally {
      setRestoring(false);
    }
  };

  const describe = (id: number) => actions.find((a) => a.id === id)?.description ?? `Action ${id}`;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {status === 'running' ? 'Application en cours…' : status === 'error' ? 'Application interrompue' : 'Terminé'}
      </h1>
      <ProgressBar value={lines.length} max={actions.length} label="Avancement de l’application" />
      <ol className="space-y-2 rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100" aria-live="polite">
        {lines.map((l) => (
          <li key={l.actionId}>
            <span className="flex items-start gap-2">
              {l.status === 'ok' ? (
                <Check className="shrink-0 text-emerald-400" aria-label="réussi" />
              ) : (
                <Xmark className="shrink-0 text-red-400" aria-label="échec" />
              )}
              {describe(l.actionId)}
            </span>
            {l.output && <pre className="ml-8 whitespace-pre-wrap break-all text-slate-300">{l.output}</pre>}
          </li>
        ))}
        {status === 'running' && <li className="text-slate-300">…</li>}
      </ol>
      {status === 'error' && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-red-900">
          <p className="flex items-start gap-2">
            <WarningTriangle aria-hidden="true" className="shrink-0" /> {failure}
          </p>
          <button type="button" className="btn-danger" onClick={() => void restore()} disabled={restoring}>
            <Rewind aria-hidden="true" /> {restoring ? 'Restauration…' : 'Restaurer l’état précédent'}
          </button>
        </div>
      )}
    </section>
  );
}
