import { PAYOUT_STRUCTURE } from "courtchamps-shared/types";
import type { PayoutStructure } from "courtchamps-shared/types";

export const PAYOUT_STRUCTURE_OPTIONS: {
  value: PayoutStructure;
  label: string;
  hint: string;
}[] = [
  {
    value: PAYOUT_STRUCTURE.PROGRESSIVE,
    label: "Progressive",
    hint: "Top-heavy: 35% of the pot to the champion. Cash and CP go to the places in the money.",
  },
  {
    value: PAYOUT_STRUCTURE.LINEAR,
    label: "Linear",
    hint: "Flatter: less to the top four, more further down. CP goes to every playoff place.",
  },
];

export const PAYOUT_STRUCTURE_REQUIRED = "Choose a payout structure.";

export const isPayoutStructure = (value: unknown): value is PayoutStructure =>
  PAYOUT_STRUCTURE_OPTIONS.some((option) => option.value === value);

export const payoutStructureHint = (value: string): string =>
  PAYOUT_STRUCTURE_OPTIONS.find((option) => option.value === value)?.hint ??
  "How the cash and CP pots are split between the places.";
