import { isLadderStandingsFinal } from "courtchamps-shared/helpers";
import type { Ladder } from "courtchamps-shared/types";

export const STANDINGS_FINAL_MESSAGE =
  "This ladder's standings are final for the playoffs, so this can no longer be decided.";

type StandingsLadder = Pick<Ladder, "playoffStartsAt" | "standingsFinalisedAt">;

export const isLadderStandingsLocked = (
  ladder: StandingsLadder | null | undefined,
  now: Date = new Date(),
): boolean =>
  !!ladder &&
  (!!ladder.standingsFinalisedAt || isLadderStandingsFinal(ladder, now));

export const assertLadderStandingsOpen = (
  ladder: StandingsLadder | null | undefined,
  now: Date = new Date(),
): void => {
  if (isLadderStandingsLocked(ladder, now)) {
    throw new Error(STANDINGS_FINAL_MESSAGE);
  }
};
