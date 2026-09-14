import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "../firebase/config";
import { UserProfile } from "courtchamps-shared/types";

const USERS_COLLECTION = "users";

export interface PlayerListItem extends UserProfile {
  /** Document id. */
  userId: string;
  /** 1-based rank across the whole ordered player set. */
  globalRank: number;
}

export interface PaginatedPlayers {
  players: PlayerListItem[];
  totalPlayers: number;
  totalPages: number;
}

/**
 * Mirrors the mobile app's `getAllUsersPaginated`: fetch every player ordered by
 * the shared ranking criteria, assign a global rank, optionally filter by a
 * username prefix, then return the requested page. Ordering is kept identical to
 * the app so the global rank shown here matches the app.
 */
export const getAllPlayersPaginated = async (
  page = 1,
  pageSize = 25,
  searchParam = "",
): Promise<PaginatedPlayers> => {
  const playersQuery = query(
    collection(db, USERS_COLLECTION),
    orderBy("profileDetail.XP", "desc"),
    orderBy("profileDetail.numberOfWins", "desc"),
    orderBy("profileDetail.winPercentage", "desc"),
    orderBy("profileDetail.totalPointDifference", "desc"),
    orderBy("username", "asc"),
  );

  const snapshot = await getDocs(playersQuery);

  let players: PlayerListItem[] = snapshot.docs.map((document, index) => ({
    ...(document.data() as UserProfile),
    userId: document.id,
    globalRank: index + 1,
  }));

  const trimmedSearch = searchParam.trim().toLowerCase();
  if (trimmedSearch) {
    players = players.filter((player) =>
      player.username?.toLowerCase().startsWith(trimmedSearch),
    );
  }

  const totalPlayers = players.length;
  const start = (page - 1) * pageSize;
  const pagePlayers = players.slice(start, start + pageSize);

  return {
    players: pagePlayers,
    totalPlayers,
    totalPages: Math.ceil(totalPlayers / pageSize),
  };
};

export interface PlayerProfileResult {
  profile: PlayerListItem | null;
  /** 1-based global rank across all players. */
  globalRank: number | null;
  /** 1-based rank within the player's country. */
  countryRank: number | null;
}

/**
 * Fetch a single player plus their global and country rank. Uses the same
 * ordered query as the list so the ranks match the app and the leaderboard —
 * one read gives us the full profile and both ranks.
 */
export const getPlayerProfile = async (
  userId: string,
): Promise<PlayerProfileResult> => {
  const playersQuery = query(
    collection(db, USERS_COLLECTION),
    orderBy("profileDetail.XP", "desc"),
    orderBy("profileDetail.numberOfWins", "desc"),
    orderBy("profileDetail.winPercentage", "desc"),
    orderBy("profileDetail.totalPointDifference", "desc"),
    orderBy("username", "asc"),
  );

  const snapshot = await getDocs(playersQuery);
  const ranked = snapshot.docs.map((document, index) => ({
    ...(document.data() as UserProfile),
    userId: document.id,
    globalRank: index + 1,
  }));

  const profile = ranked.find((player) => player.userId === userId) ?? null;
  if (!profile) {
    return { profile: null, globalRank: null, countryRank: null };
  }

  const countryCode = profile.location?.countryCode;
  const countryRank = countryCode
    ? ranked
        .filter((player) => player.location?.countryCode === countryCode)
        .findIndex((player) => player.userId === userId) + 1
    : null;

  return {
    profile,
    globalRank: profile.globalRank,
    countryRank: countryRank || null,
  };
};
