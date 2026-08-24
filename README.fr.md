# AajoTestOS

Un système d'exploitation web. Calme, minimaliste, et proche de ce que vous attendez de Windows ou de macOS, entièrement dans un onglet de navigateur.

Lire dans une autre langue : [English](./README.md) · [中文](./README.zh.md)

## Sommaire

1. Présentation
2. Démarrage rapide
3. Prérequis
4. Architecture
5. Le moteur de stockage
6. Modèle de sécurité
7. Passerelle temps réel
8. Internationalisation
9. Scripts
10. Variables d'environnement
11. Référence de l'API
12. Codes d'erreur
13. Tests
14. Partager votre serveur de développement via un tunnel
15. Déploiement sur Railway
16. Raccourcis clavier
17. Budgets de performance
18. Dépannage
19. Conventions

## Présentation

AajoTestOS reproduit une métaphore de bureau complète dans le navigateur : séquence de démarrage, écran de connexion, écran de verrouillage, barre de menus, dock, centre de contrôle, recherche Spotlight, centre de notifications, et des fenêtres déplaçables, redimensionnables et accrochables.

Quinze applications sont incluses :

- **Notes**, avec sauvegarde automatique, épinglage et étiquettes de couleur
- **Démineur**, trois difficultés, scores personnels et classement partagé
- **Chat**, le cœur social : messagerie entre inconnus avec un quota, invitations d'amitié, partage de médias entre amis, présence et indicateur de saisie
- **Fichiers** et **Photos**, alimentés par de vrais médias importés
- **Réglages**, **Terminal**, **Calculatrice**, **Musique**, **Calendrier**, **Horloge**, **Météo**, **Moniteur**, **Peinture**, **Snake**

Tout est conservé dans un stockage JSON sur disque. Aucune base de données externe, aucun service cloud, aucun compte chez un tiers.

## Démarrage rapide

```bash
git clone <votre dépôt> aajotestos
cd aajotestos
npm install
npm run dev
```

Ouvrez http://localhost:8080 et créez un compte. C'est toute l'installation : aucun fichier de configuration, aucune base de données à provisionner, aucune étape d'amorçage.

La première inscription crée `data/users.json` et le reste du stockage à côté.

## Prérequis

- **Node.js 20 ou supérieur.** Le projet est développé sur Node 22.
- **npm.** Une version récente suffit. Un `package-lock.json` est versionné, donc `npm ci` est reproductible.
- Environ 550 Mo d'espace disque pour `node_modules`.

Aucun outillage global n'est nécessaire. Ni Docker, ni serveur de base de données, ni Redis.

## Architecture

Le projet respecte une séparation stricte Modèle, Vue, Contrôleur.

```
server.mjs                  Point d'entrée à origine unique : Next et la passerelle
server/
  chatGateway.mjs           Câblage Socket.IO et authentification du handshake

src/
  app/
    api/                    CONTRÔLEURS. Un fichier de route par ressource.
      auth/                 Inscription, connexion, déconnexion, session courante
      chat/                 Conversations, messages, envoi, amis, invitations
      minesweeper/          Scores et classement
      media/[id]/           Diffusion autorisée des octets d'un média
      notes/  settings/  upload/  users/  health/
    layout.tsx  page.tsx  globals.css

  lib/
    store/engine.ts         Le moteur de stockage. Transactions, collections, médias.
    models/                 MODÈLES. Toutes les règles métier vivent ici.
      user.ts  session.ts  note.ts  message.ts  friendship.ts  score.ts  media.ts
    auth/
      password.ts           Hachage scrypt et vérification
      session.ts            Utilitaires du cookie de session
    api/
      handlers.ts           Enveloppe withAuth, réponses ok et fail
      client.ts             Enveloppe fetch côté navigateur
    i18n/                   Dictionnaires et contexte de traduction
    os/                     Primitives du shell : store, viewport, horloge, audio, thème

  components/
    os/                     VUES du shell : Desktop, Window, Dock, MenuBar, ...
    apps/<NomApp>/          VUES de chaque application
    ui/                     Quatorze primitives shadcn, toutes utilisées

tests/                      Suites Vitest
```

