import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  IoArrowForward,
  IoCashOutline,
  IoGitNetworkOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
  IoShareSocialOutline,
} from "react-icons/io5";
import {
  LADDER_MIN_ENTRANTS_TO_START,
  formatCurrency,
  formatLadderPrizePool,
  getLadderEntrantNoun,
  getLadderEntryPrice,
  getLadderLocation,
  getLadderName,
  getLadderPreRegistrationJoinPath,
  isCashLadder,
} from "courtchamps-shared/helpers";
import {
  LADDER_CANCELLED_REFUND,
  PAID_LADDER_AGE_BADGE,
  PLATFORM_FEE_PERCENT,
} from "courtchamps-shared";
import type { LadderPreRegistration } from "courtchamps-shared/types";

import { ladderTrophies } from "../../assets";
import {
  countLadderPreRegistrants,
  fetchOpenLadderPreRegistrations,
} from "../../services/ladderPreRegistrations";

export const SEASON_ONE_ANCHOR = "season-one";

const palette = {
  navy: "#041426",
  card: "#071b30",
  cardHover: "#0c2137",
  blue: "#00A2FF",
  gold: "#ffc800",
  body: "#c9d6e3",
  muted: "#93a7bd",
  panelBorder: "rgba(255, 255, 255, 0.08)",
};

type OpenLadder = LadderPreRegistration & { registeredCount: number };

const loadOpenLadders = async (): Promise<OpenLadder[]> => {
  const preRegistrations = await fetchOpenLadderPreRegistrations();
  return Promise.all(
    preRegistrations.map(async (preRegistration) => ({
      ...preRegistration,
      registeredCount: await countLadderPreRegistrants(
        preRegistration.preRegistrationId,
      ).catch(() => 0),
    })),
  );
};

