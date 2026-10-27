import { LADDER_PRE_REGISTRATION_STATUS } from "courtchamps-shared/types";
import type {
  LadderPreRegistration,
  LadderPreRegistrationStatus,
} from "courtchamps-shared/types";
import type { LadderPreRegistrantExport } from "../services/ladderPreRegistrations";
import type { StatusTone } from "../components/admin/StatusPill";

export const PRE_REGISTRATION_STATUS_STYLES: Record<
  LadderPreRegistrationStatus,
  { label: string; tone: StatusTone }
> = {
  [LADDER_PRE_REGISTRATION_STATUS.OPEN]: { label: "Open in app", tone: "info" },
  [LADDER_PRE_REGISTRATION_STATUS.CLOSED]: { label: "Hidden", tone: "neutral" },
  [LADDER_PRE_REGISTRATION_STATUS.LAUNCHED]: {
    label: "Launched",
    tone: "positive",
  },
};

export const formatPreRegistrationEntryFee = (
  preRegistration: Pick<LadderPreRegistration, "entryFee" | "currencyType">,
): string =>
  preRegistration.entryFee === 0
    ? "Free"
    : `${preRegistration.entryFee.toLocaleString()} ${preRegistration.currencyType}`;

const csvCell = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const isoOrEmpty = (date: Date | null): string =>
  date && date.getTime() > 0 ? date.toISOString() : "";

export const buildRegistrantsCsv = (
  registrants: LadderPreRegistrantExport[],
): string =>
  [
    "userId,username,email,registeredAt,notifiedAt",
    ...registrants.map((registrant) =>
      [
        registrant.userId,
        registrant.username,
        registrant.email,
        isoOrEmpty(registrant.createdAt),
        isoOrEmpty(registrant.notifiedAt),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
