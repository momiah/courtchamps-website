import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  IoAddCircleOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCreateOutline,
  IoEnterOutline,
  IoEyeOffOutline,
  IoFlashOutline,
  IoGitNetworkOutline,
  IoHelp,
  IoLockClosedOutline,
  IoMapOutline,
  IoPeopleOutline,
  IoPerson,
  IoPersonAddOutline,
  IoPodiumOutline,
  IoQrCodeOutline,
  IoSwapHorizontalOutline,
  IoTrendingUpOutline,
  IoTrophyOutline,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import {
  LADDER_MATCH_BEST_OF_OPTIONS,
  LADDER_PLAYOFF_START_DAYS,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_POSTING_CLOSE_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_STATUS,
} from "courtchamps-shared";
import { LADDER_STATUS_LABELS } from "courtchamps-shared/helpers";

import { ladderTrophies } from "../../assets";

const BLUE = "#00A2FF";
const GOLD = "#FFC800";
const BODY = "#c9d6e3";
const MUTED = "#9fb8c8";

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const splitAmount = (prizePool: string) => {
  const match = prizePool.match(/[\d,]+/);
  if (!match || match.index === undefined) return null;
  return {
    prefix: prizePool.slice(0, match.index),
    value: Number(match[0].replace(/,/g, "")),
    suffix: prizePool.slice(match.index + match[0].length),
  };
};

/** The prize pool counting up from zero the first time it scrolls into view. */
const PrizeCount: React.FC<{ prizePool: string }> = ({ prizePool }) => {
  const ref = useRef<HTMLDivElement>(null);
  const parts = splitAmount(prizePool);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !parts || prefersReducedMotion()) return;
    if (typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const startedAt = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startedAt) / 1400, 1);
          setShown(Math.round(parts.value * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [parts?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PoolValue ref={ref}>
      {parts && shown !== null
        ? `${parts.prefix}${shown.toLocaleString("en-GB")}${parts.suffix}`
        : prizePool}
    </PoolValue>
  );
};

const Card: React.FC<{
  icon?: IconType;
  gold?: boolean;
  children: React.ReactNode;
}> = ({ icon: Icon, gold, children }) => (
  <CardRow $centre={!Icon}>
    {Icon ? (
      <CardIcon $gold={gold}>
        <Icon />
      </CardIcon>
    ) : null}
    <span>{children}</span>
  </CardRow>
);

const PageIcon: React.FC<{ icon: IconType }> = ({ icon: Icon }) => (
  <IconCircle>
    <Icon />
  </IconCircle>
);

const Matchup: React.FC<{ reveal?: boolean }> = ({ reveal }) => (
  <MatchupRow>
    <Avatar $user>
      <IoPerson />
    </Avatar>
    <Versus>VS</Versus>
    {reveal ? (
      <Flip>
        <Avatar className="face-hidden">
          <IoHelp />
        </Avatar>
        <Avatar className="face-revealed" $revealed>
          <IoPerson />
        </Avatar>
      </Flip>
    ) : (
      <Avatar>
        <IoHelp />
      </Avatar>
    )}
  </MatchupRow>
);

const DOUBLES_RIVALS = ["Alex & Priya", "Sam & Leo", "Jordan & Kai"];
const SINGLES_RIVALS = ["Alex", "Sam", "Jordan"];
const RIVAL_CP = [1240, 1180, 1050];

const LadderClimb: React.FC<{ doubles: boolean }> = ({ doubles }) => (
  <Board>
    <Ranks>
      {[1, 2, 3, 4].map((rank) => (
        <span key={rank}>{rank}</span>
      ))}
    </Ranks>
    <Lane>
      {(doubles ? DOUBLES_RIVALS : SINGLES_RIVALS).map((name, i) => (
        <LaneRow key={name} className={`rival-${i}`}>
          {name}
          <em>{RIVAL_CP[i].toLocaleString("en-GB")} CP</em>
        </LaneRow>
      ))}
      <LaneRow className="you" $you>
        {doubles ? "You & Partner" : "You"}
        <em>climbing</em>
      </LaneRow>
    </Lane>
  </Board>
);

const MATCH_STEPS: { icon: IconType; text: string }[] = [
  { icon: IoQrCodeOutline, text: "Check in at the court" },
  { icon: IoPeopleOutline, text: "Play your opponent" },
  { icon: IoCreateOutline, text: "Report your scores" },
];

interface Phase {
  icon: IconType;
  image?: string;
  label: string;
  length?: string;
  text: string;
  gold?: boolean;
}

const seasonPhases = (
  noun: string,
  playoffSpots: number,
  cash: boolean,
): Phase[] => [
  {
    icon: IoPersonAddOutline,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_OPEN],
    length: `Day 1 - ${LADDER_REGISTRATION_CLOSE_DAYS}`,
    text: "Sign up and start posting or accepting matches straight away.",
  },
  {
    icon: IoLockClosedOutline,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_CLOSED],
    length: `Day ${LADDER_REGISTRATION_CLOSE_DAYS + 1} - ${LADDER_PLAYOFF_START_DAYS}`,
    text: `No new ${noun}s join. Keep climbing; new matches close ${days(LADDER_POSTING_CLOSE_DAYS)} before the playoffs.`,
  },
  {
    icon: IoGitNetworkOutline,
    label: LADDER_STATUS_LABELS[LADDER_STATUS.PLAYOFFS],
    length: `${Math.log2(playoffSpots)} rounds`,
    text: `The top ${playoffSpots} ${noun}s play a knockout. Each round is two matches, home and away, played within ${days(LADDER_PLAYOFF_TIE_DAYS)}.`,
  },
  {
    icon: IoTrophyOutline,
    image: ladderTrophies[0],
    label: LADDER_STATUS_LABELS[LADDER_STATUS.COMPLETED],
    text: cash
      ? "The champion crowned. Cash paid. CP awarded."
      : "The champion crowned. CP awarded.",
    gold: true,
  },
];