### Les règles qui tiennent l'ensemble

- **Les modèles n'importent jamais depuis `components/`.** Les règles métier ignorent qu'une interface existe.
- **Les contrôleurs ne contiennent aucune règle métier.** Une route lit l'entrée, appelle une fonction de modèle, met en forme la réponse.
- **Les vues ne parlent jamais au stockage.** Elles passent par `lib/api/client.ts`.
- **Le serveur n'émet jamais de texte affichable.** Chaque échec est une clé de traduction. Voir **Codes d'erreur**.

Le Chat illustre cette séparation, car c'est la fonctionnalité la plus complexe :

- `components/apps/Chat/types.ts` décrit les formes retournées par l'API
- `components/apps/Chat/useChatController.ts` contient l'état, les appels réseau et le socket
- `components/apps/Chat/ChatApp.tsx` dessine, et rien d'autre

## Le moteur de stockage

`src/lib/store/engine.ts` est un petit stockage JSON transactionnel. Il existe parce que le cahier des charges impose un stockage fichier sans base de données.

### Collections

Chaque collection est un fichier distinct sous `DATA_DIR` :

```
data/
  users.json
  sessions.json
  notes.json
  messages.json
  friendships.json
  scores.json
  media.json
  media/<userId>/<mediaId>.<ext>
```

Cette séparation compte. Quand tout tenait dans un seul fichier, enregistrer un score du Démineur réécrivait sur le disque chaque message et chaque compte.

### Transactions

Lire, décider, puis écrire en étapes séparées constitue une situation de compétition. Deux requêtes peuvent franchir le même contrôle avant que l'une des deux n'écrive. `transaction` ferme cette fenêtre en fournissant les lignes à l'intérieur du verrou d'écriture :

```ts
return transaction(["users"], ({ users }) => {
  if (users.some((u) => u.username === name)) {
    return { error: "auth.error.usernameTaken" };
  }
  users.push(newUser);
  return { user: newUser };
});
```

Propriétés garanties :

- Seules les collections nommées sont chargées, et seules elles sont réécrites.
- Lever une exception dans le corps annule l'écriture. Le disque reste intact.
- La validation écrit dans un fichier temporaire au nom unique, puis effectue un renommage atomique : un lecteur simultané ne voit jamais un fichier partiel.
- Une transaction rejetée n'empoisonne pas la file pour la suivante.

### Médias

Les imports sont décodés, validés contre une liste blanche de types MIME, vérifiés en taille sur les octets réellement décodés, puis écrits sur disque. Seules les métadonnées entrent dans `media.json`. Les messages portent un `mediaId`, jamais du base64.

Types acceptés : PNG, JPEG, GIF, WebP, MP4, WebM. Maximum 4 Mo par fichier.

### Limites de montée en charge, dites clairement

Le verrou d'écriture est propre au processus. **N'exécutez qu'une seule instance.** Deux réplicas pointant vers le même répertoire se corrompraient mutuellement. Si une montée en charge horizontale devient nécessaire, l'interface de stockage est volontairement assez étroite pour passer à SQLite sans toucher une seule fonction de modèle.

## Modèle de sécurité

### Mots de passe

Hachés avec **scrypt**, N=16384, r=8, p=1, clé dérivée de 64 octets, avec un sel aléatoire indépendant de 16 octets par utilisateur. Stockés sous la forme `scrypt$N$r$p$sel$empreinte`.

La vérification est à temps constant via `timingSafeEqual`. Une tentative de connexion sur un identifiant inexistant effectue tout de même un appel scrypt équivalent, afin que le temps de réponse ne révèle pas l'existence d'un compte.

La longueur minimale d'un mot de passe est de 8 caractères.

### Sessions

Les jetons font 256 bits issus de `crypto.randomBytes`, encodés en base64url. Le cookie est `httpOnly`, `sameSite=lax`, `path=/`, et `secure` dès que `NODE_ENV` vaut `production`. Une session dure 7 jours, et les lignes expirées sont purgées à chaque connexion plutôt que par une minuterie.

