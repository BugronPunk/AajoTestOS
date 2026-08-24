import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("accepts the correct password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse batteru", stored)).toBe(false);
  });

  /**
   * Regression test for the original hashing scheme.
   *
   * That scheme accumulated `h = h * 31 + c` and truncated to 32 bits, which is
   * linear: raising one character by 1 and lowering the next by 31 left the
   * digest unchanged. "qBss1234" therefore opened an account whose password was
   * "pass1234", and the same one line transform worked on any password.
   */
  it("is not linear, so the +1/-31 character transform no longer collides", async () => {
    const stored = await hashPassword("pass1234");
    expect(await verifyPassword("qBss1234", stored)).toBe(false);
    expect(await verifyPassword("pass1234", stored)).toBe(true);
  });

  it("salts per user, so identical passwords hash differently", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toEqual(b);
    // Both still verify, because the salt travels with the digest.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  });

  it("rejects malformed stored values instead of throwing", async () => {
    for (const bad of ["", "nonsense", "scrypt$1", "h205d7d402e"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});
