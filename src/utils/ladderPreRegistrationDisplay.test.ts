import {
  buildRegistrantsCsv,
  formatPreRegistrationEntryFee,
} from "./ladderPreRegistrationDisplay";

describe("buildRegistrantsCsv", () => {
  it("lists each registrant with when they registered and were notified", () => {
    expect(
      buildRegistrantsCsv([
        {
          userId: "u1",
          email: "player@example.com",
          createdAt: new Date("2026-10-24T10:00:00Z"),
          notifiedAt: null,
        },
        {
          userId: "u2",
          email: 'odd,"name"@example.com',
          createdAt: new Date("2026-10-25T09:30:00Z"),
          notifiedAt: new Date("2026-11-01T00:15:00Z"),
        },
      ]),
    ).toBe(
      [
        "userId,email,registeredAt,notifiedAt",
        "u1,player@example.com,2026-10-24T10:00:00.000Z,",
        'u2,"odd,""name""@example.com",2026-10-25T09:30:00.000Z,2026-11-01T00:15:00.000Z',
      ].join("\n"),
    );
  });

  it("is just the header when nobody has registered", () => {
    expect(buildRegistrantsCsv([])).toBe(
      "userId,email,registeredAt,notifiedAt",
    );
  });
});

describe("formatPreRegistrationEntryFee", () => {
  it("shows free and paid entry", () => {
    expect(
      formatPreRegistrationEntryFee({ entryFee: 0, currencyType: "GBP" }),
    ).toBe("Free");
    expect(
      formatPreRegistrationEntryFee({ entryFee: 20, currencyType: "GBP" }),
    ).toBe("20 GBP");
  });
});