interface Step {
  title: string;
  highlight: string;
  line: React.ReactNode;
  gold?: boolean;
  panel: React.ReactNode;
}

export interface LadderHowItWorksProps {
  noun: "player" | "team";
  maxPlayers: number;
  playoffSpots: number;
  inTheMoney: number;
  cash: boolean;
  prizePool: string;
  firstEntrant: boolean;
}

/** How it works: the app's How to Play pages as numbered rows that alternate sides. */
const LadderHowItWorks: React.FC<LadderHowItWorksProps> = ({
  noun,
  maxPlayers,
  playoffSpots,
  inTheMoney,
  cash,
  prizePool,
  firstEntrant,
}) => {
  useEffect(() => {
    AOS.init({ duration: 600, offset: 80, once: true, easing: "ease-in-out" });
  }, []);

  const doubles = noun === "team";
  const firstBestOf = LADDER_MATCH_BEST_OF_OPTIONS[0];
  const lastBestOf =
    LADDER_MATCH_BEST_OF_OPTIONS[LADDER_MATCH_BEST_OF_OPTIONS.length - 1];

  const steps: Step[] = [
    {
      title: "Post a",
      highlight: "Match",
      line: "Your court. Your time.",
      panel: (
        <>
          <PageIcon icon={IoAddCircleOutline} />
          <Cards>
            <Card icon={IoCalendarOutline}>
              Choose your court and post a match. Pick a <b>day and time</b>{" "}
              that suits you, then wait for another member to accept.
            </Card>
            <Card icon={IoEyeOffOutline}>
              You&apos;ll <b>never know your opponent</b> until they accept your
              match.
            </Card>
          </Cards>
        </>
      ),
    },
    {
      title: "Accept a",
      highlight: "Match",
      line: "See a match you like? Take it.",
      panel: (
        <>
          <Matchup reveal />
          <Cards>
            <Card icon={IoMapOutline}>
              Rather explore? Browse <b>live matches</b> at courts across the
              ladder and accept one that suits you.
            </Card>
            <Card icon={IoEyeOffOutline}>
              Your opponent is <b>hidden</b> until you accept the match.
            </Card>
          </Cards>
        </>
      ),
    },
    {
      title: "Match",
      highlight: "Accepted",
      line: "Show up, play, and it counts.",
      panel: (
        <>
          <PageIcon icon={IoCheckmarkCircleOutline} />
          <StepList>
            {MATCH_STEPS.map(({ icon: Icon, text }, i) => (
              <React.Fragment key={text}>
                <StepRow>
                  <StepIcon>
                    <Icon />
                  </StepIcon>
                  <span>{text}</span>
                </StepRow>
                {i < MATCH_STEPS.length - 1 ? <StepLine /> : null}
              </React.Fragment>
            ))}
          </StepList>
        </>
      ),
    },
    {
      title: "The",
      highlight: "Objective",
      line: "Every win moves you up the ladder.",
      panel: (
        <>
          <LadderClimb doubles={doubles} />
          <Tiles>
            <Tile>
              <IoFlashOutline />
              <b>
                {firstBestOf}–{lastBestOf}
              </b>
              <small>games a match</small>
            </Tile>
            <Tile>
              <IoTrendingUpOutline />
              <b>Earn CP</b>
              <small>every win</small>
            </Tile>
            <Tile $gold>
              <IoTrophyOutline />
              <b>Top {playoffSpots}</b>
              <small>go to playoffs</small>
            </Tile>
          </Tiles>
        </>
      ),
    },
    {
      title: "The",
      highlight: "Season",
      line: `${LADDER_PLAYOFF_START_DAYS} days. One shot at the playoffs.`,
      panel: (
        <>
          <PageIcon icon={IoCalendarOutline} />
          <Phases>
            {seasonPhases(noun, playoffSpots, cash).map((phase, i, all) => (
              <PhaseRow key={phase.label}>
                <PhaseRail>
                  <PhaseDot $gold={phase.gold}>
                    {phase.image ? (
                      <img src={phase.image} alt="" />
                    ) : (
                      <phase.icon />
                    )}
                  </PhaseDot>
                  {i < all.length - 1 ? <PhaseLine /> : null}
                </PhaseRail>
                <PhaseBody>
                  <PhaseHead>
                    <PhaseLabel $gold={phase.gold}>{phase.label}</PhaseLabel>
                    {phase.length ? (
                      <PhaseLength>{phase.length}</PhaseLength>
                    ) : null}
                  </PhaseHead>
                  <PhaseText>{phase.text}</PhaseText>
                </PhaseBody>
              </PhaseRow>
            ))}
          </Phases>
        </>
      ),
    },
    {
      title: "Winning the",
      highlight: "Final",
      gold: true,
      line: (
        <>
          Prize pool up to <Gold>{prizePool}</Gold>
        </>
      ),
      panel: (
        <>
          <TrophyHero>
            <img src={ladderTrophies[0]} alt="" />
          </TrophyHero>
          <TrophyRow>
            {ladderTrophies.slice(1).map((trophy: string) => (
              <img key={trophy} src={trophy} alt="" />
            ))}
          </TrophyRow>
          <Pool>
            <small>Prize pool up to</small>
            <PrizeCount prizePool={prizePool} />
          </Pool>
          <Cards>
            <Card>
              Win the Final to be crowned <Gold>champion</Gold>! <br />{" "}
              Top&nbsp;
              {inTheMoney} {cash ? "paid" : "awarded CP"} in a full ladder.
            </Card>
          </Cards>
        </>
      ),
    },
  ];

  return (
    <Section>
      <Eyebrow>How it works</Eyebrow>
      <Intro data-aos="fade-up">
        <SeasonLabel>Season one</SeasonLabel>
        <Headline>
          <span>Climb.</span>
          <span>Compete.</span>
          <span className="gold">Conquer.</span>
        </Headline>
        <Tagline>
          {maxPlayers.toLocaleString("en-GB")} {noun}s. One champion.
        </Tagline>
        {firstEntrant ? (
          <FirstBadge>Be the first {noun} to pre-register</FirstBadge>
        ) : null}
      </Intro>

      <Hero>
        <TextBlock $centre data-aos="fade-up">
          <BigNumber aria-hidden>00</BigNumber>
          <RowTitle>
            Matchmaking, made <Highlight>simple</Highlight>
          </RowTitle>
        </TextBlock>
        <Panel $wide data-aos="fade-up">
          <Matchup />
          <Explainers>
            <Explainer>
              <ExplainerIcon>
                <IoSwapHorizontalOutline />
              </ExplainerIcon>
              <div>
                <b>What&apos;s Matchmaking?</b>
                <span>
                  Matchmaking lets you schedule games with other {noun}s in the
                  ladder, on your time and your terms.
                </span>
              </div>
            </Explainer>
            <Explainer>
              <ExplainerIcon>
                <IoPodiumOutline />
              </ExplainerIcon>
              <div>
                <b>What&apos;s a Ladder?</b>
                <span>
                  A ranked competition where a large group of {noun}s compete
                  across a wide region. When the season ends, the top {noun}s go
                  head to head in a knockout tournament.
                </span>
              </div>
            </Explainer>
            <Explainer>
              <ExplainerIcon>
                <IoEnterOutline />
              </ExplainerIcon>
              <div>
                <span>
                  Once you <b>join the ladder</b>, you can enter the{" "}
                  <Blue>Match Making arena</Blue> to post or find matches to
                  progress in the competition.
                </span>
              </div>
            </Explainer>
          </Explainers>
        </Panel>
      </Hero>

      <Rows>
        {steps.map((step, i) => {
          const reverse = i % 2 === 1;
          return (
            <Row key={step.title + step.highlight} $reverse={reverse}>
              <Panel data-aos={reverse ? "fade-left" : "fade-right"}>
                {step.panel}
              </Panel>
              <TextBlock
                $reverse={reverse}
                data-aos={reverse ? "fade-right" : "fade-left"}
              >
                <BigNumber aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </BigNumber>
                <RowTitle>
                  {step.title}{" "}
                  <Highlight $gold={step.gold}>{step.highlight}</Highlight>
                </RowTitle>
                <Punch $reverse={reverse}>{step.line}</Punch>
              </TextBlock>
            </Row>
          );
        })}
      </Rows>
    </Section>
  );
};