const useOpenLadders = () => {
  const [ladders, setLadders] = useState<OpenLadder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadOpenLadders()
      .then((found) => {
        if (active) setLadders(found);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { ladders, loading };
};

const LadderCard: React.FC<{ ladder: OpenLadder }> = ({ ladder }) => {
  const cash = isCashLadder(ladder);
  const { entryFee, platformFee } = getLadderEntryPrice(ladder.entryFee);
  const money = (amount: number) => formatCurrency(amount, ladder.currencyType);
  const noun = getLadderEntrantNoun(ladder.ladderType);
  const name = getLadderName(ladder);

  return (
    <Card to={getLadderPreRegistrationJoinPath(ladder.preRegistrationId)}>
      <CardHead>
        <div>
          <CardName>{name}</CardName>
          <CardLocation>{getLadderLocation(ladder)}</CardLocation>
        </div>
        <CardTrophy src={ladderTrophies[0]} alt="" />
      </CardHead>
      <PoolLabel>Prize pool up to</PoolLabel>
      <PoolAmount>{formatLadderPrizePool(ladder)}</PoolAmount>
      <Pills>
        <Pill>{ladder.ladderType}</Pill>
        <Pill $gold={cash}>
          {cash
            ? `${money(entryFee)} entry + ${money(platformFee)} fee`
            : "Free entry"}
        </Pill>
        <Pill>
          {ladder.maxPlayers.toLocaleString("en-GB")} {noun} places
        </Pill>
        {ladder.registeredCount > 0 ? (
          <Pill>
            {ladder.registeredCount.toLocaleString("en-GB")} pre-registered
          </Pill>
        ) : null}
      </Pills>
      <CardAction>
        View ladder <IoArrowForward />
      </CardAction>
    </Card>
  );
};

const OpenLadders: React.FC<{ ladders: OpenLadder[]; loading: boolean }> = ({
  ladders,
  loading,
}) => {
  if (loading) {
    return (
      <CardGrid>
        <SkeletonCard />
        <SkeletonCard />
      </CardGrid>
    );
  }

  if (ladders.length === 0) {
    return (
      <EmptyCard>
        New ladders are on the way. Download Court Champs to hear first when
        pre-registration opens near you.
      </EmptyCard>
    );
  }

  return (
    <CardGrid>
      {ladders.map((ladder) => (
        <LadderCard key={ladder.preRegistrationId} ladder={ladder} />
      ))}
    </CardGrid>
  );
};

const steps = [
  {
    icon: IoPersonAddOutline,
    title: "Pre-register free",
    text: "Lock in your place now. Nothing to pay today.",
  },
  {
    icon: IoPeopleOutline,
    title: "Play starts",
    text: `Matches open once ${LADDER_MIN_ENTRANTS_TO_START} players have joined. If not, the ladder is cancelled and every entry is ${LADDER_CANCELLED_REFUND}.`,
  },
  {
    icon: IoGitNetworkOutline,
    title: "Playoffs",
    text: "The top of the ladder plays a knockout for the title and the top prize.",
  },
];

const SeasonOne: React.FC = () => {
  const { ladders, loading } = useOpenLadders();
  const guideLadder = ladders[0];

  return (
    <>
      <Section id={SEASON_ONE_ANCHOR}>
        <Eyebrow data-aos="fade-up">Pre-register now</Eyebrow>
        <Title data-aos="fade-up">Season One ladders</Title>
        <Lead data-aos="fade-up">
          Pre-register free and lock in your place before play starts. Nothing
          to pay today.
        </Lead>
        <OpenLadders ladders={ladders} loading={loading} />
        <StepGrid>
          {steps.map(({ icon: Icon, title, text }, i) => (
            <Step key={title} data-aos="fade-up" data-aos-delay={i * 100}>
              <StepIcon>
                <Icon />
              </StepIcon>
              <div>
                <StepTitle>{title}</StepTitle>
                <StepText>{text}</StepText>
              </div>
            </Step>
          ))}
        </StepGrid>
        {guideLadder ? (
          <GuideLink
            to={getLadderPreRegistrationJoinPath(guideLadder.preRegistrationId)}
          >
            See how ladders work <IoArrowForward />
          </GuideLink>
        ) : null}
      </Section>

      <Section>
        <Eyebrow data-aos="fade-up">Ladder types</Eyebrow>
        <Title data-aos="fade-up">Play for cash or for glory</Title>
        <TypeGrid>
          <TypeCard $gold data-aos="fade-up">
            <TypeHead $gold>
              <IoCashOutline /> Cash ladders <AgeBadge>{PAID_LADDER_AGE_BADGE}</AgeBadge>
            </TypeHead>
            <TypeText>
              The full entry fee goes into the prize pool, so the pot grows with
              every player who joins. A {PLATFORM_FEE_PERCENT} platform fee is
              added on top of the entry. If a ladder doesn&apos;t reach its
              minimum players, it&apos;s cancelled and every entry is{" "}
              {LADDER_CANCELLED_REFUND}.
            </TypeText>
          </TypeCard>
          <TypeCard data-aos="fade-up" data-aos-delay={100}>
            <TypeHead>
              <IoPeopleOutline /> Community ladders{" "}
              <SoonBadge>Coming soon</SoonBadge>
            </TypeHead>
            <TypeText>
              Free to enter. Same ladder, same matchmaking, same playoffs.
              Compete for CP, trophies and bragging rights.
            </TypeText>
          </TypeCard>
        </TypeGrid>
      </Section>

      <InviteBand data-aos="fade-up">
        <InviteIcon>
          <IoShareSocialOutline />
        </InviteIcon>
        <InviteTitle>Bring your rivals</InviteTitle>
        <InviteText>
          Pre-register in the app, then share your ladder link. More players
          means a bigger prize pool and more opponents to climb past.
        </InviteText>
      </InviteBand>
    </>
  );
};

export default SeasonOne;

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const Section = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "1120px",
  padding: "56px 0",
  scrollMarginTop: "24px",
  "@media (max-width: 480px)": { padding: "40px 0" },
});

const Eyebrow = styled.div({
  textTransform: "uppercase",
  letterSpacing: "2.5px",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: palette.blue,
  marginBottom: "12px",
});

const Title = styled.h2({
  fontSize: "2.4rem",
  fontWeight: 800,
  textAlign: "center",
  margin: "0 0 16px",
  letterSpacing: "-0.5px",
  "@media (max-width: 480px)": { fontSize: "1.8rem" },
});

const Lead = styled.p({
  fontSize: "1.1rem",
  lineHeight: 1.6,
  color: palette.muted,
  textAlign: "center",
  maxWidth: "560px",
  margin: "0 0 36px",
});

const CardGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "20px",
  width: "100%",
  maxWidth: "880px",
});

const Card = styled(Link)({
  display: "flex",
  flexDirection: "column",
  padding: "24px",
  borderRadius: "20px",
  background: palette.card,
  border: `1px solid ${palette.panelBorder}`,
  color: "#fff",
  textDecoration: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease, background 0.2s ease",
  ":hover": {
    background: palette.cardHover,
    borderColor: `${palette.gold}88`,
  },
});

const CardHead = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "18px",
});

const CardName = styled.h3({
  fontSize: "1.3rem",
  fontWeight: 700,
  margin: 0,
});

const CardLocation = styled.div({
  fontSize: "0.9rem",
  color: palette.muted,
  marginTop: "4px",
});

const CardTrophy = styled.img({
  width: "52px",
  height: "52px",
  objectFit: "contain",
  flexShrink: 0,
});

const PoolLabel = styled.div({
  fontSize: "0.85rem",
  color: palette.body,
});

