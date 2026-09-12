import React, { useEffect } from "react";
import styled, { css, keyframes } from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";
import {
  FaTrophy,
  FaUsers,
  FaChartLine,
  FaMedal,
  FaBell,
  FaVideo,
  FaMapMarkerAlt,
  FaListOl,
  FaBolt,
  FaComments,
} from "react-icons/fa";

import { CourtChampLogo, playStoreBadge, appStoreBadge } from "../../assets";
import { appImages } from "../../assets/appImages";

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const theme = {
  bg: "rgb(3, 16, 31)",
  bgAlt: "#071b30",
  panel: "rgba(255, 255, 255, 0.04)",
  panelBorder: "rgba(255, 255, 255, 0.08)",
  blue: "#00A2FF",
  blueDeep: "#0057FF",
  gold: "#FFD100",
  orange: "#FF7800",
  text: "#FFFFFF",
  muted: "#93a7bd",
};

// ─── Content ───────────────────────────────────────────────────────────────────

const heroHighlights = [
  { icon: <FaTrophy />, label: "Leagues & Tournaments" },
  { icon: <FaChartLine />, label: "Live Scoreboards" },
  { icon: <FaMedal />, label: "Ranks, XP & Medals" },
];

const steps = [
  {
    icon: <FaUsers />,
    title: "Join or Create",
    description:
      "Find a league in your area or spin up your own competition, then invite players to the court.",
  },
  {
    icon: <FaBolt />,
    title: "Play & Log Scores",
    description:
      "Record match results on a live scoreboard and watch stats, standings and rivalries update instantly.",
  },
  {
    icon: <FaTrophy />,
    title: "Climb the Ranks",
    description:
      "Earn XP, unlock medals and rise up the leaderboard as you turn every match into a title race.",
  },
];

const features = [
  {
    label: "Scoreboard",
    image: appImages.scoreboard,
    description:
      "Add scores and see real-time match updates, player stats, and player performance.",
  },
  {
    label: "Home page",
    image: appImages.homePage,
    description:
      "View top players, see real-time stats and join or create leagues in your area!",
  },
  {
    label: "User Profile",
    image: appImages.userProfile,
    description:
      "A personal profile page displaying your match history, earned medals, XP, and progress toward higher ranks.",
  },
  {
    label: "Player details modal",
    image: appImages.profileDetailModal,
    description:
      "A detailed view of a player's profile, showing stats, achievements, and other relevant information in a clean overlay.",
  },
  {
    label: "League Summary",
    image: appImages.leagueSummary,
    description:
      "An overview of the league, including standings, recent matches, prize distribution, and player rankings all in one place.",
  },
  {
    label: "Team details modal",
    image: appImages.teamDetailModal,
    description:
      "View detailed team stats for your team and see who your rival is!",
  },
  {
    label: "Chat Room",
    image: appImages.chatRoom,
    description:
      "Connect with players in dedicated private chat rooms for every league, discuss games, and share experiences!",
  },
];

