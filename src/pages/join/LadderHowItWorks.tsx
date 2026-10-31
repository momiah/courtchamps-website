import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { FaCheck, FaMapMarkerAlt } from "react-icons/fa";

import { LadderTrophy } from "../../assets";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True once the element has scrolled into view; stays true after that. */
const useInView = <T extends Element>(threshold = 0.35) => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
};

const useDelayedFlag = (start: boolean, delayMs: number) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!start) return;
    const timer = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(timer);
  }, [start, delayMs]);
  return on;
};

const PreRegisterVisual: React.FC<{ active: boolean; label: string }> = ({
  active,
  label,
}) => {
  const done = useDelayedFlag(active, 900);
  return (
    <VisualCard>
      <PreRegisterButton $done={done}>
        {done ? (
          <>
            <FaCheck /> {label}
          </>
        ) : (
          "Pre-register"
        )}
      </PreRegisterButton>
    </VisualCard>
  );
};

const MatchVisual: React.FC<{ active: boolean }> = ({ active }) => {
  const accepted = useDelayedFlag(active, 1100);
  return (
    <VisualCard>
      <MatchRow>
        <MatchTime>
          <strong>Sat</strong>
          <span>10:00</span>
        </MatchTime>
        <MatchInfo>
          <MatchTitle>New match</MatchTitle>
          <MatchPlace>
            <FaMapMarkerAlt /> Courts near you
          </MatchPlace>
        </MatchInfo>
        <AcceptedBadge $show={accepted}>Accepted</AcceptedBadge>
      </MatchRow>
    </VisualCard>
  );
};

const RIVALS = [
  { name: "Alex", cp: 1240 },
  { name: "Sam", cp: 1180 },
  { name: "Jordan", cp: 1050 },
];
const START_CP = 980;
const CP_PER_WIN = 120;
const ROW_HEIGHT = 34;

const ClimbVisual: React.FC<{ active: boolean }> = ({ active }) => {
  const [rank, setRank] = useState(RIVALS.length);
  const [cp, setCp] = useState(START_CP);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setRank(0);
      setCp(START_CP + CP_PER_WIN * RIVALS.length);
      return;
    }
    let current = RIVALS.length;
    let held = 0;
    const timer = setInterval(() => {
      if (current > 0) {
        current -= 1;
        setResetting(false);
        setRank(current);
        setCp((value) => value + CP_PER_WIN);
      } else if (++held > 2) {
        held = 0;
        current = RIVALS.length;
        setResetting(true);
        setRank(current);
        setCp(START_CP);
      }
    }, 1300);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <VisualCard>
      <LadderBoard style={{ height: ROW_HEIGHT * (RIVALS.length + 1) }}>
        {RIVALS.map((rival, i) => {
          const position = i + (i >= rank ? 1 : 0);
          return (
            <LadderRow
              key={rival.name}
              style={{ top: position * ROW_HEIGHT }}
              $animate={!resetting}
            >
              <RankNumber>{position + 1}</RankNumber>
              <RowName>{rival.name}</RowName>
              <RowCp>{rival.cp.toLocaleString("en-GB")} CP</RowCp>
            </LadderRow>
          );
        })}
        <LadderRow
          $you
          style={{ top: rank * ROW_HEIGHT }}
          $animate={!resetting}
        >
          <RankNumber $you>{rank + 1}</RankNumber>
          <RowName>You</RowName>
          <RowCp $you>
            {cp.toLocaleString("en-GB")} CP
            {cp > START_CP ? <CpPop key={cp}>+{CP_PER_WIN}</CpPop> : null}
          </RowCp>
        </LadderRow>
      </LadderBoard>
    </VisualCard>
  );
};

