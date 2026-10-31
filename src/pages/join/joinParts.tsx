import React from "react";
import styled from "styled-components";
import { appStoreBadge, playStoreBadge } from "../../assets";

export const APP_STORE_URL =
  "https://apps.apple.com/app/court-champs/id6538725576";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.courtchamp";

/** App Store and Google Play badges, each opening its store in a new tab. */
export const StoreBadges: React.FC = () => (
  <BadgeRow>
    <BadgeButton onClick={() => window.open(APP_STORE_URL, "_blank")}>
      <BadgeImage src={appStoreBadge} alt="Download on the App Store" />
    </BadgeButton>
    <BadgeButton onClick={() => window.open(PLAY_STORE_URL, "_blank")}>
      <BadgeImage src={playStoreBadge} alt="Get it on Google Play" />
    </BadgeButton>
  </BadgeRow>
);

export const PageContainer = styled.div({
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

export const LogoImg = styled.img({
  width: 200,
  maxWidth: "60%",
  height: "auto",
  marginBottom: 28,
});

export const HeroCard = styled.div({
  position: "relative",
  width: "100%",
  maxWidth: 680,
  borderRadius: 16,
  overflow: "hidden",
  marginBottom: 16,
  minHeight: 200,
  backgroundColor: "rgb(10, 30, 55)",
});

export const HeroImage = styled.img<{ isDefault?: boolean }>(
  ({ isDefault }) => ({
    width: "100%",
    height: 220,
    objectFit: isDefault ? "contain" : "cover",
    objectPosition: isDefault ? "right center" : "center center",
    display: "block",
  }),
);

export const HeroOverlay = styled.div({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "65%",
  background:
    "linear-gradient(to top, rgba(3,16,31,0.98) 0%, transparent 100%)",
});

export const HeroContent = styled.div({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "20px 20px 18px",
});

export const CompetitionLabel = styled.div({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#00A2FF",
  marginBottom: 4,
});

export const CompetitionName = styled.h1({
  fontSize: 24,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 6px",
  lineHeight: 1.2,
  "@media (max-width: 480px)": {
    fontSize: 18,
  },
});

export const LocationText = styled.div({
  fontSize: 13,
  color: "#aaa",
});

export const TagsRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  width: "100%",
  maxWidth: 680,
  marginBottom: 16,
});

export const SectionCard = styled.div({
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

export const SectionTitle = styled.h3({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#00A2FF",
  margin: "0 0 12px",
});

export const DescriptionText = styled.p({
  fontSize: 14,
  color: "#bbb",
  lineHeight: 1.6,
  margin: 0,
});

export const CTACard = styled.div({
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

export const CTATitle = styled.h2({
  fontSize: 22,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 8px",
  "@media (max-width: 480px)": {
    fontSize: 18,
  },
});

export const CTASubtitle = styled.p({
  fontSize: 15,
  color: "#aaa",
  margin: "0 0 24px",
  lineHeight: 1.5,
  "@media (max-width: 480px)": {
    fontSize: 13,
  },
});

export const BadgeRow = styled.div({
  display: "flex",
  gap: 16,
  justifyContent: "center",
  flexWrap: "wrap",
});

export const BadgeButton = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  transition: "transform 0.2s",
  ":hover": { transform: "scale(1.05)" },
});

export const BadgeImage = styled.img({
  height: 52,
  objectFit: "contain",
  maxWidth: 180,
  "@media (max-width: 480px)": {
    height: 42,
    maxWidth: 140,
  },
});

export const SkeletonWrapper = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "100%",
  maxWidth: 680,
});

export const SkeletonBlock = styled.div<{
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

export const SkeletonRow = styled.div({
  display: "flex",
  gap: 8,
});

export const SkeletonPill = styled.div({
  height: 28,
  width: 80,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.07)",
});

export const ErrorCard = styled.div({
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

export const ErrorIcon = styled.div({ fontSize: 48, marginBottom: 16 });

export const ErrorTitle = styled.h2({
  fontSize: 20,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 8px",
});

export const ErrorText = styled.p({ fontSize: 14, color: "#888", margin: 0 });

export const FooterText = styled.div({
  fontSize: 12,
  color: "#444",
  marginTop: 12,
});
