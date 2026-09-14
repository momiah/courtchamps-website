import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { PlayerListItem } from "../../services/players";
import { getRankProgress, rankMedalUrl } from "../../utils/ranks";

const PERF_BASE = `${process.env.PUBLIC_URL ?? ""}/performance`;

const fmt = (value: number): string =>
  Number(value || 0).toLocaleString("en-US");

const matchMedals = (d: PlayerListItem["profileDetail"]) => [
  { icon: "assassin.png", title: "Assassin", stat: d?.demonWin ?? 0 },
  { icon: "win-streak-3.png", title: "3 Win Streak", stat: d?.winStreak3 ?? 0 },
  { icon: "win-streak-5.png", title: "5 Win Streak", stat: d?.winStreak5 ?? 0 },
  { icon: "win-streak-7.png", title: "7 Win Streak", stat: d?.winStreak7 ?? 0 },
];

const PLACEMENTS = ["first", "second", "third", "fourth"] as const;
const PLACE_LABELS = ["1st", "2nd", "3rd", "4th"];
const trophyIcons = ["trophy-1st", "trophy-2nd", "trophy-3rd", "trophy-4th"];
const medalIcons = ["medal-1st", "medal-2nd", "medal-3rd", "medal-4th"];

interface ProfilePerformanceProps {
  profile: PlayerListItem;
}

export default function ProfilePerformance({
  profile,
}: ProfilePerformanceProps) {
  const detail = profile.profileDetail;
  const xp = detail?.XP ?? 0;
  const pd = detail?.totalPointDifference ?? 0;

  const wins = detail?.numberOfWins ?? 0;
  const losses = detail?.numberOfLosses ?? 0;
  const winRatio = losses === 0 ? 0 : wins / losses;

  const record: { title: string; value: React.ReactNode }[] = [
    { title: "Court Points", value: fmt(Math.round(xp)) },
    {
      title: "Point Difference",
      value: (
        <span style={{ color: pd < 0 ? "#ff6b6b" : "#4cd47a" }}>
          {pd > 0 ? "+" : ""}
          {fmt(pd)}
        </span>
      ),
    },
    { title: "Wins", value: fmt(wins) },
    { title: "Losses", value: fmt(losses) },
    { title: "Win Ratio", value: Number.isNaN(winRatio) ? "0" : winRatio.toFixed(2) },
    { title: "Highest Streak", value: fmt(detail?.highestWinStreak ?? 0) },
  ];

  return (
    <Grid>
      <FeatureCard>
        <CardTitle>Rank Progress</CardTitle>
        <MedalProgress xp={xp} prevGameXp={detail?.prevGameXP} />
      </FeatureCard>

      <Column>
        <Card>
          <CardTitle>Season Record</CardTitle>
          <RecordGrid>
            {record.map((item) => (
              <RecordTile key={item.title}>
                <RecordValue>{item.value}</RecordValue>
                <RecordLabel>{item.title}</RecordLabel>
              </RecordTile>
            ))}
          </RecordGrid>
        </Card>
      </Column>

      <Column>
        <Card>
          <CardTitle>Match Medals</CardTitle>
          <MedalRow>
            {matchMedals(detail).map((medal) => (
              <MedalItem key={medal.title}>
                <MatchMedalImg src={`${PERF_BASE}/${medal.icon}`} alt={medal.title} />
                <MedalStat>{fmt(medal.stat)}</MedalStat>
                <MedalTitle>{medal.title}</MedalTitle>
              </MedalItem>
            ))}
          </MedalRow>
        </Card>

        <Card>
          <CardTitle>League Victories</CardTitle>
          <PrizeRow>
            {PLACEMENTS.map((key, index) => (
              <PrizeCard key={key}>
                <PrizeImg src={`${PERF_BASE}/${trophyIcons[index]}.png`} alt={PLACE_LABELS[index]} />
                <PrizeText>{detail?.leagueStats?.[key] ?? 0}</PrizeText>
              </PrizeCard>
            ))}
          </PrizeRow>
        </Card>

        <Card>
          <CardTitle>Tournament Victories</CardTitle>
          <PrizeRow>
            {PLACEMENTS.map((key, index) => (
              <PrizeCard key={key}>
                <PrizeImg src={`${PERF_BASE}/${medalIcons[index]}.png`} alt={PLACE_LABELS[index]} />
                <PrizeText>{detail?.tournamentStats?.[key] ?? 0}</PrizeText>
              </PrizeCard>
            ))}
          </PrizeRow>
        </Card>
      </Column>
    </Grid>
  );
}

