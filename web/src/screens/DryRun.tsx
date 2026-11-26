import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditPencil, Globe, Play, ShieldCheck, WarningTriangle, Xmark } from 'iconoir-react';
import { api } from '../api/client';
import { useApp } from '../App';
import ActionList from '../components/ActionList';
import BeforeAfter from '../components/BeforeAfter';
import { WALLPAPERS } from '../profile';

export default function DryRun() {
  const { detection, profile, dryrun, setDryrun } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const p = profile!;

  useEffect(() => {
    if (dryrun) return;
    let cancelled = false;
    api
      .dryrun(p)
      .then((r) => !cancelled && setDryrun(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [dryrun, p, setDryrun]);

  const wallpaper = WALLPAPERS.find((w) => w.file === p.wallpaper);
  const privileged = dryrun?.actions.some((a) => a.command.includes('pkexec')) ?? false;
  const canApply = !!dryrun && dryrun.actions.length > 0 && (!wallpaper || consent);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vérifiez avant d’appliquer</h1>
        <p className="mt-1 text-slate-700">Rien n’a encore été modifié. Voici ce qui va changer.</p>
      </div>
      <BeforeAfter profile={p} desktop={detection!.desktop} />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-900">
          <WarningTriangle aria-hidden="true" className="shrink-0" /> {error}
        </p>
      )}
      {!dryrun && !error && <p className="text-slate-700" aria-live="polite">Préparation de la liste des actions…</p>}

      {dryrun && (
        <>
          {privileged && (
            <p className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-yellow-900">
              <ShieldCheck aria-hidden="true" className="shrink-0" />
              Certaines actions modifient le système : votre mot de passe administrateur sera demandé dans une
              fenêtre du système. La raison est indiquée pour chaque action.
            </p>
          )}
          <ActionList actions={dryrun.actions} showCommands={p.persona === 'tinkerer'} />
          {wallpaper && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-700" checked={consent}
                onChange={(e) => setConsent(e.target.checked)} />
              <span>
                <span className="flex items-center gap-1 font-medium">
                  <Globe aria-hidden="true" /> J’accepte le téléchargement du fond d’écran « {wallpaper.name} »
                </span>
                <span className="block text-sm text-slate-700">
                  Téléchargement depuis commons.wikimedia.org. {wallpaper.credit}.
                </span>
              </span>
            </label>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={!canApply} onClick={() => navigate('/application')}>
          <Play aria-hidden="true" /> Appliquer
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/personnaliser')}>
          <EditPencil aria-hidden="true" /> Modifier mes choix
        </button>
        <button type="button" className="btn-secondary" onClick={() => { setDryrun(null); navigate('/profil'); }}>
          <Xmark aria-hidden="true" /> Annuler
        </button>
      </div>
    </section>
  );
}
