<h1 align="center"><img src="data/io.github.joss943.LinXtailor.svg" width="72" alt=""><br>LinXtailor</h1>
<p align="center"><b>Le compagnon de ceux qui passent de Windows à Linux.</b> Vos logiciels, vos habitudes et un bureau à votre goût, en une page.</p>
<p align="center">
  <a href="https://joss943.github.io/LinXtailor/">Site</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#fonctionnement">Fonctionnement</a> ·
  <a href="#garde-fous">Garde-fous</a> ·
  <a href="docs/problemes-migration.md">Guide de migration</a><br><br>
  <a href="https://github.com/Joss943/LinXtailor/actions/workflows/ci.yml"><img src="https://github.com/Joss943/LinXtailor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Fedora%20·%20Ubuntu%20·%20Debian-GNOME%20·%20KDE%20·%20XFCE-4338ca" alt="Fedora, Ubuntu, Debian">
  <img src="https://img.shields.io/badge/licence-MIT-blue" alt="MIT">
</p>

Choisissez un profil, ajustez sur une seule page, vérifiez la liste exacte des changements, appliquez.
Tout est sauvegardé avant et peut être annulé en un clic.

- **Agent local** (Python, FastAPI) sur `localhost:7420` uniquement : détection, dry-run, application, restauration.
- **Interface web** (React, TypeScript, Tailwind CSS, icônes Iconoir), en français.

## Installation

**Page d’installation : <https://joss943.github.io/LinXtailor/>**

Sur Fedora 40+, Ubuntu 22.04+ ou Debian 12+, ouvrez un terminal et collez :

```sh
curl -fsSL https://raw.githubusercontent.com/Joss943/LinXtailor/main/install.sh | bash
```

Puis lancez **LinXtailor** depuis le menu des applications, ou tapez `linxtailor` dans un terminal.

