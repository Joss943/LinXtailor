import type {
  Animations, Comfort, Desktop, Detection, DockPosition, IconSize, Persona, Profile,
  Shortcuts, TerminalApp, Theme, WallpaperFile,
} from './types';

export const isWeakMachine = (d: Detection) => d.ramGb < 4 || d.gpu === 'unknown';

export const defaultTerminal = (de: Desktop): TerminalApp =>
  de === 'KDE' ? 'konsole' : de === 'XFCE' ? 'xfce4-terminal' : 'gnome-terminal';

export interface WallpaperInfo {
  file: WallpaperFile;
  name: string;
  credit: string;
  /** Couleurs de la miniature SVG (aucune image distante n'est chargée avant accord). */
  colors: [string, string, string];
}

export const WALLPAPERS: WallpaperInfo[] = [
  {
    file: 'aurore.jpg',
    name: 'Aurore',
    credit:
      'Caspar David Friedrich, Le Voyageur contemplant une mer de nuages (vers 1818) — domaine public, Wikimedia Commons',
    colors: ['#8a9bb0', '#d9d4c7', '#3b3f45'],
  },
  {
    file: 'vague.jpg',
    name: 'Vague',
    credit:
      'Katsushika Hokusai, La Grande Vague de Kanagawa (vers 1831) — domaine public, Wikimedia Commons',
    colors: ['#e9dfc7', '#1f4e79', '#f4f1e8'],
  },
  {
    file: 'nuit.jpg',
    name: 'Nuit',
    credit: 'Vincent van Gogh, La Nuit étoilée (1889) — domaine public, Wikimedia Commons',
    colors: ['#1b2a5c', '#3d5aa8', '#f2c94c'],
  },
];

export const COMFORT_OPTIONS: { id: Comfort; title: string; problem: string }[] = [
  {
    id: 'windowButtons',
    title: 'Boutons réduire et agrandir',
    problem: 'Sous GNOME, les fenêtres n’ont qu’un bouton fermer.',
  },
  {
    id: 'numlock',
    title: 'Pavé numérique allumé',
    problem: 'Le pavé numérique est souvent éteint à l’ouverture de session.',
  },
  {
    id: 'codecs',
    title: 'Lecture des vidéos et musiques',
    problem: 'Certaines vidéos MP4 ou musiques ne se lisent pas sans codecs supplémentaires.',
  },
  {
    id: 'officeFonts',
    title: 'Polices pour documents Word et Excel',
    problem: 'Sans polices compatibles, la mise en page des documents reçus se décale.',
  },
];

export const PERSONAS: { id: Persona; name: string; origin: string; description: string }[] = [
  {
    id: 'migrator',
    name: 'Le migrateur',
    origin: 'Je viens de Windows',
    description: 'Barre en bas, raccourcis Windows, boutons de fenêtre et lecture des vidéos.',
  },
  {
    id: 'aesthete',
    name: 'L’esthète',
    origin: 'Je viens de macOS',
    description: 'Dock centré en bas, thème clair, beau fond d’écran, raccourcis façon macOS.',
  },
  {
    id: 'tinkerer',
    name: 'Le bidouilleur',
    origin: 'Je connais Linux',
    description: 'Thème sombre, dock à gauche, et chaque commande visible et copiable.',
  },
  {
    id: 'minimalist',
    name: 'Le minimaliste',
    origin: 'Je veux l’essentiel',
    description: 'Effets désactivés, petites icônes, rien de superflu.',
  },
];

