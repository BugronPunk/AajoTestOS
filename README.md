# AajoTestOS

A web based operating system. Calm, minimal, and functionally close to what you expect from Windows or macOS, running entirely in a browser tab.

Read this in another language: [Français](./README.fr.md) · [中文](./README.zh.md)

## Contents

1. What this is
2. Quick start
3. Requirements
4. Architecture
5. The storage engine
6. Security model
7. Realtime gateway
8. Internationalization
9. Scripts
10. Environment variables
11. API reference
12. Error codes
13. Testing
14. Sharing your dev server through a tunnel
15. Deploying to Railway
16. Keyboard shortcuts
17. Performance budgets
18. Troubleshooting
19. Conventions

## What this is

AajoTestOS presents a full desktop metaphor in the browser: a boot sequence, a login screen, a lock screen, a menu bar, a dock, a control centre, Spotlight search, a notification centre, and draggable, resizable, snappable windows.

Fifteen applications ship with it:

- **Notes**, autosaving, pinnable, colour tagged
- **Minesweeper**, three difficulties with personal scores and a shared leaderboard
- **Chat**, the social core: stranger messaging with a budget, friend invitations, media sharing between friends, presence and typing indicators
- **Files** and **Photos**, backed by real uploaded media
- **Settings**, **Terminal**, **Calculator**, **Music**, **Calendar**, **Clock**, **Weather**, **Monitor**, **Paint**, **Snake**

Everything persists to a JSON file store on disk. There is no external database, no cloud service, and no account with any third party.

## Quick start

```bash
git clone <your remote> aajotestos
cd aajotestos
npm install
npm run dev
```

Open http://localhost:8080 and create an account. That is the whole setup: no configuration file, no database to provision, no seed step.

The first signup creates `data/users.json` and the rest of the store alongside it.

## Requirements

- **Node.js 20 or newer.** Node 22 is what the project is developed against.
- **npm.** Any recent version. A `package-lock.json` is committed, so `npm ci` is reproducible.
- Roughly 550 MB of disk for `node_modules`.

No global tooling is needed. No Docker, no database server, no Redis.

## Architecture

The project follows a strict Model, View, Controller separation.

```
server.mjs                  Single origin entry point: Next plus the realtime gateway
server/
  chatGateway.mjs           Socket.IO wiring and handshake authentication

src/
  app/
    api/                    CONTROLLERS. One route file per resource.
      auth/                 Sign up, sign in, sign out, current session
      chat/                 Conversations, messages, send, friends, invites
      minesweeper/          Scores and leaderboard
      media/[id]/           Authorised media byte streaming
      notes/  settings/  upload/  users/  health/
    layout.tsx  page.tsx  globals.css

  lib/
    store/engine.ts         The storage engine. Transactions, collections, media.
    models/                 MODELS. All business rules live here.
      user.ts  session.ts  note.ts  message.ts  friendship.ts  score.ts  media.ts
    auth/
      password.ts           scrypt hashing and verification
      session.ts            Session cookie helpers
    api/
      handlers.ts           withAuth wrapper, ok and fail responses
      client.ts             Browser side fetch wrapper
    i18n/                   Dictionaries and the translate context
    os/                     Shell primitives: store, viewport, clock, audio, theme

  components/
    os/                     VIEWS for the shell: Desktop, Window, Dock, MenuBar, ...
    apps/<AppName>/         VIEWS for each application
    ui/                     Fourteen shadcn primitives, all in use

tests/                      Vitest suites
```

### The rules that keep it honest

- **Models never import from `components/`.** Business rules do not know a UI exists.
- **Controllers never contain business rules.** A route file parses input, calls one model function, and shapes the response.
- **Views never talk to the store.** They call the API through `lib/api/client.ts`.
- **The server never emits a display string.** Every failure is a translation key. See **Error codes**.

Chat is the reference example of the split, because it is the most complex feature:

- `components/apps/Chat/types.ts` shapes the API returns
- `components/apps/Chat/useChatController.ts` holds all state, fetching and socket wiring
- `components/apps/Chat/ChatApp.tsx` draws, and does nothing else

## The storage engine

`src/lib/store/engine.ts` is a small transactional JSON store. It exists because the brief calls for file based storage with no database.

### Collections

