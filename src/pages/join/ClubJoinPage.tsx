import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import type { Club, Player } from "courtchamps-shared/types";
import { ccImageEndpoint } from "courtchamps-shared/schema";
import { db } from "../../services/firebase.config";
import { CourtChampLogo } from "../../assets";
import Tag from "../../components/Tag";
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
  ErrorCard,
  ErrorIcon,
  ErrorTitle,
  ErrorText,
  FooterText,
  StoreBadges,
  ParticipantGrid,
  ParticipantChip,
  Avatar,
  ParticipantName,
} from "./joinParts";

const MEMBERS_SHOWN = 12;

const ClubJoinPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!clubId) {
      setError("Club not found.");
      setLoading(false);
      return;
    }

    const fetchClub = async () => {
      try {
        const [clubSnap, membersSnap] = await Promise.all([
          getDoc(doc(db, "clubs", clubId)),
          getDocs(collection(db, "clubs", clubId, "participants")),
        ]);

        if (!clubSnap.exists()) {
          setError("Club not found.");
          return;
        }

        setClub({ ...(clubSnap.data() as Club), clubId: clubSnap.id });
        setMembers(
          membersSnap.docs.map(
            (memberDoc) =>
              ({ ...memberDoc.data(), userId: memberDoc.id }) as Player,
          ),
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load club. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

  if (loading) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <SkeletonWrapper>
          <SkeletonBlock height={220} borderRadius={16} />
          <SkeletonBlock height={28} width="60%" />
          <SkeletonBlock height={18} width="40%" />
          <SkeletonBlock height={100} />
        </SkeletonWrapper>
      </PageContainer>
    );
  }

  if (error || !club) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <ErrorCard>
          <ErrorIcon>🏸</ErrorIcon>
          <ErrorTitle>Club Not Found</ErrorTitle>
          <ErrorText>
            {error || "This club link may have expired or been removed."}
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

  const memberCount = members.length;
  const location = [club.clubLocation?.city, club.clubLocation?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <PageContainer>
      <LogoImg
        src={CourtChampLogo}
        alt="Court Champs"
        onClick={() => {
          window.location.href = "/";
        }}
      />

      <HeroCard>
        <HeroImage
          src={club.clubImage || ccImageEndpoint}
          alt={club.clubName}
          isDefault={!club.clubImage}
        />
        <HeroOverlay />
        <HeroContent>
          <CompetitionLabel>Club</CompetitionLabel>
          <CompetitionName>{club.clubName}</CompetitionName>
          {location ? <LocationText>📍 {location}</LocationText> : null}
        </HeroContent>
      </HeroCard>

      <TagsRow>
        <Tag
          name={`${memberCount} ${memberCount === 1 ? "Member" : "Members"}`}
          icon={"person"}
          iconColor={"#00A2FF"}
        />
        {club.clubOwner?.username ? (
          <Tag name={`By ${club.clubOwner.username}`} />
        ) : null}
      </TagsRow>

      {memberCount > 0 ? (
        <SectionCard>
          <SectionTitle>Members ({memberCount})</SectionTitle>
          <ParticipantGrid>
            {members
              .slice(0, showAll ? undefined : MEMBERS_SHOWN)
              .map((member) => (
                <ParticipantChip key={member.userId}>
                  <Avatar>
                    {(member.username ||
                      member.firstName ||
                      "?")[0].toUpperCase()}
                  </Avatar>
                  <ParticipantName>{formatDisplayName(member)}</ParticipantName>
                </ParticipantChip>
              ))}
            {memberCount > MEMBERS_SHOWN ? (
              <ParticipantChip
                muted
                clickable
                onClick={() => setShowAll((shown) => !shown)}
              >
                <ParticipantName>
                  {showAll
                    ? "Show less"
                    : `+${memberCount - MEMBERS_SHOWN} more`}
                </ParticipantName>
              </ParticipantChip>
            ) : null}
          </ParticipantGrid>
        </SectionCard>
      ) : null}

      {club.clubDescription ? (
        <SectionCard>
          <SectionTitle>About</SectionTitle>
          <DescriptionText>{club.clubDescription}</DescriptionText>
        </SectionCard>
      ) : null}

      <CTACard>
        <CTATitle>Ready to join?</CTATitle>
        <CTASubtitle>
          Download Court Champs and request to join{" "}
          <strong>{club.clubName}</strong> today.
        </CTASubtitle>
        <StoreBadges />
      </CTACard>

      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default ClubJoinPage;
