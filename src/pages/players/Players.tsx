import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import { CourtChampLogoIcon } from "../../assets";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  getAllPlayersPaginated,
  PlayerListItem,
} from "../../services/players";
import { findRankIndex, getRankByXp, rankMedalUrl } from "../../utils/ranks";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 500;
const MAX_PAGE_BUTTONS = 5;

const getRankSuffix = (rank: number): string => {
  const lastTwo = rank % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const flagUrl = (countryCode?: string): string | null =>
  countryCode ? `https://flagcdn.com/h20/${countryCode.toLowerCase()}.png` : null;

export default function Players() {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the raw input into the value we actually query with.
  useEffect(() => {
    const handle = window.setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // A new search always starts back at the first page.
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Guards against out-of-order responses overwriting newer results.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    getAllPlayersPaginated(page, PAGE_SIZE, search)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setPlayers(result.players);
        setTotalPlayers(result.totalPlayers);
        setTotalPages(result.totalPages);
      })
      .catch((fetchError) => {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to fetch players:", fetchError);
        setError("Could not load players. Please try again.");
        setPlayers([]);
        setTotalPlayers(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [page, search]);

  const goToPage = (nextPage: number) => {
    if (nextPage >= 1 && nextPage <= totalPages && nextPage !== page) {
      setPage(nextPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const pageButtons: number[] = [];
  if (totalPages > 1) {
    let start = Math.max(1, page - Math.floor(MAX_PAGE_BUTTONS / 2));
    const end = Math.min(totalPages, start + MAX_PAGE_BUTTONS - 1);
    start = Math.max(1, end - MAX_PAGE_BUTTONS + 1);
    for (let i = start; i <= end; i += 1) pageButtons.push(i);
  }

  return (
    <PageContainer>
      <Header>
        <div>
          <Eyebrow>Leaderboard</Eyebrow>
          <Title>Players</Title>
        </div>
        <CountText>
          {loading ? "…" : `${totalPlayers.toLocaleString()} players`}
        </CountText>
      </Header>

      <SearchInput
        type="text"
        placeholder="Search players by username…"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Search players by username"
      />

      <ListCard>
        {error && <StateRow>{error}</StateRow>}

        {!error && loading && (
          <StateRow>
            <Spinner />
          </StateRow>
        )}

        {!error && !loading && players.length === 0 && (
          <StateRow>No players found</StateRow>
        )}

        {!error &&
          !loading &&
          players.map((player) => {
            const xp = player.profileDetail?.XP ?? 0;
            const rankLevel = findRankIndex(xp) + 1;
            const medal = getRankByXp(xp);
            const displayName = formatDisplayName(player);
            const flag = flagUrl(player.location?.countryCode);

            return (
              <PlayerRow
                key={`${player.userId}-${player.globalRank}`}
                to={`/players/${player.userId}`}
              >
                <RankCell>
                  {player.globalRank}
                  <Suffix>{getRankSuffix(player.globalRank)}</Suffix>
                </RankCell>

                <PlayerCell>
                  <Avatar
                    src={player.profileImage || CourtChampLogoIcon}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = CourtChampLogoIcon;
                    }}
                  />
                  <NameBlock>
                    <PlayerName>
                      {displayName || player.username || "Unknown player"}
                    </PlayerName>
                    {player.username && (
                      <Username>@{player.username}</Username>
                    )}
                  </NameBlock>
                </PlayerCell>

                <FlagCell>
                  {flag && <Flag src={flag} alt="" loading="lazy" />}
                </FlagCell>

                <StatCell>
                  <StatLabel>CP</StatLabel>
                  <StatValue>{Math.round(xp).toLocaleString()}</StatValue>
                </StatCell>

                <MedalCell title={medal.name}>
                  <MedalImage
                    src={rankMedalUrl(medal.icon)}
                    alt={medal.name}
                    loading="lazy"
                  />
                  <RankLevel>{rankLevel}</RankLevel>
                </MedalCell>
              </PlayerRow>
            );
          })}
      </ListCard>

      {!error && totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => goToPage(1)}
            disabled={page === 1 || loading}
            aria-label="First page"
          >
            <FaAngleDoubleLeft />
          </PageButton>
          <PageButton
            onClick={() => goToPage(page - 1)}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <FaChevronLeft />
          </PageButton>

          {pageButtons.map((pageNumber) =>
            pageNumber === page ? (
              <CurrentPage key={pageNumber}>{pageNumber}</CurrentPage>
            ) : (
              <PageButton
                key={pageNumber}
                onClick={() => goToPage(pageNumber)}
                disabled={loading}
              >
                {pageNumber}
              </PageButton>
            ),
          )}

          <PageButton
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages || loading}
            aria-label="Next page"
          >
            <FaChevronRight />
          </PageButton>
          <PageButton
            onClick={() => goToPage(totalPages)}
            disabled={page === totalPages || loading}
            aria-label="Last page"
          >
            <FaAngleDoubleRight />
          </PageButton>
        </Pagination>
      )}
    </PageContainer>
  );
}

// ─── Theme ───
const BLUE = "#00A2FF";
const PANEL = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";

// ─── Styled components ───
const PageContainer = styled.div({
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  padding: "40px 24px 80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const Header = styled.div({
  width: "100%",
  maxWidth: "760px",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "20px",
});

const Eyebrow = styled.div({
  textTransform: "uppercase",
  letterSpacing: "2.5px",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: BLUE,
  marginBottom: "6px",
});

const Title = styled.h1({
  fontSize: "2.4rem",
  fontWeight: 800,
  margin: 0,
  letterSpacing: "-0.5px",
  "@media (max-width: 480px)": { fontSize: "1.9rem" },
});

const CountText = styled.span({
  color: MUTED,
  fontSize: "0.85rem",
  fontWeight: 600,
  fontStyle: "italic",
  whiteSpace: "nowrap",
});

const SearchInput = styled.input({
  width: "100%",
  maxWidth: "760px",
  boxSizing: "border-box",
  height: "46px",
  padding: "0 16px",
  marginBottom: "20px",
  borderRadius: "12px",
  border: "1px solid rgb(15, 53, 99)",
  backgroundColor: "rgba(255,255,255,0.02)",
  color: "#FFFFFF",
  fontSize: "0.95rem",
  outline: "none",
  ":focus": { borderColor: BLUE },
  "::placeholder": { color: "#6f8299" },
});

const ListCard = styled.div({
  width: "100%",
  maxWidth: "760px",
  borderRadius: "16px",
  border: `1px solid ${BORDER}`,
  background: PANEL,
  overflow: "hidden",
});

const GRID_COLUMNS = "56px 1fr 44px 72px 64px";
const GRID_COLUMNS_MOBILE = "34px 1fr 30px 50px 44px";

const PlayerRow = styled(Link)({
  display: "grid",
  gridTemplateColumns: GRID_COLUMNS,
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  borderTop: `1px solid rgba(255,255,255,0.05)`,
  ":first-of-type": { borderTop: "none" },
  color: "inherit",
  textDecoration: "none",
  transition: "background 0.15s ease",
  ":hover": { background: "rgba(0,162,255,0.06)" },
  "@media (max-width: 480px)": {
    gridTemplateColumns: GRID_COLUMNS_MOBILE,
    gap: "6px",
    padding: "12px 12px",
  },
});

const RankCell = styled.div({
  display: "flex",
  alignItems: "baseline",
  color: BLUE,
  fontWeight: 700,
  fontSize: "0.95rem",
});

const Suffix = styled.span({
  fontSize: "0.65rem",
  marginLeft: "1px",
});

const PlayerCell = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
  "@media (max-width: 480px)": { gap: "8px" },
});

