import { addMonths } from "date-fns";

export interface DerivedLadderDates {
  registrationClosesAt: Date;
  seasonEndsAt: Date;
  playoffStartsAt: Date;
  playoffEndsAt: Date;
}

export const deriveLadderDates = ({
  seasonStartsAt,
}: {
  seasonStartsAt: Date;
}): DerivedLadderDates => ({
  registrationClosesAt: addMonths(seasonStartsAt, 2),
  seasonEndsAt: addMonths(seasonStartsAt, 3),
  playoffStartsAt: addMonths(seasonStartsAt, 3),
  playoffEndsAt: addMonths(seasonStartsAt, 4),
});
