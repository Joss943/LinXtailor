import type { Detection } from './types';

export interface Tip {
  title: string;
  text: string;
}

/**
 * Conseils pour les personnes qui arrivent de Windows : ce que l'application ne règle pas
 * elle-même, mais qui revient le plus souvent. Liste complète : docs/problemes-migration.md.
 */
export function tipsFor(d: Detection): Tip[] {
  const store =
    d.os === 'ubuntu' ? 'Centre d’applications' : d.desktop === 'KDE' ? 'Discover' : 'Logiciels';
  const tips: Tip[] = [
    {
      title: 'Installer un logiciel',
      text: `Les fichiers .exe ne s’installent pas. Cherchez l’application ou un équivalent dans ${store}, plutôt que sur un site web.`,
    },
    {
      title: 'Fichiers cachés',
      text: 'Ctrl+H affiche ou masque les fichiers cachés dans le gestionnaire de fichiers, comme les dossiers de configuration.',
    },
    {
      title: 'Double démarrage avec Windows',
      text: 'Désactivez le « démarrage rapide » de Windows (Options d’alimentation). Sinon, vos disques Windows restent en lecture seule sous Linux.',
    },
  ];
  if (d.gpu === 'nvidia') {
    const how =
      d.os === 'ubuntu'
        ? 'Ouvrez « Logiciels et mises à jour », onglet « Pilotes additionnels ».'
        : d.os === 'fedora'
          ? 'Activez RPM Fusion, puis installez le paquet akmod-nvidia.'
          : 'Activez les sections contrib et non-free, puis installez le paquet nvidia-driver.';
    tips.unshift({
      title: 'Carte graphique NVIDIA',
      text: `Pour les jeux et la vidéo, installez le pilote propriétaire. ${how} Si le démarrage sécurisé (Secure Boot) est actif, une clé vous sera demandée au redémarrage.`,
    });
  }
  return tips;
}
