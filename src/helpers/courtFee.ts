import type { LadderMatch } from "courtchamps-shared/types";

/** How a ladder match ended, which decides how its court fee is settled. */
export type LadderMatchOutcomeKind =
  | "completed" // played out — fee settles as normal
  | "cancelled" // never started — refund the accepter's share
  | "expired" // started then abandoned — the court was used, fee stands
  | "walkover"; // no-show — the absent player bears it, the attendee is reimbursed

/**
 * STUB: reconcile a ladder match's court fee when the match reaches a terminal
 * state. Not yet implemented — this is where the payment provider settlement
 * (release / refund / charge) will be wired.
 *
 * Fee model: the poster (`createdBy`) books and pays the venue; the accepter
 * (`acceptedBy`) pays their share to the poster, minus the platform fee. On a
 * no-show the player who showed up must not be left out of pocket, so the
 * absent player bears the fee and the attendee is reimbursed.
 *
 * A no-op for now so the call site is wired ahead of the settlement.
 */
export const reconcileLadderCourtFee = (
  match: Pick<
    LadderMatch,
    | "ladderMatchId"
    | "courtFee"
    | "currencyType"
    | "createdBy"
    | "acceptedBy"
    | "participants"
  >,
  outcome: LadderMatchOutcomeKind,
): void => {
  // STUB: court-fee settlement is not built yet.
  void match;
  void outcome;
};