const Avatar = styled.img({
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  objectFit: "cover",
  border: `1px solid ${BLUE}`,
  flexShrink: 0,
  backgroundColor: "#07111f",
  "@media (max-width: 480px)": { width: "34px", height: "34px" },
});

const NameBlock = styled.div({ minWidth: 0 });

const PlayerName = styled.div({
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#FFFFFF",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const FlagCell = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const Flag = styled.img({
  height: "16px",
  width: "auto",
  borderRadius: "2px",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
});

const Username = styled.div({
  fontSize: "0.78rem",
  color: MUTED,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const StatCell = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const StatValue = styled.span({
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#FFFFFF",
});

const StatLabel = styled.span({
  fontSize: "0.65rem",
  color: MUTED,
});

const MedalCell = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
});

const MedalImage = styled.img({
  width: "40px",
  height: "40px",
  objectFit: "contain",
});

const RankLevel = styled.span({
  fontSize: "0.65rem",
  fontWeight: 700,
  color: "#FFFFFF",
});

const StateRow = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "48px 16px",
  color: MUTED,
  fontSize: "0.95rem",
});

const Spinner = styled.div({
  width: "36px",
  height: "36px",
  border: `3px solid rgba(0,162,255,0.25)`,
  borderTopColor: BLUE,
  borderRadius: "50%",
  animation: "playersSpin 0.8s linear infinite",
  "@keyframes playersSpin": {
    to: { transform: "rotate(360deg)" },
  },
});

const Pagination = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  marginTop: "24px",
  flexWrap: "wrap",
});

const PageButton = styled.button({
  minWidth: "38px",
  height: "38px",
  padding: "0 10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  border: `1px solid ${BORDER}`,
  background: "transparent",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
  ":hover:not(:disabled)": {
    background: "rgba(0,162,255,0.12)",
    borderColor: `${BLUE}66`,
  },
  ":disabled": { opacity: 0.4, cursor: "not-allowed" },
});

const CurrentPage = styled.div({
  minWidth: "38px",
  height: "38px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background: BLUE,
  color: "#FFFFFF",
  fontSize: "0.9rem",
  fontWeight: 700,
});