// ─── Medal / XP progress ───
function MedalProgress({
  xp,
  prevGameXp,
}: {
  xp: number;
  prevGameXp?: number;
}) {
  const { currentRank, nextRank, percent } = getRankProgress(xp);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => setFill(percent), 100);
    return () => window.clearTimeout(handle);
  }, [percent]);

  const prev = typeof prevGameXp === "number" ? Math.round(prevGameXp) : null;

  return (
    <ProgressWrap>
      <ProgressHead>
        <RankChip>
          <RankMedal src={rankMedalUrl(currentRank.icon)} alt={currentRank.name} />
          <div>
            <RankChipName>{currentRank.name}</RankChipName>
            <RankChipXp>{fmt(currentRank.xp)} CP</RankChipXp>
          </div>
        </RankChip>

        {prev !== null && (
          <PrevBlock>
            <PrevXp $negative={prev < 0}>
              {prev < 0 ? `${fmt(prev)}` : `+${fmt(prev)}`} CP
            </PrevXp>
            <PrevLabel>Last Match</PrevLabel>
          </PrevBlock>
        )}

        <RankChip style={{ flexDirection: "row-reverse", textAlign: "right" }}>
          <RankMedal src={rankMedalUrl(nextRank.icon)} alt={nextRank.name} />
          <div>
            <RankChipName>{nextRank.name}</RankChipName>
            <RankChipXp>{fmt(nextRank.xp)} CP</RankChipXp>
          </div>
        </RankChip>
      </ProgressHead>

      <ArrowTrack>
        <ArrowFill style={{ width: `${fill}%` }}>
          <ArrowLabel>{fmt(Math.round(xp))} CP</ArrowLabel>
          <Caret />
        </ArrowFill>
      </ArrowTrack>
      <BarTrack>
        <BarFill style={{ width: `${fill}%` }} />
      </BarTrack>
    </ProgressWrap>
  );
}

// ─── Theme ───
const PANEL = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";
const BLUE = "#00A2FF";

// ─── Layout ───
const Grid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  alignItems: "start",
  gap: "16px",
  paddingBottom: "40px",
  "@media (max-width: 760px)": { gridTemplateColumns: "1fr" },
});

const Card = styled.div({
  padding: "20px",
  borderRadius: "16px",
  background: PANEL,
  border: `1px solid ${BORDER}`,
});

const FeatureCard = styled(Card)({
  gridColumn: "1 / -1",
});

// A single grid column that stacks its cards vertically.
const Column = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
});

const CardTitle = styled.h3({
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  color: MUTED,
  margin: "0 0 16px",
});

// Rank progress — keep the element sizes, but halve the overall length.
const ProgressWrap = styled.div({
  maxWidth: "520px",
  "@media (max-width: 760px)": { maxWidth: "100%" },
});

const ProgressHead = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
});

const RankChip = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
});

const RankMedal = styled.img({
  width: "34px",
  height: "34px",
  objectFit: "contain",
  flexShrink: 0,
});

const RankChipName = styled.div({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
});

const RankChipXp = styled.div({
  color: MUTED,
  fontSize: "0.78rem",
});

const PrevBlock = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
});

const PrevXp = styled.span<{ $negative?: boolean }>(({ $negative }) => ({
  color: $negative ? "#ff6b6b" : "#4cd47a",
  fontSize: "1.1rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
}));

const PrevLabel = styled.span({
  color: MUTED,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
});

const ArrowTrack = styled.div({
  height: "20px",
  width: "100%",
  position: "relative",
});

const ArrowFill = styled.div({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "flex-end",
  transition: "width 1s ease-out",
  minWidth: "fit-content",
});

const ArrowLabel = styled.span({
  color: "#FFFFFF",
  fontSize: "0.8rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
});

const Caret = styled.div({
  width: 0,
  height: 0,
  borderLeft: "6px solid transparent",
  borderRight: "6px solid transparent",
  borderTop: `7px solid ${BLUE}`,
  alignSelf: "flex-end",
  marginRight: "2px",
});

const BarTrack = styled.div({
  height: "16px",
  width: "100%",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "10px",
  overflow: "hidden",
  marginTop: "4px",
});

const BarFill = styled.div({
  height: "100%",
  background: "linear-gradient(90deg, #FFD100, #FF7800)",
  borderRadius: "10px",
  transition: "width 1s ease-out",
});

// Season record
const RecordGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
});

const RecordTile = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "16px 8px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${BORDER}`,
});

const RecordValue = styled.span({
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: "1.6rem",
});

const RecordLabel = styled.span({
  color: MUTED,
  fontSize: "0.8rem",
});

// Match medals
const MedalRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
});

const MedalItem = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
});

const MatchMedalImg = styled.img({
  width: "52px",
  height: "52px",
  objectFit: "contain",
});

const MedalTitle = styled.span({
  color: MUTED,
  fontSize: "0.68rem",
  textAlign: "center",
});

const MedalStat = styled.span({
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: "1rem",
});

// Competition prizes
const PrizeRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
});

const PrizeCard = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
  padding: "14px 6px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${BORDER}`,
});

const PrizeImg = styled.img({
  width: "48px",
  height: "48px",
  objectFit: "contain",
});

const PrizeText = styled.span({
  color: "#FFFFFF",
  fontSize: "1rem",
  fontWeight: 700,
});
