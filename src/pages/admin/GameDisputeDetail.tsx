import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import StatusPill, { StatusTone } from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import {
  DISPUTE_EVENT_LABELS,
  DISPUTE_EVENT_TYPE,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  DISPUTE_RESOLUTION,
  DISPUTE_RESOLUTION_LABELS,
  DISPUTE_STAGE,
  DISPUTE_STAGE_LABELS,
  DISPUTE_SYSTEM_ACTOR,
  LADDER_TYPE,
  disputeTimeMs,
  gameVideoDocId,
  hasCourtPositions,
  isDisputeEvidenceOverdue,
  isPlayerEvidenceEvent,
} from "courtchamps-shared/types";
import { transformDate } from "courtchamps-shared/helpers";
import type {
  Dispute,
  DisputeEvent,
  DisputeEventType,
  GameTeam,
  GameVideo,
  Player,
  SelectedPlayers,
} from "courtchamps-shared/types";
import {
  approveDispute,
  fetchDisputeById,
  fetchDisputeGameVideos,
  rejectDispute,
  requestMoreEvidence,
  voidDispute,
} from "../../services/disputes";
import {
  formatEventDate,
  formatTimeLeft,
  initials,
  playerName,
  scoreLabel,
} from "./disputeFormat";

type ActionType = "approve" | "reject" | "moreEvidence" | "void";
type Side = "team1" | "team2";

const TEAM_COLORS: Record<Side, string> = {
  team1: "#00A2FF",
  team2: "#FF9F43",
};
const ADMIN_COLOR = "#C58BFF";

const STAGE_TONES: Record<Dispute["stage"], StatusTone> = {
  under_review: "info",
  more_evidence_requested: "warning",
  resolved: "positive",
};

const eventType = (event: DisputeEvent): DisputeEventType =>
  event.type ??
  (event.stage === DISPUTE_STAGE.RESOLVED
    ? DISPUTE_EVENT_TYPE.RESOLVED
    : event.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
      ? DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED
      : DISPUTE_EVENT_TYPE.EVIDENCE_SUBMITTED);

const teamPlayers = (team?: GameTeam | null): Player[] =>
  [team?.player1, team?.player2].filter((p): p is Player => Boolean(p));

