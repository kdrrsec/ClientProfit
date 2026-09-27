import { describe, expect, it } from "vitest";
import { MAX_LOGO_BYTES, validateLogo } from "./uploads";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const svg = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));

describe("validateLogo", () => {
  it("detects PNG, JPEG and WebP by content", () => {
    expect(validateLogo(png)).toMatchObject({ ok: true, kind: { contentType: "image/png" } });
    expect(validateLogo(jpeg)).toMatchObject({ ok: true, kind: { contentType: "image/jpeg" } });
    expect(validateLogo(webp)).toMatchObject({ ok: true, kind: { contentType: "image/webp" } });
  });
  it("rejects SVG, other files, empty and oversized uploads", () => {
    expect(validateLogo(svg).ok).toBe(false);
    expect(validateLogo(new Uint8Array(Buffer.from("%PDF-1.7"))).ok).toBe(false);
    expect(validateLogo(new Uint8Array()).ok).toBe(false);
    const big = new Uint8Array(MAX_LOGO_BYTES + 1);
    big.set(png);
    expect(validateLogo(big)).toMatchObject({ ok: false, error: "err.logoTooLarge" });
  });
});
