# Référence : problèmes fréquents en passant de Windows à Linux

Fedora 40+, Ubuntu 22.04+, Debian 12+ — bureaux GNOME, KDE Plasma et XFCE.

Pour chaque problème : ce que l’on constate, pourquoi, et comment le régler. La colonne
**Desktop Tailor** indique si l’application le corrige elle-même (question « Vos habitudes de
Windows » ou raccourcis), si elle donne un conseil sur l’écran final, ou si le problème n’est
traité qu’ici.

Légende : ✅ corrigé automatiquement · 💡 conseil dans l’application · 📖 ce document uniquement

---

## 1. Bureau et fenêtres

| Problème | Pourquoi | Solution | Desktop Tailor |
|---|---|---|---|
| Pas de boutons réduire et agrandir sur les fenêtres | Choix de conception de GNOME | `gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'` | ✅ GNOME (KDE et XFCE les ont déjà) |
| Cliquer sur l’icône d’une application dans le dock ne réduit pas sa fenêtre | Comportement par défaut de Dash to Dock / Ubuntu Dock | `gsettings set org.gnome.shell.extensions.dash-to-dock click-action 'minimize'` | ✅ GNOME |
| Pas de barre des tâches en bas | GNOME place le dock à gauche (Ubuntu) ou le cache (Fedora, Debian) | Dash to Dock, position en bas | ✅ question « dock » |
| Pas de menu Démarrer | GNOME utilise la vue d’ensemble | Touche Super (Windows), puis taper le nom de l’application | 📖 |
| Alt+Tab regroupe les fenêtres par application | GNOME bascule entre applications, pas entre fenêtres | `gsettings set org.gnome.desktop.wm.keybindings switch-windows "['<Alt>Tab']"` puis `gsettings set org.gnome.desktop.wm.keybindings switch-applications "[]"` | 📖 |
| Pas d’icônes sur le bureau (GNOME) | GNOME n’affiche plus le bureau par défaut | Ubuntu : déjà présent (Desktop Icons NG). Fedora et Debian : installer l’extension « Desktop Icons NG (DING) » depuis le Gestionnaire d’extensions | 📖 |
| Raccourcis clavier différents (Win+D, Alt+F4…) | Conventions propres à chaque bureau | Raccourcis « façon Windows » | ✅ question « raccourcis » |

## 2. Fichiers

| Problème | Pourquoi | Solution | Desktop Tailor |
|---|---|---|---|
| KDE ouvre les fichiers au simple clic | Ancien réglage par défaut de Plasma 5 | `kwriteconfig5 --file kdeglobals --group KDE --key SingleClick false` (ou `kwriteconfig6`) | ✅ KDE |
| Pas de « Nouveau document » dans le clic droit (GNOME Fichiers) | Le menu se remplit à partir du dossier Modèles, vide par défaut | `touch "$(xdg-user-dir TEMPLATES)/Nouveau document texte.txt"` | 📖 |
| Fichiers et dossiers cachés introuvables | Les noms qui commencent par un point sont masqués | Ctrl+H dans le gestionnaire de fichiers | 💡 |
| Pas de lecteurs C: ou D: | Une seule arborescence : `/home/<nom>` pour vos fichiers, `/media` ou `/run/media` pour les clés USB | Utiliser les favoris du gestionnaire de fichiers | 📖 |
| `Photo.JPG` et `photo.jpg` sont deux fichiers différents | Les systèmes de fichiers Linux distinguent majuscules et minuscules | Rien à régler ; à savoir pour les scripts et les liens | 📖 |
| Disques Windows en lecture seule, ou qui refusent de se monter | Le « démarrage rapide » de Windows laisse la partition NTFS en hibernation | Sous Windows : Options d’alimentation, décocher « Activer le démarrage rapide », puis éteindre complètement | 💡 |

## 3. Matériel

