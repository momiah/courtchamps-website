import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { FaEye, FaGlobe, FaChevronLeft } from "react-icons/fa";

import { CourtChampLogoIcon } from "../../assets";
import { getPlayerProfile, PlayerListItem } from "../../services/players";
import { findRankIndex, getRankByXp, rankMedalUrl } from "../../utils/ranks";
import ProfilePerformance from "./ProfilePerformance";
import ProfileAbout from "./ProfileAbout";
import ProfileActivity from "./ProfileActivity";
import ProfileVideos from "./ProfileVideos";

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

const ordinal = (rank: number | null): React.ReactNode =>
  rank ? (
    <>
      {rank}
      <Sub>{rankSuffix(rank)}</Sub>
    </>
  ) : (
    "—"
  );

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
        <Inner>
          <BackLink to="/players">
            <FaChevronLeft /> Players
          </BackLink>
          <Centered>
            <Spinner />
          </Centered>
        </Inner>
      </PageContainer>
    );
  }

  if (notFound || !profile) {
    return (
      <PageContainer>
        <Inner>
          <BackLink to="/players">
            <FaChevronLeft /> Players
          </BackLink>
          <Centered>This profile no longer exists.</Centered>
        </Inner>
      </PageContainer>
    );
  }

  const detail = profile.profileDetail;
  const xp = detail?.XP ?? 0;
  const medal = getRankByXp(xp);
  const level = findRankIndex(xp) + 1;
  const flag = flagUrl(profile.location?.countryCode);
  const locationText = [profile.location?.city, profile.location?.country]
    .filter(Boolean)
    .join(", ");

  const kpis = [
    { label: "Global Rank", value: ordinal(globalRank), icon: <FaGlobe /> },
    {
      label: "Country Rank",
      value: ordinal(countryRank),
      icon: flag ? <FlagImg src={flag} alt="" /> : <FaGlobe />,
    },
    { label: "Profile Views", value: fmt(profile.profileViews ?? 0), icon: <FaEye /> },
  ];

  return (
    <PageContainer>
      <Inner>
        <BackLink to="/players">
          <FaChevronLeft /> Players
        </BackLink>

        {/* ── Hero banner ── */}
        <Banner>
          <BannerGlow />
          <BannerLeft>
            <AvatarRing>
              <Avatar
                src={profile.profileImage || CourtChampLogoIcon}
                alt=""
                onError={(event) => {
                  event.currentTarget.src = CourtChampLogoIcon;
                }}
              />
            </AvatarRing>
            <Identity>
              <PlayerName>{profile.username}</PlayerName>
              <MetaRow>
                {locationText && (
                  <Meta>
                    {flag && <FlagImg src={flag} alt="" />}
                    {locationText}
                  </Meta>
                )}
                {profile.headline && <Headline>“{profile.headline}”</Headline>}
              </MetaRow>
            </Identity>
          </BannerLeft>

          <MedalBadge>
            <BigMedal src={rankMedalUrl(medal.icon)} alt={medal.name} />
            <MedalName>{medal.name}</MedalName>
            <MedalLevel>Level {level}</MedalLevel>
          </MedalBadge>
        </Banner>

        {/* ── KPI strip ── */}
        <KpiStrip>
          {kpis.map((kpi) => (
            <KpiTile key={kpi.label}>
              <KpiLabel>
                {kpi.icon && <KpiIcon>{kpi.icon}</KpiIcon>}
                {kpi.label}
              </KpiLabel>
              <KpiValue>{kpi.value}</KpiValue>
            </KpiTile>
          ))}
        </KpiStrip>

        {/* ── Tabs ── */}
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

        {/* ── Tab content ── */}
        {tab === "Performance" && <ProfilePerformance profile={profile} />}
        {tab === "Profile" && <ProfileAbout profile={profile} />}
        {tab === "Activity" && <ProfileActivity profile={profile} />}
        {tab === "Videos" && (
          <ProfileVideos
            userId={profile.userId}
            firstName={profile.firstName}
          />
        )}
      </Inner>
    </PageContainer>
  );
}

// ─── Theme ───
const BLUE = "#00A2FF";
const PANEL = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";

// ─── Styled ───
const PageContainer = styled.div({
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  padding: "24px 24px 80px",
  display: "flex",
  justifyContent: "center",
});

const Inner = styled.div({
  width: "100%",
  maxWidth: "1080px",
});

