import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * JSON file storage engine.
 *
 * Two properties matter here and the previous version had neither.
 *
 * 1. Atomicity. Callers used to read the database, decide something, then write
 *    in a separate step. Two concurrent requests could both pass the same check
 *    before either wrote, which let duplicate usernames through and let the
 *    stranger message cap be exceeded. `transaction` now hands the caller the
 *    rows inside the write lock, so the decision and the write are indivisible.
 *
 * 2. Write cost. Everything lived in one file, so recording a Minesweeper score
 *    rewrote every message and every user. Collections are now separate files
 *    and a transaction only rewrites what it declares.
 */

// Overridable so tests run against a throwaway directory instead of the real
// store, and so a deployment can put the data somewhere other than the repo.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  wallpaper: string;
  accent: string;
  language: "en" | "fr" | "zh";
  theme: "light" | "dark";
  createdAt: string;
  lastSeenAt: string;
}

export interface MediaRecord {
  id: string;
  userId: string;
  name: string;
  kind: "image" | "video" | "file";
  mime: string;
  size: number;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface NoteRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  kind: "text" | "image" | "video";
  mediaId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface FriendshipRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  respondedAt: string | null;
}

export interface ScoreRecord {
  id: string;
  userId: string;
  difficulty: "beginner" | "intermediate" | "expert";
  seconds: number;
  won: boolean;
  createdAt: string;
}

export interface Database {
  users: UserRecord[];
  sessions: SessionRecord[];
  notes: NoteRecord[];
  messages: MessageRecord[];
  friendships: FriendshipRecord[];
  scores: ScoreRecord[];
  media: MediaRecord[];
}

export type CollectionName = keyof Database;

const COLLECTIONS: CollectionName[] = [
  "users",
  "sessions",
  "notes",
  "messages",
  "friendships",
  "scores",
  "media",
];

function fileFor(name: CollectionName): string {
  return path.join(DATA_DIR, `${name}.json`);
}

async function readFileCollection<K extends CollectionName>(
  name: K,
): Promise<Database[K]> {
  try {
    const raw = await fs.readFile(fileFor(name), "utf8");
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []) as Database[K];
  } catch {
    // Missing file and unparseable file are the same situation to a caller:
    // there are no rows yet.
    return [] as unknown as Database[K];
  }
}

async function writeFileCollection<K extends CollectionName>(
  name: K,
  rows: Database[K],
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = fileFor(name);
  // A unique temp name keeps two writers from sharing a scratch file, and the
  // rename is atomic so a reader never observes a half written file.
  const tmp = `${target}.${randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, target);
}

export async function read<K extends CollectionName>(
  name: K,
): Promise<Database[K]> {
  return readFileCollection(name);
}

// One global queue. Transactions are short and this store is single process by
// design, so a single lock is simpler than ordered per collection locks and
// carries no deadlock risk.
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs `fn` under the write lock with the named collections loaded. Whatever
 * `fn` returns is returned to the caller, and every named collection is written
 * back. Throwing from `fn` aborts the write, so validation failures leave disk
 * untouched.
 */
export function transaction<K extends CollectionName, R>(
  names: readonly K[],
  fn: (db: Pick<Database, K>) => R | Promise<R>,
): Promise<R> {
  const run = writeQueue.then(async () => {
    const db = {} as Pick<Database, K>;
    for (const name of names) {
      db[name] = (await readFileCollection(name)) as Database[K];
    }
    const result = await fn(db);
    for (const name of names) {
      await writeFileCollection(name, db[name]);
    }
    return result;
  });
  // The queue must not stay rejected, or every later transaction inherits the
  // failure. Callers still see their own rejection through `run`.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** 96 bits from a cryptographic source. Collision risk is negligible. */
export function nextId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

/**
 * 256 bits from a cryptographic source. Session tokens previously came from
 * Math.random(), which is seeded predictably and is not safe for anything an
 * attacker should not be able to guess.
 */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const ALLOWED_MEDIA_MIMES = Object.keys(MIME_EXTENSIONS);

export function mediaFilePath(userId: string, mediaId: string, mime: string) {
  const ext = MIME_EXTENSIONS[mime] ?? "bin";
  return path.join(MEDIA_DIR, userId, `${mediaId}.${ext}`);
}

/**
 * Writes decoded bytes to disk. Media used to be stored as base64 inside the
 * user row, which meant every request that touched any user parsed every video
 * anyone had ever uploaded.
 */
export async function writeMedia(
  userId: string,
  mediaId: string,
  mime: string,
  bytes: Buffer,
): Promise<void> {
  const target = mediaFilePath(userId, mediaId, mime);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

export async function readMedia(
  userId: string,
  mediaId: string,
  mime: string,
): Promise<Buffer | null> {
  try {
    return await fs.readFile(mediaFilePath(userId, mediaId, mime));
  } catch {
    return null;
  }
}

/** Creates any collection file that does not exist yet. */
export async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const name of COLLECTIONS) {
    try {
      await fs.access(fileFor(name));
    } catch {
      await writeFileCollection(name, [] as unknown as Database[typeof name]);
    }
  }
}