| Problème | Pourquoi | Solution | Desktop Tailor |
|---|---|---|---|
| Un simple toucher du pavé tactile ne clique pas ; le clic droit se fait à deux doigts | Réglages par défaut de GNOME | `gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true` et `click-method 'areas'` | ✅ GNOME (ailleurs : Paramètres, Pavé tactile) |
| Pavé numérique éteint à l’ouverture de session | L’état n’est pas mémorisé par défaut | GNOME : `numlock-state true` ; KDE : `kcminputrc [Keyboard] NumLock=0` ; XFCE : `keyboards /Default/Numlock` | ✅ |
| Jeux lents, écran mal géré avec une carte NVIDIA | Le pilote libre Nouveau est limité | Ubuntu : « Logiciels et mises à jour », onglet « Pilotes additionnels ». Fedora : RPM Fusion puis `sudo dnf install akmod-nvidia`. Debian : sections `contrib non-free`, puis `sudo apt install nvidia-driver`. Avec Secure Boot, une clé (MOK) est demandée au redémarrage | 💡 si NVIDIA détectée |
| Wi-Fi absent sur certaines cartes Broadcom | Micrologiciel non libre | Ubuntu : « Pilotes additionnels ». Fedora : RPM Fusion puis `broadcom-wl`. Debian : `non-free-firmware` (installé par défaut depuis Debian 12) | 📖 |
| Imprimante non détectée | Rare depuis l’impression sans pilote (IPP Everywhere) | Paramètres, Imprimantes, Ajouter. Sinon, paquets du fabricant (`hplip` pour HP) | 📖 |

## 4. Logiciels

| Problème | Pourquoi | Solution | Desktop Tailor |
|---|---|---|---|
| Les fichiers `.exe` ne s’installent pas | Programmes Windows, pas Linux | Chercher dans la logithèque (Logiciels, Centre d’applications, Discover) ou sur Flathub. En dernier recours : Bottles (Wine) | 💡 |
| Vidéos MP4 ou musiques MP3 illisibles | Codecs brevetés absents par défaut (Fedora surtout) | Fedora : RPM Fusion puis `gstreamer1-plugin-libav gstreamer1-plugins-ugly`. Ubuntu et Debian : `gstreamer1.0-libav gstreamer1.0-plugins-ugly` | ✅ |
| Documents Word ou Excel décalés dans LibreOffice | Polices Calibri, Cambria, Arial et Times absentes | Polices métriquement compatibles : Carlito, Caladea, Liberation | ✅ |
| Microsoft Office absent | Pas de version Linux | LibreOffice (installé par défaut sur Ubuntu, Fedora et Debian), ou Microsoft 365 dans le navigateur | 📖 |
| Jeux Windows | Steam utilise Proton | Steam : Paramètres, Compatibilité, activer Steam Play. Les jeux à anti-triche noyau peuvent refuser de se lancer | 📖 |

## 5. Système

| Problème | Pourquoi | Solution | Desktop Tailor |
|---|---|---|---|
| L’heure de Windows se décale d’une ou deux heures en double démarrage | Windows règle l’horloge matérielle à l’heure locale, Linux en UTC | `sudo timedatectl set-local-rtc 1` | ✅ (sur demande) |
| Pas de Ctrl+Alt+Suppr / Gestionnaire des tâches | Outil différent | GNOME : « Moniteur système ». KDE : Ctrl+Échap. XFCE : « Gestionnaire des tâches » | 📖 |
| On demande sans cesse un mot de passe | Les changements système demandent les droits administrateur | Normal : c’est votre mot de passe de session. Ne jamais lancer un script inconnu avec `sudo` | 📖 |
| Faut-il un antivirus ? | Les logiciels viennent de dépôts signés | Installer depuis la logithèque et faire les mises à jour suffit dans la plupart des cas | 📖 |
| Pas d’hibernation | Désactivée par défaut (Secure Boot, taille du swap) | La mise en veille fonctionne ; l’hibernation demande une configuration avancée | 📖 |

---

## Pourquoi tout n’est pas automatique

Desktop Tailor ne corrige que ce qui est **sûr, réversible et vérifiable dans le dry-run** :
réglages du bureau, et paquets issus des dépôts officiels ou de RPM Fusion. Tout ce qui touche au
démarrage (pilotes NVIDIA, Secure Boot), à Windows lui-même (démarrage rapide) ou à vos fichiers
personnels (dossier Modèles) reste un conseil, pour ne jamais rien casser sans que vous l’ayez
décidé.
