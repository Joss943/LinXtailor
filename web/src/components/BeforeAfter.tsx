import type { Desktop, DockPosition, IconSize, Profile, Theme, WallpaperFile } from '../types';
import { WALLPAPERS } from '../profile';

export interface MockState {
  theme: Theme;
  wallpaper: WallpaperFile | null;
  dock: DockPosition;
  iconSize: IconSize;
  windowButtons: boolean;
}

const ICON = { small: 6, medium: 8, large: 10 };

/** Maquette SVG d'un bureau (aucune image réelle n'est chargée). */
export function DesktopMock({ state, label }: { state: MockState; label: string }) {
  const dark = state.theme === 'dark';
  const wp = WALLPAPERS.find((w) => w.file === state.wallpaper);
  const [c1, c2, c3] = wp ? wp.colors : ['#64748b', '#94a3b8', '#cbd5e1'];
  const id = `g-${label.replace(/\W/g, '')}-${state.wallpaper ?? 'none'}`;
  const s = ICON[state.iconSize];
  const n = 4;
  const left = state.dock === 'left';
  const bar = s + 6;
  const winX = left ? bar + 14 : 30;
  const fg = dark ? '#f8fafc' : '#334155';
  return (
    <svg viewBox="0 0 160 100" role="img" aria-label={label} className="w-full rounded-md">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.6" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${id})`} />
      <rect x={winX} y="18" width="90" height="58" rx="3" fill={dark ? '#1e293b' : '#f8fafc'} />
      <rect x={winX} y="18" width="90" height="10" rx="3" fill={dark ? '#334155' : '#e2e8f0'} />
      <circle cx={winX + 84} cy="23" r="2" fill={fg} />
      {state.windowButtons && (
        <>
          <rect x={winX + 70} y="22.5" width="4" height="1" fill={fg} />
          <rect x={winX + 76} y="21" width="4" height="4" fill="none" strokeWidth="0.8" stroke={fg} />
        </>
      )}
      <rect x={winX + 8} y="36" width="50" height="3" rx="1" fill={dark ? '#64748b' : '#94a3b8'} />
      <rect x={winX + 8} y="44" width="70" height="3" rx="1" fill={dark ? '#475569' : '#cbd5e1'} />
      <rect x={winX + 8} y="52" width="60" height="3" rx="1" fill={dark ? '#475569' : '#cbd5e1'} />
      {left ? (
        <g>
          <rect x="0" y="0" width={bar} height="100" fill="#0f172a" opacity="0.8" />
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x="3" y={20 + i * (s + 4)} width={s} height={s} rx="1.5" fill="#e2e8f0" />
          ))}
        </g>
      ) : (
        <g>
          <rect
            x={80 - (n * (s + 4)) / 2 - 4}
            y={100 - bar - 2}
            width={n * (s + 4) + 4}
            height={bar}
            rx="3"
            fill="#0f172a"
            opacity="0.8"
          />
          {Array.from({ length: n }, (_, i) => (
            <rect
              key={i}
              x={80 - (n * (s + 4)) / 2 + i * (s + 4)}
              y={100 - bar + 1}
              width={s}
              height={s}
              rx="1.5"
              fill="#e2e8f0"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/** État par défaut supposé du bureau détecté. */
export function defaultMock(de: Desktop): MockState {
  return {
    theme: 'light',
    wallpaper: null,
    dock: de === 'GNOME' ? 'left' : 'bottom',
    iconSize: 'medium',
    windowButtons: de !== 'GNOME',
  };
}

export function profileMock(p: Profile, de: Desktop): MockState {
  return {
    theme: p.theme === 'auto' ? 'light' : p.theme,
    wallpaper: p.wallpaper,
    dock: p.dock.position,
    iconSize: p.dock.iconSize,
    windowButtons: de !== 'GNOME' || p.comfort.includes('windowButtons'),
  };
}

export default function BeforeAfter({ profile, desktop }: { profile: Profile; desktop: Desktop }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure>
        <DesktopMock state={defaultMock(desktop)} label="Bureau avant" />
        <figcaption className="mt-1 text-center text-sm text-slate-700">Avant</figcaption>
      </figure>
      <figure>
        <DesktopMock state={profileMock(profile, desktop)} label="Bureau après" />
        <figcaption className="mt-1 text-center text-sm text-slate-700">Après</figcaption>
      </figure>
    </div>
  );
}