function GameDisputeDetail() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const load = useCallback(async (): Promise<void> => {
    if (!disputeId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const found = await fetchDisputeById(disputeId);
      setDispute(found);
      setVideos(found ? await fetchDisputeGameVideos(found.gameId) : []);
    } catch (error) {
      console.error("Failed to load dispute", error);
      setLoadError("Could not load this dispute. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const videosById = useMemo(() => {
    const map: Record<string, GameVideo> = {};
    videos.forEach((video) => {
      if (video.gameId && video.postedBy?.userId) {
        map[gameVideoDocId(video.gameId, video.postedBy.userId)] = video;
      }
    });
    return map;
  }, [videos]);

  const runAction = async (type: ActionType): Promise<void> => {
    if (!dispute) return;
    if (type === "moreEvidence" && !notes.trim()) {
      setActionError("Add a note telling the players what else you need.");
      return;
    }
    const adminUserId = currentUser?.uid ?? "";
    const adminNotes = notes.trim() || undefined;
    setActionBusy(true);
    setActionError(null);
    try {
      if (type === "approve") {
        await approveDispute(dispute, adminUserId, adminNotes);
      } else if (type === "reject") {
        await rejectDispute(dispute, adminUserId, adminNotes);
      } else if (type === "void") {
        await voidDispute(dispute, adminUserId, adminNotes);
      } else {
        await requestMoreEvidence(dispute, adminUserId, notes);
      }
      navigate("/admin/disputes");
    } catch (error) {
      console.error("Failed to action dispute", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not action this dispute. Please try again.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  if (loading || loadError || !dispute) {
    return (
      <AdminLayout title="Game Dispute">
        <BackLink type="button" onClick={() => navigate("/admin/disputes")}>
          ← Back to disputes
        </BackLink>
        <StateCard>
          {loading
            ? "Loading dispute…"
            : (loadError ?? "This dispute no longer exists.")}
        </StateCard>
      </AdminLayout>
    );
  }

  const original = dispute.originalGame;
  const resolved = dispute.stage === DISPUTE_STAGE.RESOLVED;
  const awaitingPlayers =
    dispute.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED;
  const overdue = isDisputeEvidenceOverdue(dispute, nowMs);
  const dueMs = disputeTimeMs(dispute.evidenceDueAt);
  const timeLeft =
    awaitingPlayers && dueMs ? formatTimeLeft(dueMs, nowMs) : null;
  const isDoubles = dispute.ladderType === LADDER_TYPE.DOUBLES;

  const sideOf = (userId: string): Side | null => {
    if (teamPlayers(original?.team1).some((p) => p.userId === userId)) {
      return "team1";
    }
    if (teamPlayers(original?.team2).some((p) => p.userId === userId)) {
      return "team2";
    }
    return null;
  };
  const playerById = (userId: string): Player | undefined =>
    [...teamPlayers(original?.team1), ...teamPlayers(original?.team2)].find(
      (p) => p.userId === userId,
    );
  const actorName = (userId: string): string => {
    if (userId === DISPUTE_SYSTEM_ACTOR) return "Automatic";
    const player = playerById(userId);
    return player ? playerName(player) : "Admin";
  };

  const evidenceEvents = dispute.events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => isPlayerEvidenceEvent(event))
    .reverse();

  const respondedIds = new Set(
    dispute.events
      .filter(isPlayerEvidenceEvent)
      .map((event) => event.createdBy),
  );
  const playerCount =
    teamPlayers(original?.team1).length + teamPlayers(original?.team2).length;

  const evidenceSummary = (userId: string): string | null => {
    const own = dispute.events.filter(
      (event) => event.createdBy === userId && isPlayerEvidenceEvent(event),
    );
    const videoCount = own.filter((event) => event.videoId).length;
    const noteCount = own.filter((event) => event.note).length;
    const parts = [
      videoCount && `${videoCount} video${videoCount > 1 ? "s" : ""}`,
      noteCount && `${noteCount} note${noteCount > 1 ? "s" : ""}`,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };

  const gameTitle = original?.gameNumber
    ? `Game ${original.gameNumber} · ${dispute.ladderName || "Ladder"}`
    : dispute.ladderName || "Game dispute";

  return (
    <AdminLayout title="Game Dispute">
      <HeadRow>
        <BackLink type="button" onClick={() => navigate("/admin/disputes")}>
          ← Back to disputes
        </BackLink>
        <TitleRow>
          <PageTitle>{gameTitle}</PageTitle>
          <StatusPill tone={STAGE_TONES[dispute.stage]}>
            {resolved && dispute.resolution
              ? DISPUTE_RESOLUTION_LABELS[dispute.resolution]
              : DISPUTE_STAGE_LABELS[dispute.stage]}
          </StatusPill>
          <Grow />
          {awaitingPlayers ? (
            <Countdown>
              {timeLeft
                ? `⏱ ${timeLeft} until auto-void`
                : "⏱ Deadline passed. Ready to void"}
            </Countdown>
          ) : null}
        </TitleRow>
      </HeadRow>

      <TopGrid>
        <Panel>
          <PanelTitle>Dispute details</PanelTitle>
          <DetailsGrid>
            <Cell label="Ladder" value={dispute.ladderName || "—"} />
            <Cell label="Type" value={isDoubles ? "Doubles" : "Singles"} />
            <Cell label="Stage" value={DISPUTE_STAGE_LABELS[dispute.stage]} />
            <Cell
              label="Match date"
              value={transformDate(dispute.matchDate ?? "") || "—"}
            />
            <Cell label="Match time" value={dispute.matchTime || "—"} />
            <Cell label="Location" value={dispute.courtName || "—"} />
            <Cell label="Opened by" value={actorName(dispute.openedBy)} />
            <Cell label="Opened" value={formatEventDate(dispute.createdAt)} />
            {resolved ? (
              <Cell
                label="Resolved"
                value={formatEventDate(dispute.resolvedAt) || "—"}
              />
            ) : (
              <Cell
                label="Evidence due"
                value={
                  awaitingPlayers && dueMs
                    ? formatEventDate(dispute.evidenceDueAt)
                    : "—"
                }
                warn={awaitingPlayers}
              />
            )}
          </DetailsGrid>
          <Ids>
            <span>
              Match <code>{dispute.ladderMatchId}</code>
            </span>
            <span>
              Game <code>{dispute.gameId}</code>
            </span>
            <span>
              Dispute <code>{dispute.disputeId}</code>
            </span>
          </Ids>
        </Panel>

        <Panel>
          <PanelTitle>
            Game
            <Legend>
              <LegendItem>
                <Swatch color={TEAM_COLORS.team1} />
                Team 1
              </LegendItem>
              <LegendItem>
                <Swatch color={TEAM_COLORS.team2} />
                Team 2
              </LegendItem>
            </Legend>
          </PanelTitle>
          <GameCard>
            {original?.gameNumber ? (
              <GameTag>Game {original.gameNumber}</GameTag>
            ) : null}
            <GameBody>
              {(["team1", "team2"] as Side[]).map((side, sideIndex) => (
                <React.Fragment key={side}>
                  {sideIndex === 1 ? (
                    <Scores>
                      <ScoreLab>Reported</ScoreLab>
                      <OldScore>{scoreLabel(dispute.originalGame)}</OldScore>
                      <ScoreLab>Disputed</ScoreLab>
                      <BigScore>{scoreLabel(dispute.disputedGame)}</BigScore>
                      {resolved && dispute.finalGame ? (
                        <>
                          <ScoreLab>Final</ScoreLab>
                          <FinalScore>
                            {scoreLabel(dispute.finalGame)}
                          </FinalScore>
                        </>
                      ) : null}
                    </Scores>
                  ) : null}
                  <TeamCol right={side === "team2"}>
                    {teamPlayers(original?.[side]).map((player) => {
                      const summary = evidenceSummary(player.userId);
                      const opener = player.userId === dispute.openedBy;
                      return (
                        <PlayerRow key={player.userId} right={side === "team2"}>
                          <Avatar color={TEAM_COLORS[side]}>
                            {initials(player)}
                          </Avatar>
                          <PlayerText right={side === "team2"}>
                            <strong>{playerName(player)}</strong>
                            {opener ? <Flag>⚑ Opened dispute</Flag> : null}
                            {summary ? (
                              <Submitted>✓ {summary}</Submitted>
                            ) : (
                              <Faint>No evidence yet</Faint>
                            )}
                          </PlayerText>
                        </PlayerRow>
                      );
                    })}
                  </TeamCol>
                </React.Fragment>
              ))}
            </GameBody>
            <GameFoot>
              <span>
                {respondedIds.size} of {playerCount} players have added evidence
              </span>
            </GameFoot>
          </GameCard>
        </Panel>
      </TopGrid>

      <Panel>
        <PanelTitle>
          Evidence
          <PanelMeta>
            {evidenceEvents.length} submission
            {evidenceEvents.length === 1 ? "" : "s"} ·{" "}
            {evidenceEvents.filter(({ event }) => event.videoId).length} video
            {evidenceEvents.filter(({ event }) => event.videoId).length === 1
              ? ""
              : "s"}
          </PanelMeta>
        </PanelTitle>
        {evidenceEvents.length === 0 ? (
          <Muted>No evidence has been added yet.</Muted>
        ) : (
          evidenceEvents.map(({ event, index }) => {
            const side = sideOf(event.createdBy);
            const video = event.videoId ? videosById[event.videoId] : undefined;
            return (
              <EvidenceItem key={index}>
                <EvidenceHead>
                  <Avatar color={side ? TEAM_COLORS[side] : ADMIN_COLOR}>
                    {initials(playerById(event.createdBy))}
                  </Avatar>
                  <PlayerText>
                    <strong>
                      {actorName(event.createdBy)}
                      {side
                        ? ` · ${side === "team1" ? "Team 1" : "Team 2"}`
                        : ""}
                      {eventType(event) === DISPUTE_EVENT_TYPE.OPENED
                        ? " · opened the dispute"
                        : ""}
                    </strong>
                    <Faint>{formatEventDate(event.createdAt)}</Faint>
                  </PlayerText>
                  <Grow />
                  {event.videoId ? <Chip>▶ Video</Chip> : <Chip>No video</Chip>}
                  {hasCourtPositions(event.courtPositions) ? (
                    <Chip>Court positions</Chip>
                  ) : null}
                  {event.note ? <Chip>Note</Chip> : null}
                </EvidenceHead>
                {event.videoId ? (
                  <VideoRow>
                    {video?.videoUrl ? (
                      <VideoFrame src={video.videoUrl} controls />
                    ) : (
                      <VideoPending>
                        Video still uploading or processing
                      </VideoPending>
                    )}
                    {event.courtPositions &&
                    hasCourtPositions(event.courtPositions) ? (
                      <CourtDiagram
                        positions={event.courtPositions}
                        sideOf={sideOf}
                      />
                    ) : (
                      <CourtEmpty>No court positions</CourtEmpty>
                    )}
                  </VideoRow>
                ) : null}
                {event.note ? (
                  <NoteBox>
                    <NoteLabel>Note</NoteLabel>
                    {event.note}
                  </NoteBox>
                ) : null}
              </EvidenceItem>
            );
          })
        )}
      </Panel>

      <BottomGrid>
        <Panel>
          <PanelTitle>Timeline</PanelTitle>
          <TimelineList>
            {dispute.events.map((event, index) => {
              const side = sideOf(event.createdBy);
              const type = eventType(event);
              return (
                <TimelineItem key={index}>
                  <Swatch
                    color={
                      side
                        ? TEAM_COLORS[side]
                        : event.createdBy === DISPUTE_SYSTEM_ACTOR
                          ? "#8fa3b8"
                          : ADMIN_COLOR
                    }
                  />
                  <TimelineText>
                    <span>
                      {DISPUTE_EVENT_LABELS[type]}{" "}
                      <Faint>· {actorName(event.createdBy)}</Faint>
                    </span>
                    {type !== DISPUTE_EVENT_TYPE.OPENED &&
                    type !== DISPUTE_EVENT_TYPE.EVIDENCE_SUBMITTED &&
                    event.note ? (
                      <Faint>“{event.note}”</Faint>
                    ) : null}
                  </TimelineText>
                  <Faint>{formatEventDate(event.createdAt)}</Faint>
                </TimelineItem>
              );
            })}
          </TimelineList>
        </Panel>

        <Panel>
          <PanelTitle>Decision</PanelTitle>
          {resolved ? (
            <>
              <ResolvedNote>
                {dispute.resolution
                  ? DISPUTE_RESOLUTION_LABELS[dispute.resolution]
                  : "Resolved"}
                {dispute.resolution === DISPUTE_RESOLUTION.VOID
                  ? `. Nobody added evidence within ${DISPUTE_EVIDENCE_WINDOW_HOURS} hours of the request.`
                  : "."}
              </ResolvedNote>
              {dispute.adminNotes ? (
                <NoteBox>
                  <NoteLabel>Admin notes</NoteLabel>
                  {dispute.adminNotes}
                </NoteBox>
              ) : null}
            </>
          ) : (
            <>
              <NotesInput
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Admin notes (shown to every player). Required when requesting more evidence."
                rows={3}
              />
              {actionError ? <ErrorText>{actionError}</ErrorText> : null}
              <Actions>
                <UpholdButton
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction("approve")}
                >
                  Uphold {scoreLabel(dispute.disputedGame)}
                </UpholdButton>
                <KeepButton
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction("reject")}
                >
                  Keep {scoreLabel(dispute.originalGame)}
                </KeepButton>
                <MoreButton
                  type="button"
                  disabled={actionBusy || awaitingPlayers}
                  onClick={() => runAction("moreEvidence")}
                >
                  {awaitingPlayers
                    ? "Request more evidence · waiting on players"
                    : `Request more evidence (${DISPUTE_EVIDENCE_WINDOW_HOURS}h to respond)`}
                </MoreButton>
                {awaitingPlayers ? (
                  <VoidButton
                    type="button"
                    disabled={actionBusy || !overdue}
                    onClick={() => runAction("void")}
                  >
                    {overdue
                      ? "Void now (original score stands)"
                      : "Void now (enabled once the deadline passes)"}
                  </VoidButton>
                ) : null}
              </Actions>
            </>
          )}
        </Panel>
      </BottomGrid>
    </AdminLayout>
  );
}

function Cell({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <CellBox>
      <CellLabel>{label}</CellLabel>
      <CellValue warn={warn}>{value}</CellValue>
    </CellBox>
  );
}

const SLOT_X = { single: ["50%"], double: ["28%", "72%"] };

function CourtDiagram({
  positions,
  sideOf,
}: {
  positions: SelectedPlayers;
  sideOf: (userId: string) => Side | null;
}) {
  const row = (players: (Player | null)[], top: string, fallback: Side) => {
    const xs = players.length > 1 ? SLOT_X.double : SLOT_X.single;
    return players.map((player, index) =>
      player ? (
        <CourtPlayer
          key={`${top}-${index}`}
          color={TEAM_COLORS[sideOf(player.userId) ?? fallback]}
          style={{ left: xs[index] ?? "50%", top }}
          title={playerName(player)}
        >
          {initials(player)}
        </CourtPlayer>
      ) : null,
    );
  };
  return (
    <Court>
      <CourtLine style={{ top: "16%" }} />
      <CourtLine style={{ top: "84%" }} />
      <CourtCentre />
      <CourtNet />
      <CourtLabel style={{ top: 6 }}>FAR SIDE</CourtLabel>
      <CourtLabel style={{ bottom: 6 }}>NEAR SIDE</CourtLabel>
      {row(positions.team1 ?? [], "28%", "team1")}
      {row(positions.team2 ?? [], "72%", "team2")}
    </Court>
  );
}

export default GameDisputeDetail;

const panelBorder = "1px solid rgba(255, 255, 255, 0.08)";

const HeadRow = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "20px",
});

