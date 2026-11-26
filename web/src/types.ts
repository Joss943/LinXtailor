export type OsId = 'ubuntu' | 'fedora' | 'debian' | 'unsupported';
export type Desktop = 'GNOME' | 'KDE' | 'XFCE' | 'unsupported';
export type Gpu = 'intel' | 'nvidia' | 'amd' | 'unknown';

export interface Detection {
  os: OsId;
  osVersion: string;
  eol: boolean;
  desktop: Desktop;
  ramGb: number;
  diskFreeGb: number;
  gpu: Gpu;
}

export type Persona = 'migrator' | 'aesthete' | 'tinkerer' | 'minimalist';
export type Theme = 'light' | 'dark' | 'auto';
export type WallpaperFile = 'aurore.jpg' | 'vague.jpg' | 'nuit.jpg';
export type DockPosition = 'bottom' | 'left';
export type IconSize = 'small' | 'medium' | 'large';
export type Animations = 'full' | 'reduced' | 'off';
export type TerminalApp = 'gnome-terminal' | 'konsole' | 'xfce4-terminal';
export type Shortcuts = 'linux' | 'windows' | 'macos';
/** Irritants fréquents des personnes venant de Windows (schemaVersion 2). */
export type Comfort = 'windowButtons' | 'numlock' | 'codecs' | 'officeFonts';

export interface Profile {
  schemaVersion: 2;
  persona: Persona;
  theme: Theme;
  wallpaper: WallpaperFile | null;
  dock: { position: DockPosition; iconSize: IconSize };
  animations: Animations;
  terminal: TerminalApp;
  shortcuts: Shortcuts;
  comfort: Comfort[];
}

export type Risk = 'none' | 'package-install' | 'repo-add';

export interface Action {
  id: number;
  description: string;
  command: string;
  risk: Risk;
}

export interface DryRunResult {
  actions: Action[];
  token: string;
}

export interface ApplyLine {
  actionId: number;
  status: 'ok' | 'error';
  output: string;
}
