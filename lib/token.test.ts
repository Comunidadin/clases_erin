import { describe, it, expect, beforeAll } from "vitest";
import { signToken, verifyToken } from "./token";

beforeAll(() => {
  process.env.TOKEN_SECRET = "test-secret";
});

describe("token", () => {
  it("acepta un token válido y recupera el sessionId", () => {
    const now = 1_000_000;
    const { token } = signToken("sess-1", 20, now);
    const res = verifyToken(token, now + 5_000);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload.s).toBe("sess-1");
  });

  it("rechaza un token expirado", () => {
    const now = 1_000_000;
    const { token } = signToken("sess-1", 20, now);
    const res = verifyToken(token, now + 21_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("expirado");
  });

  it("rechaza un token manipulado (firma inválida)", () => {
    const now = 1_000_000;
    const { token } = signToken("sess-1", 20, now);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    const res = verifyToken(tampered, now);
    expect(res.ok).toBe(false);
  });

  it("rechaza un token malformado", () => {
    const res = verifyToken("no-es-un-token", 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("malformado");
  });

  it("genera un nonce distinto por token", () => {
    const a = signToken("s", 20, 1);
    const b = signToken("s", 20, 1);
    expect(a.nonce).not.toBe(b.nonce);
  });
});