export default LadderHowItWorks;

const ring = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.45); opacity: 0; }
`;
const fromRight = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
`;
const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.6); }
  70% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;
const flip = keyframes`
  0%, 24% { transform: scaleX(1); }
  29% { transform: scaleX(0); }
  34%, 74% { transform: scaleX(1); }
  79% { transform: scaleX(0); }
  84%, 100% { transform: scaleX(1); }
`;
const hiddenFace = keyframes`
  0% { opacity: 1; } 29% { opacity: 0; } 79% { opacity: 1; }
`;
const revealedFace = keyframes`
  0% { opacity: 0; } 29% { opacity: 1; } 79% { opacity: 0; }
`;
const youClimb = keyframes`
  0%, 10% { top: 120px; } 20%, 30% { top: 80px; } 40%, 50% { top: 40px; }
  60%, 92% { top: 0; } 100% { top: 120px; }
`;
const rival0 = keyframes`
  0%, 50% { top: 0; } 60%, 92% { top: 40px; } 100% { top: 0; }
`;
const rival1 = keyframes`
  0%, 30% { top: 40px; } 40%, 92% { top: 80px; } 100% { top: 40px; }
`;
const rival2 = keyframes`
  0%, 10% { top: 80px; } 20%, 92% { top: 120px; } 100% { top: 80px; }
`;

