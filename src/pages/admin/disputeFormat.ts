import type { Game, GameTeam, GameVideo, Player } from "courtchamps-shared/types";

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