### Identité en temps réel

Le navigateur ne déclare jamais qui il est. La passerelle lit le cookie de session pendant le handshake et refuse la connexion si celui ci ne correspond pas à une session valide. Voir **Passerelle temps réel**.

### Autorisation des médias

`GET /api/media/[id]` ne sert les octets qu'à l'auteur de l'import, ou à une personne à qui ce média a effectivement été envoyé dans un message. Deviner un identifiant renvoie 403. Une requête anonyme renvoie 401.

### Validation des entrées

Fond d'écran, couleur d'accent, thème, langue et couleur d'avatar sont contrôlés contre des listes blanches avant stockage, car ils sont réinjectés dans des attributs de style. Les temps du Démineur sont bornés. Le corps des notes est limité en longueur.

### Bonnes pratiques connues, pas encore implémentées

- Aucune limitation de débit sur les tentatives de connexion. À ajouter avant toute exposition sur l'internet public.
- Aucun jeton CSRF. Le cookie `sameSite=lax` constitue la seule protection intersite sur les routes qui modifient l'état.

## Passerelle temps réel

Socket.IO est attaché **au même serveur HTTP que l'application**, sur `/socket.io`, sur le même port.

C'est délibéré, et c'est la décision de déploiement la plus importante du projet :

- Un seul tunnel ou un seul port d'hébergement expose tout le système.
- Le cookie de session est de même site, donc le handshake le transporte sans aucune configuration CORS.
- Il n'y a pas de second processus à lancer, superviser, ou oublier de démarrer.

### Événements

Du client vers le serveur :

- `message:new` `{ toUserId, messageId }`
- `invite:new` `{ toUserId }`
- `invite:responded` `{ toUserId }`
- `typing` `{ toUserId, isTyping }`

Du serveur vers le client :

- `message:incoming` `{ fromUserId, messageId }`
- `invite:incoming` `{ fromUserId }`
- `invite:resolved` `{ fromUserId }`
- `typing` `{ fromUserId, isTyping }`
- `presence` `{ userId, online }`
- `presence:snapshot` `{ userIds }` envoyé une fois à la connexion

L'identité de l'expéditeur sur chaque événement sortant provient de la session vérifiée, jamais de la charge utile.

## Internationalisation

Trois langues complètes : **anglais**, **français**, **chinois**. 297 clés chacune, avec une parité exacte vérifiée.

- Les dictionnaires vivent dans `src/lib/i18n/dictionaries.ts`.
- `useI18n()` retourne `t`, `locale` et `bcp47`.
- Utilisez `bcp47` pour chaque appel `Intl`. N'écrivez jamais une étiquette de langue en dur dans un composant.
- Le serveur retourne des clés de traduction, jamais des phrases, afin qu'une erreur s'affiche dans la langue choisie par l'utilisateur.

Pour vérifier la parité après une modification :

```bash
npm run typecheck && npm run lint
```

Pour ajouter une langue : étendez l'union `Locale`, ajoutez le dictionnaire, ajoutez l'étiquette BCP 47 dans `src/lib/i18n/context.tsx`, puis ajoutez l'option dans les Réglages.

## Scripts

- `npm run dev`: serveur de développement avec rafraîchissement rapide sur le port 8080
- `npm run build`: build de production, échoue sur toute erreur de typage
- `npm run start`: serveur de production
- `npm run lint`: ESLint sur tout le projet
- `npm run typecheck`: TypeScript sans émission
- `npm test`: Vitest, exécution unique
- `npm run test:watch`: Vitest en mode surveillance

Il n'existe pas de commande séparée pour la passerelle temps réel. Elle démarre avec l'application.

## Variables d'environnement

Toutes sont facultatives. Les valeurs par défaut donnent un système complet et fonctionnel.

