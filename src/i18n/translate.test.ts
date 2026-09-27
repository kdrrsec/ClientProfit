import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "./config";
import { en } from "./messages/en";
import { nl } from "./messages/nl";
import { createT, msg, translateMessage } from "./translate";

describe("i18n", () => {
  const t = createT(nl);

  it("interpolates params", () => {
    expect(t("team.roleOf", { name: "Sanne" })).toBe("Rol van Sanne");
  });

  it("round-trips encoded messages with params", () => {
    expect(translateMessage(nl, t, msg("err.tooLong", { max: 200 }))).toBe("Gebruik maximaal 200 tekens");
    expect(translateMessage(nl, t, msg("err.required"))).toBe("Dit veld is verplicht");
  });

  it("leaves unknown text untouched", () => {
    expect(translateMessage(nl, t, "Something else")).toBe("Something else");
  });

  it("has a non-empty Dutch text for every key", () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) expect(nl[k], k).toBeTruthy();
  });

  it("picks the language from Accept-Language", () => {
    expect(localeFromAcceptLanguage("nl-NL,nl;q=0.9,en;q=0.8")).toBe("nl");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("nl");
  });
});
