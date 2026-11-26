import { useState } from 'react';
import { Check, Copy, InfoCircle, WarningTriangle } from 'iconoir-react';
import type { Action, Risk } from '../types';

const BADGE: Record<Exclude<Risk, 'none'>, { text: string; cls: string }> = {
  'package-install': {
    text: 'Installation de paquet',
    cls: 'bg-yellow-100 text-yellow-900 border-yellow-400',
  },
  'repo-add': { text: 'Ajout de dépôt', cls: 'bg-orange-100 text-orange-900 border-orange-400' },
};

export default function ActionList({ actions, showCommands }: { actions: Action[]; showCommands: boolean }) {
  const [copied, setCopied] = useState<number | null>(null);
  const copy = async (a: Action) => {
    await navigator.clipboard.writeText(a.command);
    setCopied(a.id);
    window.setTimeout(() => setCopied(null), 1500);
  };
  if (actions.length === 0) {
    return (
      <p className="flex items-center gap-2 text-slate-700">
        <InfoCircle aria-hidden="true" /> Aucune modification nécessaire : votre bureau correspond déjà à
        ce profil.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {actions.map((a) => (
        <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {a.id}. {a.description}
            </span>
            {a.risk !== 'none' && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${BADGE[a.risk].cls}`}
              >
                <WarningTriangle width={14} height={14} aria-hidden="true" /> {BADGE[a.risk].text}
              </span>
            )}
          </div>
          {showCommands && (
            <div className="mt-2 flex items-start gap-2">
              <code className="flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-slate-900 p-2 font-mono text-sm text-slate-100">
                {a.command}
              </code>
              <button
                type="button"
                className="btn-secondary px-2"
                onClick={() => void copy(a)}
                aria-label={`Copier la commande ${a.id}`}
              >
                {copied === a.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </button>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
