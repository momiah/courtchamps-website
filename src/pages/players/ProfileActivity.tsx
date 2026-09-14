import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { PlayerListItem } from "../../services/players";
import {
  getLeaguesForUser,
  getTournamentsForUser,
  UserCompetition,
} from "../../services/competitions";
import Tag from "../../components/Tag";

const TABS = [
  { key: "leagues", label: "Leagues" },
  { key: "tournaments", label: "Tournaments" },
  { key: "clubs", label: "Clubs" },
] as const;
type ActivityTab = (typeof TABS)[number]["key"];

const EMPTY_MESSAGES: Record<ActivityTab, string> = {
  leagues:
    "No leagues yet. Join or create a league in the app to see it here 🏟️",
  tournaments:
    "No tournaments yet. Join or create a tournament in the app to see it here 🏆",
  clubs: "Clubs are coming soon.",
};

const rankSuffix = (rank: number): string => {
  const lastTwo = rank % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

interface ProfileActivityProps {
  profile: PlayerListItem;
}

export default function ProfileActivity({ profile }: ProfileActivityProps) {
  const userId = profile.userId;

  const [tab, setTab] = useState<ActivityTab>("leagues");
  const [leagues, setLeagues] = useState<UserCompetition[] | null>(null);
  const [tournaments, setTournaments] = useState<UserCompetition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqRef = useRef(0);

  useEffect(() => {
    if (tab === "clubs") return;
    if (tab === "leagues" && leagues !== null) return;
    if (tab === "tournaments" && tournaments !== null) return;

    const requestId = ++reqRef.current;
    setLoading(true);
    setError(null);

    const fetcher = tab === "leagues" ? getLeaguesForUser : getTournamentsForUser;
    fetcher(userId)
      .then((result) => {
        if (requestId !== reqRef.current) return;
        if (tab === "leagues") setLeagues(result);
        else setTournaments(result);
      })
      .catch((fetchError) => {
        if (requestId !== reqRef.current) return;
        console.error(`Failed to load ${tab}:`, fetchError);
        setError(`Could not load ${tab}. Please try again.`);
      })
      .finally(() => {
        if (requestId === reqRef.current) setLoading(false);
      });
  }, [tab, userId, leagues, tournaments]);

  const items = tab === "leagues" ? leagues : tournaments;

  return (
    <Container>
      <SubTabs>
        {TABS.map((t) => (
          <SubTab
            key={t.key}
            $active={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </SubTab>
        ))}
      </SubTabs>

      {tab === "clubs" ? (
        <EmptyState>{EMPTY_MESSAGES.clubs}</EmptyState>
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : loading || items === null ? (
        <Centered>
          <Spinner />
        </Centered>
      ) : items.length === 0 ? (
        <EmptyState>{EMPTY_MESSAGES[tab]}</EmptyState>
      ) : (
        <List>
          {items.map((item) => (
            <CompetitionCard
              key={item.id}
              to={`/join/${item.competitionType}/${item.id}`}
            >
              {item.role && (
                <RoleBadge>
                  <Tag
                    name={item.role === "owner" ? "Owner" : "Admin"}
                    color={item.role === "owner" ? "rgb(3, 16, 31)" : "#16181B"}
                    icon={undefined}
                    fontSize={8}
                    bold
                  />
                </RoleBadge>
              )}

              <Info>
                <CompName>{item.name}</CompName>
                {item.courtName && <CourtName>{item.courtName}</CourtName>}
                <TagRow>
                  {item.status?.label && (
                    <Tag name={item.status.label} color={item.status.color} />
                  )}
                  {item.type && <Tag name={item.type} />}
                </TagRow>
              </Info>

              <StatCell>
                <StatTitle>Wins</StatTitle>
                <StatValue>{item.wins}</StatValue>
              </StatCell>
              <StatCell>
                <StatTitle>Rank</StatTitle>
                <StatValue>
                  {item.userRank || "—"}
                  {item.userRank ? <Sfx>{rankSuffix(item.userRank)}</Sfx> : null}
                </StatValue>
              </StatCell>
            </CompetitionCard>
          ))}
        </List>
      )}
    </Container>
  );
}

// ─── Theme ───
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";
const BLUE = "#00A2FF";

// ─── Styled ───
const Container = styled.div({
  paddingBottom: "40px",
});

const SubTabs = styled.div({
  display: "flex",
  gap: "8px",
  marginBottom: "18px",
  flexWrap: "wrap",
});

const SubTab = styled.button<{ $active?: boolean }>(({ $active }) => ({
  padding: "8px 16px",
  borderRadius: "20px",
  border: `1px solid ${$active ? BLUE : "rgba(255,255,255,0.15)"}`,
  background: $active ? "rgba(0,162,255,0.12)" : "transparent",
  color: $active ? "#FFFFFF" : MUTED,
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 0.2s, color 0.2s, background 0.2s",
  ":hover": { color: "#FFFFFF", borderColor: `${BLUE}88` },
}));

const List = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const CompetitionCard = styled(Link)({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  alignItems: "center",
  gap: "12px",
  padding: "16px 18px",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${BORDER}`,
  textDecoration: "none",
  color: "inherit",
  transition: "background 0.15s ease, border-color 0.15s ease",
  ":hover": { background: "rgba(0,162,255,0.06)", borderColor: `${BLUE}44` },
  "@media (max-width: 480px)": { padding: "14px 14px", gap: "8px" },
});

const RoleBadge = styled.div({
  position: "absolute",
  top: "8px",
  right: "10px",
});

const Info = styled.div({
  minWidth: 0,
  paddingRight: "8px",
});

const CompName = styled.div({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1rem",
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const CourtName = styled.div({
  color: "#ccc",
  fontSize: "0.8rem",
  marginBottom: "12px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const TagRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

const StatCell = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  minWidth: "48px",
});

const StatTitle = styled.span({
  fontSize: "0.72rem",
  color: MUTED,
});

const StatValue = styled.span({
  fontSize: "1.4rem",
  fontWeight: 800,
  color: "#FFFFFF",
  display: "inline-flex",
  alignItems: "baseline",
  "@media (max-width: 480px)": { fontSize: "1.2rem" },
});

const Sfx = styled.span({
  fontSize: "0.7rem",
  color: "rgba(255,255,255,0.7)",
  marginLeft: "1px",
});

const Centered = styled.div({
  display: "flex",
  justifyContent: "center",
  padding: "48px 0",
});

const Spinner = styled.div({
  width: "36px",
  height: "36px",
  border: `3px solid rgba(0,162,255,0.25)`,
  borderTopColor: BLUE,
  borderRadius: "50%",
  animation: "activitySpin 0.8s linear infinite",
  "@keyframes activitySpin": { to: { transform: "rotate(360deg)" } },
});

const EmptyState = styled.div({
  padding: "48px 24px",
  textAlign: "center",
  color: MUTED,
  fontStyle: "italic",
  lineHeight: 1.6,
  border: `1px dashed ${BORDER}`,
  borderRadius: "16px",
});
