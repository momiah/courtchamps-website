import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { GameVideo } from "../../types/game";
import { CourtChampLogo, appStoreBadge, playStoreBadge } from "../../assets";
import { formatDisplayName } from "helpers/formatDisplayName";
import { ccImageEndpoint } from "../../schemas/schema";

const PREVIEW_DURATION = 5; // seconds before pausing for non-authenticated users

const VideoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("v");

  const [video, setVideo] = useState<GameVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!docId) {
      setError("No video specified.");
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      try {
        const ref = doc(db, "gameVideos", docId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Video not found.");
          return;
        }
        setVideo(snap.data() as GameVideo);
      } catch (err) {
        console.error(err);
        setError("Failed to load video.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [docId]);

  // ── Poll currentTime ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      if (time >= PREVIEW_DURATION && !previewEnded) {
        videoRef.current.pause();
        setIsPlaying(false);
        setPreviewEnded(true);
        clearInterval(intervalRef.current!);
      }
    }, 200);
    return () => clearInterval(intervalRef.current!);
  }, [isPlaying, previewEnded]);

  const handlePlay = () => {
    if (previewEnded) return;
    videoRef.current?.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const handleVideoClick = () => {
    if (previewEnded) return;
    if (isPlaying) handlePause();
    else handlePlay();
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const openAppStore = () =>
    window.open(
      "https://apps.apple.com/app/court-champs/id6538725576",
      "_blank",
    );

  const openPlayStore = () =>
    window.open(
      "https://play.google.com/store/apps/details?id=com.courtchamp",
      "_blank",
    );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const [score1, score2] = video?.gamescore
    ?.split("-")
    .map((s) => s.trim()) ?? ["0", "0"];
  const team1Player1 = video?.teams?.team1?.player1;
  const team1Player2 = video?.teams?.team1?.player2;
  const team2Player1 = video?.teams?.team2?.player1;
  const team2Player2 = video?.teams?.team2?.player2;

  const navigateToHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <PageContainer>
        <GlobalStyle />
        <Logo
          src={CourtChampLogo}
          alt="Court Champs"
          onClick={navigateToHome}
        />
        <SkeletonContainer>
          <SkeletonVideo />
          <SkeletonBlock height={24} width="50%" />
          <SkeletonBlock height={16} width="30%" />
        </SkeletonContainer>
      </PageContainer>
    );
  }

  if (error || !video) {
    return (
      <PageContainer>
        <GlobalStyle />
        <Logo
          src={CourtChampLogo}
          alt="Court Champs"
          onClick={navigateToHome}
        />
        <ErrorCard>
          <ErrorIcon>🏸</ErrorIcon>
          <ErrorTitle>Video Not Found</ErrorTitle>
          <ErrorText>
            {error ||
              "This video may have been removed or the link has expired."}
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

  return (
    <PageContainer>
      <GlobalStyle />
      <Logo src={CourtChampLogo} alt="Court Champs" onClick={navigateToHome} />

      {/* ── Video Player ── */}
      <VideoWrapper>
        <UploaderRow>
          <UploaderAvatar
            src={video.postedBy.profileImage || ccImageEndpoint}
            alt={video.postedBy.username}
            onError={(e) => {
              (e.target as HTMLImageElement).src = ccImageEndpoint;
            }}
          />
          <UploaderInfo>
            <UploaderName>{formatDisplayName(video.postedBy)}</UploaderName>
            <CompetitionName>{video.competitionName}</CompetitionName>
          </UploaderInfo>
        </UploaderRow>

        <VideoContainer onClick={handleVideoClick}>
          <StyledVideo
            ref={videoRef}
            src={video.videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
          />

          {/* ── Play/pause overlay ── */}
          {!isPlaying && !previewEnded && (
            <PlayOverlay>
              <PlayButton>▶</PlayButton>
            </PlayOverlay>
          )}

          {/* ── Preview ended overlay ── */}
          {previewEnded && (
            <GateOverlay>
              <GateContent>
                <GateIcon>🏸</GateIcon>
                <GateTitle>The rest of the game is in the app 📲</GateTitle>
                <GateSubtitle>It takes 30 seconds to get started.</GateSubtitle>
              </GateContent>
            </GateOverlay>
          )}

          {/* ── Controls ── */}
          {!previewEnded && (
            <Controls>
              <ProgressTrack>
                <ProgressFill style={{ width: `${progressPercent}%` }} />
                {/* 5 second marker */}
                <PreviewMarker
                  style={{
                    left: `${(PREVIEW_DURATION / (duration || 1)) * 100}%`,
                  }}
                >
                  <PreviewMarkerLabel>Preview ends</PreviewMarkerLabel>
                </PreviewMarker>
              </ProgressTrack>
              <TimeRow>
                <TimeText>{formatTime(currentTime)}</TimeText>

                <TimeText>{formatTime(duration)}</TimeText>
              </TimeRow>
            </Controls>
          )}
        </VideoContainer>
      </VideoWrapper>

      {/* ── Scorecard ── */}
      <ScorecardCard>
        <TeamColumn>
          {team1Player1 && (
            <PlayerName>{formatDisplayName(team1Player1)}</PlayerName>
          )}
          {team1Player2 && (
            <PlayerName>{formatDisplayName(team1Player2)}</PlayerName>
          )}
        </TeamColumn>
        <ScoreContainer>
          <ScoreText>{score1}</ScoreText>
          <ScoreDivider>—</ScoreDivider>
          <ScoreText>{score2}</ScoreText>
        </ScoreContainer>
        <TeamColumn right>
          {team2Player1 && (
            <PlayerName right>{formatDisplayName(team2Player1)}</PlayerName>
          )}
          {team2Player2 && (
            <PlayerName right>{formatDisplayName(team2Player2)}</PlayerName>
          )}
        </TeamColumn>
      </ScorecardCard>

      {/* ── CTA ── */}
      <CTACard>
        <CTATitle>Watch the full video on Court Champs</CTATitle>
        <CTASubtitle>
          Download for free to watch, like, comment and join competitions with
          players worldwide.
        </CTASubtitle>
        <BadgeRow>
          <BadgeButton onClick={openAppStore}>
            <BadgeImage src={appStoreBadge} alt="Download on the App Store" />
          </BadgeButton>
          <BadgeButton onClick={openPlayStore}>
            <BadgeImage src={playStoreBadge} alt="Get it on Google Play" />
          </BadgeButton>
        </BadgeRow>
      </CTACard>

      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default VideoPage;

// ─── Global ───────────────────────────────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  body { background: rgb(3, 16, 31); margin: 0; }
`;

// ─── Animations ───────────────────────────────────────────────────────────────

// Replace keyframes declarations:
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#fff",
  minHeight: "100vh",
  width: "100%",
  padding: "32px 16px 60px",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
});

const Logo = styled.img({
  width: 180,
  maxWidth: "55%",
  height: "auto",
  marginBottom: 24,
  cursor: "pointer",
});

// ─── Video ────────────────────────────────────────────────────────────────────

const VideoWrapper = styled.div`
  width: 100%;
  max-width: 680px;
  margin-bottom: 12px;
  animation: ${fadeIn} 0.4s ease;
`;

const VideoContainer = styled.div({
  position: "relative",
  width: "100%",
  aspectRatio: "16/9",
  backgroundColor: "#000",
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
});

const StyledVideo = styled.video({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
});

const PlayOverlay = styled.div({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.3)",
});

const PlayButton = styled.div({
  width: 64,
  height: 64,
  borderRadius: "50%",
  backgroundColor: "rgba(0,162,255,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  color: "#fff",
  transition: "transform 0.2s",
  ":hover": { transform: "scale(1.1)" },
});

const GateOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(3, 16, 31, 0.92);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.3s ease;
`;

const GateContent = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  padding: "0 24px",
  textAlign: "center",
});

const GateIcon = styled.div({ fontSize: 36, marginBottom: 4 });

const GateTitle = styled.h3({
  fontSize: 18,
  fontWeight: 700,
  color: "#fff",
  margin: 0,
});

const GateSubtitle = styled.p({
  fontSize: 13,
  color: "#aaa",
  margin: "0 0 8px",
});

const GateBadgeRow = styled.div({
  display: "flex",
  gap: 10,
  justifyContent: "center",
  flexWrap: "wrap",
});

const GateBadgeButton = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
});

