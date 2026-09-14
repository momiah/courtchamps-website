import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase/config";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - normalizeCompetition is an untyped JS helper.
import { normalizeCompetition } from "../helpers/normalizeCompetition";
import {
  getPlayerRankInCompetition,
  getTeamRankInCompetition,
} from "courtchamps-shared/helpers";

export type CompetitionType = "league" | "tournament";

export interface CompetitionStatus {
  label: string;
  color: string;
}

export interface UserCompetition {
  id: string;
  competitionType: CompetitionType;
  name: string;
  courtName: string;
  /** Singles / Doubles etc. */
  type: string;
  status: CompetitionStatus;
  wins: number;
  userRank: number;
  endDate: string;
  role: "owner" | "admin" | null;
}

// Ported from the app's calculateCompetitionStatus. `raw` is the untouched
// Firestore document (still carrying the leagueParticipants / fixturesGenerated
// fields the status depends on).
const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const [day, month, year] = value.split("-").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

const calculateStatus = (
  raw: Record<string, any>,
  type: CompetitionType,
): CompetitionStatus => {
  const participants = raw?.[`${type}Participants`] ?? [];
  const currentParticipants = Array.isArray(participants)
    ? participants.length
    : 0;
  const maxPlayers = raw?.maxPlayers ?? 0;
  const end = parseDate(raw?.endDate);

  if (raw?.privacy === "Private") return { label: "Private", color: "#FF4757" };
  if (end && new Date() >= end) return { label: "Ended", color: "#FF4757" };
  if (raw?.fixturesGenerated) return { label: "Started", color: "#1A6B1A" };
  if (currentParticipants === maxPlayers - 1)
    return { label: "1 More Space", color: "#34C759" };
  if (currentParticipants < maxPlayers)
    return { label: "Enlisting", color: "#FAB234" };
  return { label: "Full", color: "#286EFA" };
};

const sortByEndDateDesc = (competitions: UserCompetition[]): UserCompetition[] =>
  [...competitions].sort((a, b) => {
    const dateA = parseDate(a.endDate)?.getTime() ?? 0;
    const dateB = parseDate(b.endDate)?.getTime() ?? 0;
    return dateB - dateA;
  });

const isParticipant = (raw: Record<string, any>, type: CompetitionType, userId: string) => {
  const participants = raw?.[`${type}Participants`];
  return (
    Array.isArray(participants) &&
    participants.some((p: { userId?: string }) => p.userId === userId)
  );
};

const buildCompetition = (
  raw: Record<string, any>,
  type: CompetitionType,
  userId: string,
): UserCompetition => {
  const normalized = normalizeCompetition({
    rawData: raw,
    competitionType: type,
  });

  const participants = normalized.participants ?? [];
  const isDoubles = type === "tournament" && normalized.type === "Doubles";

  let wins = 0;
  let userRank = 0;
  if (isDoubles) {
    const teams = normalized.teams ?? [];
    const team = teams.find((t: { teamKey?: string }) =>
      t.teamKey?.includes(userId),
    );
    wins = team?.numberOfWins ?? 0;
    userRank = getTeamRankInCompetition(teams, userId);
  } else {
    const participant = participants.find(
      (p: { userId?: string }) => p.userId === userId,
    );
    wins = participant?.numberOfWins ?? 0;
    userRank = getPlayerRankInCompetition(participants, userId);
  }

  const isOwner = normalized.owner?.userId === userId;
  const isAdmin =
    !isOwner &&
    (normalized.admins ?? []).some(
      (a: { userId?: string }) => a.userId === userId,
    );

  return {
    id: normalized.id || raw.id,
    competitionType: type,
    name: normalized.name,
    courtName: normalized.location?.courtName ?? "",
    type: normalized.type,
    status: calculateStatus(raw, type),
    wins,
    userRank,
    endDate: normalized.endDate,
    role: isOwner ? "owner" : isAdmin ? "admin" : null,
  };
};

const fetchForUser = async (
  type: CompetitionType,
  userId: string,
): Promise<UserCompetition[]> => {
  const collectionName = type === "league" ? "leagues" : "tournaments";
  const snapshot = await getDocs(collection(db, collectionName));

  const competitions = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((raw) => isParticipant(raw, type, userId))
    .map((raw) => buildCompetition(raw, type, userId));

  return sortByEndDateDesc(competitions);
};

export const getLeaguesForUser = (userId: string) =>
  fetchForUser("league", userId);

export const getTournamentsForUser = (userId: string) =>
  fetchForUser("tournament", userId);
