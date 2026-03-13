import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { normalizeCompetition } from "../../helpers/normalizeCompetition";
import { NormalizedCompetition } from "../../types/competition";
import Tag from "../../components/Tag";
import { ccImageEndpoint } from "../../schemas/schema";
import { CourtChampLogo, playStoreBadge, appStoreBadge } from "../../assets";
import { formatDisplayName } from "helpers/formatDisplayName";

type CompetitionRouteType = "league" | "tournament";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const JoinPage: React.FC = () => {
  const { competitionType, competitionId } = useParams<{
    competitionType: CompetitionRouteType;
    competitionId: string;
  }>();

  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!competitionType || !competitionId) return;

    const fetchCompetition = async () => {
      try {
        const collectionName =
          competitionType === "league" ? "leagues" : "tournaments";
        const ref = doc(db, collectionName, competitionId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Competition not found.");
          return;
        }

        const normalized = normalizeCompetition({
          rawData: { ...snap.data(), id: snap.id },
          competitionType,
        });
        setCompetition(normalized);
      } catch (err) {
        console.error(err);
        setError("Failed to load competition. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [competitionType, competitionId]);

  const openAppStore = () => {
    window.open(
      "https://apps.apple.com/app/court-champs/id6538725576",
      "_blank",
    );
  };

  const openPlayStore = () => {
    window.open(
      "https://play.google.com/store/apps/details?id=com.courtchamp",
      "_blank",
    );
  };

  const sortedPlayingTimes = competition?.playingTime
    ? [...competition.playingTime].sort(
        (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
      )
    : [];

  if (loading) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <SkeletonWrapper>
          <SkeletonBlock height={220} borderRadius={16} />
          <SkeletonBlock height={28} width="60%" />
          <SkeletonBlock height={18} width="40%" />
          <SkeletonRow>
            <SkeletonPill />
            <SkeletonPill />
            <SkeletonPill />
          </SkeletonRow>
          <SkeletonBlock height={80} />
          <SkeletonBlock height={100} />
        </SkeletonWrapper>
      </PageContainer>
    );
  }

  if (error || !competition) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <ErrorCard>
          <ErrorIcon>🏸</ErrorIcon>
          <ErrorTitle>Competition Not Found</ErrorTitle>
          <ErrorText>
            {error || "This competition link may have expired or been removed."}
          </ErrorText>
          <Link
            to="/"
            style={{ color: "#00A2FF", marginTop: 16, display: "block" }}
          >
            ← Back to Court Champs
          </Link>
        </ErrorCard>
      </PageContainer>
    );
  }

  const participantCount = competition.participants?.length ?? 0;
  const competitionLabel =
    competitionType === "league" ? "League" : "Tournament";
  const isFree = !competition.entryFee || competition.entryFee === 0;
  const entryLabel = isFree
    ? "Free Entry"
    : `${competition.currencyType} ${competition.entryFee} Entry`;
  const competitionImage = competition.image || ccImageEndpoint;

  const navigateToHome = () => {
    window.location.href = "/";
  };

  return (
    <PageContainer>
      <LogoImg
        src={CourtChampLogo}
        alt="Court Champs"
        onClick={navigateToHome}
      />

      {/* Hero card */}
      <HeroCard>
        <HeroImage
          src={competitionImage}
          alt={competition.name}
          isDefault={!competition.image}
        />

        <HeroOverlay />
        <HeroContent>
          <CompetitionLabel>{competitionLabel}</CompetitionLabel>
          <CompetitionName>{competition.name}</CompetitionName>
          <LocationText>
            📍 {competition.location?.courtName}, {competition.location?.city},{" "}
            {competition.location?.country}
          </LocationText>
        </HeroContent>
      </HeroCard>

      {/* Tags row */}

      <TagsRow>
        <Tag name={competition.type} color="rgba(0,162,255,0.12)" />
        <Tag name={competition.prizeType} />
        <Tag name={entryLabel} />
        <Tag
          name={`${participantCount} / ${competition.maxPlayers}`}
          icon={"person"}
          iconColor={"#00A2FF"}
        />
        {competition.privacy && <Tag name={competition.privacy} />}
      </TagsRow>

      {/* Dates */}
      <SectionCard>
        <SectionTitle>Dates</SectionTitle>
        <DateRow>
          <DateBlock>
            <DateLabel>Start Date</DateLabel>
            <DateValue>{competition.startDate || "TBC"}</DateValue>
          </DateBlock>
          {competition.prizeType === "Trophy" && (
            <>
              <DateDivider />
              <DateBlock>
                <DateLabel>End Date</DateLabel>
                <DateValue>{competition.endDate || "TBC"}</DateValue>
              </DateBlock>
            </>
          )}
        </DateRow>
      </SectionCard>

      {/* Playing times */}
      {sortedPlayingTimes.length > 0 && (
        <SectionCard>
          <SectionTitle>Playing Times</SectionTitle>
          <PlayTimeGrid>
            {sortedPlayingTimes.map((pt, i) => (
              <PlayTimeItem key={i}>
                <PlayTimeDay>{pt.day}</PlayTimeDay>
                <PlayTimeHours>
                  {pt.startTime} – {pt.endTime}
                </PlayTimeHours>
              </PlayTimeItem>
            ))}
          </PlayTimeGrid>
        </SectionCard>
      )}

      {/* Participants */}
      <SectionCard>
        <SectionTitle>
          Players ({participantCount} / {competition.maxPlayers})
        </SectionTitle>
        <ParticipantGrid>
          {competition.participants
            .slice(0, showAll ? undefined : 12)
            .map((p) => (
              <ParticipantChip key={p.userId}>
                <Avatar hasProfileImage={!!p.profileImage}>
                  {p.profileImage ? (
                    <AvatarImage
                      src={p.profileImage}
                      alt={p.username}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    (p.username || p.firstName || "?")[0].toUpperCase()
                  )}
                </Avatar>
                <ParticipantName>{formatDisplayName(p)}</ParticipantName>
              </ParticipantChip>
            ))}
          {!showAll && participantCount > 12 && (
            <ParticipantChip
              muted
              onClick={() => setShowAll(true)}
              style={{ cursor: "pointer" }}
            >
              <ParticipantName>+{participantCount - 12} more</ParticipantName>
            </ParticipantChip>
          )}
          {showAll && (
            <ParticipantChip
              muted
              onClick={() => setShowAll(false)}
              style={{ cursor: "pointer" }}
            >
              <ParticipantName>Show less</ParticipantName>
            </ParticipantChip>
          )}
        </ParticipantGrid>
      </SectionCard>

      {/* Description */}
      {competition.description ? (
        <SectionCard>
          <SectionTitle>About</SectionTitle>
          <DescriptionText>{competition.description}</DescriptionText>
        </SectionCard>
      ) : null}

      {/* CTA */}
      <CTACard>
        <CTATitle>Ready to join?</CTATitle>
        <CTASubtitle>
          Download Court Champs and join <strong>{competition.name}</strong>{" "}
          today.
        </CTASubtitle>
        <BadgeRow>
          <BadgeButton onClick={openAppStore}>
            <BadgeImage src={appStoreBadge} alt="Download on the App Store" />
          </BadgeButton>
          <BadgeButton onClick={openPlayStore}>
            <BadgeImage src={playStoreBadge} alt="Get it on Google Play" />
          </BadgeButton>
        </BadgeRow>
      </CTACard>

      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default JoinPage;

// ─── Styled Components ────────────────────────────────────────────────────────

const PageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  minHeight: "100vh",
  width: "100%",
  padding: "32px 16px 60px",
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    padding: "20px 12px 48px",
  },
});

