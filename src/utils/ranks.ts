// Auto-generated from scoreboard-v2 rankingMedals/ranking/ranks.js.
// Rank thresholds match the app's high-quality progression; icons use the
// smaller "micro" medal images (served from /public/rankingMedals).

export interface Rank {
  name: string;
  /** Minimum XP required to hold this rank. */
  xp: number;
  /** Medal image filename under PUBLIC_URL + "/rankingMedals/". */
  icon: string;
}

export const RANK_MEDALS_BASE = `${process.env.PUBLIC_URL ?? ""}/rankingMedals`;

export const rankMedalUrl = (icon: string): string => `${RANK_MEDALS_BASE}/${icon}`;

export const ranks: Rank[] = [
  { name: "Beginner", xp: 0, icon: "micro-bronze_rank1.png" },
  { name: "Beginner II", xp: 100, icon: "micro-silver_rank1.png" },
  { name: "Beginner III", xp: 200, icon: "micro-ruby_rank1.png" },
  { name: "Beginner IV", xp: 300, icon: "micro-gold_rank1.png" },
  { name: "Rookie", xp: 400, icon: "micro-bronze_rank2.png" },
  { name: "Rookie II", xp: 600, icon: "micro-silver_rank2.png" },
  { name: "Rookie III", xp: 800, icon: "micro-ruby_rank2.png" },
  { name: "Rookie IV", xp: 1000, icon: "micro-gold_rank2.png" },
  { name: "Apprentice", xp: 1300, icon: "micro-bronze_rank3.png" },
  { name: "Apprentice II", xp: 1600, icon: "micro-silver_rank3.png" },
  { name: "Apprentice III", xp: 1900, icon: "micro-ruby_rank3.png" },
  { name: "Apprentice IV", xp: 2200, icon: "micro-gold_rank3.png" },
  { name: "Challenger", xp: 2600, icon: "micro-bronze_rank4.png" },
  { name: "Challenger II", xp: 3000, icon: "micro-silver_rank4.png" },
  { name: "Challenger III", xp: 3400, icon: "micro-ruby_rank4.png" },
  { name: "Challenger IV", xp: 3800, icon: "micro-gold_rank4.png" },
  { name: "Competitor", xp: 4300, icon: "micro-bronze_rank5.png" },
  { name: "Competitor II", xp: 4800, icon: "micro-silver_rank5.png" },
  { name: "Competitor III", xp: 5300, icon: "micro-ruby_rank5.png" },
  { name: "Competitor IV", xp: 5800, icon: "micro-gold_rank5.png" },
  { name: "Intermediate", xp: 6400, icon: "micro-bronze_rank6.png" },
  { name: "Intermediate II", xp: 7000, icon: "micro-silver_rank6.png" },
  { name: "Intermediate III", xp: 7600, icon: "micro-ruby_rank6.png" },
  { name: "Intermediate IV", xp: 8200, icon: "micro-gold_rank6.png" },
  { name: "Proficient", xp: 8900, icon: "micro-bronze_rank7.png" },
  { name: "Proficient II", xp: 9600, icon: "micro-silver_rank7.png" },
  { name: "Proficient III", xp: 10300, icon: "micro-ruby_rank7.png" },
  { name: "Proficient IV", xp: 11000, icon: "micro-gold_rank7.png" },
  { name: "Advanced", xp: 11800, icon: "micro-bronze_rank8.png" },
  { name: "Advanced II", xp: 12600, icon: "micro-silver_rank8.png" },
  { name: "Advanced III", xp: 13400, icon: "micro-ruby_rank8.png" },
  { name: "Advanced IV", xp: 14200, icon: "micro-gold_rank8.png" },
  { name: "Expert", xp: 15100, icon: "micro-bronze_rank9.png" },
  { name: "Expert II", xp: 16000, icon: "micro-silver_rank9.png" },
  { name: "Expert III", xp: 16900, icon: "micro-ruby_rank9.png" },
  { name: "Expert IV", xp: 17800, icon: "micro-gold_rank9.png" },
  { name: "Elite", xp: 18800, icon: "micro-bronze_rank10.png" },
  { name: "Elite II", xp: 19800, icon: "micro-silver_rank10.png" },
  { name: "Elite III", xp: 20800, icon: "micro-ruby_rank10.png" },
  { name: "Elite IV", xp: 21800, icon: "micro-gold_rank10.png" },
  { name: "Master", xp: 22900, icon: "micro-bronze_rank11.png" },
  { name: "Master II", xp: 24000, icon: "micro-silver_rank11.png" },
  { name: "Master III", xp: 25100, icon: "micro-ruby_rank11.png" },
  { name: "Master IV", xp: 26200, icon: "micro-gold_rank11.png" },
  { name: "Grandmaster", xp: 27400, icon: "micro-bronze_rank12.png" },
  { name: "Grandmaster II", xp: 28600, icon: "micro-silver_rank12.png" },
  { name: "Grandmaster III", xp: 29800, icon: "micro-ruby_rank12.png" },
  { name: "Grandmaster IV", xp: 31000, icon: "micro-gold_rank12.png" },
  { name: "Demon", xp: 32300, icon: "micro-bronze_rank13.png" },
  { name: "Demon II", xp: 33600, icon: "micro-silver_rank13.png" },
  { name: "Demon III", xp: 34900, icon: "micro-ruby_rank13.png" },
  { name: "Demon IV", xp: 36200, icon: "micro-gold_rank13.png" },
  { name: "Champion", xp: 37600, icon: "micro-bronze_rank14.png" },
  { name: "Champion II", xp: 39000, icon: "micro-silver_rank14.png" },
  { name: "Champion III", xp: 40400, icon: "micro-ruby_rank14.png" },
  { name: "Champion IV", xp: 41800, icon: "micro-gold_rank14.png" },
  { name: "Legend I", xp: 43300, icon: "micro-bronze_rank15.png" },
  { name: "Legend II", xp: 44800, icon: "micro-silver_rank15.png" },
  { name: "Legend III", xp: 46300, icon: "micro-ruby_rank15.png" },
  { name: "Legend IV", xp: 47800, icon: "micro-gold_rank15.png" },
  { name: "Immortal I", xp: 49400, icon: "micro-bronze_rank16.png" },
  { name: "Immortal II", xp: 51000, icon: "micro-silver_rank16.png" },
  { name: "Immortal III", xp: 52600, icon: "micro-ruby_rank16.png" },
  { name: "Immortal IV", xp: 54200, icon: "micro-gold_rank16.png" },
  { name: "Immortal V", xp: 60000, icon: "micro-purple_rank16_v4.png" },
];