// Feature cards for parts of the app that don't have a screenshot on the page yet.
const moreFeatures = [
  {
    icon: <FaTrophy />,
    title: "Tournaments",
    description:
      "Run knockout brackets and round-robins with automatic fixtures and live results.",
  },
  {
    icon: <FaUsers />,
    title: "Clubs",
    description:
      "Bring your community together under one roof and keep every member in the loop.",
  },
  {
    icon: <FaListOl />,
    title: "Global Leaderboards",
    description:
      "See how you stack up against the best players across every competition.",
  },
  {
    icon: <FaMedal />,
    title: "Ranks & Medals",
    description:
      "Progress through ranks and collect medals that showcase your achievements.",
  },
  {
    icon: <FaBell />,
    title: "Live Notifications",
    description:
      "Stay on top of invites, results and league activity the moment it happens.",
  },
  {
    icon: <FaVideo />,
    title: "Game Highlights",
    description:
      "Capture and share the best moments from your matches with the community.",
  },
  {
    icon: <FaMapMarkerAlt />,
    title: "Find Courts",
    description:
      "Discover courts near you and see where the action is happening.",
  },
  {
    icon: <FaComments />,
    title: "League Chat",
    description:
      "Trash talk, organise games and celebrate wins in every league's private chat.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  useEffect(() => {
    AOS.init({
      duration: 600,
      offset: 120,
      once: true,
      easing: "ease-in-out",
      mirror: false,
    });
  }, []);

  const openAppStore = () => {
    window.open("https://apps.apple.com/app/court-champs/id6538725576", "_blank");
  };

  const openPlayStore = () => {
    window.open(
      "https://play.google.com/store/apps/details?id=com.courtchamp",
      "_blank",
    );
  };

  const StoreBadges = (
    <BadgeRow>
      <BadgeLink onClick={openAppStore} aria-label="Download on the App Store">
        <BadgeImage src={appStoreBadge} alt="Download on the App Store" />
      </BadgeLink>
      <BadgeLink onClick={openPlayStore} aria-label="Get it on Google Play">
        <BadgeImage src={playStoreBadge} alt="Get it on Google Play" />
      </BadgeLink>
    </BadgeRow>
  );

  return (
    <PageContainer>
      <GlowTop />
      <GlowMid />

      {/* ─── Hero ─── */}
      <Hero>
        <HeroCopy>
          <Logo src={CourtChampLogo} alt="CourtChamps" data-aos="fade-up" />
          <Eyebrow data-aos="fade-up" data-aos-delay="50">
            The home of competitive racket sports
          </Eyebrow>
          <HeroHeadline data-aos="fade-up" data-aos-delay="100">
            Turn every match into a <Gradient>title race</Gradient>
          </HeroHeadline>
          <HeroSub data-aos="fade-up" data-aos-delay="150">
            Join leagues and tournaments, log live scores, track your stats and
            climb the ranks. CourtChamps brings the whole competitive
            experience to your pocket.
          </HeroSub>
          <div data-aos="fade-up" data-aos-delay="200">
            {StoreBadges}
          </div>
          <HighlightRow data-aos="fade-up" data-aos-delay="250">
            {heroHighlights.map((h) => (
              <HighlightPill key={h.label}>
                <PillIcon>{h.icon}</PillIcon>
                {h.label}
              </HighlightPill>
            ))}
          </HighlightRow>
        </HeroCopy>

        <HeroVisual data-aos="fade-left" data-aos-delay="200">
          <PhoneFrame $featured>
            <PhoneScreen src={appImages.homePage} alt="CourtChamps home screen" />
          </PhoneFrame>
          <PhoneFrame $floatingBack>
            <PhoneScreen src={appImages.scoreboard} alt="CourtChamps scoreboard" />
          </PhoneFrame>
        </HeroVisual>
      </Hero>

      {/* ─── How it works ─── */}
      <Section>
        <SectionEyebrow data-aos="fade-up">How it works</SectionEyebrow>
        <SectionTitle data-aos="fade-up">
          From first serve to champion
        </SectionTitle>
        <StepsGrid>
          {steps.map((step, i) => (
            <StepCard key={step.title} data-aos="fade-up" data-aos-delay={i * 100}>
              <StepNumber>{i + 1}</StepNumber>
              <StepIcon>{step.icon}</StepIcon>
              <StepTitle>{step.title}</StepTitle>
              <StepText>{step.description}</StepText>
            </StepCard>
          ))}
        </StepsGrid>
      </Section>

      {/* ─── Feature showcase ─── */}
      <Section>
        <SectionEyebrow data-aos="fade-up">Inside the app</SectionEyebrow>
        <SectionTitle data-aos="fade-up">
          Everything you need to compete
        </SectionTitle>
        <FeaturesContainer>
          {features.map((feat, idx) => {
            const isOdd = idx % 2 === 1;
            return (
              <FeatureRow key={feat.label} $reverse={isOdd}>
                <FeatureVisual
                  data-aos={isOdd ? "fade-left" : "fade-right"}
                >
                  <PhoneFrame>
                    <PhoneScreen src={feat.image} alt={feat.label} />
                  </PhoneFrame>
                </FeatureVisual>
                <FeatureDescriptionContainer
                  $reverse={isOdd}
                  data-aos={isOdd ? "fade-right" : "fade-left"}
                >
                  <FeatureIndex>
                    {String(idx + 1).padStart(2, "0")}
                  </FeatureIndex>
                  <FeatureTitle>{feat.label}</FeatureTitle>
                  <FeatureText>{feat.description}</FeatureText>
                </FeatureDescriptionContainer>
              </FeatureRow>
            );
          })}
        </FeaturesContainer>
      </Section>

      {/* ─── More features grid ─── */}
      <Section>
        <SectionEyebrow data-aos="fade-up">And so much more</SectionEyebrow>
        <SectionTitle data-aos="fade-up">Built for every player</SectionTitle>
        <FeatureGrid>
          {moreFeatures.map((f, i) => (
            <MiniCard key={f.title} data-aos="fade-up" data-aos-delay={(i % 4) * 80}>
              <MiniIcon>{f.icon}</MiniIcon>
              <MiniTitle>{f.title}</MiniTitle>
              <MiniText>{f.description}</MiniText>
            </MiniCard>
          ))}
        </FeatureGrid>
      </Section>

      {/* ─── Download CTA ─── */}
      <CtaBand data-aos="zoom-in">
        <CtaGlow />
        <CtaTitle>Ready to become a Court Champ?</CtaTitle>
        <CtaSub>
          Download CourtChamps for free and start climbing the ranks today.
        </CtaSub>
        {StoreBadges}
      </CtaBand>

      {/* ─── Footer ─── */}
      <FooterRow>
        <FooterLinks>
          <a
            href="https://www.privacypolicies.com/live/914311ad-9248-4550-ac0b-b316f863aa78"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          <Link to="/accounts/delete-account">Delete Account</Link>
          <a href="mailto:info@courtchamps.com">info@courtchamps.com</a>
        </FooterLinks>
        <Copyright>© {new Date().getFullYear()} CourtChamps</Copyright>
      </FooterRow>
    </PageContainer>
  );
}

