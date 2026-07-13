import { describe, expect, test } from "vitest";
import { getPageTitle } from "@/lib/title";

describe("getPageTitle", () => {
  test("returns trimmed title when non-empty", () => {
    expect(getPageTitle("  회의록  ")).toBe("회의록");
  });

  test("returns 'Untitled' when title is empty or whitespace-only", () => {
    expect(getPageTitle("")).toBe("Untitled");
    expect(getPageTitle("   ")).toBe("Untitled");
  });
});