Each collection is its own file under `DATA_DIR`:

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

Splitting them matters. When everything lived in one file, recording a Minesweeper score rewrote every message and every user account on disk.

### Transactions

Reading, deciding, and then writing in separate steps is a race. Two requests can both pass the same check before either one writes. `transaction` closes that window by handing you the rows inside the write lock:

```ts
return transaction(["users"], ({ users }) => {
  if (users.some((u) => u.username === name)) {
    return { error: "auth.error.usernameTaken" };
  }
  users.push(newUser);
  return { user: newUser };
});
```

Properties you can rely on:

- Only the collections you name are loaded, and only they are written back.
- Throwing from the body aborts the write. Disk is left untouched.
- Commits use a write to a uniquely named temporary file followed by an atomic rename, so a concurrent reader never sees a partial file.
- One rejected transaction does not poison the queue for the next one.

### Media

Uploads are decoded, validated against a MIME allowlist, size checked on real decoded bytes, and written to disk. Only metadata goes in `media.json`. Message rows carry a `mediaId`, never base64.

Accepted types: PNG, JPEG, GIF, WebP, MP4, WebM. Maximum 4 MB per file.

### Scaling limits, stated plainly

The write lock is per process. **Run exactly one instance.** Two replicas pointed at the same directory will corrupt each other. If you ever need to scale horizontally, the storage interface is deliberately narrow enough to swap for SQLite without touching a single model function.

## Security model

### Passwords

Hashed with **scrypt**, N=16384, r=8, p=1, 64 byte derived key, with an independent 16 byte random salt per user. Stored as `scrypt$N$r$p$salt$hash`.

Verification is constant time via `timingSafeEqual`. A sign in attempt for a username that does not exist still performs an equivalent scrypt call, so response latency does not disclose whether an account exists.

Minimum password length is 8 characters.

### Sessions

Tokens are 256 bits from `crypto.randomBytes`, base64url encoded. The cookie is `httpOnly`, `sameSite=lax`, `path=/`, and `secure` whenever `NODE_ENV` is `production`. Sessions live 7 days, and expired rows are swept on every sign in rather than by a timer.

### Realtime identity

The browser never states who it is. The gateway reads the session cookie during the handshake and rejects the connection outright if it does not resolve to a live session. See **Realtime gateway**.

### Media authorisation

`GET /api/media/[id]` serves bytes only to the uploader, or to somebody who was actually sent that asset in a message. Guessing an id returns 403. Anonymous requests return 401.

### Input validation

Wallpaper, accent, theme, locale and avatar colour are checked against allowlists before they are stored, because they are rendered back into style attributes. Minesweeper times are range checked. Note bodies are length capped.

### Known good practice not yet implemented

- There is no rate limiting on sign in attempts. Add one before exposing this to the open internet.
- There is no CSRF token. The `sameSite=lax` cookie is the only cross site protection on state changing routes.

## Realtime gateway

Socket.IO is attached to the **same HTTP server as the application**, at `/socket.io`, on the same port.

This is deliberate and it is the single most important deployment decision in the project:

- One tunnel or one hosting port exposes the entire system.
- The session cookie is same site, so the handshake carries it with no CORS configuration.
- There is no second process to run, supervise, or forget to start.

### Events

Client to server:

- `message:new` `{ toUserId, messageId }`
- `invite:new` `{ toUserId }`
- `invite:responded` `{ toUserId }`
- `typing` `{ toUserId, isTyping }`

Server to client:

- `message:incoming` `{ fromUserId, messageId }`
- `invite:incoming` `{ fromUserId }`
- `invite:resolved` `{ fromUserId }`
- `typing` `{ fromUserId, isTyping }`
- `presence` `{ userId, online }`
- `presence:snapshot` `{ userIds }` sent once on connect

The sender identity on every outbound event is taken from the verified session, never from the payload.

## Internationalization

Three locales ship complete: **English**, **French**, **Chinese**. 297 keys each, with exact parity enforced.

- Dictionaries live in `src/lib/i18n/dictionaries.ts`.
- `useI18n()` returns `t`, `locale`, and `bcp47`.
- Use `bcp47` for every `Intl` call. Never hardcode a locale tag in a component.
- The server returns translation keys, never sentences, so an error reads correctly in whichever language the user chose.