- Installation pour votre utilisateur seulement, dans `~/.local/share/linxtailor`. Node.js n’est pas
  nécessaire : l’interface est fournie déjà compilée dans la [dernière version](https://github.com/Joss943/LinXtailor/releases/latest).
- Le mot de passe administrateur n’est demandé que s’il manque Python (et `python3-venv` sur Ubuntu et Debian).
- `linxtailor --stop` arrête l’application ; `linxtailor --uninstall` la désinstalle.

### Depuis les sources (développement)

Prérequis : Node.js 18+, Python 3.10+.

```sh
git clone https://github.com/Joss943/LinXtailor.git && cd LinXtailor
python3 -m venv .venv && .venv/bin/pip install -r agent/requirements.txt
npm --prefix web ci
.venv/bin/python agent/server.py & npm --prefix web run dev
```

Puis ouvrez <http://localhost:5173>. `bash scripts/package.sh` produit l’archive publiée dans les versions.

## Fonctionnement

1. **Analyse** : distribution (`/etc/os-release`, champ `ID`), version et fin de vie, bureau
   (`$XDG_CURRENT_DESKTOP`), mémoire, disque et carte graphique.
2. **Profil** : le migrateur (Windows), l’esthète (macOS), le bidouilleur (Linux), le minimaliste,
   ou « Surprends-moi ». Le profil pré-règle tout.
3. **Personnaliser**, sur une seule page avec aperçu en direct (ou « Me guider pas à pas » pour
   répondre à des questions) :
   - **Apparence** : thème, fond d’écran, dock, animations, raccourcis clavier, terminal.
   - **Vos logiciels Windows** : cochez Photoshop, Office, Outlook, Paint, 7-Zip, Discord, Steam…
     et l’équivalent Linux est installé depuis Flathub, pour vous seul, sans mot de passe
     (GIMP, ONLYOFFICE, Thunderbird, Pinta, PeaZip…).
   - **Extensions GNOME** : barre des tâches façon Windows, menu Démarrer, icônes de la zone de
     notification, historique du presse-papiers (Win+V), icônes sur le bureau, lien avec le téléphone,
     anti-veille. Installées depuis extensions.gnome.org, GNOME demande confirmation pour chacune.
   - **Essentiels de première installation (top 5)** : ouvrir les .zip, .rar et .7z, pilotes Wi-Fi et
     Bluetooth non libres, pare-feu activé, mises à jour de sécurité automatiques, points de
     restauration Timeshift. Demande le mot de passe administrateur (pkexec), annoncé dans le dry-run.
   - **Habitudes Windows** :
   - boutons réduire et agrandir, et clic sur le dock qui réduit la fenêtre (GNOME) ;
   - pavé numérique allumé à l’ouverture de session ;
   - codecs vidéo et audio (MP4, MP3…) ;
   - polices compatibles avec les documents Word et Excel (Carlito, Caladea, Liberation) ;
   - pavé tactile comme sous Windows : toucher pour cliquer, clic droit en bas à droite (GNOME) ;
   - ouverture des fichiers par double-clic (KDE) ;
   - même heure que Windows en double démarrage.

   La liste complète des problèmes rencontrés en arrivant de Windows, avec leurs solutions, est dans
   [docs/problemes-migration.md](docs/problemes-migration.md).
4. **Dry-run** : aperçu avant/après et liste exacte des actions. Badge jaune pour une installation de
   paquet, badge orange pour un ajout de dépôt. Le bidouilleur voit et peut copier chaque commande.
5. **Application** : journal en temps réel. En cas d’erreur, l’application s’arrête et propose de
   restaurer l’état précédent.
6. **Terminé** : récapitulatif, « Tout annuler », export et import du profil en JSON, et conseils
   « Bon à savoir » adaptés à la machine (pilote NVIDIA, logiciels, double démarrage).

## Garde-fous

- L’agent n’écoute que sur `127.0.0.1:7420` et refuse toute origine autre que `http://localhost`.
- Rien n’est exécuté sans un dry-run validé : `/apply` exige le jeton à usage unique rendu par `/dryrun`.
- Les actions qui demandent les droits administrateur passent par `pkexec` (fenêtre du système) et
  annoncent leur raison dans le dry-run.
- Connexions Internet : uniquement ce que vous choisissez et que le dry-run affiche (fond d’écran
  après accord explicite, paquets, logiciels Flathub, extensions GNOME).
- Toutes les données restent dans `~/.config/linxtailor/` : instantanés (`snapshots/`), paquets,
  logiciels et extensions installés (`installed-*.txt`, utilisés par « Tout annuler »), cinq derniers
  profils (`history.json`), journal. Les données de « Desktop Tailor » (v1.0.0) y sont reprises.

## API de l’agent

| Méthode | Chemin      | Réponse |
|---------|-------------|---------|
| GET     | `/health`   | `{ "status": "ok" }` |
| GET     | `/detect`   | `{ os, osVersion, eol, desktop, ramGb, diskFreeGb, gpu }` |
| POST    | `/dryrun`   | corps = profil ; `{ actions: [{ id, description, command, risk }], token }` |
| POST    | `/apply`    | corps = `{ profile, token }` ; flux NDJSON `{ actionId, status, output }` |
| POST    | `/rollback` | `{ "restored": true }` |

Toute autre route ou méthode répond 404.

## Profil (schemaVersion 4)

```json
{ "schemaVersion": 4, "persona": "migrator", "theme": "light", "wallpaper": null,
  "dock": { "position": "bottom", "iconSize": "medium" }, "animations": "reduced",
  "terminal": "gnome-terminal", "shortcuts": "windows",
  "comfort": ["windowButtons", "numlock", "codecs", "officeFonts", "touchpad"],
  "apps": ["onlyoffice", "vlc"], "extensions": ["taskbar", "startMenu", "trayIcons"],
  "essentials": ["archives", "firmware", "firewall", "autoUpdates", "backup"] }
```

Les profils exportés en version 1, 2 ou 3 restent importables.

## Tests

```sh
.venv/bin/python -m unittest discover -s agent/tests
npm --prefix web run build
```

## Limites connues

- KDE : la position du dock est écrite dans `kcminputrc`, comme le prévoit la spécification ; Plasma
  n’en tient pas compte pour déplacer réellement le panneau.
- XFCE : la position du panneau est fixée par une valeur entière (`-s 4` à gauche, `-s 8` en bas), qui
  peut ne pas correspondre au format attendu par votre version de xfce4-panel.
- Plasma 6 ne fournit que `kwriteconfig6` : l’agent l’utilise automatiquement si `kwriteconfig5` est absent.
- Le fond d’écran KDE n’est pas restauré par « Tout annuler ».
- « Tout annuler » désinstalle les outils ajoutés par les essentiels, mais ne désactive pas un pare-feu
  ou des mises à jour automatiques qui étaient déjà installés. Les pilotes non libres sont conservés,
  car les retirer pourrait couper le Wi-Fi.
