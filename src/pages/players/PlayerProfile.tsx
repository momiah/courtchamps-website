import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { FaEye, FaGlobe, FaChevronLeft } from "react-icons/fa";

import { CourtChampLogoIcon } from "../../assets";
import {
  getPlayerProfile,
  PlayerListItem,
} from "../../services/players";
import { findRankIndex, getRankByXp, rankMedalUrl } from "../../utils/ranks";
import ProfilePerformance from "./ProfilePerformance";

const TABS = ["Performance", "Profile", "Activity", "Videos"] as const;
type Tab = (typeof TABS)[number];

const fmt = (value: number): string =>
  Number(value || 0).toLocaleString("en-US");

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

const flagUrl = (countryCode?: string): string | null =>
  countryCode ? `https://flagcdn.com/h20/${countryCode.toLowerCase()}.png` : null;

export default function PlayerProfile() {
  const { userId } = useParams<{ userId: string }>();

  const [profile, setProfile] = useState<PlayerListItem | null>(null);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [countryRank, setCountryRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("Performance");

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    getPlayerProfile(userId)
      .then((result) => {
        if (!active) return;
        if (!result.profile) {
          setNotFound(true);
          return;
        }
        setProfile(result.profile);
        setGlobalRank(result.globalRank);
        setCountryRank(result.countryRank);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load profile:", error);
        setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <PageContainer>
        <BackLink to="/players">
          <FaChevronLeft /> Players
        </BackLink>
        <Centered>
          <Spinner />
        </Centered>
      </PageContainer>
    );
  }

  if (notFound || !profile) {
    return (
      <PageContainer>
        <BackLink to="/players">
          <FaChevronLeft /> Players
        </BackLink>
        <Centered>This profile no longer exists.</Centered>
      </PageContainer>
    );
  }

  const detail = profile.profileDetail;
  const xp = detail?.XP ?? 0;
  const medal = getRankByXp(xp);
  const level = findRankIndex(xp) + 1;
  const pd = detail?.totalPointDifference ?? 0;
  const flag = flagUrl(profile.location?.countryCode);

  return (
    <PageContainer>
      <BackLink to="/players">
        <FaChevronLeft /> Players
      </BackLink>

      <Card>
        <Overview>
          <PlayerDetail>
            <Avatar
              src={profile.profileImage || CourtChampLogoIcon}
              alt=""
              onError={(event) => {
                event.currentTarget.src = CourtChampLogoIcon;
              }}
            />
            <DetailColumn>
              <PlayerName>{profile.username}</PlayerName>
              <DetailText>{fmt(Math.round(xp))} CP</DetailText>
              <PdText $negative={pd < 0}>
                {pd > 0 ? "+" : ""}
                {fmt(pd)} PD
              </PdText>
            </DetailColumn>
          </PlayerDetail>

          <MedalColumn>
            <BigMedal src={rankMedalUrl(medal.icon)} alt={medal.name} />
            <MedalName>{medal.name}</MedalName>
            <MedalLevel>( Level {level} )</MedalLevel>
          </MedalColumn>
        </Overview>

        {profile.headline && <Headline>{profile.headline}</Headline>}

        <Summary>
          <SummaryItem>
            <FaGlobe color="#aaa" />
            <SummaryValue>
              {globalRank ? (
                <>
                  {globalRank}
                  <Sfx>{rankSuffix(globalRank)}</Sfx>
                </>
              ) : (
                "—"
              )}
            </SummaryValue>
          </SummaryItem>

          <SummaryItem>
            {flag ? <FlagImg src={flag} alt="" /> : <FaGlobe color="#aaa" />}
            <SummaryValue>
              {countryRank ? (
                <>
                  {countryRank}
                  <Sfx>{rankSuffix(countryRank)}</Sfx>
                </>
              ) : (
                "—"
              )}
            </SummaryValue>
          </SummaryItem>

          <SummaryItem>
            <SummaryValue>{fmt(profile.profileViews ?? 0)}</SummaryValue>
            <FaEye color="#aaa" />
          </SummaryItem>
        </Summary>

        <TabBar>
          {TABS.map((name) => (
            <TabButton
              key={name}
              $active={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
            </TabButton>
          ))}
        </TabBar>

        <TabContent>
          {tab === "Performance" ? (
            <ProfilePerformance profile={profile} />
          ) : (
            <ComingSoon>{tab} — coming soon.</ComingSoon>
          )}
        </TabContent>
      </Card>
    </PageContainer>
  );
}

// ─── Theme ───
const BLUE = "#00A2FF";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#aaa";

// ─── Styled ───
const PageContainer = styled.div({
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  padding: "24px 24px 80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const BackLink = styled(Link)({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  alignSelf: "flex-start",
  width: "100%",
  maxWidth: "760px",
  margin: "0 auto 16px",
  color: BLUE,
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});

const Centered = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "50vh",
  color: MUTED,
});