const revealed = (animation: ReturnType<typeof css>) => css`
  opacity: 0;
  .aos-animate & {
    ${animation}
  }
`;

const pulseRing = (colour: string) => css`
  &::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    border: 2px solid ${colour};
    animation: ${ring} 2.2s ease-out infinite;
  }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1080px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0 24px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 32px 8px 16px;
  }

  b {
    color: #fff;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
    }
  }
`;

const Eyebrow = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: ${BLUE};
`;

const Intro = styled.div`
  text-align: center;
  margin: 12px 0 64px;
`;

const SeasonLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${MUTED};
`;

const Headline = styled.h2`
  margin: 8px 0 0;
  font-size: 48px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #fff;

  span {
    display: block;
    animation: ${slideIn} 0.6s ease-out both;
  }
  span:nth-child(2) {
    animation-delay: 0.25s;
  }
  span.gold {
    color: ${GOLD};
    animation: ${popIn} 0.5s ease-out 0.5s both;
  }

  @media (max-width: 768px) {
    font-size: 38px;
  }
`;

const Tagline = styled.p`
  color: ${MUTED};
  margin: 14px 0 0;
  font-size: 16px;
`;

const FirstBadge = styled.div`
  display: inline-block;
  margin-top: 16px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${GOLD};
  background: rgba(255, 200, 0, 0.1);
  border: 1px solid rgba(255, 200, 0, 0.35);
`;

