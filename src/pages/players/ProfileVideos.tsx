import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { FaPlay } from "react-icons/fa";

import { CourtChampLogoIcon } from "../../assets";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  getUploadedVideos,
  getVideosOfPlayer,
  VideoListItem,
} from "../../services/videos";

interface ProfileVideosProps {
  userId: string;
  firstName: string;
}

type VideoTab = "uploaded" | "featured";

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  const c = value as { toMillis?: () => number; seconds?: number };
  if (typeof c.toMillis === "function") return c.toMillis();
  if (typeof c.seconds === "number") return c.seconds * 1000;
  if (typeof value === "string") return Date.parse(value) || 0;
  return 0;
};

const formatDate = (video: VideoListItem): string => {
  const ms = toMillis(video.createdAt);
  if (ms) {
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return video.date ?? "";
};

const formatViews = (views?: number): string => {
  const n = views ?? 0;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K views`;
  return `${n} ${n === 1 ? "view" : "views"}`;
};

export default function ProfileVideos({
  userId,
  firstName,
}: ProfileVideosProps) {
  const TABS: { key: VideoTab; label: string }[] = [
    { key: "uploaded", label: "Uploaded" },
    { key: "featured", label: `Videos of ${firstName || "player"}` },
  ];

  const [tab, setTab] = useState<VideoTab>("uploaded");
  const [uploaded, setUploaded] = useState<VideoListItem[] | null>(null);
  const [featured, setFeatured] = useState<VideoListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqRef = useRef(0);

  useEffect(() => {
    if (tab === "uploaded" && uploaded !== null) return;
    if (tab === "featured" && featured !== null) return;

    const requestId = ++reqRef.current;
    setLoading(true);
    setError(null);

    const fetcher = tab === "uploaded" ? getUploadedVideos : getVideosOfPlayer;
    fetcher(userId)
      .then((result) => {
        if (requestId !== reqRef.current) return;
        if (tab === "uploaded") setUploaded(result);
        else setFeatured(result);
      })
      .catch((fetchError) => {
        if (requestId !== reqRef.current) return;
        console.error(`Failed to load ${tab} videos:`, fetchError);
        setError("Could not load videos. Please try again.");
      })
      .finally(() => {
        if (requestId === reqRef.current) setLoading(false);
      });
  }, [tab, userId, uploaded, featured]);

  const items = tab === "uploaded" ? uploaded : featured;

  const emptyMessage =
    tab === "uploaded"
      ? "No videos uploaded yet."
      : `No videos of ${firstName || "this player"} yet.`;

  return (
    <Container>
      <SubTabs>
        {TABS.map((t) => (
          <SubTab key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </SubTab>
        ))}
      </SubTabs>

      {error ? (
        <EmptyState>{error}</EmptyState>
      ) : loading || items === null ? (
        <Grid>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i}>
              <SkeletonThumb />
              <SkeletonMeta>
                <SkeletonDot />
                <div style={{ flex: 1 }}>
                  <SkeletonLine style={{ width: "80%" }} />
                  <SkeletonLine style={{ width: "50%" }} />
                </div>
              </SkeletonMeta>
            </SkeletonCard>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <Grid>
          {items.map((video) => (
            <VideoCard key={video.id} to={`/videos?v=${video.id}`}>
              <Thumb>
                {video.thumbnailUrl ? (
                  <ThumbImg
                    src={video.thumbnailUrl}
                    alt={video.competitionName}
                    loading="lazy"
                  />
                ) : (
                  <ThumbFallback>
                    <FaPlay />
                  </ThumbFallback>
                )}
                <PlayHover>
                  <FaPlay />
                </PlayHover>
                {video.gamescore && <ScoreBadge>{video.gamescore}</ScoreBadge>}
              </Thumb>

              <MetaRow>
                <Avatar
                  src={video.postedBy?.profileImage || CourtChampLogoIcon}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = CourtChampLogoIcon;
                  }}
                />
                <MetaText>
                  <Title>{video.competitionName || "Game highlight"}</Title>
                  <Channel>{formatDisplayName(video.postedBy)}</Channel>
                  <SubMeta>
                    {formatViews(video.views)}
                    {formatDate(video) ? ` · ${formatDate(video)}` : ""}
                  </SubMeta>
                </MetaText>
              </MetaRow>
            </VideoCard>
          ))}
        </Grid>
      )}
    </Container>
  );
}

// ─── Theme ───
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";
const BLUE = "#00A2FF";

// ─── Styled ───
const Container = styled.div({ paddingBottom: "40px" });

const SubTabs = styled.div({
  display: "flex",
  gap: "8px",
  marginBottom: "20px",
  flexWrap: "wrap",
});

const SubTab = styled.button<{ $active?: boolean }>(({ $active }) => ({
  padding: "8px 16px",
  borderRadius: "20px",
  border: `1px solid ${$active ? BLUE : "rgba(255,255,255,0.15)"}`,
  background: $active ? "rgba(0,162,255,0.12)" : "transparent",
  color: $active ? "#FFFFFF" : MUTED,
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 0.2s, color 0.2s, background 0.2s",
  ":hover": { color: "#FFFFFF", borderColor: `${BLUE}88` },
}));

const Grid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "20px 16px",
  "@media (max-width: 480px)": {
    gridTemplateColumns: "1fr",
  },
});

const VideoCard = styled(Link)({
  display: "block",
  textDecoration: "none",
  color: "inherit",
});

const Thumb = styled.div({
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#0a1a2e",
  border: `1px solid ${BORDER}`,
});

const ThumbImg = styled.img({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
});

const ThumbFallback = styled.div({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.35)",
  fontSize: "1.6rem",
  background: "linear-gradient(135deg, #0b2138, #0a1a2e)",
});

const PlayHover = styled.div({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#FFFFFF",
  fontSize: "1.6rem",
  background: "rgba(0,0,0,0.35)",
  opacity: 0,
  transition: "opacity 0.2s",
  [`${VideoCard}:hover &`]: { opacity: 1 },
});

const ScoreBadge = styled.div({
  position: "absolute",
  bottom: "8px",
  right: "8px",
  padding: "2px 8px",
  borderRadius: "6px",
  background: "rgba(0,0,0,0.8)",
  color: "#FFFFFF",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.3px",
});

const MetaRow = styled.div({
  display: "flex",
  gap: "12px",
  marginTop: "12px",
});

const Avatar = styled.img({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  objectFit: "cover",
  flexShrink: 0,
  backgroundColor: "#07111f",
});

const MetaText = styled.div({ minWidth: 0 });

const Title = styled.div({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.95rem",
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const Channel = styled.div({
  color: MUTED,
  fontSize: "0.82rem",
  marginTop: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const SubMeta = styled.div({
  color: MUTED,
  fontSize: "0.78rem",
});

const EmptyState = styled.div({
  padding: "48px 24px",
  textAlign: "center",
  color: MUTED,
  fontStyle: "italic",
  border: `1px dashed ${BORDER}`,
  borderRadius: "16px",
});

// ─── Skeleton ───
const SkeletonCard = styled.div({});

const shimmer = "rgba(255,255,255,0.06)";

const SkeletonThumb = styled.div({
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "12px",
  background: shimmer,
  animation: "vidPulse 1.5s ease-in-out infinite",
  "@keyframes vidPulse": {
    "0%,100%": { opacity: 0.6 },
    "50%": { opacity: 1 },
  },
});

const SkeletonMeta = styled.div({
  display: "flex",
  gap: "12px",
  marginTop: "12px",
});

const SkeletonDot = styled.div({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: shimmer,
  flexShrink: 0,
});

const SkeletonLine = styled.div({
  height: "10px",
  borderRadius: "5px",
  background: shimmer,
  marginBottom: "8px",
});