const LogoImg = styled.img({
  width: 200,
  maxWidth: "60%",
  height: "auto",
  marginBottom: 28,
});

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HeroCard = styled.div({
  position: "relative",
  width: "100%",
  maxWidth: 680,
  borderRadius: 16,
  overflow: "hidden",
  marginBottom: 16,
  minHeight: 200,
  backgroundColor: "rgb(10, 30, 55)",
});

const HeroImage = styled.img<{ isDefault?: boolean }>(({ isDefault }) => ({
  width: "100%",
  height: 220,
  objectFit: isDefault ? "contain" : "cover",
  objectPosition: isDefault ? "right center" : "center center",
  display: "block",
}));

const HeroOverlay = styled.div({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "65%",
  background:
    "linear-gradient(to top, rgba(3,16,31,0.98) 0%, transparent 100%)",
});

const HeroContent = styled.div({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "20px 20px 18px",
});

const CompetitionLabel = styled.div({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#00A2FF",
  marginBottom: 4,
});

const CompetitionName = styled.h1({
  fontSize: 24,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 6px",
  lineHeight: 1.2,
  "@media (max-width: 480px)": {
    fontSize: 18,
  },
});

const LocationText = styled.div({
  fontSize: 13,
  color: "#aaa",
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

const TagsRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  width: "100%",
  maxWidth: 680,
  marginBottom: 16,
});

// ─── Sections ─────────────────────────────────────────────────────────────────

const SectionCard = styled.div({
  width: "100%",
  maxWidth: 680,
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "16px 18px",
  marginBottom: 12,
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    padding: "14px 14px",
    borderRadius: 10,
  },
});

const SectionTitle = styled.h3({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#00A2FF",
  margin: "0 0 12px",
});

// ─── Dates ────────────────────────────────────────────────────────────────────

const DateRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 16,
});

const DateBlock = styled.div({ flex: 1 });