const BracketVisual: React.FC<{ active: boolean }> = ({ active }) => (
  <VisualCard>
    <BracketSvg viewBox="0 0 240 120" $active={active} aria-hidden>
      {[10, 40, 70, 100].map((y) => (
        <rect key={y} x="4" y={y} width="56" height="14" rx="4" />
      ))}
      <path className="round1" d="M60 17 H84 V32 H100 M60 47 H84 V32" />
      <path className="round1" d="M60 77 H84 V92 H100 M60 107 H84 V92" />
      <rect className="semi" x="100" y="25" width="56" height="14" rx="4" />
      <rect className="semi" x="100" y="85" width="56" height="14" rx="4" />
      <path className="round2" d="M156 32 H176 V62 H190 M156 92 H176 V62" />
      <rect className="final" x="190" y="52" width="46" height="20" rx="6" />
      <text className="finalText" x="213" y="66" textAnchor="middle">
        🏆
      </text>
    </BracketSvg>
  </VisualCard>
);

const splitAmount = (prizePool: string) => {
  const match = prizePool.match(/[\d,]+/);
  if (!match || match.index === undefined) return null;
  return {
    prefix: prizePool.slice(0, match.index),
    value: Number(match[0].replace(/,/g, "")),
    suffix: prizePool.slice(match.index + match[0].length),
  };
};

const PrizeVisual: React.FC<{
  active: boolean;
  prizePool: string;
  cash: boolean;
}> = ({ active, prizePool, cash }) => {
  const parts = splitAmount(prizePool);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active || !parts) return;
    if (prefersReducedMotion()) {
      setShown(parts.value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 1400, 1);
      setShown(Math.round(parts.value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, parts?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <VisualCard>
      <PrizeRow>
        <TrophyWrap>
          <TrophyGlow $cash={cash} />
          <TrophyImage src={LadderTrophy} alt="" />
        </TrophyWrap>
        <div>
          <PrizeCaption>Up to</PrizeCaption>
          <PrizeFigure $cash={cash}>
            {parts
              ? `${parts.prefix}${shown.toLocaleString("en-GB")}${parts.suffix}`
              : prizePool}
          </PrizeFigure>
          <PrizeCaption>to be won</PrizeCaption>
        </div>
      </PrizeRow>
    </VisualCard>
  );
};

interface Step {
  title: string;
  body: string;
  visual: (active: boolean) => React.ReactNode;
}

const StepItem: React.FC<{ step: Step; number: number; last: boolean }> = ({
  step,
  number,
  last,
}) => {
  const { ref, inView } = useInView<HTMLLIElement>();
  return (
    <StepRow ref={ref} $visible={inView}>
      <Rail>
        <StepNumber $visible={inView}>{number}</StepNumber>
        {last ? null : <RailLine $visible={inView} />}
      </Rail>
      <StepBody>
        <StepTitle>{step.title}</StepTitle>
        <StepText>{step.body}</StepText>
        {step.visual(inView)}
      </StepBody>
    </StepRow>
  );
};

export interface LadderHowItWorksProps {
  noun: string;
  playoffSpots: number;
  tieDays: number;
  cash: boolean;
  prizePool: string;
  launched: boolean;
  firstEntrant: boolean;
}

/** "How it works" as an animated timeline: join, play, climb, finals, prize. */
const LadderHowItWorks: React.FC<LadderHowItWorksProps> = ({
  noun,
  playoffSpots,
  tieDays,
  cash,
  prizePool,
  launched,
  firstEntrant,
}) => {
  const steps: Step[] = [
    {
      title: launched ? "Join in the app" : "Pre-register free",
      body: launched
        ? "Download Court Champs and join the ladder."
        : `Download Court Champs and pre-register. ${
            cash ? "Nothing to pay today." : "It's free to enter."
          }`,
      visual: (active) => (
        <PreRegisterVisual
          active={active}
          label={launched ? "Joined" : "Pre-registered"}
        />
      ),
    },
    {
      title: "Play near you",
      body: "Post or accept matches at courts near you, at times that suit you.",
      visual: (active) => <MatchVisual active={active} />,
    },
    {
      title: "Win and climb",
      body: "Every game you win earns CP (Court Points). The more CP, the higher you climb.",
      visual: (active) => <ClimbVisual active={active} />,
    },
    {
      title: `Top ${playoffSpots} make the finals`,
      body: `When the season ends, the top ${playoffSpots} ${noun}s play a knockout, ${tieDays} days a round.`,
      visual: (active) => <BracketVisual active={active} />,
    },
    {
      title: "Take the prize",
      body: cash
        ? "The champion takes the biggest cash prize; the top places are all paid."
        : "The champion takes the biggest CP prize.",
      visual: (active) => (
        <PrizeVisual active={active} prizePool={prizePool} cash={cash} />
      ),
    },
  ];

  return (
    <Section>
      <Eyebrow>How it works</Eyebrow>
      <Headline>From first match to champion</Headline>
      {firstEntrant ? (
        <FirstBadge>Be the first {noun} to pre-register</FirstBadge>
      ) : null}
      <Steps>
        {steps.map((step, i) => (
          <StepItem
            key={step.title}
            step={step}
            number={i + 1}
            last={i === steps.length - 1}
          />
        ))}
      </Steps>
    </Section>
  );
};

export default LadderHowItWorks;

const BLUE = "#00A2FF";
const GOLD = "#ffc800";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 162, 255, 0.55); }
  70% { box-shadow: 0 0 0 12px rgba(0, 162, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 162, 255, 0); }