- `PORT`: port des pages, de l'API et du socket. Défaut `8080`. Les plateformes d'hébergement l'injectent.
- `HOST`: interface d'écoute. Défaut `0.0.0.0`. Utilisez `127.0.0.1` pour restreindre à cette machine.
- `DATA_DIR`: emplacement du stockage et des médias. Défaut `./data`. **Pointez ceci vers un volume monté en production.**
- `DEV_ORIGINS`: noms d'hôtes supplémentaires, séparés par des virgules, autorisés à joindre le serveur de développement depuis une autre origine. Les domaines de tunnel courants sont déjà acceptés. Sans effet sur un build de production.
- `NEXT_PUBLIC_SOCKET_URL`: uniquement pour le cas inhabituel d'une passerelle sur un autre hôte. Laissez vide pour que le navigateur se reconnecte à l'origine dont il provient.

Copiez `.env.example` vers `.env` si vous souhaitez en modifier une.

## Référence de l'API

Chaque route retourne du JSON. Chaque échec a la forme `{ "error": "<clé de traduction>" }`. Les routes authentifiées renvoient `401` avec `common.error.auth` en l'absence de cookie de session valide.

### Authentification

```
POST /api/auth
  { action: "signup" | "login", username: string, password: string }
  -> { user: PublicUser, locale: "en" | "fr" | "zh" }   pose le cookie de session

GET  /api/auth
  -> { user: PublicUser | null, media: MediaRecord[], locale }

POST /api/auth/logout
  -> { ok: true }                                       efface le cookie de session
```

### Notes

```
GET    /api/notes                       -> { notes: NoteRecord[] }
POST   /api/notes    { title, content, color }          -> { note }
PATCH  /api/notes    { id, title?, content?, color?, pinned? } -> { note }
DELETE /api/notes?id=<noteId>           -> { ok: true }
```

La propriété fait partie du filtre lors de la mise à jour et de la suppression : un compte ne peut jamais toucher la note d'un autre compte en devinant un identifiant.

### Chat

```
GET   /api/chat/conversations   -> { conversations: [{ peer, lastMessage, unread, isFriend }] }
PATCH /api/chat/conversations   -> { ok: true, marked: number }     marque tout comme lu

GET   /api/chat/messages?peerId=<id>
  -> { messages, isFriend, canSend, reason?, kind,
       strangerMax, strangerMaxChars, strangerRemaining }

POST  /api/chat/send
  { toUserId, content?, kind: "text" | "image" | "video", mediaId? }
  -> { message }

GET   /api/chat/friends         -> { friends: PublicUser[] }
GET   /api/chat/invites?scope=incoming|sent -> { invites }
POST  /api/chat/invites  { toUserId }       -> { invite }
PATCH /api/chat/invites  { inviteId, accept } -> { ok, accepted, peerId }
```

### L'économie du chat

C'est la partie qui porte de vraies règles, elle mérite donc d'être énoncée précisément.

- Deux comptes qui ne sont pas amis peuvent envoyer **3 messages chacun**. Le quota est compté **par expéditeur**, pas par conversation, donc une réponse reste toujours possible. Celui qui épuise son quota peut encore recevoir une réponse.
- Les messages entre inconnus sont limités à **500 caractères**, et un message trop long est **refusé**, pas tronqué en silence.
- Les images et les vidéos sont **réservées aux amis**, contrôle appliqué côté serveur. Un message média doit référencer un fichier que l'expéditeur possède réellement.
- Accepter une invitation lève à la fois le quota de messages et la restriction sur les médias.
- Une invitation refusée peut être renvoyée plus tard. La paire n'est pas bloquée définitivement.

### Médias

```
POST /api/upload   { dataUrl, name }   -> { media: MediaRecord }
GET  /api/media/<mediaId>              -> octets bruts, ou 401 / 403 / 404
```

### Autres

```
GET   /api/users?q=<requête>                     -> { users: PublicUser[] }
PATCH /api/settings  { displayName?, bio?, wallpaper?, accent?, theme?, language?, avatarColor? }
GET   /api/minesweeper/scores                    -> { scores }
POST  /api/minesweeper/scores  { difficulty, seconds, won } -> { score }
GET   /api/minesweeper/leaderboard?difficulty=<d> -> { difficulty, leaderboard }
GET   /api/health                                -> { status, service, uptimeSeconds }
```