const BackLink = styled.button({
  background: "none",
  border: "none",
  color: "#00A2FF",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  alignSelf: "flex-start",
});

const TitleRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "10px 14px",
});

const PageTitle = styled.h2({
  color: "#fff",
  fontSize: "1.4rem",
  fontWeight: 700,
  margin: 0,
});

const Grow = styled.span({ flex: 1 });

const Countdown = styled.span({
  padding: "6px 12px",
  borderRadius: "8px",
  backgroundColor: "rgba(245, 196, 81, 0.14)",
  color: "#f5c451",
  fontWeight: 600,
  fontSize: "0.82rem",
  fontVariantNumeric: "tabular-nums",
});

const StateCard = styled.div({
  padding: "20px",
  borderRadius: "12px",
  backgroundColor: "#0a1929",
  border: panelBorder,
  color: "#8fa3b8",
  fontSize: "0.9rem",
  marginTop: "16px",
});

const TopGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
  gap: "18px",
  marginBottom: "18px",
  "@media (max-width: 1000px)": { gridTemplateColumns: "minmax(0, 1fr)" },
});

const BottomGrid = styled(TopGrid)({ marginTop: "18px", marginBottom: 0 });

const Panel = styled.section({
  backgroundColor: "#03101F",
  border: "1px solid #09213E",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
});