`;

const pop = keyframes`
  0% { opacity: 0; transform: scale(0.6); }
  60% { opacity: 1; transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
`;

const floatUp = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-8px); }
`;

const draw = keyframes`
  to { stroke-dashoffset: 0; }
`;

const fadeIn = keyframes`
  to { opacity: 1; }
`;

const hover = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const glow = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.08); }
`;

const shimmer = keyframes`
  to { background-position: 200% center; }
`;

const Section = styled.section`
  width: 100%;
  max-width: 680px;
  box-sizing: border-box;
  margin-bottom: 12px;
  padding: 24px 20px 8px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(
      120% 60% at 0% 0%,
      rgba(0, 162, 255, 0.12) 0%,
      transparent 60%
    ),
    rgba(255, 255, 255, 0.03);

  @media (max-width: 480px) {
    padding: 20px 14px 4px;
    border-radius: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
      stroke-dashoffset: 0 !important;
    }
  }
`;

const Eyebrow = styled.h3`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${BLUE};
  margin: 0 0 6px;
`;

const Headline = styled.h2`
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 18px;
  line-height: 1.2;

  @media (max-width: 480px) {
    font-size: 21px;
  }
`;

const FirstBadge = styled.div`
  display: inline-block;
  margin: -6px 0 18px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${GOLD};
  background: rgba(255, 200, 0, 0.1);
  border: 1px solid rgba(255, 200, 0, 0.35);
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StepRow = styled.li<{ $visible: boolean }>`
  display: flex;
  gap: 14px;
  opacity: 0;
  ${({ $visible }) =>
    $visible &&
    css`
      animation: ${fadeUp} 0.6s ease-out forwards;
    `}
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
`;

