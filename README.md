# PHP Décodé — Guide interactif (Baba Niang)

Site statique autonome, inspiré du style de [Guide-Java](https://baba-niang.github.io/Guide-Java/).
Ouvrir `index.html` (aucune installation requise). Pour le meilleur rendu (polices Google Fonts),
héberger le dossier (GitHub Pages, Netlify…) ou l'ouvrir via un petit serveur local plutôt qu'en `file://`.

## Ce qui a changé par rapport à la version précédente

- **Identité visuelle propre à PHP** : thème violet/vert inspiré du couple requête→réponse serveur,
  motif `<?php` en filigrane, numéros de chapitre façon balises `‹01›`, typographies
  Space Grotesk (titres) + IBM Plex Sans (texte) + JetBrains Mono (code), au lieu du thème « café »
  du guide Java.
- **Mode clair / sombre** : bouton soleil/lune en haut à droite, détecte la préférence système au
  premier chargement puis mémorise le choix (`localStorage`).
- **Navigation par chapitres repensée** : rangée de pastilles cliquables avec compteur de fiches
  révisées par chapitre, chapitre actif mis en évidence automatiquement au scroll
  (`IntersectionObserver`), raccourcis clavier `←` `→` pour sauter de chapitre en chapitre,
  `/` pour aller à la recherche, `Échap` pour fermer la visionneuse d'image.
- **Fiches réorganisées** : badges factuels par fiche (nombre de sections d'explication, d'exemples
  de code, d'images), filtre « Toutes / À réviser / Révisées », recherche plein texte inchangée
  mais restylée.
- **Explications améliorées** : bloc de code dans un encart dédié avec bouton **Copier**, zone
  « Pratique » et « À retenir » redessinées, ouverture/fermeture animée des fiches.
- **Interactivité ajoutée** : zoom plein écran des images de fiches (lightbox), bouton
  « retour en haut », transitions douces, sauvegarde de la progression et du thème.
- Les 94 images fournies sont conservées dans `images/` sans aucune modification.

## Structure

```
index.html      structure de la page
css/style.css   design tokens (clair/sombre), mise en page, composants
js/data.js      contenu des 30 fiches + 6 chapitres + liste des images (inchangé)
js/app.js       rendu, recherche, filtres, thème, progression, lightbox, raccourcis clavier
images/         94 captures de fiches PHP originales
```