## Codes d'erreur

Cinquante codes, regroupés par préfixe. Le client les résout avec `t(code)`.

- `common.error.*`: `auth`, `server`, `network`
- `auth.error.*`: `action`, `badCredentials`, `passwordShort`, `usernameChars`, `usernameLong`, `usernameShort`, `usernameTaken`
- `chat.error.*`: `alreadyFriends`, `empty`, `inviteMissing`, `invitePending`, `inviteRespond`, `inviteSend`, `mediaFriendsOnly`, `mediaMissing`, `mediaType`, `recipient`, `selfInvite`, `selfMessage`, `send`, `strangerLimit`, `tooLong`, `upload`, `userMissing`
- `notes.error.*`: `create`, `delete`, `load`, `missing`, `save`, `tooLong`
- `settings.error.*`: `accent`, `avatarColor`, `displayName`, `language`, `noPrefs`, `readFile`, `save`, `theme`, `wallpaper`
- `upload.error.*`: `invalid`, `missing`, `tooLarge`, `type`
- `minesweeper.error.*`: `difficulty`, `time`
- `files.error.*`: `load`, `upload`

Ajouter un code implique de l'ajouter dans les trois dictionnaires. Aucun mécanisme de repli n'affiche silencieusement une clé brute à un utilisateur.

## Tests

```bash
npm test
```

Vingt quatre tests répartis en trois suites, tous exécutés sur un répertoire de stockage jetable.

- `tests/password.test.ts`: hachage, vérification, sel par utilisateur, entrées malformées, et un test de non régression sur le hachage linéaire d'origine, où `qBss1234` ouvrait un compte dont le mot de passe était `pass1234`.
- `tests/concurrency.test.ts`: les compétitions d'écriture. Cinquante inscriptions simultanées sur un même identifiant donnent exactement un compte. Cinquante envois simultanés entre inconnus donnent exactement trois messages. Vingt cinq invitations simultanées donnent exactement une ligne. Plus l'annulation de transaction et la reprise de la file.
- `tests/chatRules.test.ts`: le quota par expéditeur, le refus des messages trop longs, les privilèges média, la validation des imports et l'autorisation des invitations.

Les tests positionnent `DATA_DIR` sur un répertoire temporaire avant tout import, ils ne touchent donc jamais votre stockage réel.

## Partager votre serveur de développement via un tunnel

```bash
npm run dev
ngrok http 8080
```

Partagez l'URL HTTPS affichée par ngrok. C'est tout.

### Si vous utilisiez une version antérieure du projet et que cela ne fonctionnait pas

Quatre problèmes distincts empêchaient l'accès via un tunnel. Les quatre sont corrigés, et il est utile de les connaître pour les reconnaître ailleurs.

1. **Next refusait ses propres ressources.** En développement, Next bloque les requêtes d'origine différente pour tout ce qui se trouve sous `/_next`. Les visiteurs recevaient le HTML mais ni CSS ni JavaScript : la page arrivait sans style et ne devenait jamais interactive. Les domaines de tunnel courants sont désormais acceptés dans `next.config.ts`, et `DEV_ORIGINS` couvre le reste.
2. **Le socket pointait vers la machine du visiteur.** Le client se connectait à `http://localhost:3003` écrit en dur, ce qui, dans le navigateur d'un visiteur distant, désigne _son_ ordinateur. Le chat était mort pour tout le monde sauf l'hôte. Le client se connecte maintenant à l'origine dont il provient.
3. **CORS rejetait le tunnel.** La passerelle n'autorisait que `http://localhost:8080`. L'origine unique supprime le problème plutôt que d'exiger une liste maintenue à jour avec l'URL.
4. **Deux ports, un seul tunnel.** La passerelle tournait dans un processus séparé sur le port 3003, et `ngrok http 8080` ne peut pas l'exposer. Tout est sur un seul port désormais.