const GateBadgeImage = styled.img({
  height: 36,
  objectFit: "contain",
});

const Controls = styled.div({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "8px 12px 10px",
  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
});

const ProgressTrack = styled.div({
  position: "relative",
  width: "100%",
  height: 4,
  backgroundColor: "rgba(255,255,255,0.25)",
  borderRadius: 2,
  overflow: "visible",
  marginBottom: 6,
});

const ProgressFill = styled.div({
  height: "100%",
  backgroundColor: "#00A2FF",
  borderRadius: 2,
  transition: "width 0.2s linear",
});

const PreviewMarker = styled.div({
  position: "absolute",
  top: -2,
  width: 2,
  height: 8,
  backgroundColor: "#FFD700",
  transform: "translateX(-50%)",
  ":hover div": { opacity: 1 },
});

const PreviewMarkerLabel = styled.div({
  position: "absolute",
  bottom: 12,
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "rgba(0,0,0,0.8)",
  color: "#FFD700",
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 4,
  whiteSpace: "nowrap",
  opacity: 0,
  transition: "opacity 0.2s",
  pointerEvents: "none",
});

const TimeRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const TimeText = styled.span({
  fontSize: 11,
  color: "rgba(255,255,255,0.7)",
});

const PreviewNote = styled.span({
  fontSize: 10,
  color: "#FFD700",
  fontWeight: 600,
});