// ─── Animations ────────────────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────

const PageContainer = styled.div({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: theme.bg,
  color: theme.text,
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden",
  padding: "0 24px 0",
  boxSizing: "border-box",
});

// Decorative background glows
const GlowTop = styled.div({
  position: "absolute",
  top: "-200px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "900px",
  height: "700px",
  maxWidth: "120vw",
  background: `radial-gradient(circle, ${theme.blue}22 0%, transparent 65%)`,
  pointerEvents: "none",
  zIndex: 0,
});

const GlowMid = styled.div({
  position: "absolute",
  top: "45%",
  right: "-200px",
  width: "600px",
  height: "600px",
  background: `radial-gradient(circle, ${theme.blueDeep}18 0%, transparent 65%)`,
  pointerEvents: "none",
  zIndex: 0,
});

// ─── Hero ───
const Hero = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "48px",
  width: "100%",
  maxWidth: "1120px",
  padding: "72px 0 96px",
  "@media (max-width: 900px)": {
    flexDirection: "column",
    padding: "48px 0 64px",
    gap: "56px",
  },
});

const HeroCopy = styled.div({
  flex: "1 1 480px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  "@media (max-width: 900px)": {
    alignItems: "center",
    textAlign: "center",
  },
});

const Logo = styled.img({
  width: "300px",
  maxWidth: "70%",
  height: "auto",
  marginBottom: "28px",
});

const Eyebrow = styled.div({
  textTransform: "uppercase",
  letterSpacing: "2.5px",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: theme.blue,
  marginBottom: "18px",
});

const HeroHeadline = styled.h1({
  fontSize: "3.4rem",
  lineHeight: 1.08,
  fontWeight: 800,
  margin: 0,
  letterSpacing: "-1px",
  "@media (max-width: 900px)": { fontSize: "2.5rem" },
  "@media (max-width: 480px)": { fontSize: "2rem" },
});

