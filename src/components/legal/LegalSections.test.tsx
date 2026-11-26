import React from "react";
import { render, screen } from "@testing-library/react";
import { LADDER_TERMS, TERMS_OF_USE, getLadderRules } from "courtchamps-shared";

import LegalSections from "./LegalSections";

describe("LegalSections", () => {
  it("renders the ladder terms with the payout tables and the full refund line", () => {
    render(<LegalSections sections={LADDER_TERMS} idPrefix="ladder-terms" />);
    expect(screen.getByText("1. Who we are")).toBeTruthy();
    expect(screen.getByTestId("ladder-payouts-linear")).toBeTruthy();
    expect(screen.getByTestId("ladder-payouts-progressive")).toBeTruthy();
    expect(
      screen.getByText(/the ladder is cancelled and every entry is refunded in full, including the 10% platform fee/),
    ).toBeTruthy();
  });

  it("renders the rules with the playoff places table", () => {
    render(<LegalSections sections={getLadderRules("player")} idPrefix="ladder-rules" />);
    expect(screen.getByText("How the standings work")).toBeTruthy();
    expect(screen.getByTestId("ladder-playoff-places")).toBeTruthy();
    expect(screen.getByText("128–255")).toBeTruthy();
  });

  it("renders the terms of use", () => {
    render(<LegalSections sections={TERMS_OF_USE} idPrefix="terms-of-use" />);
    expect(screen.getByText(/Acceptable use/)).toBeTruthy();
  });
});