### Toujours inaccessible

- Adresse d'écoute : `HOST` doit valoir `0.0.0.0`, ce qui est la valeur par défaut. `127.0.0.1` ne sera pas joignable depuis un tunnel.
- ngrok en formule gratuite affiche une page d'avertissement à la première visite. Les visiteurs la traversent une fois. Une formule payante ou un domaine personnalisé la supprime.
- Un domaine de tunnel personnalisé qui n'est ni ngrok ni Cloudflare doit être déclaré : `DEV_ORIGINS=montunnel.example.com npm run dev`.
- Pour une démonstration destinée à rester en ligne, préférez `npm run build && npm run start`. Le serveur de production n'applique aucune protection d'origine sur les ressources et se révèle nettement plus rapide.

## Déploiement sur Railway

`railway.json` est versionné et déjà configuré.

```bash
railway init
railway up
```

### À lire avant le premier déploiement

**Le système de fichiers d'un conteneur est éphémère.** Chaque compte, note, message et fichier importé vit dans `DATA_DIR`. Sans volume persistant, un redéploiement ou un redémarrage efface tout.

1. Créez un volume dans le tableau de bord Railway et montez le sur `/data`.
2. Définissez `DATA_DIR=/data` dans les variables du service.

Sans cette étape, l'application fonctionnera parfaitement jusqu'au premier redéploiement, puis accueillera tout le monde avec un écran de connexion vide.

### Deux réglages de build qui ne sont pas facultatifs

Les deux existent parce que le build échoue sans eux, et les erreurs produites ne sont pas explicites.

**`.dockerignore` garde `node_modules` hors de l'image.** Le Dockerfile généré se termine par `COPY . /app/.` : sans fichier d'exclusion, le `node_modules` construit sur votre machine est copié dans le conteneur. `npm ci` tente ensuite de le supprimer avant de réinstaller, et sur le système de fichiers du constructeur cette suppression échoue :

