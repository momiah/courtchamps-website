import {
  STANDINGS_FINAL_MESSAGE,
  assertLadderStandingsOpen,
  isLadderStandingsLocked,
} from "./ladderStandings";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-10T12:00:00Z");

describe("ladder standings lock", () => {
  it("locks a day before the playoffs start, or once the standings were finalised", () => {
    expect(
      isLadderStandingsLocked(
        { playoffStartsAt: new Date(now.getTime() + 2 * DAY) } as never,
        now,
      ),
    ).toBe(false);
    expect(
      isLadderStandingsLocked(
        { playoffStartsAt: new Date(now.getTime() + DAY) } as never,
        now,
      ),
    ).toBe(true);
    expect(
      isLadderStandingsLocked(
        {
          playoffStartsAt: new Date(now.getTime() + 9 * DAY),
          standingsFinalisedAt: now,
        } as never,
        now,
      ),
    ).toBe(true);
    expect(isLadderStandingsLocked(undefined, now)).toBe(false);
  });

  it("refuses a decision once locked", () => {
    expect(() =>
      assertLadderStandingsOpen({ standingsFinalisedAt: now } as never, now),
    ).toThrow(STANDINGS_FINAL_MESSAGE);
    expect(() =>
      assertLadderStandingsOpen(
        { playoffStartsAt: new Date(now.getTime() + 3 * DAY) } as never,
        now,
      ),
    ).not.toThrow();
  });
});
