import type { ReactNode } from 'react';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';
import ProgressBar from './ProgressBar';

interface Props {
  step: number;
  total: number;
  title: string;
  hint?: string;
  children: ReactNode;
  canContinue?: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export default function QuestionCard(p: Props) {
  return (
    <section className="card mx-auto max-w-2xl p-6" aria-labelledby="question-title">
      <p className="mb-2 text-sm text-slate-700" aria-live="polite">
        {p.step}/{p.total}
      </p>
      <ProgressBar value={p.step} max={p.total} label="Progression du questionnaire" />
      <h2 id="question-title" className="mt-6 text-2xl font-semibold">
        {p.title}
      </h2>
      {p.hint && <p className="mt-1 text-slate-700">{p.hint}</p>}
      <div className="mt-6">{p.children}</div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={p.onBack}>
          <NavArrowLeft aria-hidden="true" /> Retour
        </button>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={p.onSkip}>
            Passer
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={p.onNext}
            disabled={p.canContinue === false}
          >
            Suivant <NavArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

interface OptionProps {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  detail?: string;
}

export function OptionButton({ selected, disabled, onClick, icon, title, detail }: OptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
        selected ? 'border-indigo-700 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-400'
      }`}
    >
      {icon && (
        <span className="mt-0.5 text-indigo-700" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>
        <span className="block font-medium">{title}</span>
        {detail && <span className="block text-sm text-slate-700">{detail}</span>}
      </span>
    </button>
  );
}