const Spinner = styled.div({
  width: "40px",
  height: "40px",
  border: `3px solid rgba(0,162,255,0.25)`,
  borderTopColor: BLUE,
  borderRadius: "50%",
  animation: "profileSpin 0.8s linear infinite",
  "@keyframes profileSpin": { to: { transform: "rotate(360deg)" } },
});

const Card = styled.div({
  width: "100%",
  maxWidth: "760px",
});

const Overview = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "8px 0 16px",
});

const PlayerDetail = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "18px",
  minWidth: 0,
});

const Avatar = styled.img({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  objectFit: "cover",
  border: `2px solid ${BLUE}`,
  backgroundColor: "#07111f",
  flexShrink: 0,
  "@media (max-width: 480px)": { width: "64px", height: "64px" },
});

const DetailColumn = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

const PlayerName = styled.div({
  fontSize: "1.6rem",
  fontWeight: 800,
  color: "#FFFFFF",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media (max-width: 480px)": { fontSize: "1.3rem" },
});

const DetailText = styled.div({
  color: MUTED,
  fontSize: "0.9rem",
});

const PdText = styled.div<{ $negative?: boolean }>(({ $negative }) => ({
  color: $negative ? "#ff6b6b" : "#4cd47a",
  fontSize: "0.9rem",
  fontWeight: 700,
}));

const MedalColumn = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
});

const BigMedal = styled.img({
  width: "80px",
  height: "80px",
  objectFit: "contain",
  "@media (max-width: 480px)": { width: "64px", height: "64px" },
});

const MedalName = styled.div({
  color: "#FFFFFF",
  fontSize: "0.8rem",
});

const MedalLevel = styled.div({
  color: "#cdcdcd",
  fontStyle: "italic",
  fontSize: "0.75rem",
});

const Headline = styled.div({
  color: "#FFFFFF",
  fontSize: "0.9rem",
  marginBottom: "14px",
});

const Summary = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  borderRadius: "8px",
  background: "rgba(0,0,0,0.3)",
  marginBottom: "18px",
});

const SummaryItem = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

const SummaryValue = styled.span({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1.05rem",
  display: "inline-flex",
  alignItems: "baseline",
});

const Sfx = styled.span({
  color: "rgba(255,255,255,0.7)",
  fontSize: "0.7rem",
  marginLeft: "1px",
});

const FlagImg = styled.img({
  height: "16px",
  width: "auto",
  borderRadius: "2px",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
});

const TabBar = styled.div({
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "4px 0 14px",
});

const TabButton = styled.button<{ $active?: boolean }>(({ $active }) => ({
  flex: "1 0 auto",
  minWidth: "22%",
  padding: "9px 16px",
  borderRadius: "20px",
  border: `${$active ? 2 : 1}px solid ${$active ? BLUE : "rgba(255,255,255,0.5)"}`,
  background: $active ? "rgba(0,162,255,0.12)" : "transparent",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 0.2s, border-color 0.2s",
  ":hover": { borderColor: BLUE },
}));

const TabContent = styled.div({
  borderTop: `1px solid ${BORDER}`,
  paddingTop: "8px",
});

const ComingSoon = styled.div({
  padding: "48px 16px",
  textAlign: "center",
  color: MUTED,
});
