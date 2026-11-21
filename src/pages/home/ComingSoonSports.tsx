import React from "react";
import styled from "styled-components";

const palette = {
  card: "#071b30",
  blue: "#00A2FF",
  gold: "#ffc800",
  muted: "#93a7bd",
  panelBorder: "rgba(255, 255, 255, 0.08)",
};

const iconProps = {
  width: 40,
  height: 40,
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TennisIcon = () => (
  <svg {...iconProps}>
    <circle cx="24" cy="24" r="17" />
    <path d="M11 12.5c6.5 5.5 6.5 17.5 0 23" />
    <path d="M37 12.5c-6.5 5.5-6.5 17.5 0 23" />
  </svg>
);

const PadelIcon = () => (
  <svg {...iconProps}>
    <g transform="rotate(-30 24 24)">
      <path d="M24 4c7.2 0 12 5.6 12 12.6 0 6.2-3.9 11-8.6 13.2l-.9 3.2h-5l-.9-3.2C15.9 27.6 12 22.8 12 16.6 12 9.6 16.8 4 24 4z" />
      <rect x="21.5" y="33" width="5" height="12" rx="2" />
      {[
        [19.5, 12],
        [24, 12],
        [28.5, 12],
        [17.5, 17],
        [22, 17],
        [26.5, 17],
        [30.5, 17],
        [19.5, 22],
        [24, 22],
        [28.5, 22],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="1.1"
          fill="currentColor"
          stroke="none"
        />
      ))}
    </g>
    <circle cx="42" cy="31" r="4" fill={palette.gold} stroke="none" />
  </svg>
);

const SquashIcon = () => (
  <svg {...iconProps}>
    <g transform="rotate(-30 22 24)">
      <ellipse cx="22" cy="14" rx="8.5" ry="11" />
      <path
        d="M18.5 10v8M22 6.5v15M25.5 10v8M14.5 11h15M14 16h16M15.5 21h13"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path d="M17.5 23.5 22 31l4.5-7.5" />
      <path d="M22 31v14" strokeWidth="4" />
    </g>
    <circle cx="39" cy="38" r="3.5" fill={palette.gold} stroke="none" />
  </svg>
);

const sports = [
  {
    name: "Tennis",
    icon: <TennisIcon />,
    description:
      "Singles and doubles leagues, rankings and ladders for club and park players.",
  },
  {
    name: "Padel",
    icon: <PadelIcon />,
    description:
      "Doubles leagues and tournaments for one of the fastest-growing racket sports.",
  },
  {
    name: "Squash",
    icon: <SquashIcon />,
    description:
      "Box leagues, ladders and rankings to settle every club rivalry.",
  },
];

export default function ComingSoonSports() {
  return (
    <Section>
      <Eyebrow data-aos="fade-up">Coming soon</Eyebrow>
      <Title data-aos="fade-up">More racket sports on the way</Title>
      <Sub data-aos="fade-up">
        Badminton is live now. Tennis, padel and squash are next, with the same
        leagues, tournaments, rankings and ladders.
      </Sub>
      <Grid>
        {sports.map((sport, i) => (
          <Card key={sport.name} data-aos="fade-up" data-aos-delay={i * 80}>
            <IconTile>{sport.icon}</IconTile>
            <SportName>{sport.name}</SportName>
            <SportText>{sport.description}</SportText>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

const Section = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "1120px",
  padding: "72px 0 24px",
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
  margin: "0 0 14px",
  letterSpacing: "-0.5px",
  "@media (max-width: 480px)": { fontSize: "1.8rem" },
});

const Sub = styled.p({
  maxWidth: "560px",
  textAlign: "center",
  fontSize: "1.05rem",
  lineHeight: 1.6,
  color: palette.muted,
  margin: "0 0 40px",
});

const Grid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "20px",
  width: "100%",
  "@media (max-width: 600px)": { gap: "10px" },
});

const Card = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "26px 24px",
  borderRadius: "18px",
  background: palette.card,
  border: `1px solid ${palette.panelBorder}`,
  transition: "border-color 0.25s ease",
  ":hover": { borderColor: `${palette.blue}55` },
  "@media (max-width: 600px)": { padding: "18px 8px", borderRadius: "14px" },
});

const IconTile = styled.div({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "64px",
  height: "64px",
  borderRadius: "16px",
  background: `${palette.blue}1a`,
  border: `1px solid ${palette.blue}33`,
  color: palette.blue,
  marginBottom: "18px",
  "@media (max-width: 600px)": {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    marginBottom: "12px",
    svg: { width: "32px", height: "32px" },
  },
});

const SportName = styled.h3({
  fontSize: "1.3rem",
  fontWeight: 700,
  margin: "0 0 8px",
  "@media (max-width: 600px)": { fontSize: "1rem", margin: 0 },
});

const SportText = styled.p({
  fontSize: "0.95rem",
  lineHeight: 1.55,
  color: palette.muted,
  margin: 0,
  "@media (max-width: 600px)": { display: "none" },
});
