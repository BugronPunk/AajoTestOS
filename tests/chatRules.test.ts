import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTemporaryStore } from "./helpers";

const store = createTemporaryStore();

const { ensureStore, read } = await import("@/lib/store/engine");
const { createUser } = await import("@/lib/models/user");
const { createInvite, respondToInvite } =
  await import("@/lib/models/friendship");
const {
  sendMessage,
  sendPermission,
  STRANGER_MAX_MESSAGES,
  STRANGER_MAX_CHARS,
} = await import("@/lib/models/message");
const { decodeDataUrl, MAX_MEDIA_BYTES } = await import("@/lib/models/media");

let alice = "";
let bob = "";

beforeAll(async () => {
  await ensureStore();
  alice = (await createUser("alice", "password123")).user!.id;
  bob = (await createUser("bob", "password123")).user!.id;
});

afterAll(() => store.cleanup());

describe("stranger budget", () => {
  it("is counted per sender, so a reply is always possible", async () => {
    // Alice spends her whole budget.
    for (let i = 0; i < STRANGER_MAX_MESSAGES; i++) {
      const sent = await sendMessage(alice, bob, `hello ${i}`, "text", null);
      expect(sent.message).toBeTruthy();
    }
    expect(
      (await sendMessage(alice, bob, "one more", "text", null)).error,
    ).toBe("chat.error.strangerLimit");

    // Bob must still be able to answer. Counting the whole conversation used to
    // silence him completely once Alice had sent three.
    const reply = await sendMessage(bob, alice, "hi back", "text", null);
    expect(reply.message).toBeTruthy();

    const permission = await sendPermission(bob, alice);
    expect(permission.strangerRemaining).toBe(STRANGER_MAX_MESSAGES - 1);
  });

  it("rejects an over long message rather than truncating it", async () => {
    const carol = (await createUser("carol", "password123")).user!.id;
    const tooLong = "x".repeat(STRANGER_MAX_CHARS + 1);

    const result = await sendMessage(carol, bob, tooLong, "text", null);
    expect(result.error).toBe("chat.error.tooLong");

    const messages = await read("messages");
    expect(messages.some((m) => m.fromUserId === carol)).toBe(false);
  });

  it("rejects an empty message", async () => {
    const dave = (await createUser("dave", "password123")).user!.id;
    expect((await sendMessage(dave, bob, "   ", "text", null)).error).toBe(
      "chat.error.empty",
    );
  });
});

describe("media privileges", () => {
  it("blocks media between strangers", async () => {
    const erin = (await createUser("erin", "password123")).user!.id;
    const result = await sendMessage(erin, bob, "", "image", "med_whatever");
    expect(result.error).toBe("chat.error.mediaFriendsOnly");
  });

  it("blocks media that references an asset the sender does not own", async () => {
    const frank = (await createUser("frank", "password123")).user!.id;
    const invite = await createInvite(frank, bob);
    await respondToInvite(invite.invite!.id, bob, true);

    // Friends now, but the attachment does not exist.
    const result = await sendMessage(frank, bob, "", "image", "med_missing");
    expect(result.error).toBe("chat.error.mediaMissing");
  });

  it("lifts the text budget once an invitation is accepted", async () => {
    const grace = (await createUser("grace", "password123")).user!.id;
    const invite = await createInvite(grace, bob);
    await respondToInvite(invite.invite!.id, bob, true);

    for (let i = 0; i < STRANGER_MAX_MESSAGES + 5; i++) {
      expect(
        (await sendMessage(grace, bob, `friend ${i}`, "text", null)).message,
      ).toBeTruthy();
    }
    expect((await sendPermission(grace, bob)).isFriend).toBe(true);
  });
});

describe("upload validation", () => {
  it("rejects anything that is not an allowlisted media type", () => {
    expect(decodeDataUrl("data:text/html;base64,PHNjcmlwdD4=").error).toBe(
      "upload.error.type",
    );
    // The old route accepted any string starting with "data:".
    expect(decodeDataUrl("data:not-a-url").error).toBe("upload.error.invalid");
    expect(decodeDataUrl("https://example.com/x.png").error).toBe(
      "upload.error.invalid",
    );
  });

  it("measures the limit against decoded bytes", () => {
    const oversized = Buffer.alloc(MAX_MEDIA_BYTES + 1024).toString("base64");
    expect(decodeDataUrl(`data:image/png;base64,${oversized}`).error).toBe(
      "upload.error.tooLarge",
    );
  });

  it("accepts a small PNG", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
    const result = decodeDataUrl(`data:image/png;base64,${bytes}`);
    expect(result.error).toBeUndefined();
    expect(result.upload?.mime).toBe("image/png");
    expect(result.upload?.bytes.length).toBe(4);
  });
});

describe("invitations", () => {
  it("refuses a self invitation", async () => {
    expect((await createInvite(alice, alice)).error).toBe(
      "chat.error.selfInvite",
    );
  });

  it("refuses an invitation to an account that does not exist", async () => {
    expect((await createInvite(alice, "usr_missing")).error).toBe(
      "chat.error.userMissing",
    );
  });

  it("only lets the recipient answer", async () => {
    const heidi = (await createUser("heidi", "password123")).user!.id;
    const invite = await createInvite(heidi, alice);
    // Bob is neither party.
    expect((await respondToInvite(invite.invite!.id, bob, true)).error).toBe(
      "chat.error.inviteMissing",
    );
    expect((await respondToInvite(invite.invite!.id, alice, true)).ok).toBe(
      true,
    );
  });
});
