import type { ReactNode } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  ArrowDown, Brightness, Check, HalfMoon, LayoutLeft, MediaImage, MinusCircle, Play, Rewind,
  ShortcutSquare, SunLight, Terminal,
} from 'iconoir-react';
import type { Comfort, Profile } from '../types';
import QuestionCard, { OptionButton } from '../components/QuestionCard';
import { DesktopMock } from '../components/BeforeAfter';
import { COMFORT_OPTIONS, LABELS, WALLPAPERS, isComfortAvailable, isWeakMachine } from '../profile';
import { useApp } from '../App';

export const QUIZ_STEPS = 6;

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export default function Quiz() {
  const { step: raw } = useParams();
  const step = Number(raw);
  const { detection, profile, setProfile, setDryrun } = useApp();
  const navigate = useNavigate();
  if (!Number.isInteger(step) || step < 1 || step > QUIZ_STEPS) return <Navigate to="/questions/1" replace />;
  const p = profile!;
  const d = detection!;
  const weak = isWeakMachine(d);

  const update = (patch: Partial<Profile>) => {
    setProfile({ ...p, ...patch });
    setDryrun(null);
  };
  const next = () => navigate(step === QUIZ_STEPS ? '/personnaliser' : `/questions/${step + 1}`);
  const back = () => navigate(step === 1 ? '/personnaliser' : `/questions/${step - 1}`);
  const common = { step, total: QUIZ_STEPS, onBack: back, onNext: next };

  switch (step) {
    case 1:
      return (
        <QuestionCard {...common} title="Quel thème préférez-vous ?" onSkip={next}
          hint="« Passer » conserve la suggestion de votre profil.">
          <div className="grid gap-2 sm:grid-cols-3">
            <OptionButton selected={p.theme === 'light'} onClick={() => update({ theme: 'light' })}
              icon={<SunLight />} title={LABELS.theme.light} />
            <OptionButton selected={p.theme === 'dark'} onClick={() => update({ theme: 'dark' })}
              icon={<HalfMoon />} title={LABELS.theme.dark} />
            <OptionButton selected={p.theme === 'auto'} onClick={() => update({ theme: 'auto' })}
              icon={<Brightness />} title="Automatique" detail="Garde le réglage actuel du système" />
          </div>
        </QuestionCard>
      );
    case 2:
      return (
        <QuestionCard {...common} title="Un fond d’écran ?"
          hint="Œuvres du domaine public. L’image choisie sera téléchargée depuis Wikimedia Commons, uniquement après votre accord, juste avant l’application."
          onSkip={() => { update({ wallpaper: null }); next(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            {WALLPAPERS.map((w) => (
              <button key={w.file} type="button" aria-pressed={p.wallpaper === w.file}
                onClick={() => update({ wallpaper: p.wallpaper === w.file ? null : w.file })}
                className={`rounded-lg border-2 p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  p.wallpaper === w.file ? 'border-indigo-700 bg-indigo-50' : 'border-slate-200 bg-white'
                }`}>
                <DesktopMock label={`Aperçu du fond ${w.name}`} state={{
                  theme: 'light', wallpaper: w.file, dock: p.dock.position, iconSize: 'small', windowButtons: true,
                }} />
                <span className="mt-2 flex items-center gap-1 font-medium">
                  <MediaImage aria-hidden="true" /> {w.name}
                  {p.wallpaper === w.file && <Check className="text-indigo-700" aria-hidden="true" />}
                </span>
                <span className="mt-1 block text-xs text-slate-700">{w.credit}</span>
              </button>
            ))}
          </div>
        </QuestionCard>
      );
    case 3:
      return (
        <QuestionCard {...common} title="Où placer le dock ?" onSkip={next}
          hint="Le dock regroupe vos applications favorites.">
          <Group label="Position">
            <OptionButton selected={p.dock.position === 'bottom'} icon={<ArrowDown />} title={LABELS.position.bottom}
              detail="Comme Windows ou macOS" onClick={() => update({ dock: { ...p.dock, position: 'bottom' } })} />
            <OptionButton selected={p.dock.position === 'left'} icon={<LayoutLeft />} title={LABELS.position.left}
              detail="Libère de la hauteur d’écran" onClick={() => update({ dock: { ...p.dock, position: 'left' } })} />
          </Group>
          <Group label="Taille des icônes">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <OptionButton key={s} selected={p.dock.iconSize === s} title={LABELS.iconSize[s]}
                onClick={() => update({ dock: { ...p.dock, iconSize: s } })} />
            ))}
          </Group>
        </QuestionCard>
      );
    case 4:
      return (
        <QuestionCard {...common} title="Et les animations ?" onSkip={next}>
          <div className="grid gap-2 sm:grid-cols-3">
            <OptionButton selected={p.animations === 'full'} disabled={weak} icon={<Play />}
              title={LABELS.animations.full}
              detail={weak ? 'Indisponible : machine trop modeste' : 'Fluide et vivant'}
              onClick={() => update({ animations: 'full' })} />
            <OptionButton selected={p.animations === 'reduced'} icon={<Rewind />} title={LABELS.animations.reduced}
              detail="Plus rapide" onClick={() => update({ animations: 'reduced' })} />
            <OptionButton selected={p.animations === 'off'} icon={<MinusCircle />} title={LABELS.animations.off}
              detail="Réactivité maximale" onClick={() => update({ animations: 'off' })} />
          </div>
        </QuestionCard>
      );
    case 5:
      return (
        <QuestionCard {...common} title="Terminal et raccourcis clavier" onSkip={next}>
          <Group label="Terminal">
            {(['gnome-terminal', 'konsole', 'xfce4-terminal'] as const).map((t) => (
              <OptionButton key={t} selected={p.terminal === t} icon={<Terminal />} title={LABELS.terminal[t]}
                onClick={() => update({ terminal: t })} />
            ))}
          </Group>
          <Group label="Raccourcis clavier">
            <OptionButton selected={p.shortcuts === 'linux'} icon={<ShortcutSquare />} title={LABELS.shortcuts.linux}
              onClick={() => update({ shortcuts: 'linux' })} />
            <OptionButton selected={p.shortcuts === 'windows'} icon={<ShortcutSquare />} title={LABELS.shortcuts.windows}
              detail="Super+D affiche le bureau, Alt+F4 ferme" onClick={() => update({ shortcuts: 'windows' })} />
            <OptionButton selected={p.shortcuts === 'macos'} icon={<ShortcutSquare />} title={LABELS.shortcuts.macos}
              detail="Super+Q ferme la fenêtre" onClick={() => update({ shortcuts: 'macos' })} />
          </Group>
        </QuestionCard>
      );
    default: {
      const toggle = (c: Comfort) =>
        update({ comfort: p.comfort.includes(c) ? p.comfort.filter((x) => x !== c) : [...p.comfort, c] });
      return (
        <QuestionCard {...common} title="Vos habitudes de Windows"
          hint="Les petits manques qui surprennent le plus après un passage à Linux. Cochez ceux à corriger."
          onSkip={() => { update({ comfort: [] }); next(); }}>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMFORT_OPTIONS.map((c) => {
              const available = isComfortAvailable(c, d.desktop);
              const checked = available && p.comfort.includes(c.id);
              return (
                <label key={c.id}
                  className={`flex items-start gap-3 rounded-lg border-2 p-3 focus-within:ring-2 focus-within:ring-indigo-600 ${
                    !available ? 'cursor-not-allowed border-slate-200 bg-slate-100'
                      : checked ? 'cursor-pointer border-indigo-700 bg-indigo-50' : 'cursor-pointer border-slate-200 bg-white'
                  }`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-700" disabled={!available}
                    checked={checked} onChange={() => toggle(c.id)} />
                  <span>
                    <span className="block font-medium">{c.title}</span>
                    <span className="block text-sm text-slate-700">{c.problem}</span>
                    {!available && c.elseNote && (
                      <span className="mt-1 block text-sm font-medium text-slate-800">{c.elseNote}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </QuestionCard>
      );
    }
  }
}
