import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./helpers";

describe("safeReturnTo", () => {
  const id = "cl_123";
  it("allows paths of the same client", () => {
    expect(safeReturnTo("/clients/cl_123?tab=services", id)).toBe("/clients/cl_123?tab=services");
    expect(safeReturnTo("/clients/cl_123/setup?step=domains", id)).toBe("/clients/cl_123/setup?step=domains");
    expect(safeReturnTo("/clients/cl_123", id)).toBe("/clients/cl_123");
  });
  it("allows the org-wide record sections", () => {
    expect(safeReturnTo("/domains?status=ACTIVE", id)).toBe("/domains?status=ACTIVE");
    expect(safeReturnTo("/time?client=cl_9&page=2", id)).toBe("/time?client=cl_9&page=2");
    expect(safeReturnTo("/domainsx", id)).toBe("/clients/cl_123");
  });
  it("falls back for anything else", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/clients/other", "/clients/cl_1234", "/clients/cl_123/../../x", "/clients/cl_123?x=<script>", null]) {
      expect(safeReturnTo(bad, id)).toBe("/clients/cl_123");
    }
  });
});