To verify parity after editing:

```bash
npm run typecheck && npm run lint
```

To add a locale: extend the `Locale` union, add the dictionary, add the BCP 47 tag in `src/lib/i18n/context.tsx`, and add the option in Settings.

## Scripts

- `npm run dev`: development server with fast refresh on port 8080
- `npm run build`: production build, fails on any type error
- `npm run start`: production server
- `npm run lint`: ESLint across the project
- `npm run typecheck`: TypeScript with no emit
- `npm test`: Vitest, single run
- `npm run test:watch`: Vitest in watch mode

There is no separate command for the realtime gateway. It starts with the app.

## Environment variables

Every one is optional. The defaults give you a complete working system.

- `PORT`: port for pages, API and the socket. Default `8080`. Hosting platforms inject this.
- `HOST`: interface to bind. Default `0.0.0.0`. Use `127.0.0.1` to restrict to this machine.
- `DATA_DIR`: where the store and media live. Default `./data`. **Point this at a mounted volume in production.**
- `DEV_ORIGINS`: extra comma separated hostnames allowed to reach the dev server cross origin. Common tunnel domains are already trusted. No effect on a production build.
- `NEXT_PUBLIC_SOCKET_URL`: only for the unusual case of running the gateway on a different host. Leave unset so the browser connects back to the origin it loaded from.

Copy `.env.example` to `.env` if you want to change any of them.

## API reference

Every route returns JSON. Every failure has the shape `{ "error": "<translation key>" }`. Authenticated routes return `401` with `common.error.auth` when no valid session cookie is present.

### Authentication

```
POST /api/auth
  { action: "signup" | "login", username: string, password: string }
  -> { user: PublicUser, locale: "en" | "fr" | "zh" }   sets the session cookie

GET  /api/auth
  -> { user: PublicUser | null, media: MediaRecord[], locale }

POST /api/auth/logout
  -> { ok: true }                                       clears the session cookie
```

### Notes

```
GET    /api/notes                       -> { notes: NoteRecord[] }
POST   /api/notes    { title, content, color }          -> { note }
PATCH  /api/notes    { id, title?, content?, color?, pinned? } -> { note }
DELETE /api/notes?id=<noteId>           -> { ok: true }
```

Ownership is part of the match on update and delete, so one account can never touch another account's note by guessing an id.

### Chat