export function personaProfile(persona: Persona, d: Detection): Profile {
  const weak = isWeakMachine(d);
  const terminal = defaultTerminal(d.desktop);
  const base = { schemaVersion: 2 as const, persona, terminal };
  switch (persona) {
    case 'migrator':
      return {
        ...base, theme: 'light', wallpaper: null,
        dock: { position: 'bottom', iconSize: 'medium' },
        animations: 'reduced', shortcuts: 'windows',
        comfort: ['windowButtons', 'numlock', 'codecs', 'officeFonts'],
      };
    case 'aesthete':
      return {
        ...base, theme: 'light', wallpaper: 'aurore.jpg',
        dock: { position: 'bottom', iconSize: 'large' },
        animations: weak ? 'reduced' : 'full', shortcuts: 'macos', comfort: ['codecs'],
      };
    case 'tinkerer':
      return {
        ...base, theme: 'dark', wallpaper: null,
        dock: { position: 'left', iconSize: 'small' },
        animations: weak ? 'reduced' : 'full', shortcuts: 'linux', comfort: [],
      };
    case 'minimalist':
      return {
        ...base, theme: 'auto', wallpaper: null,
        dock: { position: 'left', iconSize: 'small' },
        animations: 'off', shortcuts: 'linux', comfort: [],
      };
  }
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Profil aléatoire mais cohérent avec la machine (terminal du bureau, animations). */
export function randomProfile(d: Detection): Profile {
  const persona = pick<Persona>(['migrator', 'aesthete', 'tinkerer', 'minimalist']);
  const animations = pick<Animations>(isWeakMachine(d) ? ['reduced', 'off'] : ['full', 'reduced', 'off']);
  return {
    schemaVersion: 2,
    persona,
    theme: pick<Theme>(['light', 'dark', 'auto']),
    wallpaper: pick<WallpaperFile | null>([null, 'aurore.jpg', 'vague.jpg', 'nuit.jpg']),
    dock: {
      position: pick<DockPosition>(['bottom', 'left']),
      iconSize: pick<IconSize>(['small', 'medium', 'large']),
    },
    animations,
    terminal: defaultTerminal(d.desktop),
    shortcuts: pick<Shortcuts>(['linux', 'windows', 'macos']),
    comfort: COMFORT_OPTIONS.map((c) => c.id).filter(() => Math.random() < 0.5),
  };
}

// --- Import / export -------------------------------------------------------

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v);

/** Valide un profil importé ; migre schemaVersion 1 (sans « comfort ») vers 2. */
export function parseProfile(raw: unknown): Profile {
  if (typeof raw !== 'object' || raw === null) throw new Error('Le fichier ne contient pas un profil.');
  const p = raw as Record<string, unknown>;
  const dock = p.dock as Record<string, unknown> | undefined;
  const comfort = p.schemaVersion === 1 ? [] : p.comfort;
  const ok =
    (p.schemaVersion === 1 || p.schemaVersion === 2) &&
    oneOf(p.persona, ['migrator', 'aesthete', 'tinkerer', 'minimalist'] as const) &&
    oneOf(p.theme, ['light', 'dark', 'auto'] as const) &&
    (p.wallpaper === null || oneOf(p.wallpaper, ['aurore.jpg', 'vague.jpg', 'nuit.jpg'] as const)) &&
    typeof dock === 'object' && dock !== null &&
    oneOf(dock.position, ['bottom', 'left'] as const) &&
    oneOf(dock.iconSize, ['small', 'medium', 'large'] as const) &&
    oneOf(p.animations, ['full', 'reduced', 'off'] as const) &&
    oneOf(p.terminal, ['gnome-terminal', 'konsole', 'xfce4-terminal'] as const) &&
    oneOf(p.shortcuts, ['linux', 'windows', 'macos'] as const) &&
    Array.isArray(comfort) &&
    comfort.every((c) => oneOf(c, ['windowButtons', 'numlock', 'codecs', 'officeFonts'] as const));
  if (!ok) throw new Error('Profil invalide ou d’une version inconnue.');
  return {
    schemaVersion: 2,
    persona: p.persona as Persona,
    theme: p.theme as Theme,
    wallpaper: p.wallpaper as WallpaperFile | null,
    dock: { position: dock.position as DockPosition, iconSize: dock.iconSize as IconSize },
    animations: p.animations as Animations,
    terminal: p.terminal as TerminalApp,
    shortcuts: p.shortcuts as Shortcuts,
    comfort: comfort as Comfort[],
  };
}

// --- Libellés --------------------------------------------------------------

export const LABELS = {
  theme: { light: 'Clair', dark: 'Sombre', auto: 'Automatique (réglage du système)' },
  position: { bottom: 'En bas', left: 'À gauche' },
  iconSize: { small: 'Petites', medium: 'Moyennes', large: 'Grandes' },
  animations: { full: 'Activées', reduced: 'Réduites', off: 'Désactivées' },
  terminal: { 'gnome-terminal': 'GNOME Terminal', konsole: 'Konsole', 'xfce4-terminal': 'Terminal XFCE' },
  shortcuts: { linux: 'Par défaut', windows: 'Façon Windows', macos: 'Façon macOS' },
} as const;