const StepNumber = styled.div<{ $visible: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 15px;
  color: #fff;
  background: linear-gradient(135deg, ${BLUE} 0%, #0066cc 100%);
  ${({ $visible }) =>
    $visible &&
    css`
      animation: ${pulse} 1.6s ease-out 0.2s 2;
    `}
`;

const RailLine = styled.div<{ $visible: boolean }>`
  width: 2px;
  flex: 1;
  margin: 6px 0;
  background: linear-gradient(${BLUE}, rgba(0, 162, 255, 0.1));
  transform-origin: top;
  transform: scaleY(${({ $visible }) => ($visible ? 1 : 0)});
  transition: transform 0.9s ease-out 0.3s;
`;

const StepBody = styled.div`
  flex: 1;
  min-width: 0;
  padding-bottom: 22px;
`;

const StepTitle = styled.div`
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  margin: 6px 0 4px;
`;

const StepText = styled.p`
  font-size: 14px;
  color: #c9d6e3;
  line-height: 1.55;
  margin: 0 0 12px;
`;

const VisualCard = styled.div`
  border-radius: 12px;
  padding: 12px;
  background: rgba(3, 16, 31, 0.7);
  border: 1px solid rgba(0, 162, 255, 0.18);
  overflow: hidden;
`;

const PreRegisterButton = styled.div<{ $done: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: ${({ $done }) => ($done ? "#1f9d55" : BLUE)};
  transition: background 0.3s;
  ${({ $done }) =>
    $done &&
    css`
      animation: ${pop} 0.45s ease-out;
    `}
`;

const MatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MatchTime = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 162, 255, 0.12);
  color: ${BLUE};
  font-size: 12px;
  line-height: 1.3;

  strong {
    font-size: 14px;
  }
`;

const MatchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MatchTitle = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`;

const MatchPlace = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #8a9bab;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const AcceptedBadge = styled.div<{ $show: boolean }>`
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #1f9d55;
  opacity: 0;
  ${({ $show }) =>
    $show &&
    css`
      animation: ${pop} 0.45s ease-out forwards;
    `}
`;

const LadderBoard = styled.div`
  position: relative;
`;

const LadderRow = styled.div<{ $you?: boolean; $animate: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 13px;
  box-sizing: border-box;
  transition: ${({ $animate }) => ($animate ? "top 0.6s ease-in-out" : "none")};
  background: ${({ $you }) =>
    $you ? "rgba(0, 162, 255, 0.2)" : "rgba(255, 255, 255, 0.04)"};
  border: 1px solid
    ${({ $you }) => ($you ? "rgba(0, 162, 255, 0.6)" : "transparent")};
  z-index: ${({ $you }) => ($you ? 1 : 0)};
`;

const RankNumber = styled.span<{ $you?: boolean }>`
  width: 16px;
  font-weight: 800;
  color: ${({ $you }) => ($you ? BLUE : "#8a9bab")};
`;

const RowName = styled.span`
  flex: 1;
  font-weight: 700;
  color: #fff;
`;

const RowCp = styled.span<{ $you?: boolean }>`
  position: relative;
  font-weight: 700;
  color: ${({ $you }) => ($you ? BLUE : "#c9d6e3")};
`;

const CpPop = styled.span`
  position: absolute;
  right: calc(100% + 8px);
  top: 0;
  font-size: 12px;
  font-weight: 800;
  color: ${GOLD};
  animation: ${floatUp} 1.1s ease-out forwards;
`;

const BracketSvg = styled.svg<{ $active: boolean }>`
  display: block;
  width: 100%;
  max-width: 320px;
  height: auto;

  rect {
    fill: rgba(255, 255, 255, 0.08);
  }

  path {
    fill: none;
    stroke: ${BLUE};
    stroke-width: 2;
    stroke-dasharray: 120;
    stroke-dashoffset: 120;
  }

  .semi,
  .final,
  .finalText {
    opacity: 0;
  }

  .semi {
    fill: rgba(0, 162, 255, 0.25);
  }

  .final {
    fill: rgba(255, 200, 0, 0.2);
    stroke: ${GOLD};
    stroke-width: 1.5;
  }

  .finalText {
    font-size: 12px;
  }

  ${({ $active }) =>
    $active &&
    css`
      .round1 {
        animation: ${draw} 0.8s ease-out 0.2s forwards;
      }
      .semi {
        animation: ${fadeIn} 0.4s ease-out 0.9s forwards;
      }
      .round2 {
        animation: ${draw} 0.8s ease-out 1.2s forwards;
      }
      .final,
      .finalText {
        animation: ${fadeIn} 0.5s ease-out 1.9s forwards;
      }
    `}
`;

const PrizeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const TrophyWrap = styled.div`
  position: relative;
  width: 64px;
  height: 84px;
  flex-shrink: 0;
`;

const TrophyGlow = styled.div<{ $cash: boolean }>`
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    ${({ $cash }) => ($cash ? "rgba(255, 200, 0, 0.45)" : "rgba(0, 162, 255, 0.45)")}
      0%,
    transparent 70%
  );
  animation: ${glow} 2.4s ease-in-out infinite;
`;

const TrophyImage = styled.img`
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: ${hover} 3s ease-in-out infinite;
`;

const PrizeCaption = styled.div`
  font-size: 13px;
  color: #c9d6e3;
`;

const PrizeFigure = styled.div<{ $cash: boolean }>`
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(
    90deg,
    ${({ $cash }) => ($cash ? GOLD : BLUE)} 0%,
    #ffffff 50%,
    ${({ $cash }) => ($cash ? GOLD : BLUE)} 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ${shimmer} 3s linear infinite;

  @media (max-width: 480px) {
    font-size: 28px;
  }
`;