/** Index (0-based) of the rank a given XP falls into; clamped to the array. */
export function findRankIndex(xp: number): number {
  const numericXp = Number(xp);
  if (Number.isNaN(numericXp) || numericXp < 0) return 0;
  if (numericXp >= ranks[ranks.length - 1].xp) return ranks.length - 1;
  const index = ranks.findIndex((rank, i) => {
    const nextXp = ranks[i + 1]?.xp ?? Infinity;
    return numericXp >= rank.xp && numericXp < nextXp;
  });
  return index === -1 ? 0 : index;
}

/** The Rank a given XP falls into. */
export function getRankByXp(xp: number): Rank {
  return ranks[findRankIndex(xp)];
}

export interface RankProgress {
  currentRank: Rank;
  nextRank: Rank;
  /** Progress from currentRank to nextRank, 0–100. 100 at the max rank. */
  percent: number;
}

/**
 * Progress of a given XP between its current and next rank. Mirrors the app's
 * MedalProgress: currentRank is the highest rank at/below the XP, nextRank is
 * the first rank above it (or the max rank when already at the top).
 */
export function getRankProgress(xp: number): RankProgress {
  const numericXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;

  const currentRank = ranks.reduce((prev, current) =>
    current.xp <= numericXp ? current : prev,
  );

  const nextRank =
    ranks.find((rank) => numericXp < rank.xp) ?? ranks[ranks.length - 1];

  const span = nextRank.xp - currentRank.xp;
  const percent =
    span <= 0 ? 100 : Math.max(0, Math.min(100, ((numericXp - currentRank.xp) / span) * 100));

  return { currentRank, nextRank, percent };
}
