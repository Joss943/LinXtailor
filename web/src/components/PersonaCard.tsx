import type { ReactNode } from 'react';
import { DesktopMock, type MockState } from './BeforeAfter';

interface Props {
  icon: ReactNode;
  name: string;
  origin: string;
  description: string;
  preview: MockState;
  onSelect: () => void;
}

export default function PersonaCard({ icon, name, origin, description, preview, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card flex flex-col gap-3 p-4 text-left transition hover:border-indigo-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      <DesktopMock state={preview} label={`Aperçu : ${name}`} />
      <span className="flex items-center gap-2">
        <span className="text-indigo-700" aria-hidden="true">
          {icon}
        </span>
        <span className="text-lg font-semibold">{name}</span>
      </span>
      <span className="text-sm font-medium text-slate-700">{origin}</span>
      <span className="text-sm text-slate-700">{description}</span>
    </button>
  );
}
