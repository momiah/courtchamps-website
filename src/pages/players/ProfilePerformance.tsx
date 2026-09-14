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

  const wins = detail?.numberOfWins ?? 0;
  const losses = detail?.numberOfLosses ?? 0;
  const winRatio = losses === 0 ? 0 : wins / losses;

  const stats = [
    { title: "Wins", value: fmt(wins) },
    { title: "Losses", value: fmt(losses) },
    { title: "Win Ratio", value: Number.isNaN(winRatio) ? "0" : winRatio.toFixed(2) },
    { title: "Highest Streak", value: fmt(detail?.highestWinStreak ?? 0) },
  ];

  return (
    <Container>
      <MedalProgress
        xp={xp}
        prevGameXp={detail?.prevGameXP}
      />

      <Divider />
      <Heading>Match Medals</Heading>
      <MedalRow>
        {matchMedals(detail).map((medal) => (
          <MedalItem key={medal.title}>
            <MatchMedalImg src={`${PERF_BASE}/${medal.icon}`} alt={medal.title} />
            <MedalTitle>{medal.title}</MedalTitle>
            <MedalStat>{fmt(medal.stat)}</MedalStat>
          </MedalItem>
        ))}
      </MedalRow>

      <Divider />
      <Heading>League Victories</Heading>
      <PrizeRow>
        {PLACEMENTS.map((key, index) => (
          <PrizeCard key={key}>
            <PrizeImg src={`${PERF_BASE}/${trophyIcons[index]}.png`} alt={`${key} place`} />
            <PrizeText>{detail?.leagueStats?.[key] ?? 0}</PrizeText>
          </PrizeCard>
        ))}
      </PrizeRow>

      <Divider />
      <Heading>Tournament Victories</Heading>
      <PrizeRow>
        {PLACEMENTS.map((key, index) => (
          <PrizeCard key={key}>
            <PrizeImg src={`${PERF_BASE}/${medalIcons[index]}.png`} alt={`${key} place`} />
            <PrizeText>{detail?.tournamentStats?.[key] ?? 0}</PrizeText>
          </PrizeCard>
        ))}
      </PrizeRow>

      <StatsGrid>
        {stats.map((stat) => (
          <StatCell key={stat.title}>
            <StatTitle>{stat.title}</StatTitle>
            <StatValue>{stat.value}</StatValue>
          </StatCell>
        ))}
      </StatsGrid>
    </Container>
  );
}

// ─── Medal progress bar ───
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

  const prev =
    typeof prevGameXp === "number" ? Math.round(prevGameXp) : null;

  return (
    <ProgressWrap>
      <ArrowTrack>
        <ArrowFill style={{ width: `${fill}%` }}>
          <ArrowLabel>{fmt(Math.round(xp))}</ArrowLabel>
          <Caret />
        </ArrowFill>
      </ArrowTrack>

      <BarTrack>
        <BarFill style={{ width: `${fill}%` }} />
      </BarTrack>

      <RanksRow>
        <RankEnd style={{ alignItems: "flex-start" }}>
          <RankXp>{fmt(currentRank.xp)} CP</RankXp>
          <RankMedal src={rankMedalUrl(currentRank.icon)} alt={currentRank.name} />
          <RankName>{currentRank.name}</RankName>
        </RankEnd>

        {prev !== null && (
          <PrevBlock>
            <PrevXp $negative={prev < 0}>
              {prev < 0 ? `${fmt(prev)} CP` : `+${fmt(prev)} CP`}
            </PrevXp>
            <PrevLabel>Last Match</PrevLabel>
          </PrevBlock>
        )}

        <RankEnd style={{ alignItems: "flex-end" }}>
          <RankXp>{fmt(nextRank.xp)} CP</RankXp>
          <RankMedal src={rankMedalUrl(nextRank.icon)} alt={nextRank.name} />
          <RankName>{nextRank.name}</RankName>
        </RankEnd>
      </RanksRow>
    </ProgressWrap>
  );
}

// ─── Theme ───
const DIVIDER = "#262626";
const MUTED = "#aaa";

// ─── Styled ───
const Container = styled.div({
  paddingBottom: "40px",
});

const Heading = styled.h3({
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "#FFFFFF",
  margin: "0 0 10px",
});

const Divider = styled.div({
  height: "1px",
  background: DIVIDER,
  margin: "18px 0",
});

// Medal progress
const ProgressWrap = styled.div({
  margin: "12px 0 20px",
});

const ArrowTrack = styled.div({
  height: "22px",
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
  fontWeight: 700,
  whiteSpace: "nowrap",
});

const Caret = styled.div({
  width: 0,
  height: 0,
  borderLeft: "6px solid transparent",
  borderRight: "6px solid transparent",
  borderTop: "7px solid #FFFFFF",
  alignSelf: "flex-end",
  marginRight: "2px",
});

const BarTrack = styled.div({
  height: "20px",
  width: "100%",
  background: "#e0e0e0",
  borderRadius: "10px",
  overflow: "hidden",
  margin: "6px 0 10px",
});

const BarFill = styled.div({
  height: "100%",
  background: "linear-gradient(180deg, #FFD100, #FF7800)",
  borderRadius: "10px",
  transition: "width 1s ease-out",
});

const RanksRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const RankEnd = styled.div({
  display: "flex",
  flexDirection: "column",
  width: "40%",
  gap: "4px",
});

const RankXp = styled.span({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.85rem",
});

const RankMedal = styled.img({
  width: "24px",
  height: "24px",
  objectFit: "contain",
});

const RankName = styled.span({
  color: MUTED,
  fontSize: "0.8rem",
});

const PrevBlock = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const PrevXp = styled.span<{ $negative?: boolean }>(({ $negative }) => ({
  color: $negative ? "#ff6b6b" : "#4cd47a",
  fontSize: "1.1rem",
  fontWeight: 700,
}));

const PrevLabel = styled.span({
  color: MUTED,
  fontSize: "0.7rem",
});

// Match medals
const MedalRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  padding: "12px 0",
});

const MedalItem = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
});

const MatchMedalImg = styled.img({
  width: "56px",
  height: "56px",
  objectFit: "contain",
  "@media (max-width: 480px)": { width: "48px", height: "48px" },
});

const MedalTitle = styled.span({
  color: MUTED,
  fontSize: "0.7rem",
  textAlign: "center",
});

const MedalStat = styled.span({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.9rem",
});

// Competition prizes
const PrizeRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "6px 0 4px",
});

const PrizeCard = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
  padding: "12px 6px",
  borderRadius: "8px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgb(26, 28, 54)",
});

const PrizeImg = styled.img({
  width: "52px",
  height: "52px",
  objectFit: "contain",
  "@media (max-width: 480px)": { width: "44px", height: "44px" },
});

const PrizeText = styled.span({
  color: "#ccc",
  fontSize: "0.9rem",
  fontWeight: 700,
});

// Performance stats grid
const StatsGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  marginTop: "8px",
});

const StatCell = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
  padding: "20px 0",
  borderTop: `1px solid ${DIVIDER}`,
});

const StatTitle = styled.span({
  color: MUTED,
  fontSize: "0.85rem",
});

const StatValue = styled.span({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1.4rem",
});
