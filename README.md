# Desktop Tailor

Personnalisez votre bureau Linux (Fedora, Ubuntu, Debian — GNOME, KDE Plasma, XFCE) en quelques
questions. Chaque modification est montrée avant d’être appliquée, et tout peut être annulé.

- **Agent local** (Python, FastAPI) sur `localhost:7420` uniquement : détection, dry-run, application, restauration.
- **Interface web** (React, TypeScript, Tailwind CSS, icônes Iconoir), en français.

## Installation

**Page d’installation : <https://joss943.github.io/kinginlinux/>**

Sur Fedora 40+, Ubuntu 22.04+ ou Debian 12+, ouvrez un terminal et collez :

```sh
curl -fsSL https://raw.githubusercontent.com/Joss943/kinginlinux/main/install.sh | bash
```

Puis lancez **Desktop Tailor** depuis le menu des applications, ou tapez `desktop-tailor` dans un terminal.

- Installation pour votre utilisateur seulement, dans `~/.local/share/desktop-tailor`. Node.js n’est pas
  nécessaire : l’interface est fournie déjà compilée dans la [dernière version](https://github.com/Joss943/kinginlinux/releases/latest).
- Le mot de passe administrateur n’est demandé que s’il manque Python (et `python3-venv` sur Ubuntu et Debian).
- `desktop-tailor --stop` arrête l’application ; `desktop-tailor --uninstall` la désinstalle.

### Depuis les sources (développement)

Prérequis : Node.js 18+, Python 3.10+.

```sh
git clone https://github.com/Joss943/kinginlinux.git && cd kinginlinux
python3 -m venv .venv && .venv/bin/pip install -r agent/requirements.txt
npm --prefix web ci
.venv/bin/python agent/server.py & npm --prefix web run dev
```

Puis ouvrez <http://localhost:5173>. `bash scripts/package.sh` produit l’archive publiée dans les versions.

## Fonctionnement

1. **Analyse** : distribution (`/etc/os-release`, champ `ID`), version et fin de vie, bureau
   (`$XDG_CURRENT_DESKTOP`), mémoire, disque et carte graphique.
2. **Profil** : le migrateur (Windows), l’esthète (macOS), le bidouilleur (Linux), le minimaliste,
   ou « Surprends-moi ».
3. **Questions** : thème, fond d’écran, dock, animations, terminal et raccourcis, puis
   **habitudes de Windows** :
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
- Seule connexion Internet : le téléchargement du fond d’écran choisi (Wikimedia Commons, domaine
  public), après accord explicite.
- Toutes les données restent dans `~/.config/desktop-tailor/` : instantanés (`snapshots/`),
  paquets installés (`installed-packages.txt`), cinq derniers profils (`history.json`), journal.

## API de l’agent

| Méthode | Chemin      | Réponse |
|---------|-------------|---------|
| GET     | `/health`   | `{ "status": "ok" }` |
| GET     | `/detect`   | `{ os, osVersion, eol, desktop, ramGb, diskFreeGb, gpu }` |
| POST    | `/dryrun`   | corps = profil ; `{ actions: [{ id, description, command, risk }], token }` |
| POST    | `/apply`    | corps = `{ profile, token }` ; flux NDJSON `{ actionId, status, output }` |
| POST    | `/rollback` | `{ "restored": true }` |

Toute autre route ou méthode répond 404.

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