const PanelTitle = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  color: "#8fa3b8",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
});

const PanelMeta = styled.span({
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 500,
});

const DetailsGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  border: "1px solid #09213E",
  borderRadius: "10px",
  overflow: "hidden",
  "& > div": {
    borderRight: "1px solid #09213E",
    borderBottom: "1px solid #09213E",
  },
  "& > div:nth-child(3n)": { borderRight: "none" },
  "& > div:nth-last-child(-n + 3)": { borderBottom: "none" },
});

const CellBox = styled.div({
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

const CellLabel = styled.span({
  color: "#5b7186",
  fontSize: "0.66rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

const CellValue = styled.span<{ warn?: boolean }>(({ warn }) => ({
  color: warn ? "#f5c451" : "#fff",
  fontSize: "0.9rem",
  fontWeight: 600,
  overflowWrap: "anywhere",
}));

const Ids = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 16px",
  color: "#5b7186",
  fontSize: "0.75rem",
  "& code": { fontFamily: "monospace", color: "#9fb8c8", marginLeft: "4px" },
});

const Legend = styled.span({
  display: "flex",
  gap: "12px",
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 500,
});

const LegendItem = styled.span({
  display: "flex",
  alignItems: "center",
  gap: "5px",
});

const Swatch = styled.i<{ color: string }>(({ color }) => ({
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  flex: "none",
}));

const GameCard = styled.div({
  border: "1px solid #09213E",
  borderRadius: "10px",
  backgroundColor: "#020b16",
});

const GameTag = styled.span({
  display: "inline-block",
  margin: "10px 12px 0",
  padding: "1px 6px",
  borderRadius: "4px",
  backgroundColor: "rgba(0, 162, 255, 0.55)",
  color: "#fff",
  fontSize: "0.7rem",
  fontWeight: 700,
});

const GameBody = styled.div({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 140px minmax(0, 1fr)",
  alignItems: "center",
  gap: "8px",
  padding: "12px",
});

const TeamCol = styled.div<{ right?: boolean }>(({ right }) => ({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  alignItems: right ? "flex-end" : "flex-start",
}));

const PlayerRow = styled.div<{ right?: boolean }>(({ right }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexDirection: right ? "row-reverse" : "row",
  minWidth: 0,
}));

const PlayerText = styled.div<{ right?: boolean }>(({ right }) => ({
  display: "flex",
  flexDirection: "column",
  lineHeight: 1.25,
  textAlign: right ? "right" : "left",
  minWidth: 0,
  color: "#fff",
  fontSize: "0.88rem",
}));

const Avatar = styled.span<{ color: string }>(({ color }) => ({
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  flex: "none",
  backgroundColor: color,
  color: "#021120",
  fontSize: "0.68rem",
  fontWeight: 700,
}));

const Flag = styled.small({ color: "#f5c451", fontSize: "0.7rem" });
const Submitted = styled.small({ color: "#5ce6a1", fontSize: "0.7rem" });
const Faint = styled.small({ color: "#5b7186", fontSize: "0.74rem" });

const Scores = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  fontVariantNumeric: "tabular-nums",
});

