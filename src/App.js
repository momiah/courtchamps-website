import React, { useEffect } from "react";
import styled from "styled-components";
import AOS from "aos";
import "aos/dist/aos.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import CourtChampsLogo from "./assets/court-champ-logo.png";
import AppStoreBadge from "./assets/app-store-mobile-download-button.png";
import PlayStoreBadge from "./assets/play-store-mobile-download-button.png";
import { appImages } from "./assets/appImages";

import DeleteAccount from "./pages/accounts/DeleteAccount";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/accounts/delete-account" element={<DeleteAccount />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
  useEffect(() => {
    AOS.init({
      duration: 600,
      offset: 150,
      once: true,
      easing: "ease-in-out",
      mirror: false,
    });
  }, []);

  const openAppStore = () => {
    window.open(
      "https://apps.apple.com/app/court-champs/id6538725576",
      "_blank"
    );
  };

  const openPlayStore = () => {
    window.open(
      "https://play.google.com/store/apps/details?id=com.courtchamp",
      "_blank"
    );
  };

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
        "Connect with players in dedicated private chat room for every league, discuss games, and share experiences!",
    },
  ];

  return (
    <PageContainer>
      <HeaderSection>
        <Logo src={CourtChampsLogo} alt="CourtChamps Logo" data-aos="zoom-in" />
      </HeaderSection>
      <BadgeRow>
        <BadgeLink
          onClick={openAppStore}
          data-aos="zoom-in"
          data-aos-offset="150"
        >
          <BadgeImage src={AppStoreBadge} alt="Download on the App Store" />
        </BadgeLink>
        <BadgeLink
          onClick={openPlayStore}
          data-aos="zoom-in"
          data-aos-offset="150"
        >
          <BadgeImage src={PlayStoreBadge} alt="Get it on Google Play" />
        </BadgeLink>
      </BadgeRow>
      <FeaturesContainer>
        {features.map((feat, idx) => {
          const isOdd = idx % 2 === 1;
          const imgAnimation = isOdd ? "fade-left" : "fade-right";
          const textAnimation = isOdd ? "fade-right" : "fade-left";

          return (
            <FeatureRow key={idx} reverse={isOdd}>
              <FeatureImage
                src={feat.image}
                alt={feat.label}
                data-aos={imgAnimation}
                data-aos-offset="150"
              />
              <FeatureDescriptionContainer
                reverse={isOdd}
                data-aos={textAnimation}
                data-aos-offset="150"
              >
                <FeatureTitle>{feat.label}</FeatureTitle>
                <FeatureText>{feat.description}</FeatureText>
              </FeatureDescriptionContainer>
            </FeatureRow>
          );
        })}
      </FeaturesContainer>
      <FooterRow>
        <a
          href="https://www.privacypolicies.com/live/914311ad-9248-4550-ac0b-b316f863aa78"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#FFFFFF",
            textDecoration: "none",
            marginRight: "8px",
          }}
        >
          Privacy Policy
        </a>
        <Link
          to="/accounts/delete-account"
          style={{
            color: "#FFFFFF",
            textDecoration: "none",
            marginRight: "8px",
          }}
        >
          Delete Account
        </Link>
        <span>info@courtchamps.com</span>
        <span>© 2025 CourtChamps</span>
      </FooterRow>
    </PageContainer>
  );
}

// Styled components (object style)

const PageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  minHeight: "100vh",
  width: "100%",
  padding: "40px 24px",
  boxSizing: "border-box",
});

const HeaderSection = styled.div({
  marginBottom: "48px",
  paddingLeft: "74px",
});

const Logo = styled.img({
  width: "400px",
  maxWidth: "80%",
  height: "auto",
});

const FeaturesContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "48px",
  width: "100%",
  maxWidth: "960px",
  marginBottom: "64px",
});

const FeatureRow = styled.div(({ reverse }) => ({
  display: "flex",
  flexDirection: reverse ? "row-reverse" : "row",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  gap: "24px",

  "@media (max-width: 768px)": {
    flexDirection: "column",
    gap: "16px",
  },
}));

const FeatureImage = styled.img({
  width: "100%",
  maxWidth: "300px",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  objectFit: "cover",

  "@media (max-width: 768px)": {
    maxWidth: "200px",
    height: "auto",
  },
});

const FeatureDescriptionContainer = styled.div(({ reverse }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: reverse ? "flex-end" : "flex-start",
  maxWidth: "400px",
  padding: "0 16px",

  "@media (max-width: 768px)": {
    alignItems: "center",
    padding: 25,
  },
}));

const FeatureTitle = styled.div({
  fontSize: "2.25rem",
  fontWeight: "600",
  color: "#FFFFFF",
  textAlign: "inherit",
  width: "100%",
  "@media (max-width: 768px)": {
    fontSize: "1rem",
    width: "100%",
  },
});

const FeatureText = styled.div({
  fontSize: "1.5rem",
  color: "#CCCCCC",
  marginTop: "8px",
  textAlign: "inherit",
  "@media (max-width: 768px)": {
    fontSize: "0.875rem",
    width: "100%",
  },
});

const BadgeRow = styled.div({
  display: "flex",
  flexDirection: "row",
  gap: "24px",
  flexWrap: "wrap",
  justifyContent: "center",
  marginBottom: "32px",
});

const BadgeLink = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  transition: "transform 0.2s",
  ":hover": {
    transform: "scale(1.05)",
  },
});

const BadgeImage = styled.img({
  height: "60px",
  objectFit: "contain",
  maxWidth: "200px",
  "@media (max-width: 480px)": {
    height: "50px",
    maxWidth: "160px",
  },
});

const FooterRow = styled.div({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  padding: "16px 0",
  gap: "25px",
  "@media (max-width: 480px)": {
    fontSize: "0.75rem",
  },
});
