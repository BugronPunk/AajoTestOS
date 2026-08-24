import { read, transaction, nextId, type UserRecord } from "@/lib/store/engine";
import { hashPassword, verifyPassword, fakeVerify } from "@/lib/auth/password";

export type { UserRecord };

const AVATAR_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;

export interface PublicUser {
  id: string;
  username: string;
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

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    bio: user.bio,
    wallpaper: user.wallpaper,
    accent: user.accent,
    language: user.language,
    theme: user.theme,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
  };
}

/** Returns an error code the API layer translates. Never a display string. */
export function validateCredentials(
  username: string,
  password: string,
): string | null {
  const clean = username.trim().toLowerCase();
  if (clean.length < USERNAME_MIN) return "auth.error.usernameShort";
  if (clean.length > USERNAME_MAX) return "auth.error.usernameLong";
  if (!/^[a-z0-9_.]+$/.test(clean)) return "auth.error.usernameChars";
  if (password.length < PASSWORD_MIN) return "auth.error.passwordShort";
  return null;
}

export async function createUser(
  username: string,
  password: string,
): Promise<{ user?: UserRecord; error?: string }> {
  const invalid = validateCredentials(username, password);
  if (invalid) return { error: invalid };

  const cleanName = username.trim().toLowerCase();

  // Hashing is deliberately slow, so it runs before the lock is taken. Holding
  // the write lock across it would serialise every signup behind one scrypt.
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  return transaction(["users"], ({ users }) => {
    // The uniqueness check and the insert are inside the same lock, so two
    // concurrent signups can no longer both claim the same name.
    if (users.some((u) => u.username === cleanName)) {
      return { error: "auth.error.usernameTaken" };
    }
    const user: UserRecord = {
      id: nextId("usr"),
      username: cleanName,
      passwordHash,
      displayName: username.trim(),
      avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
      bio: "",
      wallpaper: "aurora",
      accent: "sky",
      language: "en",
      theme: "light",
      createdAt: now,
      lastSeenAt: now,
    };
    users.push(user);
    return { user };
  });
}

export async function authenticate(
  username: string,
  password: string,
): Promise<{ user?: UserRecord; error?: string }> {
  const users = await read("users");
  const cleanName = username.trim().toLowerCase();
  const user = users.find((u) => u.username === cleanName);

  if (!user) {
    // Spend comparable time so response latency does not disclose whether the
    // username exists.
    await fakeVerify();
    return { error: "auth.error.badCredentials" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "auth.error.badCredentials" };
  return { user };
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const users = await read("users");
  return users.find((u) => u.id === userId) ?? null;
}

export async function listUsersExcept(userId: string): Promise<PublicUser[]> {
  const users = await read("users");
  return users.filter((u) => u.id !== userId).map(toPublicUser);
}

export type UserPatch = Partial<
  Pick<
    UserRecord,
    | "displayName"
    | "bio"
    | "wallpaper"
    | "accent"
    | "language"
    | "theme"
    | "avatarColor"
  >
>;

export async function updateUser(
  userId: string,
  patch: UserPatch,
): Promise<UserRecord | null> {
  return transaction(["users"], ({ users }) => {
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    return users[idx];
  });
}