```
npm error EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

Un `.dockerignore` et un `.railwayignore` équivalent sont versionnés. Ils réduisent aussi l'envoi d'environ 730 Mo à près de 1 Mo, ce qui représente l'essentiel du temps de build.

**Le build installe explicitement les devDependencies.** Railway définit `NODE_ENV=production`, et npm ignore alors les devDependencies. TypeScript, Tailwind et les paquets de types s'y trouvent tous, donc `next build` échoue juste après pour modules manquants. C'est la raison pour laquelle la commande de build est `npm ci --include=dev && npm run build` et non un simple `npm ci`. Si vous voyez `npm warn config production` dans le journal de build, c'est ce réglage qui compte.

### Ce que fait la configuration

- Construit avec `npm ci && npm run build`, le fichier de verrouillage fait donc autorité.
- Démarre avec `npm run start`, qui lit automatiquement le `PORT` injecté par Railway.
- Sonde `/api/health`, qui lit réellement le stockage : un déploiement dont le répertoire de données n'est pas accessible en écriture échoue au contrôle au lieu de servir une application cassée.
- Redémarre en cas d'échec, jusqu'à dix fois.
- **Fixe `numReplicas` à 1.** Ce n'est pas une décision de coût. Le verrou d'écriture du moteur de stockage est propre au processus, et deux réplicas partageant un volume se corrompraient mutuellement.

### Variables à définir

- `DATA_DIR=/data` (obligatoire, voir ci dessus)
- `NODE_ENV=production` est déjà positionné par le script de démarrage
- `PORT` est injecté par Railway. Ne le définissez pas vous même.

La même structure fonctionne sur Render, Fly et tout hébergeur de conteneurs : un port, un réplica, un volume monté.

## Raccourcis clavier

Le modificateur est Commande sur macOS et Contrôle ailleurs.

- `Mod+K`: ouvrir ou fermer Spotlight
- `Mod+N`: nouvelle fenêtre de l'application active
- `Mod+W`: fermer la fenêtre active
- `Mod+M`: réduire la fenêtre active
- `Mod+Entrée`: agrandir ou restaurer la fenêtre active
- `Mod+Tab`: passer à la fenêtre suivante
- `Mod+Maj+Tab`: passer à la fenêtre précédente
- `Échap`: fermer Spotlight, le centre de contrôle ou le centre de notifications

Les fenêtres s'accrochent aussi en les glissant vers un bord ou un coin : moitiés gauche et droite, haut pour agrandir, et quatre quarts.

## Budgets de performance

Ce sont les cibles visées par le code.

- **Déplacement de fenêtre : moins de 4 ms de script par image**, sur un budget de 16,7 ms. Le déplacement écrit une transformation `translate3d` directement sur l'élément à l'intérieur d'un `requestAnimationFrame`, et n'écrit dans le store qu'une seule fois, au relâchement. Aucun rendu React pendant que le pointeur bouge.
- **Une seule minuterie pour tout le shell.** `useClock(granularityMs)` partage un unique intervalle et ne redessine un composant que lorsque la valeur affichée change réellement.
- **Un seul écouteur de redimensionnement** pour tout le shell, via `useViewport()`.
- **Les médias ne sont jamais intégrés.** Les octets sont diffusés depuis `/api/media/<id>` avec un en tête de cache immuable de longue durée.
- **Le démarrage joue une fois par onglet**, pas à chaque rafraîchissement.

## Dépannage

**Le port 8080 est déjà utilisé.** Un processus tourne encore. `lsof -nP -iTCP:8080 -sTCP:LISTEN` pour le trouver, ou démarrez sur un autre port avec `PORT=3000 npm run dev`.

**« Another next dev server is already running » alors que rien n'écoute.** Un serveur de développement arrêté brutalement laisse un verrou dans `.next/dev`. Supprimez ce répertoire et relancez :

```bash
rm -rf .next/dev && npm run dev
```

**Le chat affiche tout le monde hors ligne et les messages n'arrivent pas en direct.** Le socket n'est pas connecté. Ouvrez la console du navigateur : un `unauthorized` répété signifie que le cookie de session n'atteint pas le handshake, ce qui indique en général que vous êtes déconnecté. Reconnectez vous.

**Tout fonctionnait, puis un redéploiement a vidé l'application.** Il vous manque le volume persistant. Voir **Déploiement sur Railway**.

**Le build échoue sur une erreur de typage.** C'est voulu. `ignoreBuildErrors` est désactivé et le reste. Lancez `npm run typecheck` pour la liste complète.

**Les imports sont refusés.** Seuls PNG, JPEG, GIF, WebP, MP4 et WebM sont acceptés, jusqu'à 4 Mo mesurés après décodage.

**Un message ne part pas.** Vérifiez `strangerRemaining` dans la réponse de `/api/chat/messages`. Les non amis disposent de trois messages chacun, et de 500 caractères par message.

**Le son ne produit rien.** L'audio de l'interface est coupé par défaut. Activez le dans le centre de contrôle. Les navigateurs exigent aussi une action de l'utilisateur avant de laisser démarrer un son.

## Conventions

Elles sont appliquées, pas seulement souhaitées. Sinon le build échoue.

- **Aucune suppression.** Ni `eslint-disable`, ni `@ts-ignore`, ni `@ts-nocheck` dans `src/`. Le compte actuel est zéro et il le reste.
- **Aucun code mort.** Aucun fichier, export, dépendance ou dossier inutilisé.
- **La vérification de types fait partie du build.** `ignoreBuildErrors` est désactivé.
- **Le mode strict de React est actif.**
- **Aucun tiret dans les identifiants.** camelCase pour les valeurs et les fonctions, PascalCase pour les composants et les types, SCREAMING_SNAKE_CASE pour les constantes.
- **Les commentaires expliquent pourquoi, pas quoi.** Là où un défaut a été corrigé, le commentaire consigne le mode de défaillance afin que personne ne le réintroduise.

Avant d'ouvrir une pull request :

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Les quatre doivent passer sans erreur.
