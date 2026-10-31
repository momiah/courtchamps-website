import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  formatCurrency,
  getLadderEntryPrice,
  getLadderPlayoffStructure,
} from "courtchamps-shared";
import {
  formatLadderPrizePool,
  getFullLadderPrizeTable,
  getLadderEntrantNoun,
  isCashLadder,
} from "courtchamps-shared/helpers";
import { LADDER_PRE_REGISTRATION_STATUS } from "courtchamps-shared/types";
import type { LadderPreRegistration } from "courtchamps-shared/types";
import { ccImageEndpoint } from "courtchamps-shared/schema";

import { CourtChampLogo } from "../../assets";
import Tag from "../../components/Tag";
import LadderHowItWorks from "./LadderHowItWorks";
import {
  countLadderPreRegistrants,
  fetchLadderPreRegistration,
} from "../../services/ladderPreRegistrations";
import {
  CTACard,
  CTASubtitle,
  CTATitle,
  CompetitionLabel,
  CompetitionName,
  ErrorCard,
  ErrorIcon,
  ErrorText,
  ErrorTitle,
  FooterText,
  HeroCard,
  HeroContent,
  HeroImage,
  HeroOverlay,
  LocationText,
  LogoImg,
  PageContainer,
  SectionCard,
  SectionTitle,
  SkeletonBlock,
  SkeletonWrapper,
  StoreBadges,
  TagsRow,
} from "./joinParts";

