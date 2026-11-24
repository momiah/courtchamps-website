import { isPayoutStructure, payoutStructureHint } from "./payoutStructure";

describe("payout structure field", () => {
  it("accepts only progressive or linear, so the field can't be left empty", () => {
    expect(isPayoutStructure("progressive")).toBe(true);
    expect(isPayoutStructure("linear")).toBe(true);
    expect(isPayoutStructure("")).toBe(false);
    expect(isPayoutStructure(undefined)).toBe(false);
  });

  it("describes the chosen structure", () => {
    expect(payoutStructureHint("progressive")).toMatch(/35%/);
    expect(payoutStructureHint("")).toMatch(/split/);
  });
});
