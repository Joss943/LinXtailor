import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Home, InfoCircle, Rewind, Upload } from 'iconoir-react';
import { api } from '../api/client';
import { useApp } from '../App';
import { APP_OPTIONS, COMFORT_OPTIONS, EXTENSION_OPTIONS, LABELS, PERSONAS, WALLPAPERS, parseProfile } from '../profile';
import { tipsFor } from '../tips';

export default function Done() {
  const { detection, profile, setProfile, setDryrun, notify } = useApp();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const p = profile!;

  const rows: [string, string][] = [
    ['Profil', PERSONAS.find((x) => x.id === p.persona)!.name],
    ['Thème', LABELS.theme[p.theme]],
    ['Fond d’écran', WALLPAPERS.find((w) => w.file === p.wallpaper)?.name ?? 'Inchangé'],
    ['Dock', `${LABELS.position[p.dock.position]}, icônes ${LABELS.iconSize[p.dock.iconSize].toLowerCase()}`],
    ['Animations', LABELS.animations[p.animations]],
    ['Terminal', LABELS.terminal[p.terminal]],
    ['Raccourcis', LABELS.shortcuts[p.shortcuts]],
    [
      'Habitudes Windows',
      p.comfort.length ? COMFORT_OPTIONS.filter((c) => p.comfort.includes(c.id)).map((c) => c.title).join(', ') : 'Aucune',
    ],
    ['Logiciels', p.apps.length ? APP_OPTIONS.filter((a) => p.apps.includes(a.id)).map((a) => a.name).join(', ') : 'Aucun'],
    [
      'Extensions',
      detection?.desktop === 'GNOME' && p.extensions.length
        ? EXTENSION_OPTIONS.filter((e) => p.extensions.includes(e.id)).map((e) => e.name).join(', ')
        : 'Aucune',
    ],
  ];

  const rollback = async () => {
    setRestoring(true);
    try {
      const r = await api.rollback();
      notify(
        r.restored
          ? { kind: 'success', text: 'Toutes les modifications ont été annulées.' }
          : { kind: 'error', text: 'Rien à annuler, ou annulation incomplète.' },
      );
    } catch (e) {
      notify({ kind: 'error', text: (e as Error).message });
    } finally {
      setRestoring(false);
    }
  };

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify(p, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linxtailor-profil.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProfile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = parseProfile(JSON.parse(await file.text()));
      setProfile(imported);
      setDryrun(null);
      navigate('/apercu');
    } catch (err) {
      notify({ kind: 'error', text: err instanceof SyntaxError ? 'Fichier JSON illisible.' : (err as Error).message });
    }
  };

  return (
    <section className="card mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <CheckCircle className="text-emerald-700" aria-hidden="true" /> Votre bureau est prêt
      </h1>
      <p className="text-slate-700">
        Certains réglages (thème, dock, extensions) peuvent nécessiter de fermer puis rouvrir la session. Vos nouveaux logiciels sont dans le menu des applications.
      </p>
      <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium">{k}</dt>
            <dd className="text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-danger" onClick={() => void rollback()} disabled={restoring}>
          <Rewind aria-hidden="true" /> {restoring ? 'Annulation…' : 'Tout annuler'}
        </button>
        <button type="button" className="btn-secondary" onClick={exportProfile}>
          <Download aria-hidden="true" /> Exporter le profil
        </button>
        <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
          <Upload aria-hidden="true" /> Importer un profil
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => void importProfile(e)} aria-label="Fichier de profil à importer" />
        <button type="button" className="btn-secondary" onClick={() => navigate('/profil')}>
          <Home aria-hidden="true" /> Recommencer
        </button>
      </div>
      {detection && (
        <div className="border-t border-slate-200 pt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <InfoCircle className="text-indigo-700" aria-hidden="true" /> Bon à savoir en arrivant de Windows
          </h2>
          <ul className="mt-3 space-y-3">
            {tipsFor(detection).map((t) => (
              <li key={t.title}>
                <span className="block font-medium">{t.title}</span>
                <span className="block text-sm text-slate-700">{t.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
