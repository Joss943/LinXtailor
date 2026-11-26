interface Props {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  /** Raison affichée quand l'option ne s'applique pas à ce bureau. */
  unavailable?: string;
}

/** Case à cocher présentée en carte, utilisée pour les listes à choix multiples. */
export default function CheckCard({ checked, onChange, title, description, unavailable }: Props) {
  const disabled = unavailable !== undefined;
  const on = checked && !disabled;
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border-2 p-3 focus-within:ring-2 focus-within:ring-indigo-600 ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100'
          : on
            ? 'cursor-pointer border-indigo-700 bg-indigo-50'
            : 'cursor-pointer border-slate-200 bg-white hover:border-slate-400'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-indigo-700"
        checked={on}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        <span className="block font-medium">{title}</span>
        {description && <span className="block text-sm text-slate-700">{description}</span>}
        {disabled && unavailable && (
          <span className="mt-1 block text-sm font-medium text-slate-800">{unavailable}</span>
        )}
      </span>
    </label>
  );
}