const Hero = styled.div`
  width: 100%;
  max-width: 960px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  margin-bottom: 88px;

  @media (max-width: 768px) {
    margin-bottom: 64px;
  }
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 88px;
  width: 100%;
  max-width: 960px;

  @media (max-width: 768px) {
    gap: 64px;
  }
`;

const Row = styled.div<{ $reverse: boolean }>`
  display: flex;
  flex-direction: ${({ $reverse }) => ($reverse ? "row-reverse" : "row")};
  align-items: center;
  justify-content: center;
  gap: 56px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 26px;
  }
`;

const Panel = styled.div<{ $wide?: boolean }>`
  box-sizing: border-box;
  flex: 0 0 auto;
  width: ${({ $wide }) => ($wide ? "100%" : "420px")};
  max-width: 100%;
  border-radius: 24px;
  padding: ${({ $wide }) => ($wide ? "36px 40px" : "30px 24px")};
  background:
    radial-gradient(
      120% 80% at 50% 0%,
      rgba(0, 162, 255, 0.14),
      transparent 65%
    ),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    width: 100%;
    padding: 22px 16px;
  }
`;

const TextBlock = styled.div<{ $reverse?: boolean; $centre?: boolean }>`
  max-width: ${({ $centre }) => ($centre ? "640px" : "400px")};
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: ${({ $reverse, $centre }) =>
    $centre ? "center" : $reverse ? "flex-end" : "flex-start"};
  text-align: ${({ $reverse, $centre }) =>
    $centre ? "center" : $reverse ? "right" : "left"};

  @media (max-width: 768px) {
    order: -1;
    align-items: center;
    text-align: center;
    padding: 0 4px;
  }
`;

const BigNumber = styled.span`
  font-size: 88px;
  font-weight: 800;
  line-height: 0.85;
  letter-spacing: -2px;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(0, 162, 255, 0.45);
  margin-bottom: 6px;

  @media (max-width: 768px) {
    font-size: 64px;
  }
`;

const RowTitle = styled.h3`
  font-size: 44px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #fff;
  margin: 0;
  text-wrap: balance;

  @media (max-width: 768px) {
    font-size: 34px;
  }
`;

const Highlight = styled.span<{ $gold?: boolean }>`
  background: linear-gradient(
    90deg,
    ${({ $gold }) => ($gold ? `${GOLD}, #ffe48a` : `${BLUE}, #6fd0ff`)}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Punch = styled.p<{ $reverse: boolean }>`
  position: relative;
  margin: 16px 0 0;
  padding-top: 16px;
  font-size: 21px;
  font-weight: 500;
  line-height: 1.5;
  color: ${BODY};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    ${({ $reverse }) => ($reverse ? "right: 0;" : "left: 0;")}
    width: 44px;
    height: 3px;
    border-radius: 2px;
    background: ${BLUE};
  }

  @media (max-width: 768px) {
    font-size: 18px;

    &::before {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
    }
  }
`;

const Gold = styled.span`
  color: ${GOLD};
  font-weight: 700;
`;

const Blue = styled.span`
  color: ${BLUE};
  font-weight: 700;
`;

const IconCircle = styled.div`
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 162, 255, 0.12);
  border: 1px solid rgba(0, 162, 255, 0.35);
  color: ${BLUE};
  font-size: 40px;
  ${pulseRing(BLUE)}
`;

const Cards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: stretch;
`;

const CardRow = styled.div<{ $centre?: boolean }>`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: ${({ $centre }) => ($centre ? "center" : "flex-start")};
  text-align: ${({ $centre }) => ($centre ? "center" : "left")};
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: ${BODY};
  font-size: 14.5px;
  line-height: 1.45;
  ${revealed(css`
    animation: ${fromRight} 0.5s ease-out 0.3s forwards;
  `)}

  & + & {
    animation-delay: 0.45s;
  }
`;

