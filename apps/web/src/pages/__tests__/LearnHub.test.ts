import { describe, expect, it } from "vitest";
import { jlptPracticeHref, topikMaterialHrefs } from "../LearnHub";

describe("legacy practice deep links", () => {
  it("preserves a valid level without a selected mode", () => {
    expect(jlptPracticeHref("N3", null)).toBe("/quiz?level=N3");
  });

  it("preserves a valid mode without a selected level", () => {
    expect(jlptPracticeHref(null, "listening")).toBe("/quiz/listening");
  });

  it("drops invalid legacy parameters instead of selecting another level", () => {
    expect(jlptPracticeHref("N0", "unknown")).toBe("/quiz");
  });

  it("sends only allowlisted TOPIK values to their supported entry points", () => {
    const unit = "identity-greetings";
    expect(topikMaterialHrefs("3", unit, "writing")).toEqual({
      owner: "/track/topik-ko/learn?view=owner&grade=3",
      foundation: `/track/topik-ko/learn?view=foundation&unit=${unit}`,
      practice: "/track/topik-ko/learn?view=practice&section=writing",
    });
    expect(topikMaterialHrefs("9", "invalid", "other")).toEqual({
      owner: "/track/topik-ko/learn?view=owner",
      foundation: "/track/topik-ko/learn?view=foundation",
      practice: "/track/topik-ko/learn?view=practice",
    });
  });
});