const ScoreLab = styled.span({
  color: "#8fa3b8",
  fontSize: "0.6rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
});

const OldScore = styled.span({
  color: "#5b7186",
  fontSize: "1.1rem",
  fontWeight: 700,
  textDecoration: "line-through",
});

const BigScore = styled.span({
  color: "#fff",
  fontSize: "1.8rem",
  fontWeight: 800,
  lineHeight: 1,
});

const FinalScore = styled.span({
  color: "#5ce6a1",
  fontSize: "1.2rem",
  fontWeight: 700,
});

const GameFoot = styled.div({
  display: "flex",
  justifyContent: "space-between",
  borderTop: "1px solid #09213E",
  padding: "8px 12px",
  color: "#8fa3b8",
  fontSize: "0.76rem",
});

const EvidenceItem = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  "& + &": { borderTop: "1px solid #09213E", paddingTop: "18px" },
});

const EvidenceHead = styled.div({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px 10px",
});

const Chip = styled.span({
  border: panelBorder,
  borderRadius: "4px",
  padding: "1px 6px",
  color: "#8fa3b8",
  fontSize: "0.7rem",
});

const VideoRow = styled.div({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
  gap: "16px",
  alignItems: "stretch",
  "@media (max-width: 900px)": { gridTemplateColumns: "minmax(0, 1fr)" },
});