const BackLink = styled(Link)({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "16px",
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

// Hero banner
const Banner = styled.div({
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "28px 32px",
  borderRadius: "20px",
  border: `1px solid ${BORDER}`,
  background:
    "linear-gradient(120deg, #0b2138 0%, #0a1a2e 55%, #0c2b45 100%)",
  // Keep the avatar and rank medal side by side on mobile (like the app),
  // rather than stacking the medal underneath.
  "@media (max-width: 640px)": {
    padding: "18px 16px",
    gap: "12px",
  },
});

const BannerGlow = styled.div({
  position: "absolute",
  top: "-120px",
  right: "-80px",
  width: "380px",
  height: "380px",
  background: `radial-gradient(circle, ${BLUE}33 0%, transparent 65%)`,
  pointerEvents: "none",
});

const BannerLeft = styled.div({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "22px",
  minWidth: 0,
  "@media (max-width: 640px)": { gap: "12px" },
});

const AvatarRing = styled.div({
  padding: "4px",
  borderRadius: "50%",
  background: `linear-gradient(145deg, ${BLUE}, #0057FF)`,
  flexShrink: 0,
});

const Avatar = styled.img({
  display: "block",
  width: "104px",
  height: "104px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid rgb(3,16,31)",
  backgroundColor: "#07111f",
  "@media (max-width: 640px)": { width: "48px", height: "48px" },
});

const Identity = styled.div({ minWidth: 0 });

const PlayerName = styled.h1({
  fontSize: "2rem",
  fontWeight: 800,
  margin: "0 0 8px",
  letterSpacing: "-0.5px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media (max-width: 640px)": {
    fontSize: "1.15rem",
    margin: "0 0 4px",
    // Let the name show in full rather than truncating in the tight row.
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
    overflowWrap: "anywhere",
  },
});

const MetaRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px 16px",
  minWidth: 0,
});

const Meta = styled.div({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: MUTED,
  fontSize: "0.9rem",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media (max-width: 640px)": {
    fontSize: "0.8rem",
    // Allow the location to wrap fully instead of being clipped.
    overflow: "visible",
    textOverflow: "clip",
    whiteSpace: "normal",
  },
});

const Headline = styled.div({
  color: "#c7d4e1",
  fontSize: "0.9rem",
  fontStyle: "italic",
  // Hide in the tight mobile header row to keep the avatar/medal row clean.
  "@media (max-width: 640px)": { display: "none" },
});

const MedalBadge = styled.div({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  flexShrink: 0,
  textAlign: "center",
  "@media (max-width: 640px)": { maxWidth: "100px" },
});

const BigMedal = styled.img({
  width: "104px",
  height: "104px",
  objectFit: "contain",
  "@media (max-width: 640px)": { width: "48px", height: "48px" },
});

const MedalName = styled.div({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1rem",
  "@media (max-width: 640px)": { fontSize: "0.85rem" },
});

const MedalLevel = styled.div({
  color: MUTED,
  fontSize: "0.8rem",
  "@media (max-width: 640px)": { fontSize: "0.72rem" },
});

// KPI strip
const KpiStrip = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px",
  margin: "16px 0 24px",
  "@media (max-width: 560px)": { gridTemplateColumns: "1fr" },
});

const KpiTile = styled.div({
  padding: "16px",
  borderRadius: "14px",
  background: PANEL,
  border: `1px solid ${BORDER}`,
});

const KpiLabel = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: MUTED,
  fontSize: "0.72rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: "8px",
});

const KpiIcon = styled.span({
  display: "inline-flex",
  color: BLUE,
  fontSize: "0.85rem",
});

const KpiValue = styled.div({
  display: "inline-flex",
  alignItems: "baseline",
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "#FFFFFF",
});

const Sub = styled.span({
  color: "rgba(255,255,255,0.6)",
  fontSize: "0.8rem",
  marginLeft: "2px",
});

const FlagImg = styled.img({
  height: "14px",
  width: "auto",
  borderRadius: "2px",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
});

// Tabs (underline style)
const TabBar = styled.div({
  display: "flex",
  gap: "4px",
  borderBottom: `1px solid ${BORDER}`,
  marginBottom: "24px",
  overflowX: "auto",
});

const TabButton = styled.button<{ $active?: boolean }>(({ $active }) => ({
  position: "relative",
  padding: "12px 18px",
  border: "none",
  background: "none",
  color: $active ? "#FFFFFF" : MUTED,
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "color 0.2s",
  ":hover": { color: "#FFFFFF" },
  ":after": {
    content: '""',
    position: "absolute",
    left: "12px",
    right: "12px",
    bottom: "-1px",
    height: "3px",
    borderRadius: "3px 3px 0 0",
    background: $active ? BLUE : "transparent",
  },
}));