const DateDivider = styled.div({
  width: 1,
  height: 36,
  backgroundColor: "rgba(255,255,255,0.1)",
});

const DateLabel = styled.div({
  fontSize: 11,
  color: "#666",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const DateValue = styled.div({
  fontSize: 15,
  color: "#fff",
  fontWeight: 600,
});

// ─── Playing Times ────────────────────────────────────────────────────────────

const PlayTimeGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
  "@media (max-width: 480px)": {
    gridTemplateColumns: "repeat(2, 1fr)",
  },
});

const PlayTimeItem = styled.div({
  backgroundColor: "rgba(0,162,255,0.06)",
  border: "1px solid rgba(0,162,255,0.15)",
  borderRadius: 8,
  padding: "8px 10px",
});

const PlayTimeDay = styled.div({
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 2,
});

const PlayTimeHours = styled.div({
  fontSize: 11,
  color: "#888",
});

// ─── Participants ─────────────────────────────────────────────────────────────

const ParticipantGrid = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
});

const ParticipantChip = styled.div<{ muted?: boolean; clickable?: boolean }>(
  ({ muted, clickable }) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: muted ? "rgba(255,255,255,0.04)" : "rgba(0,162,255,0.08)",
    border: `1px solid ${muted ? "rgba(255,255,255,0.08)" : "rgba(0,162,255,0.2)"}`,
    borderRadius: 20,
    padding: "4px 10px 4px 4px",
    cursor: clickable ? "pointer" : "default",
    transition: "opacity 0.2s",
    ":hover": clickable ? { opacity: 0.7 } : {},
  }),
);

const Avatar = styled.div<{ hasProfileImage?: boolean }>(
  ({ hasProfileImage }) => ({
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: hasProfileImage ? "transparent" : "#00A2FF",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  }),
);

const AvatarImage = styled.img({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

const ParticipantName = styled.span({
  fontSize: 12,
  color: "#ccc",
  fontWeight: 500,
});

// ─── Description ──────────────────────────────────────────────────────────────

const DescriptionText = styled.p({
  fontSize: 14,
  color: "#bbb",
  lineHeight: 1.6,
  margin: 0,
});

// ─── CTA ──────────────────────────────────────────────────────────────────────

const CTACard = styled.div({
  width: "100%",
  maxWidth: 680,
  background:
    "linear-gradient(135deg, rgba(0,162,255,0.12) 0%, rgba(0,60,120,0.2) 100%)",
  border: "1px solid rgba(0,162,255,0.25)",
  borderRadius: 16,
  padding: "28px 24px",
  marginTop: 8,
  marginBottom: 20,
  textAlign: "center",
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    padding: "22px 16px",
    borderRadius: 12,
  },
});

const CTATitle = styled.h2({
  fontSize: 22,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 8px",
  "@media (max-width: 480px)": {
    fontSize: 18,
  },
});

const CTASubtitle = styled.p({
  fontSize: 15,
  color: "#aaa",
  margin: "0 0 24px",
  lineHeight: 1.5,
  "@media (max-width: 480px)": {
    fontSize: 13,
  },
});

const BadgeRow = styled.div({
  display: "flex",
  gap: 16,
  justifyContent: "center",
  flexWrap: "wrap",
});

const BadgeButton = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  transition: "transform 0.2s",
  ":hover": { transform: "scale(1.05)" },
});

const BadgeImage = styled.img({
  height: 52,
  objectFit: "contain",
  maxWidth: 180,
  "@media (max-width: 480px)": {
    height: 42,
    maxWidth: 140,
  },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonWrapper = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "100%",
  maxWidth: 680,
});

const SkeletonBlock = styled.div<{
  height?: number;
  width?: string;
  borderRadius?: number;
}>(({ height = 20, width = "100%", borderRadius = 8 }) => ({
  height,
  width,
  borderRadius,
  backgroundColor: "rgba(255,255,255,0.07)",
  animation: "pulse 1.5s ease-in-out infinite",
  "@keyframes pulse": {
    "0%": { opacity: 0.6 },
    "50%": { opacity: 1 },
    "100%": { opacity: 0.6 },
  },
}));

const SkeletonRow = styled.div({
  display: "flex",
  gap: 8,
});

const SkeletonPill = styled.div({
  height: 28,
  width: 80,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.07)",
});

// ─── Error ────────────────────────────────────────────────────────────────────

const ErrorCard = styled.div({
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 40,
  textAlign: "center",
  maxWidth: 400,
  width: "100%",
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    padding: 24,
  },
});

const ErrorIcon = styled.div({ fontSize: 48, marginBottom: 16 });

const ErrorTitle = styled.h2({
  fontSize: 20,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 8px",
});

const ErrorText = styled.p({ fontSize: 14, color: "#888", margin: 0 });

const FooterText = styled.div({
  fontSize: 12,
  color: "#444",
  marginTop: 12,
});
