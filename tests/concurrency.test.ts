import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTemporaryStore } from "./helpers";

const store = createTemporaryStore();

// Imported after DATA_DIR is set, so the store resolves to the temp directory.
const { read, transaction, ensureStore, newToken, nextId } =
  await import("@/lib/store/engine");
const { createUser } = await import("@/lib/models/user");
const { sendMessage, STRANGER_MAX_MESSAGES } =
  await import("@/lib/models/message");
const { createInvite } = await import("@/lib/models/friendship");

beforeAll(async () => {
  await ensureStore();
});

afterAll(() => store.cleanup());

/**
 * These are the three read then write races the original models carried. Each
 * one checked a condition with one read and wrote in a separate step, so two
 * requests arriving together could both pass the check before either wrote.
 */
describe("write races", () => {
  it("lets exactly one of 50 concurrent signups claim a username", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => createUser("contested", "password123")),
    );
    const created = results.filter((r) => r.user);
    expect(created).toHaveLength(1);

    const users = await read("users");
    expect(users.filter((u) => u.username === "contested")).toHaveLength(1);
  });

  it("holds the stranger message cap under 50 concurrent sends", async () => {
    const sender = await createUser("sender_one", "password123");
    const recipient = await createUser("recipient_one", "password123");
    const from = sender.user!.id;
    const to = recipient.user!.id;

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        sendMessage(from, to, `burst ${i}`, "text", null),
      ),
    );
    expect(results.filter((r) => r.message)).toHaveLength(
      STRANGER_MAX_MESSAGES,
    );

    const messages = await read("messages");
    expect(
      messages.filter((m) => m.fromUserId === from && m.toUserId === to),
    ).toHaveLength(STRANGER_MAX_MESSAGES);
  });

  it("creates a single invitation from 25 concurrent requests", async () => {
    const a = await createUser("inviter_one", "password123");
    const b = await createUser("invitee_one", "password123");

    const results = await Promise.all(
      Array.from({ length: 25 }, () => createInvite(a.user!.id, b.user!.id)),
    );
    // Every call returns the same row; what matters is that only one exists.
    expect(results.filter((r) => r.error)).toHaveLength(24);

    const friendships = await read("friendships");
    expect(friendships).toHaveLength(1);
  });
});

describe("transaction semantics", () => {
  it("writes nothing when the body throws", async () => {
    const before = await read("notes");
    await expect(
      transaction(["notes"], ({ notes }) => {
        notes.push({
          id: "note_should_not_persist",
          userId: "u",
          title: "t",
          content: "c",
          color: "#fff",
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        throw new Error("validation failed");
      }),
    ).rejects.toThrow("validation failed");

    expect(await read("notes")).toEqual(before);
  });

  it("keeps serving later transactions after one rejects", async () => {
    await expect(
      transaction(["scores"], () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // A rejected queue used to poison every subsequent write.
    const value = await transaction(["scores"], () => "still working");
    expect(value).toBe("still working");
  });
});

describe("identifier entropy", () => {
  it("produces unique session tokens", () => {
    const tokens = new Set(Array.from({ length: 5000 }, () => newToken()));
    expect(tokens.size).toBe(5000);
  });

  it("produces unique record ids", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => nextId("usr")));
    expect(ids.size).toBe(5000);
  });
});