const PoolAmount = styled.div({
  fontSize: "2.4rem",
  fontWeight: 800,
  color: palette.gold,
  lineHeight: 1.1,
  margin: "2px 0 16px",
  fontVariantNumeric: "tabular-nums",
});

const Pills = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

const Pill = styled.span<{ $gold?: boolean }>(({ $gold }) => ({
  fontSize: "0.8rem",
  fontWeight: 600,
  padding: "5px 11px",
  borderRadius: "999px",
  color: $gold ? palette.gold : "#dce6f0",
  background: $gold ? "rgba(255, 200, 0, 0.1)" : "rgba(0, 162, 255, 0.12)",
  border: `1px solid ${$gold ? "rgba(255, 200, 0, 0.35)" : "rgba(0, 162, 255, 0.25)"}`,
}));

const CardAction = styled.span({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  alignSelf: "flex-start",
  marginTop: "22px",
  padding: "10px 18px",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "0.95rem",
  color: "white",
  background: palette.blue,
});

const SkeletonCard = styled.div`
  height: 290px;
  border-radius: 20px;
  background: linear-gradient(
    90deg,
    ${palette.card} 0px,
    ${palette.cardHover} 120px,
    ${palette.card} 240px
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s linear infinite;
`;

const EmptyCard = styled.div({
  width: "100%",
  maxWidth: "560px",
  padding: "28px 24px",
  borderRadius: "20px",
  textAlign: "center",
  color: palette.body,
  lineHeight: 1.6,
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${palette.panelBorder}`,
  boxSizing: "border-box",
});

const StepGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
  width: "100%",
  maxWidth: "880px",
  marginTop: "28px",
  "@media (max-width: 768px)": { gridTemplateColumns: "minmax(0, 1fr)" },
});

const Step = styled.div({
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(0, 162, 255, 0.06)",
  border: "1px solid rgba(0, 162, 255, 0.22)",
});

const StepIcon = styled.div({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  fontSize: "1.3rem",
  color: palette.blue,
  background: "rgba(0, 162, 255, 0.15)",
  border: "1px solid rgba(0, 162, 255, 0.35)",
});

const StepTitle = styled.h3({
  fontSize: "1.05rem",
  fontWeight: 700,
  margin: "2px 0 4px",
});

const StepText = styled.p({
  fontSize: "0.92rem",
  lineHeight: 1.5,
  color: palette.muted,
  margin: 0,
});

const GuideLink = styled(Link)({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "24px",
  fontWeight: 700,
  color: palette.blue,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});

const TypeGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
  width: "100%",
  maxWidth: "880px",
  marginTop: "20px",
  "@media (max-width: 768px)": { gridTemplateColumns: "minmax(0, 1fr)" },
});

const TypeCard = styled.div<{ $gold?: boolean }>(({ $gold }) => ({
  padding: "28px 24px",
  borderRadius: "20px",
  background: $gold ? "rgba(255, 200, 0, 0.05)" : "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${$gold ? "rgba(255, 200, 0, 0.4)" : palette.panelBorder}`,
}));

const TypeHead = styled.h3<{ $gold?: boolean }>(({ $gold }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  fontSize: "1.3rem",
  fontWeight: 700,
  margin: "0 0 12px",
  color: $gold ? palette.gold : "#fff",
  svg: { fontSize: "1.5rem", color: $gold ? palette.gold : palette.blue },
}));

const AgeBadge = styled.span({
  fontSize: "0.75rem",
  fontWeight: 800,
  padding: "3px 9px",
  borderRadius: "999px",
  color: palette.navy,
  background: palette.gold,
});

const SoonBadge = styled.span({
  fontSize: "0.75rem",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: "999px",
  color: palette.blue,
  background: "rgba(0, 162, 255, 0.12)",
  border: "1px solid rgba(0, 162, 255, 0.35)",
});

const TypeText = styled.p({
  fontSize: "1rem",
  lineHeight: 1.6,
  color: palette.body,
  margin: 0,
});

const InviteBand = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  width: "100%",
  maxWidth: "880px",
  margin: "24px 0 40px",
  padding: "40px 28px",
  borderRadius: "24px",
  background: palette.card,
  border: "1px solid rgba(0, 162, 255, 0.25)",
  boxSizing: "border-box",
  "@media (max-width: 480px)": { padding: "32px 20px" },
});

const InviteIcon = styled.div({
  fontSize: "2rem",
  color: palette.blue,
  marginBottom: "10px",
});

const InviteTitle = styled.h2({
  fontSize: "1.8rem",
  fontWeight: 800,
  margin: "0 0 10px",
});

const InviteText = styled.p({
  fontSize: "1.05rem",
  lineHeight: 1.6,
  color: palette.body,
  maxWidth: "520px",
  margin: 0,
});