const VideoFrame = styled.video({
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "10px",
  backgroundColor: "#000",
  display: "block",
});

const VideoPending = styled.div({
  aspectRatio: "16 / 9",
  borderRadius: "10px",
  border: "1.5px dashed #1f3a55",
  display: "grid",
  placeItems: "center",
  color: "#5b7186",
  fontSize: "0.85rem",
});

const Court = styled.div({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "240px",
  backgroundColor: "#0B3B2E",
  border: "2px solid rgba(255, 255, 255, 0.55)",
  borderRadius: "4px",
  "@media (max-width: 900px)": {
    height: "auto",
    minHeight: 0,
    aspectRatio: "1 / 1.3",
    maxWidth: "360px",
    justifySelf: "center",
  },
});

const CourtLine = styled.div({
  position: "absolute",
  left: 0,
  right: 0,
  borderTop: "1px solid rgba(255, 255, 255, 0.55)",
});

const CourtCentre = styled.div({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "50%",
  borderLeft: "1px solid rgba(255, 255, 255, 0.55)",
});

const CourtNet = styled.div({
  position: "absolute",
  left: "-6px",
  right: "-6px",
  top: "50%",
  borderTop: "3px dashed #fff",
});

const CourtLabel = styled.span({
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: "0.6rem",
  letterSpacing: "0.1em",
});

