import { describe, expect, it } from "vitest";
import { nextRenewalDate, normalizeDomain, parseRdap, pickSiteName } from ".";

const day = (s: string) => new Date(`${s}T00:00:00Z`);

// Shapes follow RFC 9083 as published by SIDN (.nl: no expiry) and Verisign (.com).
const sidn = {
  objectClassName: "domain",
  ldhName: "bakkerij-jansen.nl",
  status: ["active"],
  events: [
    { eventAction: "registration", eventDate: "2016-03-14T10:22:31Z" },
    { eventAction: "last changed", eventDate: "2024-01-02T08:00:00Z" },
  ],
  entities: [
    { objectClassName: "entity", roles: ["registrar"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "Hostnet B.V."]]] },
    { objectClassName: "entity", roles: ["technical"], vcardArray: ["vcard", [["fn", {}, "text", "Tech Contact"]]] },
  ],
};
const verisign = {
  events: [
    { eventAction: "registration", eventDate: "2007-10-09T18:20:50Z" },
    { eventAction: "expiration", eventDate: "2026-10-09T18:20:50Z" },
    { eventAction: "last update of RDAP database", eventDate: "2026-10-01T00:00:00Z" },
  ],
  entities: [{ roles: ["registrar"], publicIds: [{ type: "IANA Registrar ID", identifier: "292" }], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "MarkMonitor Inc."]]] }],
};

describe("normalizeDomain", () => {
  it("accepts URLs, www and paths", () => {
    expect(normalizeDomain("https://www.Bakkerij-Jansen.nl/contact?x=1")).toBe("bakkerij-jansen.nl");
    expect(normalizeDomain("bakkerij.nl")).toBe("bakkerij.nl");
    expect(normalizeDomain(" shop.example.co.uk ")).toBe("shop.example.co.uk");
    expect(normalizeDomain("http://example.com:8080")).toBe("example.com");
  });
  it("rejects anything that isn't a public hostname", () => {
    for (const bad of ["", "localhost", "192.168.1.1", "http://127.0.0.1", "user@example.nl", "-bad.nl", "exa mple.nl", "intranet"]) {
      expect(normalizeDomain(bad), bad).toBeNull();
    }
  });
});

describe("parseRdap", () => {
  it("reads .nl answers without an expiry date", () => {
    expect(parseRdap(sidn)).toEqual({ registrar: "Hostnet B.V.", registeredAt: day("2016-03-14"), expiresAt: null });
  });
  it("reads .com answers with an expiry date", () => {
    expect(parseRdap(verisign)).toEqual({ registrar: "MarkMonitor Inc.", registeredAt: day("2007-10-09"), expiresAt: day("2026-10-09") });
  });
  it("finds a registrar nested under another entity", () => {
    const nested = { entities: [{ roles: ["registrant"], entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "TransIP"]]] }] }] };
    expect(parseRdap(nested).registrar).toBe("TransIP");
  });
  it("survives junk", () => {
    expect(parseRdap(null)).toEqual({ registrar: null, registeredAt: null, expiresAt: null });
    expect(parseRdap({ events: "x", entities: [{ roles: ["registrar"] }] })).toEqual({ registrar: null, registeredAt: null, expiresAt: null });
  });
});

describe("nextRenewalDate", () => {
  const today = day("2026-10-04");
  it("uses a future expiry date as is", () => {
    expect(nextRenewalDate({ registeredAt: day("2007-10-09"), expiresAt: day("2026-10-09") }, today)).toEqual(day("2026-10-09"));
  });
  it("rolls the registration anniversary forward when there is no expiry", () => {
    expect(nextRenewalDate({ registeredAt: day("2016-03-14"), expiresAt: null }, today)).toEqual(day("2027-03-14"));
    expect(nextRenewalDate({ registeredAt: day("2016-10-04"), expiresAt: null }, today)).toEqual(day("2026-10-04"));
  });
  it("rolls a past expiry forward and handles 29 February", () => {
    expect(nextRenewalDate({ registeredAt: null, expiresAt: day("2025-01-01") }, today)).toEqual(day("2027-01-01"));
    expect(nextRenewalDate({ registeredAt: day("2024-02-29"), expiresAt: null }, today)).toEqual(day("2027-02-28"));
  });
  it("returns null without dates", () => {
    expect(nextRenewalDate({ registeredAt: null, expiresAt: null }, today)).toBeNull();
  });
});

describe("pickSiteName", () => {
  it("prefers og:site_name", () => {
    expect(pickSiteName(`<head><meta property="og:site_name" content="Bakkerij Jansen &amp; Zn" /><title>Home - Iets</title></head>`)).toBe("Bakkerij Jansen & Zn");
  });
  it("drops 'Home' and taglines from the title", () => {
    expect(pickSiteName("<title>Home - Bakkerij Jansen</title>")).toBe("Bakkerij Jansen");
    expect(pickSiteName("<title>Bakkerij Jansen | Vers brood uit Utrecht</title>")).toBe("Bakkerij Jansen");
    expect(pickSiteName("<title>\n  Welkom  · Kapsalon Zafer\n</title>")).toBe("Kapsalon Zafer");
  });
  it("keeps hyphenated names intact", () => {
    expect(pickSiteName("<title>Jansen-Bouw</title>")).toBe("Jansen-Bouw");
  });
  it("returns null when there is nothing useful", () => {
    expect(pickSiteName("<html><body>hi</body></html>")).toBeNull();
    expect(pickSiteName("<title>Home</title>")).toBeNull();
  });
});