```
GET   /api/chat/conversations   -> { conversations: [{ peer, lastMessage, unread, isFriend }] }
PATCH /api/chat/conversations   -> { ok: true, marked: number }     marks everything read

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

### The chat economy

This is the part with real rules, so it is worth stating precisely.

- Two accounts who are not friends may send **3 messages each**. The budget is counted **per sender**, not per conversation, so a reply is always possible. Whoever runs out can still be answered.
- Stranger messages are capped at **500 characters**, and an over long message is **rejected**, not silently truncated.
- Images and video are **friends only**, enforced on the server. A media message must reference an asset the sender actually owns.
- Accepting an invitation lifts both the message budget and the media restriction.
- A rejected invitation may be sent again later. The pair is not permanently blocked.

### Media

```
POST /api/upload   { dataUrl, name }   -> { media: MediaRecord }
GET  /api/media/<mediaId>              -> raw bytes, or 401 / 403 / 404
```

### Other

```
GET   /api/users?q=<query>                       -> { users: PublicUser[] }
PATCH /api/settings  { displayName?, bio?, wallpaper?, accent?, theme?, language?, avatarColor? }
GET   /api/minesweeper/scores                    -> { scores }
POST  /api/minesweeper/scores  { difficulty, seconds, won } -> { score }
GET   /api/minesweeper/leaderboard?difficulty=<d> -> { difficulty, leaderboard }
GET   /api/health                                -> { status, service, uptimeSeconds }
```

## Error codes

Fifty codes, grouped by prefix. The client resolves them with `t(code)`.

- `common.error.*`: `auth`, `server`, `network`
- `auth.error.*`: `action`, `badCredentials`, `passwordShort`, `usernameChars`, `usernameLong`, `usernameShort`, `usernameTaken`
- `chat.error.*`: `alreadyFriends`, `empty`, `inviteMissing`, `invitePending`, `inviteRespond`, `inviteSend`, `mediaFriendsOnly`, `mediaMissing`, `mediaType`, `recipient`, `selfInvite`, `selfMessage`, `send`, `strangerLimit`, `tooLong`, `upload`, `userMissing`
- `notes.error.*`: `create`, `delete`, `load`, `missing`, `save`, `tooLong`
- `settings.error.*`: `accent`, `avatarColor`, `displayName`, `language`, `noPrefs`, `readFile`, `save`, `theme`, `wallpaper`
- `upload.error.*`: `invalid`, `missing`, `tooLarge`, `type`
- `minesweeper.error.*`: `difficulty`, `time`
- `files.error.*`: `load`, `upload`

Adding a code means adding it to all three dictionaries. There is no fallback that silently prints a raw key to a user.

## Testing

```bash
npm test
```

Twenty four tests across three suites, all against a throwaway store directory.

- `tests/password.test.ts`: hashing, verification, per user salting, malformed input, and a regression test for the original linear hash where `qBss1234` opened an account whose password was `pass1234`.
- `tests/concurrency.test.ts`: the write races. Fifty concurrent signups for one username yield exactly one account. Fifty concurrent stranger sends yield exactly three messages. Twenty five concurrent invitations yield exactly one row. Plus transaction rollback and queue recovery.
- `tests/chatRules.test.ts`: the per sender budget, over long rejection, media privileges, upload validation, and invitation authorisation.

Tests set `DATA_DIR` to a temporary directory before importing anything, so they never touch your real store.

## Sharing your dev server through a tunnel

```bash
npm run dev
ngrok http 8080
```

Share the HTTPS URL ngrok prints. That is all.

### If you used an older revision of this project and it did not work

Four separate problems used to break tunnelled access. All four are fixed, and it is worth knowing what they were so you recognise them elsewhere.

1. **Next refused its own assets.** In development Next blocks cross origin requests for everything under `/_next`. Visitors got the HTML but no CSS and no JavaScript, so the page arrived unstyled and never became interactive. Common tunnel domains are now trusted in `next.config.ts`, and `DEV_ORIGINS` covers anything else.
2. **The socket pointed at the visitor's own machine.** The client connected to a hardcoded `http://localhost:3003`, which on a remote visitor's browser means _their_ computer. Chat was dead for everyone except the host. The client now connects to the origin it loaded from.
3. **CORS rejected the tunnel.** The gateway allowlisted `http://localhost:8080` only. Same origin removes the problem entirely rather than requiring the list to be kept in step with the URL.
4. **Two ports, one tunnel.** The gateway ran as a separate process on 3003, and `ngrok http 8080` cannot expose it. Everything is on one port now.

### Still not reachable

- Bind address: `HOST` must be `0.0.0.0`, which is the default. `127.0.0.1` will not be reachable from a tunnel.
- ngrok on a free plan shows an interstitial warning page on first visit. Visitors click through once. A paid plan or a custom domain removes it.
- A custom tunnel domain that is not ngrok or Cloudflare needs adding: `DEV_ORIGINS=mytunnel.example.com npm run dev`.
- For a demo you intend to leave running, prefer `npm run build && npm run start`. The production server has no cross origin asset guard at all and is considerably faster.

## Deploying to Railway

`railway.json` is committed and configured.

```bash
railway init
railway up
```

### Read this before your first deploy

**Container filesystems are ephemeral.** Every account, note, message and uploaded file lives in `DATA_DIR`. Without a persistent volume, a redeploy or a restart wipes all of it.

1. Create a volume in the Railway dashboard and mount it at `/data`.
2. Set `DATA_DIR=/data` in the service variables.

Skip this and the app will work perfectly until the first redeploy, then greet everyone with an empty login screen.

### Two build settings that are not optional

Both of these exist because the build fails without them, and the failures are not obvious from the error text.

**`.dockerignore` keeps `node_modules` out of the image.** The generated Dockerfile ends with `COPY . /app/.`, so without an ignore file your locally built `node_modules` is copied into the container. `npm ci` then tries to delete it before reinstalling, and on the builder's overlay filesystem that delete fails:

