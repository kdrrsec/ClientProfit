import { describe, expect, it } from "vitest";
import { isPublicIp, publicOnlyLookup } from "./domain";

describe("isPublicIp", () => {
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "185.12.1.4", "2a00:1450:4001:82a::200e"]) expect(isPublicIp(ip), ip).toBe(true);
  });
  it("blocks internal addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });
});

describe("publicOnlyLookup", () => {
  const lookup = (host: string, all: boolean) =>
    new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>((resolve) =>
      publicOnlyLookup(host, { all }, (err, address) => resolve({ err, address })),
    );

  it("refuses hosts that resolve to internal addresses at connect time", async () => {
    for (const all of [false, true]) {
      const { err } = await lookup("localhost", all);
      expect(err?.code).toBe("EBLOCKED");
    }
  });
});
