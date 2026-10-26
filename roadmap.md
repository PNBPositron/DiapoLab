# DiapoLab — Roadmap & état du projet

Éditeur de présentations neobrutaliste (React + Vite + Tailwind + Supabase), déployé sur Vercel.

## ✅ Fait (récent → ancien)

- [x] Mode présentateur : touche **P** en présentation → minuterie, notes du slide courant, aperçu de la slide suivante (reset du chrono à chaque présentation).
- [x] Notes de présentateur : section « Speaker notes » dans le panneau Design, sauvegardées avec le slide (jamais rendues sur le canvas).
- [x] Sondages live avec QR code : les polls synchronisent via Supabase Realtime (broadcast), bouton « join » dans le quiz qui affiche un QR vers la page public `/v/$key` (vote depuis le téléphone, résultats en direct, rattrapage automatique des retardataires).
- [x] Catalogue partagé `src/lib/motion-catalog.ts` : les transitions et animations d'éléments ne sont plus dupliquées entre PagesBar et PropertiesPanel (19 transitions, animations d'entrée unifiées).
- [x] FlowCraft : 16 types de diagrammes (flows, structures, réseaux, plans), dégradés par style, restylage de groupe ; seconde couleur de dégradé pour **tous** les styles (material, matrix, swiss inclus).
- [x] Quiz : restylage complet selon le style UI (12 thèmes) pour la question ET les réponses ; la bonne réponse n'est mise en évidence qu'après le choix de l'utilisateur.
- [x] Transitions de slides : catalogue étendu (reveal, shutter, swirl, warp, prism, origami…) avec mini-aperçus ; le slide sortant reste affiché en fond pendant la transition (plus de flash blanc) ; prism/origami via presets motion.
- [x] Liens de partage privés : table `design_shares` + RPC `get_shared_design` (migration `20261022090000_private_share_links.sql`), page viewer `/t/$id` moderne (glass, bouton Present, compteur de pages) ; distinction lien invalide vs migration non appliquée.
- [x] Thumbnails sans UI de sélection ni animations d'entrée (mode `preview`).
- [x] Centre/modernisation du popup de publication, compression des images, renommage Designs → Projects, thèmes de quiz, zoom de transition réglable, zoom d'aperçu ajustable, ombres et édition de quiz vérifiés, transitions morph corrigées.

## ⏳ En attente d'une action utilisateur

- [ ] **Appliquer les migrations SQL dans Supabase** (SQL Editor) pour activer les liens privés sur la base hébergée : `supabase/migrations/20261022090000_private_share_links.sql`.
- [ ] Vérifier le popup de publication de bout en bout (bloqué : besoin d'un compte connecté — pas encore d'utilisateur de test).
- [ ] Vérifier le build Vercel après les derniers commits (présenter view, QR polls, notes) et tester un poll live depuis un téléphone.

## 💡 Idées suivantes

- [ ] Activer/configurer Realtime si le canal broadcast des polls ne se propage pas (Dashboard → Realtime) — aucun RLS requis avec le design broadcast actuel.
- [ ] Persistance optionnelle des votes de poll (table + résultat partagé entre sessions).
- [ ] Annotation live pendant la présentation (stylo sur le slide projeté).
- [ ] Export PDF/PPTX des notes du présentateur.
