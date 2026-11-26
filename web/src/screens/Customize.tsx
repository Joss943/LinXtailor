import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Laptop, NavArrowRight, Packages, Palette, Puzzle, Search, ShieldCheck, ShortcutSquare, Spark, Tools,
} from 'iconoir-react';
import { useApp } from '../App';
import CheckCard from '../components/CheckCard';
import { DesktopMock, profileMock } from '../components/BeforeAfter';
import {
  APP_OPTIONS, COMFORT_OPTIONS, ESSENTIAL_OPTIONS, EXTENSION_OPTIONS, LABELS, PERSONAS, WALLPAPERS,
  isComfortAvailable, isWeakMachine,
} from '../profile';
import type { Profile } from '../types';

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

interface Choice<T extends string | null> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Groupe de boutons à choix unique. */
function Segmented<T extends string | null>(props: {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-1.5 text-sm font-semibold">{props.label}</legend>
      <div className="flex flex-wrap gap-2">
        {props.choices.map((c) => (
          <button
            key={String(c.value)}
            type="button"
            aria-pressed={props.value === c.value}
            disabled={c.disabled}
            onClick={() => props.onChange(c.value)}
            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
              props.value === c.value
                ? 'border-indigo-700 bg-indigo-50 text-indigo-900'
                : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {props.hint && <p className="mt-1 text-sm text-slate-700">{props.hint}</p>}
    </fieldset>
  );
}

function Section(props: { id: string; icon: ReactNode; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={props.id} className="card scroll-mt-4 p-5" aria-labelledby={`${props.id}-title`}>
      <h2 id={`${props.id}-title`} className="flex items-center gap-2 text-xl font-semibold">
        <span className="text-indigo-700" aria-hidden="true">{props.icon}</span>
        {props.title}
      </h2>
      {props.intro && <p className="mt-1 text-slate-700">{props.intro}</p>}
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

export default function Customize() {
  const { detection, profile, setProfile, setDryrun } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const p = profile!;
  const d = detection!;
  const gnome = d.desktop === 'GNOME';
  const weak = isWeakMachine(d);
  const taskbar = gnome && p.extensions.includes('taskbar');

  const update = (patch: Partial<Profile>) => {
    setProfile({ ...p, ...patch });
    setDryrun(null);
  };

  const q = query.trim().toLowerCase();
  const apps = APP_OPTIONS.filter(
    (a) => !q || `${a.name} ${a.windows} ${a.category}`.toLowerCase().includes(q),
  );
  const categories = [...new Set(apps.map((a) => a.category))];
  const comfortCount = p.comfort.filter((c) =>
    isComfortAvailable(COMFORT_OPTIONS.find((o) => o.id === c)!, d.desktop),
  ).length;
  const extensionCount = gnome ? p.extensions.length : 0;

  const nav = [
    { id: 'apparence', label: 'Apparence' },
    { id: 'essentiels', label: 'Essentiels' },
    { id: 'habitudes', label: 'Habitudes Windows' },
    { id: 'logiciels', label: 'Logiciels' },
    { id: 'extensions', label: 'Extensions' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,18rem]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Personnalisez votre bureau</h1>
          <p className="mt-1 text-slate-700">
            Tout est déjà réglé selon votre profil. Ajustez ce que vous voulez, puis vérifiez : rien n’est
            appliqué sans votre accord.
          </p>
          <nav aria-label="Sections" className="mt-3 flex flex-wrap gap-2">
            {nav.map((n) => (
              <a key={n.id} href={`#${n.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(n.id)?.scrollIntoView(); }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-800 hover:border-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                {n.label}
              </a>
            ))}
          </nav>
        </div>

        <Section id="apparence" icon={<Palette />} title="Apparence">
          <Segmented label="Thème" value={p.theme} onChange={(theme) => update({ theme })} choices={[
            { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' },
            { value: 'auto', label: 'Ne pas changer' },
          ]} />
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold">Fond d’écran (domaine public)</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[null, ...WALLPAPERS.map((w) => w.file)].map((file) => {
                const w = WALLPAPERS.find((x) => x.file === file);
                const selected = p.wallpaper === file;
                return (
                  <button key={file ?? 'none'} type="button" aria-pressed={selected}
                    onClick={() => update({ wallpaper: file })}
                    title={w?.credit}
                    className={`rounded-lg border-2 p-1.5 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      selected ? 'border-indigo-700 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}>
                    <DesktopMock label={w ? `Fond ${w.name}` : 'Fond actuel'}
                      state={{ theme: 'light', wallpaper: file, dock: 'bottom', iconSize: 'small', windowButtons: true }} />
                    <span className="mt-1 block">{w ? w.name : 'Ne pas changer'}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {taskbar ? (
            <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
              Dock : remplacé par la barre des tâches façon Windows (voir Extensions).
            </p>
          ) : (
            <>
              <Segmented label="Dock" value={p.dock.position}
                onChange={(position) => update({ dock: { ...p.dock, position } })}
                choices={[{ value: 'bottom', label: 'En bas' }, { value: 'left', label: 'À gauche' }]} />
              <Segmented label="Taille des icônes du dock" value={p.dock.iconSize}
                onChange={(iconSize) => update({ dock: { ...p.dock, iconSize } })}
                choices={(['small', 'medium', 'large'] as const).map((s) => ({ value: s, label: LABELS.iconSize[s] }))} />
            </>
          )}
          <Segmented label="Animations" value={p.animations} onChange={(animations) => update({ animations })}
            hint={weak ? 'Animations complètes indisponibles : machine modeste.' : undefined}
            choices={[
              { value: 'full', label: 'Activées', disabled: weak },
              { value: 'reduced', label: 'Réduites' }, { value: 'off', label: 'Désactivées' },
            ]} />
          <Segmented label="Raccourcis clavier" value={p.shortcuts} onChange={(shortcuts) => update({ shortcuts })}
            choices={(['windows', 'macos', 'linux'] as const).map((s) => ({ value: s, label: LABELS.shortcuts[s] }))} />
          <Segmented label="Terminal" value={p.terminal} onChange={(terminal) => update({ terminal })}
            choices={(['gnome-terminal', 'konsole', 'xfce4-terminal'] as const).map((t) => ({ value: t, label: LABELS.terminal[t] }))} />
        </Section>

        <Section id="essentiels" icon={<Tools />} title="Essentiels de première installation"
          intro="Le top 5 de ce qui manque juste après l’installation. Demande le mot de passe administrateur.">
          <div className="grid gap-2 sm:grid-cols-2">
            {ESSENTIAL_OPTIONS.map((e) => (
              <CheckCard key={e.id} checked={p.essentials.includes(e.id)} title={e.title} description={e.problem}
                onChange={() => update({ essentials: toggle(p.essentials, e.id) })} />
            ))}
          </div>
        </Section>

        <Section id="habitudes" icon={<Laptop />} title="Habitudes Windows"
          intro="Les petits manques qui surprennent le plus après un passage à Linux.">
          <div className="grid gap-2 sm:grid-cols-2">
            {COMFORT_OPTIONS.map((c) => (
              <CheckCard key={c.id} checked={p.comfort.includes(c.id)} title={c.title} description={c.problem}
                unavailable={isComfortAvailable(c, d.desktop) ? undefined : c.elseNote ?? ''}
                onChange={() => update({ comfort: toggle(p.comfort, c.id) })} />
            ))}
          </div>
        </Section>

        <Section id="logiciels" icon={<Packages />} title="Vos logiciels Windows"
          intro="Cochez ce que vous utilisiez : l’équivalent Linux est installé depuis Flathub, pour vous seul, sans mot de passe.">
          <label className="relative block max-w-sm">
            <span className="sr-only">Chercher un logiciel</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-600" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Photoshop, Outlook, Steam…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
          </label>
          {categories.map((cat) => (
            <div key={cat} className="mt-4">
              <h3 className="mb-1.5 text-sm font-semibold">{cat}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {apps.filter((a) => a.category === cat).map((a) => (
                  <CheckCard key={a.id} checked={p.apps.includes(a.id)}
                    title={a.windows === a.name ? a.name : `${a.windows} → ${a.name}`}
                    description={a.windows === a.name ? 'Version Linux officielle' : `Remplace ${a.windows}`}
                    onChange={() => update({ apps: toggle(p.apps, a.id) })} />
                ))}
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <p className="mt-4 text-slate-700">
              Rien trouvé ici : cherchez « {query} » dans la logithèque de votre système, ou ouvrez-le dans le navigateur
              si c’est un service en ligne (Teams, Office 365, WhatsApp).
            </p>
          )}
        </Section>

        <Section id="extensions" icon={<Puzzle />} title="Extensions"
          intro={gnome
            ? 'Des modules pour GNOME qui ajoutent ce que Windows fait d’office. GNOME vous demandera de confirmer chaque installation.'
            : undefined}>
          {gnome ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {EXTENSION_OPTIONS.map((e) => (
                <CheckCard key={e.id} checked={p.extensions.includes(e.id)} title={e.name} description={e.problem}
                  onChange={() => update({ extensions: toggle(p.extensions, e.id) })} />
              ))}
            </div>
          ) : (
            <p className="text-slate-700">
              Sur {d.desktop === 'KDE' ? 'KDE Plasma' : 'XFCE'}, la barre des tâches, le menu Démarrer et la zone de
              notification sont déjà là : aucune extension n’est nécessaire.
            </p>
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="card space-y-4 p-4">
          <DesktopMock state={profileMock(p, d.desktop)} label="Aperçu de votre bureau" />
          <dl className="grid grid-cols-[1fr,auto] gap-y-1 text-sm">
            <dt className="text-slate-700">Profil</dt>
            <dd className="font-medium">{PERSONAS.find((x) => x.id === p.persona)!.name}</dd>
            <dt className="text-slate-700">Essentiels</dt><dd className="font-medium">{p.essentials.length}</dd>
            <dt className="text-slate-700">Habitudes corrigées</dt><dd className="font-medium">{comfortCount}</dd>
            <dt className="text-slate-700">Logiciels</dt><dd className="font-medium">{p.apps.length}</dd>
            <dt className="text-slate-700">Extensions</dt><dd className="font-medium">{extensionCount}</dd>
          </dl>
          <button type="button" className="btn-primary w-full" onClick={() => navigate('/apercu')}>
            Vérifier les changements <NavArrowRight aria-hidden="true" />
          </button>
          <p className="flex items-start gap-1.5 text-xs text-slate-700">
            <ShieldCheck width={16} height={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            Vous verrez la liste exacte avant toute modification. Tout reste annulable.
          </p>
          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            <button type="button" className="btn-secondary w-full text-sm" onClick={() => navigate('/questions/1')}>
              <Spark aria-hidden="true" /> Me guider pas à pas
            </button>
            <button type="button" className="btn-secondary w-full text-sm" onClick={() => navigate('/profil')}>
              <ShortcutSquare aria-hidden="true" /> Changer de profil
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