// ─── Scorecard ────────────────────────────────────────────────────────────────

const ScorecardCard = styled.div`
  width: 100%;
  max-width: 680px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(0, 100, 200, 0.12);
  border: 1px solid rgba(0, 162, 255, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 10px;
  animation: ${fadeIn} 0.5s ease 0.1s both;
  box-sizing: border-box;
`;

const TeamColumn = styled.div<{ right?: boolean }>(({ right }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: right ? "flex-end" : "flex-start",
  gap: 4,
}));

const PlayerName = styled.span<{ right?: boolean }>({
  fontSize: 13,
  color: "#fff",
  fontWeight: 600,
});

const ScoreContainer = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px",
});

const ScoreText = styled.span({
  fontSize: 24,
  fontWeight: 700,
  color: "#00A2FF",
});

const ScoreDivider = styled.span({
  color: "rgba(255,255,255,0.3)",
  fontSize: 18,
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

const UploaderRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
});

const UploaderAvatar = styled.img({
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "2px solid #00A2FF",
  objectFit: "cover",
  flexShrink: 0,
});

const UploaderInfo = styled.div({ flex: 1 });

const UploaderName = styled.div({
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
});

const CompetitionName = styled.div({
  fontSize: 12,
  color: "#00A2FF",
  marginTop: 2,
});

// ─── CTA ──────────────────────────────────────────────────────────────────────

const CTACard = styled.div`
  width: 100%;
  max-width: 680px;
  background: linear-gradient(
    135deg,
    rgba(0, 162, 255, 0.12) 0%,
    rgba(0, 60, 120, 0.2) 100%
  );
  border: 1px solid rgba(0, 162, 255, 0.25);
  border-radius: 14px;
  padding: 24px 20px;
  text-align: center;
  margin-bottom: 20px;
  animation: ${fadeIn} 0.5s ease 0.3s both;
  box-sizing: border-box;
`;

const CTATitle = styled.h2({
  fontSize: 18,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 6px",
});

const CTASubtitle = styled.p({
  fontSize: 13,
  color: "#aaa",
  margin: "0 0 18px",
  lineHeight: 1.5,
});

const BadgeRow = styled.div({
  display: "flex",
  gap: 12,
  justifyContent: "center",
  flexWrap: "wrap",
});

const BadgeButton = styled.button({
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  transition: "transform 0.2s",
  ":hover": { transform: "scale(1.05)" },
});

const BadgeImage = styled.img({
  height: 44,
  objectFit: "contain",
  maxWidth: 160,
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonContainer = styled.div({
  width: "100%",
  maxWidth: 680,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const SkeletonVideo = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.07);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SkeletonBlock = styled.div<{ height?: number; width?: string }>`
  height: ${({ height = 16 }) => height}px;
  width: ${({ width = "100%" }) => width};
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.07);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

// ─── Error ────────────────────────────────────────────────────────────────────

const ErrorCard = styled.div({
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 40,
  textAlign: "center",
  maxWidth: 400,
  width: "100%",
  boxSizing: "border-box",
});

const ErrorIcon = styled.div({ fontSize: 48, marginBottom: 16 });
const ErrorTitle = styled.h2({
  fontSize: 20,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 8px",
});
const ErrorText = styled.p({ fontSize: 14, color: "#888", margin: 0 });

const FooterText = styled.div({ fontSize: 12, color: "#444", marginTop: 12 });