const Gradient = styled.span({
  background: `linear-gradient(90deg, ${theme.blue}, ${theme.blueDeep})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
});

const HeroSub = styled.p({
  fontSize: "1.2rem",
  lineHeight: 1.6,
  color: theme.muted,
  maxWidth: "520px",
  margin: "24px 0 32px",
  "@media (max-width: 480px)": { fontSize: "1.05rem" },
});

const HighlightRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "28px",
  "@media (max-width: 900px)": { justifyContent: "center" },
});

const HighlightPill = styled.div({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "9px 16px",
  borderRadius: "999px",
  background: theme.panel,
  border: `1px solid ${theme.panelBorder}`,
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#dce6f0",
});

const PillIcon = styled.span({
  display: "inline-flex",
  color: theme.blue,
  fontSize: "0.95rem",
});

const HeroVisual = styled.div({
  position: "relative",
  flex: "1 1 380px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "560px",
  "@media (max-width: 900px)": { minHeight: "520px", width: "100%" },
  "@media (max-width: 480px)": { minHeight: "460px" },
});

// ─── Phone frame ───
const PhoneFrame = styled.div<{ $featured?: boolean; $floatingBack?: boolean }>`
  position: ${({ $featured, $floatingBack }) =>
    $featured || $floatingBack ? "absolute" : "relative"};
  width: ${({ $featured, $floatingBack }) =>
    $featured ? "270px" : $floatingBack ? "215px" : "260px"};
  padding: 10px;
  border-radius: 38px;
  background: linear-gradient(160deg, #1b2b40, #0a1626);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ $featured }) =>
    $featured
      ? `0 30px 70px rgba(0,0,0,0.55), 0 0 60px ${theme.blue}30`
      : "0 24px 55px rgba(0,0,0,0.5)"};
  z-index: ${({ $featured }) => ($featured ? 2 : 1)};
  ${({ $featured }) =>
    $featured &&
    css`
      transform: rotate(-4deg);
      left: 8%;
      animation: ${float} 6s ease-in-out infinite;
    `}
  ${({ $floatingBack }) =>
    $floatingBack &&
    css`
      transform: rotate(6deg);
      right: 4%;
      top: 70px;
      opacity: 0.92;
      animation: ${float} 7s ease-in-out infinite 0.5s;
    `}
  @media (max-width: 480px) {
    width: ${({ $featured, $floatingBack }) =>
      $featured ? "220px" : $floatingBack ? "170px" : "220px"};
    padding: 8px;
    border-radius: 32px;
  }
`;

const PhoneScreen = styled.img({
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: "28px",
  objectFit: "cover",
  "@media (max-width: 480px)": { borderRadius: "24px" },
});

// ─── Sections ───
const Section = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "1120px",
  padding: "64px 0",
});

const SectionEyebrow = styled.div({
  textTransform: "uppercase",
  letterSpacing: "2.5px",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: theme.blue,
  marginBottom: "12px",
});

const SectionTitle = styled.h2({
  fontSize: "2.4rem",
  fontWeight: 800,
  textAlign: "center",
  margin: "0 0 48px",
  letterSpacing: "-0.5px",
  "@media (max-width: 480px)": { fontSize: "1.8rem", marginBottom: "36px" },
});

// ─── Steps ───
const StepsGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "24px",
  width: "100%",
  "@media (max-width: 768px)": { gridTemplateColumns: "1fr" },
});

const StepCard = styled.div({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: "32px 28px",
  borderRadius: "20px",
  background: theme.panel,
  border: `1px solid ${theme.panelBorder}`,
  overflow: "hidden",
  transition: "transform 0.25s ease, border-color 0.25s ease",
  ":hover": {
    transform: "translateY(-6px)",
    borderColor: `${theme.blue}55`,
  },
});

const StepNumber = styled.span({
  position: "absolute",
  top: "12px",
  right: "20px",
  fontSize: "3.5rem",
  fontWeight: 800,
  lineHeight: 1,
  color: "rgba(255,255,255,0.06)",
});

const StepIcon = styled.div({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "14px",
  background: `linear-gradient(145deg, ${theme.blue}, ${theme.blueDeep})`,
  color: "#fff",
  fontSize: "1.4rem",
  marginBottom: "20px",
  boxShadow: `0 8px 24px ${theme.blue}40`,
});

const StepTitle = styled.h3({
  fontSize: "1.35rem",
  fontWeight: 700,
  margin: "0 0 10px",
});

const StepText = styled.p({
  fontSize: "1rem",
  lineHeight: 1.6,
  color: theme.muted,
  margin: 0,
});

// ─── Feature showcase ───
const FeaturesContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "72px",
  width: "100%",
  maxWidth: "960px",
});

const FeatureRow = styled.div<{ $reverse?: boolean }>(({ $reverse }) => ({
  display: "flex",
  flexDirection: $reverse ? "row-reverse" : "row",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  gap: "48px",
  "@media (max-width: 768px)": {
    flexDirection: "column",
    gap: "24px",
  },
}));

const FeatureVisual = styled.div({
  flex: "0 0 auto",
  display: "flex",
  justifyContent: "center",
});

const FeatureDescriptionContainer = styled.div<{ $reverse?: boolean }>(
  ({ $reverse }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: $reverse ? "flex-end" : "flex-start",
    textAlign: $reverse ? "right" : "left",
    maxWidth: "420px",
    "@media (max-width: 768px)": {
      alignItems: "center",
      textAlign: "center",
      padding: "0 8px",
    },
  }),
);

const FeatureIndex = styled.span({
  fontSize: "0.95rem",
  fontWeight: 700,
  letterSpacing: "2px",
  color: theme.blue,
  marginBottom: "10px",
});

const FeatureTitle = styled.h3({
  fontSize: "2rem",
  fontWeight: 700,
  margin: "0 0 12px",
  "@media (max-width: 768px)": { fontSize: "1.6rem" },
});

const FeatureText = styled.p({
  fontSize: "1.2rem",
  lineHeight: 1.6,
  color: theme.muted,
  margin: 0,
  "@media (max-width: 768px)": { fontSize: "1rem" },
});

// ─── Feature grid ───
const FeatureGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  width: "100%",
  "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
  "@media (max-width: 520px)": { gridTemplateColumns: "1fr" },
});

const MiniCard = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: "26px 22px",
  borderRadius: "18px",
  background: theme.panel,
  border: `1px solid ${theme.panelBorder}`,
  transition: "transform 0.25s ease, border-color 0.25s ease, background 0.25s ease",
  ":hover": {
    transform: "translateY(-6px)",
    borderColor: `${theme.blue}55`,
    background: "rgba(255,255,255,0.06)",
  },
});

const MiniIcon = styled.div({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  background: `${theme.blue}1a`,
  border: `1px solid ${theme.blue}33`,
  color: theme.blue,
  fontSize: "1.25rem",
  marginBottom: "16px",
});

const MiniTitle = styled.h4({
  fontSize: "1.15rem",
  fontWeight: 700,
  margin: "0 0 8px",
});

const MiniText = styled.p({
  fontSize: "0.95rem",
  lineHeight: 1.55,
  color: theme.muted,
  margin: 0,
});

// ─── CTA band ───
const CtaBand = styled.section({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  width: "100%",
  maxWidth: "1120px",
  margin: "48px 0 80px",
  padding: "64px 32px",
  borderRadius: "28px",
  overflow: "hidden",
  background: "linear-gradient(145deg, #0c2137, #06182b)",
  border: `1px solid ${theme.panelBorder}`,
  "@media (max-width: 480px)": { padding: "48px 20px" },
});

const CtaGlow = styled.div({
  position: "absolute",
  top: "-120px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "500px",
  height: "300px",
  maxWidth: "100%",
  background: `radial-gradient(circle, ${theme.blue}33 0%, transparent 70%)`,
  pointerEvents: "none",
});

const CtaTitle = styled.h2({
  position: "relative",
  fontSize: "2.4rem",
  fontWeight: 800,
  margin: "0 0 14px",
  letterSpacing: "-0.5px",
  "@media (max-width: 480px)": { fontSize: "1.8rem" },
});

const CtaSub = styled.p({
  position: "relative",
  fontSize: "1.15rem",
  color: theme.muted,
  margin: "0 0 32px",
  maxWidth: "480px",
});

// ─── Badges ───
const BadgeRow = styled.div({
  display: "flex",
  flexDirection: "row",
  gap: "18px",
  flexWrap: "wrap",
  justifyContent: "center",
  marginTop: "8px",
});

const BadgeLink = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  transition: "transform 0.2s",
  ":hover": { transform: "scale(1.05)" },
});

const BadgeImage = styled.img({
  height: "56px",
  objectFit: "contain",
  maxWidth: "190px",
  "@media (max-width: 480px)": { height: "48px", maxWidth: "150px" },
});

// ─── Footer ───
const FooterRow = styled.footer({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  width: "100%",
  maxWidth: "1120px",
  padding: "32px 0 48px",
  borderTop: `1px solid ${theme.panelBorder}`,
  color: theme.muted,
});

const FooterLinks = styled.div({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "24px",
  fontSize: "0.95rem",
  a: {
    color: "#dce6f0",
    textDecoration: "none",
    transition: "color 0.2s",
  },
  "a:hover": { color: theme.blue },
  "@media (max-width: 480px)": { gap: "16px", fontSize: "0.85rem" },
});

const Copyright = styled.div({
  fontSize: "0.85rem",
  color: theme.muted,
});