const CourtPlayer = styled.span<{ color: string }>(({ color }) => ({
  position: "absolute",
  transform: "translate(-50%, -50%)",
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  backgroundColor: color,
  border: "2px solid #fff",
  color: "#021120",
  fontSize: "0.66rem",
  fontWeight: 700,
}));

const CourtEmpty = styled.div({
  border: "1.5px dashed #1f3a55",
  borderRadius: "6px",
  display: "grid",
  placeItems: "center",
  color: "#5b7186",
  fontSize: "0.8rem",
  minHeight: "120px",
});

const NoteBox = styled.div({
  backgroundColor: "#0a1929",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#c7d6e5",
  fontSize: "0.88rem",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
});

const NoteLabel = styled.span({
  display: "block",
  color: "#5b7186",
  fontSize: "0.64rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "2px",
});

const Muted = styled.p({ color: "#8fa3b8", fontSize: "0.85rem", margin: 0 });

const TimelineList = styled.div({ display: "flex", flexDirection: "column" });

const TimelineItem = styled.div({
  display: "grid",
  gridTemplateColumns: "12px minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid #09213E",
  color: "#fff",
  fontSize: "0.85rem",
  "&:last-child": { borderBottom: "none" },
});

const TimelineText = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

const NotesInput = styled.textarea({
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: "0.85rem",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: "inherit",
});

const ErrorText = styled.p({
  color: "#f87171",
  fontSize: "0.82rem",
  margin: 0,
});

const Actions = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
});

const actionButton = {
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "0.84rem",
  fontWeight: 700,
  cursor: "pointer",
  "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
} as const;

const UpholdButton = styled.button({
  ...actionButton,
  border: "none",
  backgroundColor: "#22c55e",
  color: "#022012",
});

const KeepButton = styled.button({
  ...actionButton,
  border: "1px solid #f87171",
  backgroundColor: "transparent",
  color: "#f87171",
});

const MoreButton = styled.button({
  ...actionButton,
  gridColumn: "1 / -1",
  border: "1px solid rgba(245, 196, 81, 0.4)",
  backgroundColor: "rgba(245, 196, 81, 0.14)",
  color: "#f5c451",
});

const VoidButton = styled.button({
  ...actionButton,
  gridColumn: "1 / -1",
  border: "1px dashed rgba(255, 255, 255, 0.25)",
  backgroundColor: "transparent",
  color: "#c7d6e5",
});

const ResolvedNote = styled.p({
  color: "#5ce6a1",
  fontSize: "0.9rem",
  margin: 0,
});