const CardIcon = styled.span<{ $gold?: boolean }>`
  flex: 0 0 34px;
  height: 34px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  background: ${({ $gold }) =>
    $gold ? "rgba(255, 200, 0, 0.12)" : "rgba(0, 162, 255, 0.15)"};
  color: ${({ $gold }) => ($gold ? GOLD : BLUE)};
`;

const ExplainerIcon = styled.span`
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: rgba(0, 162, 255, 0.15);
  border: 1px solid rgba(0, 162, 255, 0.35);
  color: ${BLUE};
`;

const Explainers = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
  gap: 12px;
  align-self: stretch;
`;

const Explainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 20px 16px;
  border-radius: 14px;
  background: rgba(0, 162, 255, 0.07);
  border: 1px solid rgba(0, 162, 255, 0.25);
  ${revealed(css`
    animation: ${popIn} 0.45s ease-out 0.2s forwards;
  `)}

  &:nth-child(2) {
    animation-delay: 0.35s;
  }
  &:nth-child(3) {
    animation-delay: 0.5s;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  div > b {
    font-size: 15px;
  }
  div > span {
    color: ${BODY};
    font-size: 14px;
    line-height: 1.5;
  }
`;

const MatchupRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 6px 0;
`;

const Avatar = styled.div<{ $user?: boolean; $revealed?: boolean }>`
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: #7f97a8;
  border: 2px dashed #33445a;
  background: rgba(255, 255, 255, 0.04);

  ${({ $user }) =>
    $user &&
    css`
      border: 2px solid ${BLUE};
      background: transparent;
      color: #fff;
      box-shadow: 0 0 14px rgba(0, 162, 255, 0.75);
      ${pulseRing(BLUE)}
    `}

  ${({ $revealed }) =>
    $revealed &&
    css`
      border: 2px solid ${GOLD};
      background: transparent;
      color: #fff;
      box-shadow: 0 0 14px rgba(255, 200, 0, 0.7);
    `}
`;

const Versus = styled.span`
  color: ${GOLD};
  font-size: 22px;
  font-weight: 800;
  font-style: italic;
`;

const Flip = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  animation: ${flip} 5s ease-in-out infinite;

  & > div {
    position: absolute;
    inset: 0;
  }
  .face-hidden {
    animation: ${hiddenFace} 5s step-end infinite;
  }
  .face-revealed {
    animation: ${revealedFace} 5s step-end infinite;
  }
`;

const StepList = styled.div`
  align-self: stretch;
  display: flex;
  flex-direction: column;
`;

const StepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  ${revealed(css`
    animation: ${fromRight} 0.5s ease-out 0.3s forwards;
  `)}

  &:nth-child(3) {
    animation-delay: 0.5s;
  }
  &:nth-child(5) {
    animation-delay: 0.7s;
  }
`;

const StepIcon = styled.span`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(0, 162, 255, 0.12);
  border: 1px solid rgba(0, 162, 255, 0.35);
  color: ${BLUE};
`;

const StepLine = styled.div`
  width: 2px;
  height: 22px;
  margin: 4px 0 4px 22px;
  border-radius: 1px;
  background: rgba(0, 162, 255, 0.35);
`;

const Board = styled.div`
  display: flex;
  gap: 8px;
  align-self: stretch;
`;

const Ranks = styled.div`
  display: flex;
  flex-direction: column;

  span {
    height: 40px;
    width: 18px;
    display: flex;
    align-items: center;
    color: #7f97a8;
    font-weight: 800;
    font-size: 14px;
  }
`;

const Lane = styled.div`
  position: relative;
  flex: 1;
  height: 160px;

  .rival-0 {
    top: 0;
    animation-name: ${rival0};
  }
  .rival-1 {
    top: 40px;
    animation-name: ${rival1};
  }
  .rival-2 {
    top: 80px;
    animation-name: ${rival2};
  }
  .you {
    top: 120px;
    animation-name: ${youClimb};
  }
