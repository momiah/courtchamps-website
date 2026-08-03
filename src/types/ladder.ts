export interface CourtLocation {
  address: string;
  city: string;
  country: string;
  countryCode: string;
  postCode: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Court {
  courtId: string;
  courtName: string;
  location: CourtLocation;
  verified: boolean;
  submittedBy: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export type CourtInput = Pick<Court, "courtName" | "location">;

export const LADDER_STATUS = {
  DRAFT: "draft",
  REGISTRATION_OPEN: "registrationOpen",
  REGISTRATION_CLOSED: "registrationClosed",
  IN_PROGRESS: "inProgress",
  PLAYOFFS: "playoffs",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type LadderStatus =
  (typeof LADDER_STATUS)[keyof typeof LADDER_STATUS];

export interface Ladder {
  ladderId: string;
  name: string;
  description: string;
  image: string;
  region: string;
  countryCode: string;
  courtIds: string[];
  status: LadderStatus;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  seasonStartsAt: Date;
  seasonEndsAt: Date;
  playoffStartsAt: Date;
  playoffEndsAt: Date;
  entryFee: number;
  currencyType: string;
  minRank: number;
  maxPlayers: number;
  participantCount: number;
  prizesDistributed: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export type LadderInput = Pick<
  Ladder,
  | "name"
  | "description"
  | "image"
  | "region"
  | "countryCode"
  | "courtIds"
  | "registrationOpensAt"
  | "seasonStartsAt"
  | "entryFee"
  | "currencyType"
  | "minRank"
  | "maxPlayers"
>;
