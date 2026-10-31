import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { normalizeCompetition } from "../../helpers/normalizeCompetition";
import { NormalizedCompetition } from "courtchamps-shared/types";
import Tag from "../../components/Tag";
import { ccImageEndpoint } from "courtchamps-shared/schema";
import { CourtChampLogo } from "../../assets";
import { formatDisplayName } from "helpers/formatDisplayName";
import {
  PageContainer,
  LogoImg,
  HeroCard,
  HeroImage,
  HeroOverlay,
  HeroContent,
  CompetitionLabel,
  CompetitionName,
  LocationText,
  TagsRow,
  SectionCard,
  SectionTitle,
  DescriptionText,
  CTACard,
  CTATitle,
  CTASubtitle,
  SkeletonWrapper,
  SkeletonBlock,
  SkeletonRow,
  SkeletonPill,
  ErrorCard,
  ErrorIcon,
  ErrorTitle,
  ErrorText,
  FooterText,
  StoreBadges,
} from "./joinParts";

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
          {competitionType === "league" && (
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
        <StoreBadges />
      </CTACard>

      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default JoinPage;

// ─── Styled Components ────────────────────────────────────────────────────────

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