`;

const LaneRow = styled.div<{ $you?: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 34px;
  box-sizing: border-box;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  animation-duration: 7s;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  background: ${({ $you }) =>
    $you ? "rgba(0, 162, 255, 0.2)" : "rgba(255, 255, 255, 0.05)"};
  border: 1px solid
    ${({ $you }) => ($you ? "rgba(0, 162, 255, 0.6)" : "transparent")};
  z-index: ${({ $you }) => ($you ? 1 : 0)};

  em {
    font-style: normal;
    font-weight: 600;
    font-size: 13px;
    color: ${({ $you }) => ($you ? BLUE : BODY)};
  }
`;

const Tiles = styled.div`
  display: flex;
  gap: 8px;
  align-self: stretch;
`;

const Tile = styled.div<{ $gold?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 4px;
  border-radius: 14px;
  font-size: 20px;
  border: 1px solid
    ${({ $gold }) =>
      $gold ? "rgba(255, 200, 0, 0.3)" : "rgba(0, 162, 255, 0.3)"};
  background: ${({ $gold }) =>
    $gold ? "rgba(255, 200, 0, 0.08)" : "rgba(0, 162, 255, 0.08)"};
  color: ${({ $gold }) => ($gold ? GOLD : BLUE)};
  ${revealed(css`
    animation: ${popIn} 0.45s ease-out 0.3s forwards;
  `)}

  &:nth-child(2) {
    animation-delay: 0.42s;
  }
  &:nth-child(3) {
    animation-delay: 0.54s;
  }

  b {
    color: ${({ $gold }) => ($gold ? GOLD : "#fff")};
    font-size: 17px;
    white-space: nowrap;
  }
  small {
    color: ${MUTED};
    font-size: 11.5px;
    text-align: center;
  }
`;

const Phases = styled.div`
  align-self: stretch;
  display: flex;
  flex-direction: column;
`;

const PhaseRow = styled.div`
  display: flex;
  gap: 14px;
  ${revealed(css`
    animation: ${fromRight} 0.5s ease-out 0.3s forwards;
  `)}

  &:nth-child(2) {
    animation-delay: 0.45s;
  }
  &:nth-child(3) {
    animation-delay: 0.6s;
  }
  &:nth-child(4) {
    animation-delay: 0.75s;
  }
`;

const PhaseRail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PhaseDot = styled.div<{ $gold?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${({ $gold }) =>
    $gold ? "rgba(255, 200, 0, 0.12)" : "rgba(0, 162, 255, 0.12)"};
  border: 1px solid
    ${({ $gold }) =>
      $gold ? "rgba(255, 200, 0, 0.45)" : "rgba(0, 162, 255, 0.45)"};
  color: ${({ $gold }) => ($gold ? GOLD : BLUE)};

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
`;

const PhaseLine = styled.div`
  flex: 1;
  width: 2px;
  min-height: 14px;
  margin: 4px 0;
  border-radius: 1px;
  background: rgba(0, 162, 255, 0.35);
`;

const PhaseBody = styled.div`
  padding: 7px 0 12px;
  min-width: 0;
`;

const PhaseHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const PhaseLabel = styled.span<{ $gold?: boolean }>`
  font-weight: 700;
  font-size: 15px;
  color: ${({ $gold }) => ($gold ? GOLD : "#fff")};
`;

const PhaseLength = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${BLUE};
  background: rgba(0, 162, 255, 0.12);
  border-radius: 999px;
  padding: 2px 8px;
`;

const PhaseText = styled.div`
  color: ${BODY};
  font-size: 13.5px;
  line-height: 1.45;
  margin-top: 3px;
`;

const TrophyHero = styled.div`
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 200, 0, 0.12);
  border: 1px solid rgba(255, 200, 0, 0.35);
  ${pulseRing(GOLD)}

  img {
    width: 84px;
    height: 84px;
    object-fit: contain;
    animation: ${float} 3s ease-in-out infinite;
  }
`;

const TrophyRow = styled.div`
  display: flex;
  gap: 14px;

  img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    ${revealed(css`
      animation: ${popIn} 0.45s ease-out 0.3s forwards;
    `)}
  }
  img:nth-child(2) {
    animation-delay: 0.45s;
  }
  img:nth-child(3) {
    animation-delay: 0.6s;
  }
`;

const Pool = styled.div`
  text-align: center;

  small {
    color: ${MUTED};
    font-size: 13px;
  }
`;

const PoolValue = styled.div`
  color: ${GOLD};
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;
