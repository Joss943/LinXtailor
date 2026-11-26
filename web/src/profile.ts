import type {
  Animations, AppId, Comfort, Desktop, Detection, DockPosition, IconSize, Persona, Profile,
  Shortcuts, TerminalApp, Theme, WallpaperFile, ExtensionId,
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

export interface ComfortOption {
  id: Comfort;
  title: string;
  problem: string;
  /** Bureaux où la correction s'applique (tous si absent). */
  only?: Desktop[];
  /** Explication affichée sur les autres bureaux. */
  elseNote?: string;
}

export const COMFORT_OPTIONS: ComfortOption[] = [
  {
    id: 'windowButtons',
    title: 'Boutons réduire et agrandir',
    problem: 'Sous GNOME, les fenêtres n’ont qu’un bouton fermer et cliquer sur une icône du dock ne réduit pas la fenêtre.',
    only: ['GNOME'],
    elseNote: 'Déjà le cas sur ce bureau.',
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
  {
    id: 'touchpad',
    title: 'Pavé tactile comme sous Windows',
    problem: 'Un simple toucher ne clique pas, et le clic droit se fait à deux doigts au lieu du coin inférieur droit.',
    only: ['GNOME'],
    elseNote: 'Sur ce bureau, réglez-le dans Paramètres, Pavé tactile.',
  },
  {
    id: 'doubleClick',
    title: 'Ouvrir les fichiers par double-clic',
    problem: 'KDE peut ouvrir les fichiers au simple clic, ce qui déroute.',
    only: ['KDE'],
    elseNote: 'Déjà le cas sur ce bureau.',
  },
  {
    id: 'dualBootClock',
    title: 'Même heure que Windows (double démarrage)',
    problem: 'Si Windows est aussi installé, son horloge se décale d’une ou deux heures après chaque passage par Linux.',
  },
];

export const isComfortAvailable = (c: ComfortOption, de: Desktop) => !c.only || c.only.includes(de);

export interface AppOption {
  id: AppId;
  name: string;
  /** Logiciel utilisé sous Windows. */
  windows: string;
  category: 'Bureautique' | 'Internet' | 'Création' | 'Multimédia' | 'Jeux' | 'Outils';
}

/** Équivalents Linux installés depuis Flathub, pour l'utilisateur, sans mot de passe. */
export const APP_OPTIONS: AppOption[] = [
  { id: 'onlyoffice', name: 'ONLYOFFICE', windows: 'Word, Excel, PowerPoint', category: 'Bureautique' },
  { id: 'thunderbird', name: 'Thunderbird', windows: 'Outlook', category: 'Bureautique' },
  { id: 'peazip', name: 'PeaZip', windows: '7-Zip, WinRAR', category: 'Outils' },
  { id: 'vscode', name: 'Visual Studio Code', windows: 'Notepad++, VS Code', category: 'Outils' },
  { id: 'chrome', name: 'Google Chrome', windows: 'Google Chrome', category: 'Internet' },
  { id: 'discord', name: 'Discord', windows: 'Discord', category: 'Internet' },
  { id: 'zoom', name: 'Zoom', windows: 'Zoom', category: 'Internet' },
  { id: 'vlc', name: 'VLC', windows: 'Lecteur multimédia', category: 'Multimédia' },
  { id: 'spotify', name: 'Spotify', windows: 'Spotify', category: 'Multimédia' },
  { id: 'obs', name: 'OBS Studio', windows: 'OBS Studio', category: 'Multimédia' },
  { id: 'gimp', name: 'GIMP', windows: 'Photoshop', category: 'Création' },
  { id: 'pinta', name: 'Pinta', windows: 'Paint', category: 'Création' },
  { id: 'inkscape', name: 'Inkscape', windows: 'Illustrator', category: 'Création' },
  { id: 'kdenlive', name: 'Kdenlive', windows: 'Premiere, Clipchamp', category: 'Création' },
  { id: 'steam', name: 'Steam', windows: 'Steam', category: 'Jeux' },
  { id: 'heroic', name: 'Heroic', windows: 'Epic Games, GOG', category: 'Jeux' },
];

export interface ExtensionOption {
  id: ExtensionId;
  name: string;
  problem: string;
}

/** Extensions GNOME qui comblent les manques les plus ressentis en venant de Windows. */
export const EXTENSION_OPTIONS: ExtensionOption[] = [
  { id: 'taskbar', name: 'Barre des tâches façon Windows', problem: 'Une barre en bas avec vos fenêtres ouvertes, l’heure et les notifications. Remplace le dock.' },
  { id: 'startMenu', name: 'Menu Démarrer', problem: 'Un vrai menu d’applications classé par catégories, en bas à gauche.' },
  { id: 'trayIcons', name: 'Icônes de la zone de notification', problem: 'Sans elle, Discord, Steam ou Dropbox n’ont pas d’icône près de l’horloge.' },
  { id: 'clipboard', name: 'Historique du presse-papiers', problem: 'Retrouvez vos derniers copier-coller, comme avec Win+V.' },
  { id: 'desktopIcons', name: 'Icônes sur le bureau', problem: 'Fichiers et raccourcis posés sur le bureau, comme sous Windows.' },
  { id: 'phone', name: 'Lien avec le téléphone', problem: 'Notifications, SMS et fichiers de votre téléphone Android (GSConnect).' },
  { id: 'caffeine', name: 'Empêcher la mise en veille', problem: 'Un clic pour garder l’écran allumé pendant un film ou une présentation.' },
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
  const gnome = d.desktop === 'GNOME';
  const base = { schemaVersion: 3 as const, persona, terminal, apps: [] as AppId[], extensions: [] as ExtensionId[] };
  switch (persona) {
    case 'migrator':
      return {
        ...base, theme: 'light', wallpaper: null,
        dock: { position: 'bottom', iconSize: 'medium' },
        animations: 'reduced', shortcuts: 'windows',
        comfort: COMFORT_OPTIONS.filter((c) => c.id !== 'dualBootClock' && isComfortAvailable(c, d.desktop)).map(
          (c) => c.id,
        ),
        apps: ['onlyoffice', 'vlc'],
        extensions: gnome ? ['taskbar', 'startMenu', 'trayIcons', 'clipboard', 'desktopIcons'] : [],
      };
    case 'aesthete':
      return {
        ...base, theme: 'light', wallpaper: 'aurore.jpg',
        dock: { position: 'bottom', iconSize: 'large' },
        animations: weak ? 'reduced' : 'full', shortcuts: 'macos', comfort: ['codecs'],
        extensions: gnome ? ['trayIcons', 'clipboard'] : [],
      };
    case 'tinkerer':
      return {
        ...base, theme: 'dark', wallpaper: null,
        dock: { position: 'left', iconSize: 'small' },
        animations: weak ? 'reduced' : 'full', shortcuts: 'linux', comfort: [],
        apps: ['vscode'], extensions: gnome ? ['trayIcons', 'clipboard'] : [],
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
    schemaVersion: 3,
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
    comfort: COMFORT_OPTIONS.filter(
      (c) => c.id !== 'dualBootClock' && isComfortAvailable(c, d.desktop) && Math.random() < 0.5,
    ).map((c) => c.id),
    apps: [],
    extensions: d.desktop === 'GNOME' ? EXTENSION_OPTIONS.filter(() => Math.random() < 0.3).map((e) => e.id) : [],
  };
}

// --- Import / export -------------------------------------------------------

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v);

/** Valide un profil importé ; migre les schemaVersion 1 et 2 vers 3. */
export function parseProfile(raw: unknown): Profile {
  if (typeof raw !== 'object' || raw === null) throw new Error('Le fichier ne contient pas un profil.');
  const p = raw as Record<string, unknown>;
  const dock = p.dock as Record<string, unknown> | undefined;
  const comfort = p.schemaVersion === 1 ? [] : p.comfort;
  const apps = p.schemaVersion === 3 ? p.apps : [];
  const extensions = p.schemaVersion === 3 ? p.extensions : [];
  const validList = (v: unknown, ids: readonly string[]): v is string[] =>
    Array.isArray(v) && v.every((x) => ids.includes(x as string)) && new Set(v).size === v.length;
  const ok =
    (p.schemaVersion === 1 || p.schemaVersion === 2 || p.schemaVersion === 3) &&
    validList(apps, APP_OPTIONS.map((a) => a.id)) &&
    validList(extensions, EXTENSION_OPTIONS.map((e) => e.id)) &&
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
    comfort.every((c) => COMFORT_OPTIONS.some((o) => o.id === c)) &&
    new Set(comfort).size === comfort.length;
  if (!ok) throw new Error('Profil invalide ou d’une version inconnue.');
  return {
    schemaVersion: 3,
    persona: p.persona as Persona,
    theme: p.theme as Theme,
    wallpaper: p.wallpaper as WallpaperFile | null,
    dock: { position: dock.position as DockPosition, iconSize: dock.iconSize as IconSize },
    animations: p.animations as Animations,
    terminal: p.terminal as TerminalApp,
    shortcuts: p.shortcuts as Shortcuts,
    comfort: comfort as Comfort[],
    apps: apps as AppId[],
    extensions: extensions as ExtensionId[],
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