/** The page a shared pre-registration link opens: the prize, how it works and the store links. */
const LadderPreRegistrationJoinPage: React.FC = () => {
  const { preRegistrationId } = useParams<{ preRegistrationId: string }>();
  const [preRegistration, setPreRegistration] =
    useState<LadderPreRegistration | null>(null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!preRegistrationId) return;
    const load = async () => {
      try {
        const [found, count] = await Promise.all([
          fetchLadderPreRegistration(preRegistrationId),
          countLadderPreRegistrants(preRegistrationId).catch(() => 0),
        ]);
        setPreRegistration(found);
        setRegisteredCount(count);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [preRegistrationId]);

  if (loading) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <SkeletonWrapper>
          <SkeletonBlock height={220} borderRadius={16} />
          <SkeletonBlock height={48} width="50%" />
          <SkeletonBlock height={200} />
          <SkeletonBlock height={140} />
        </SkeletonWrapper>
      </PageContainer>
    );
  }

  if (
    !preRegistration ||
    preRegistration.status === LADDER_PRE_REGISTRATION_STATUS.CLOSED
  ) {
    return (
      <PageContainer>
        <LogoImg src={CourtChampLogo} alt="Court Champs" />
        <ErrorCard>
          <ErrorIcon>🏸</ErrorIcon>
          <ErrorTitle>Ladder Not Found</ErrorTitle>
          <ErrorText>
            This ladder isn&apos;t open for pre-registration.
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

  const cash = isCashLadder(preRegistration);
  const noun = getLadderEntrantNoun(preRegistration.ladderType);
  const { playoffSpots, inTheMoney } = getLadderPlayoffStructure(
    preRegistration.maxPlayers,
  );
  const launched =
    preRegistration.status === LADDER_PRE_REGISTRATION_STATUS.LAUNCHED;
  const { entryFee, platformFee } = getLadderEntryPrice(
    preRegistration.entryFee,
  );
  const money = (amount: number) =>
    formatCurrency(amount, preRegistration.currencyType);
  const places = preRegistration.maxPlayers.toLocaleString("en-GB");

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
          src={preRegistration.image || ccImageEndpoint}
          alt={preRegistration.name}
          isDefault={!preRegistration.image}
        />
        <HeroOverlay />
        <HeroContent>
          <CompetitionLabel>
            {launched ? "Ladder · now open" : "Ladder · coming soon"}
          </CompetitionLabel>
          <CompetitionName>{preRegistration.name}</CompetitionName>
          {preRegistration.region ? (
            <LocationText>📍 {preRegistration.region}</LocationText>
          ) : null}
        </HeroContent>
      </HeroCard>

      <PrizeCard>
        <PrizeLabel>Up to</PrizeLabel>
        <PrizeAmount>{formatLadderPrizePool(preRegistration)}</PrizeAmount>
        <PrizeLabel>
          to be won with a full ladder of {places} {noun}s
        </PrizeLabel>
      </PrizeCard>

      <TagsRow>
        <Tag name={preRegistration.ladderType} color="rgba(0,162,255,0.12)" />
        <Tag name={cash ? `${money(entryFee)}* entry` : "Free entry"} />
        <Tag name={`${places} places`} icon="person" iconColor="#00A2FF" />
        {registeredCount > 0 ? (
          <Tag
            name={`${registeredCount.toLocaleString("en-GB")} pre-registered`}
          />
        ) : null}
      </TagsRow>

      <SectionCard>
        <SectionTitle>Prize breakdown</SectionTitle>
        <PrizeTable>
          <thead>
            <tr>
              <th>Finish</th>
              {cash ? <th>Cash</th> : null}
              <th>CP</th>
            </tr>
          </thead>
          <tbody>
            {getFullLadderPrizeTable(preRegistration).map((row) => (
              <tr key={row.fromPlace}>
                <PlaceCell>{row.label}</PlaceCell>
                {cash ? <CashCell>{money(row.cash)}</CashCell> : null}
                <td>{row.cp.toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </PrizeTable>
        <Note>
          The prize pool grows with every {noun} who joins. Payouts shown are
          for a full ladder.
        </Note>
      </SectionCard>

      <LadderHowItWorks
        noun={noun}
        maxPlayers={preRegistration.maxPlayers}
        playoffSpots={playoffSpots}
        inTheMoney={inTheMoney}
        cash={cash}
        prizePool={formatLadderPrizePool(preRegistration)}
        firstEntrant={registeredCount === 0}
      />

      <CTACard>
        <CTATitle>{launched ? "Registration is open" : "Be first in"}</CTATitle>
        <CTASubtitle>
          {launched ? (
            <>
              Download Court Champs and join{" "}
              <strong>{preRegistration.name}</strong> in the app.
            </>
          ) : (
            <>
              Download Court Champs, sign in and pre-register for{" "}
              <strong>{preRegistration.name}</strong>. Nothing to pay today.
            </>
          )}
        </CTASubtitle>
        <StoreBadges />
      </CTACard>

      {cash ? (
        <Note style={{ maxWidth: 680, textAlign: "center" }}>
          *A {money(platformFee)} platform fee is added on top of the{" "}
          {money(entryFee)} entry. The full entry fee goes into the prize pool.
          18+ only.
        </Note>
      ) : null}

      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default LadderPreRegistrationJoinPage;

const PrizeCard = styled.div({
  width: "100%",
  maxWidth: 680,
  textAlign: "center",
  border: "1.5px solid #ffc800",
  borderRadius: 14,
  padding: "18px 16px",
  marginBottom: 16,
  boxSizing: "border-box",
  backgroundColor: "rgba(255,200,0,0.06)",
});

const PrizeLabel = styled.div({
  fontSize: 14,
  color: "#c9d6e3",
});

const PrizeAmount = styled.div({
  fontSize: 44,
  fontWeight: 800,
  color: "#ffc800",
  lineHeight: 1.15,
  margin: "2px 0",
  "@media (max-width: 480px)": {
    fontSize: 36,
  },
});

const PrizeTable = styled.table({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  "th, td": {
    textAlign: "left",
    padding: "10px 6px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  th: {
    color: "#9fb8c8",
    fontWeight: 600,
    fontSize: 12,
    borderTop: "none",
  },
  td: { color: "#fff", fontWeight: 600 },
});

const PlaceCell = styled.td({ color: "#00A2FF !important" });

const CashCell = styled.td({ color: "#ffc800 !important" });

const Note = styled.p({
  fontSize: 12,
  color: "#8a9bab",
  lineHeight: 1.5,
  margin: "10px 0 0",
});