```
npm error EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

A `.dockerignore` and a matching `.railwayignore` are committed. They also shrink the upload from roughly 730 MB to about 1 MB, which is most of the build time.

**The build installs devDependencies explicitly.** Railway sets `NODE_ENV=production`, and npm then skips devDependencies. TypeScript, Tailwind and the type packages all live there, so `next build` fails immediately afterwards with missing modules. That is why the build command is `npm ci --include=dev && npm run build` rather than plain `npm ci`. If you see `npm warn config production` in your build log, this is the setting that matters.

### What the configuration does

- Builds with `npm ci && npm run build`, so the lockfile is authoritative.
- Starts with `npm run start`, which reads Railway's injected `PORT` automatically.
- Health checks `/api/health`, which actually reads the store, so a deploy with an unwritable data directory fails the check rather than serving a broken app.
- Restarts on failure, up to ten times.
- **Pins `numReplicas` to 1.** This is not a cost decision. The storage engine's write lock is per process, and two replicas sharing a volume would corrupt each other.

### Variables to set

- `DATA_DIR=/data` (required, as above)
- `NODE_ENV=production` is set by the start script already
- `PORT` is injected by Railway. Do not set it yourself.

The same shape works on Render, Fly and any container host: one port, one replica, one mounted volume.

## Keyboard shortcuts

Modifier is Command on macOS and Control elsewhere.

- `Mod+K`: open or close Spotlight
- `Mod+N`: new window of the focused application
- `Mod+W`: close the focused window
- `Mod+M`: minimise the focused window
- `Mod+Enter`: maximise or restore the focused window
- `Mod+Tab`: cycle forward through open windows
- `Mod+Shift+Tab`: cycle backward
- `Escape`: dismiss Spotlight, the control centre, or the notification centre

Windows also snap by dragging to a screen edge or corner: left and right halves, top for maximise, and four quarters.

## Performance budgets

These are the targets the code is written against.

- **Window drag: under 4 ms of scripting per frame**, against a 16.7 ms budget. Dragging writes a `translate3d` transform directly to the element inside a `requestAnimationFrame`, and commits to the store exactly once on release. It does not render React again while the pointer moves.
- **One timer for the whole shell.** `useClock(granularityMs)` shares a single interval and only renders a component again when the value it displays actually changes.
- **One resize listener** for the whole shell, via `useViewport()`.
- **Media is never inlined.** Bytes stream from `/api/media/<id>` with a long lived immutable cache header.
- **Boot plays once per tab**, not on every refresh.

## Troubleshooting

**Port 8080 already in use.** Something is still running. `lsof -nP -iTCP:8080 -sTCP:LISTEN` to find it, or start on another port with `PORT=3000 npm run dev`.

**"Another next dev server is already running" but nothing is listening.** A dev server that was killed abruptly leaves a lock behind in `.next/dev`. Delete that directory and start again:

```bash
rm -rf .next/dev && npm run dev
```

**Chat shows everyone offline and messages do not arrive live.** The socket is not connected. Open the browser console: a repeated `unauthorized` means the session cookie is not reaching the handshake, which usually means you are signed out. Sign in again.

**Everything works but a redeploy emptied the app.** You are missing the persistent volume. See **Deploying to Railway**.

**The build fails on a type error.** That is intentional. `ignoreBuildErrors` is off and stays off. Run `npm run typecheck` for the full list.

**Uploads are rejected.** Only PNG, JPEG, GIF, WebP, MP4 and WebM are accepted, up to 4 MB measured after decoding.

**A message will not send.** Check `strangerRemaining` in the response from `/api/chat/messages`. Non friends get three each, and 500 characters per message.

**Sound does nothing.** Interface audio is muted by default. Turn it on in the control centre. Browsers also require a user gesture before any audio can start.

## Conventions

These are enforced, not aspirational. The build fails otherwise.

- **No suppressions.** No `eslint-disable`, no `@ts-ignore`, no `@ts-nocheck` anywhere in `src/`. The current count is zero and it stays zero.
- **No dead code.** No unused files, exports, dependencies or folders.
- **Type checking is part of the build.** `ignoreBuildErrors` is off.
- **React Strict Mode is on.**
- **No hyphens in identifiers.** camelCase for values and functions, PascalCase for components and types, SCREAMING_SNAKE_CASE for constants.
- **Comments explain why, not what.** Where a defect was fixed, the comment records the failure mode so nobody reintroduces it.

Before opening a pull request:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

All four must pass clean.
