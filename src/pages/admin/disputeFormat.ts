import type {
  Game,
  GameTeam,
  GameVideo,
  Player,
} from "courtchamps-shared/types";

export const playerName = (player?: Player | null): string => {
  if (!player) return "—";
  return (
    player.username?.trim() ||
    `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() ||
    "—"
  );
};

export const sideLabel = (team?: GameTeam | null): string =>
  [team?.player1, team?.player2]
    .filter((p): p is Player => Boolean(p))
    .map(playerName)
    .join(" & ") || "—";

export const scoreLabel = (game?: Game | null): string => {
  if (!game) return "—";
  if (game.gamescore) return game.gamescore;
  return `${game.team1?.score ?? "-"} - ${game.team2?.score ?? "-"}`;
};

/** A dispute event's timestamp as "23 Sep, 4:15 PM" (handles Firestore Timestamps). */
export const formatEventDate = (value: unknown): string => {
  const date =
    value && typeof (value as { toDate?: () => Date }).toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
};

/** Who uploaded a video-evidence clip (so a doubles side's two players read apart). */
export const uploaderName = (video: GameVideo): string => {
  const by = video.postedBy;
  if (!by) return "Unknown";
  return (
    by.username?.trim() ||
    `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() ||
    "Unknown"
  );
};

export const initials = (player?: Player | null): string => {
  const name = playerName(player);
  if (name === "—") return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2)
  ).toUpperCase();
};

/** Time left until `dueMs`, e.g. "1d 22h" or "3h 10m"; null once it has passed. */
export const formatTimeLeft = (dueMs: number, nowMs: number): string | null => {
  const left = dueMs - nowMs;
  if (left <= 0) return null;
  const minutes = Math.floor(left / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes % 60}m`;
};
