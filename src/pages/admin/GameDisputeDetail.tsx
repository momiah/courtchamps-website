import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import StatusPill from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { DISPUTE_STAGE, DISPUTE_STAGE_LABELS, LADDER_TYPE } from "courtchamps-shared/types";
import type {
  Dispute,
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
} from "../../services/disputes";
import { playerName, sideLabel, scoreLabel, uploaderName } from "./disputeFormat";

type ActionType = "approve" | "reject" | "moreEvidence";

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

  const runAction = async (type: ActionType): Promise<void> => {
    if (!dispute) return;
    if (type === "moreEvidence" && !notes.trim()) {
      setActionError("Add a note telling the player what else you need.");
      return;
    }
    const adminUserId = currentUser?.uid ?? "";
    setActionBusy(true);
    setActionError(null);
    try {
      if (type === "approve") {
        await approveDispute(dispute, adminUserId, notes.trim() || undefined);
      } else if (type === "reject") {
        await rejectDispute(dispute, adminUserId, notes.trim() || undefined);
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

  const positions = dispute
    ? [...(dispute.evidence ?? [])].reverse().find((e) => e.courtPositions)
        ?.courtPositions
    : undefined;
  const resolved = dispute?.stage === DISPUTE_STAGE.RESOLVED;
  const awaitingPlayer = dispute?.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED;
  const isDoubles = dispute?.ladderType === LADDER_TYPE.DOUBLES;

  return (
    <AdminLayout title="Game Dispute">
      <BackLink type="button" onClick={() => navigate("/admin/disputes")}>
        ← Back to disputes
      </BackLink>

      {loading ? (
        <StateCard>Loading dispute…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : !dispute ? (
        <StateCard>This dispute no longer exists.</StateCard>
      ) : (
        <>
          <FieldGrid>
            <Field label="Ladder" value={dispute.ladderName || "—"} />
            <Field label="Type" value={isDoubles ? "Doubles" : "Singles"} />
            <Field label="Date" value={dispute.matchDate || "—"} />
            <Field label="Match ID" value={dispute.ladderMatchId} mono />
            <Field label="Game ID" value={dispute.gameId} mono />
            <Field label="Stage" value={DISPUTE_STAGE_LABELS[dispute.stage]} />
          </FieldGrid>

          <SectionTitle>Players</SectionTitle>
          <PlayersRow>
            <TeamBox>
              <TeamName>{sideLabel(dispute.originalGame?.team1)}</TeamName>
            </TeamBox>
            <Vs>vs</Vs>
            <TeamBox>
              <TeamName>{sideLabel(dispute.originalGame?.team2)}</TeamName>
            </TeamBox>
          </PlayersRow>

          <SectionTitle>Scores</SectionTitle>
          <ScoreCompare>
            <ScoreBox>
              <ScoreLabel>Current</ScoreLabel>
              <ScoreValue>{scoreLabel(dispute.originalGame)}</ScoreValue>
            </ScoreBox>
            <ScoreBox highlight>
              <ScoreLabel>Disputed</ScoreLabel>
              <ScoreValue>{scoreLabel(dispute.disputedGame)}</ScoreValue>
            </ScoreBox>
            {resolved && dispute.finalGame ? (
              <ScoreBox highlight>
                <ScoreLabel>Final</ScoreLabel>
                <ScoreValue>{scoreLabel(dispute.finalGame)}</ScoreValue>
              </ScoreBox>
            ) : null}
          </ScoreCompare>

          <SectionTitle>Video evidence</SectionTitle>
          {videos.length === 0 ? (
            <Muted>No video was provided.</Muted>
          ) : (
            videos.map((video, index) => (
              <VideoBlock key={index}>
                <Uploader>Uploaded by {uploaderName(video)}</Uploader>
                <VideoWrap>
                  <video src={video.videoUrl} controls width="100%" />
                </VideoWrap>
              </VideoBlock>
            ))
          )}

          <SectionTitle>Court positions</SectionTitle>
          {positions ? (
            <CourtPositions positions={positions} />
          ) : (
            <Muted>No court positions were provided.</Muted>
          )}

          <SectionTitle>Notes from players</SectionTitle>
          {(dispute.evidence ?? []).some((e) => e.notes) ? (
            (dispute.evidence ?? [])
              .filter((e) => e.notes)
              .map((e, index) => <NoteLine key={index}>“{e.notes}”</NoteLine>)
          ) : (
            <Muted>No notes were provided.</Muted>
          )}

          <SectionTitle>Progress</SectionTitle>
          {dispute.events.map((event, index) => (
            <Accordion key={`${event.stage}-${index}`}>
              <summary>
                <StatusPill
                  tone={
                    event.stage === DISPUTE_STAGE.RESOLVED
                      ? "info"
                      : event.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
                        ? "warning"
                        : "neutral"
                  }
                >
                  {DISPUTE_STAGE_LABELS[event.stage]}
                </StatusPill>
              </summary>
              <AccordionBody>
                {event.note || "No additional detail."}
                {event.stage === DISPUTE_STAGE.RESOLVED && dispute.adminNotes ? (
                  <div>Admin notes: {dispute.adminNotes}</div>
                ) : null}
              </AccordionBody>
            </Accordion>
          ))}

          {!resolved ? (
            <ActionPanel>
              <SectionTitle>Admin notes (shown to players)</SectionTitle>
              <NotesInput
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional for approve/reject; required when requesting more evidence."
                rows={3}
              />
              {actionError ? <ErrorText>{actionError}</ErrorText> : null}
              <ButtonRow>
                <ApproveButton
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction("approve")}
                >
                  Approve (uphold disputed)
                </ApproveButton>
                <RejectButton
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction("reject")}
                >
                  Reject (keep original)
                </RejectButton>
                <MoreButton
                  type="button"
                  disabled={actionBusy || awaitingPlayer}
                  onClick={() => runAction("moreEvidence")}
                >
                  {awaitingPlayer
                    ? "Waiting for player evidence"
                    : "Request more evidence"}
                </MoreButton>
              </ButtonRow>
            </ActionPanel>
          ) : (
            <ResolvedNote>This dispute has been resolved.</ResolvedNote>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <FieldBox>
      <FieldLabel>{label}</FieldLabel>
      {mono ? <Mono>{value}</Mono> : <FieldValue>{value}</FieldValue>}
    </FieldBox>
  );
}

function CourtPositions({ positions }: { positions: SelectedPlayers }) {
  const row = (label: string, players: (Player | null)[]) => (
    <PositionRow>
      <PositionTeam>{label}</PositionTeam>
      <PositionPlayers>
        {players.length
          ? players.map((p, index) => (
              <PositionPlayer key={index}>{playerName(p)}</PositionPlayer>
            ))
          : "—"}
      </PositionPlayers>
    </PositionRow>
  );
  return (
    <PositionsBox>
      {row("Team 1", positions.team1 ?? [])}
      {row("Team 2", positions.team2 ?? [])}
    </PositionsBox>
  );
}

export default GameDisputeDetail;

const BackLink = styled.button({
  background: "none",
  border: "none",
  color: "#00A2FF",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  marginBottom: "16px",
});

const StateCard = styled.div({
  padding: "20px",
  borderRadius: "12px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#8fa3b8",
  fontSize: "0.9rem",
});

const FieldGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "8px",
});
const FieldBox = styled.div({ display: "flex", flexDirection: "column", gap: "4px" });
const FieldLabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  fontWeight: 700,
});
const FieldValue = styled.span({ color: "#fff", fontSize: "0.9rem" });
const Mono = styled.span({
  fontFamily: "monospace",
  fontSize: "0.8rem",
  color: "#c7d6e5",
});

const SectionTitle = styled.h4({
  color: "#9fb8c8",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  fontWeight: 700,
  margin: "20px 0 8px",
});

const PlayersRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});
const TeamBox = styled.div({
  flex: 1,
  padding: "12px",
  borderRadius: "8px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255,255,255,0.08)",
});
const TeamName = styled.span({ color: "#fff", fontSize: "0.9rem", fontWeight: 600 });
const Vs = styled.span({ color: "#8fa3b8", fontSize: "0.8rem" });

const ScoreCompare = styled.div({ display: "flex", gap: "12px" });
const ScoreBox = styled.div<{ highlight?: boolean }>(({ highlight }) => ({
  flex: 1,
  padding: "12px",
  borderRadius: "8px",
  textAlign: "center",
  backgroundColor: highlight ? "rgba(0,162,255,0.1)" : "#0a1929",
  border: `1px solid ${highlight ? "rgba(0,162,255,0.4)" : "rgba(255,255,255,0.08)"}`,
}));
const ScoreLabel = styled.div({
  color: "#8fa3b8",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  marginBottom: "4px",
});
const ScoreValue = styled.div({ color: "#fff", fontSize: "1.1rem", fontWeight: 700 });

const VideoBlock = styled.div({ marginBottom: "12px" });
const Uploader = styled.div({
  color: "#8fa3b8",
  fontSize: "0.78rem",
  marginBottom: "6px",
});
const VideoWrap = styled.div({ borderRadius: "8px", overflow: "hidden" });
const Muted = styled.p({ color: "#8fa3b8", fontSize: "0.85rem", margin: 0 });
const NoteLine = styled.p({
  color: "#c7d6e5",
  fontSize: "0.85rem",
  fontStyle: "italic",
  margin: "0 0 6px",
});

const PositionsBox = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});
const PositionRow = styled.div({ display: "flex", gap: "12px", alignItems: "center" });
const PositionTeam = styled.span({
  color: "#8fa3b8",
  fontSize: "0.8rem",
  fontWeight: 700,
  width: "64px",
});
const PositionPlayers = styled.div({ display: "flex", gap: "8px", flexWrap: "wrap" });
const PositionPlayer = styled.span({
  padding: "4px 10px",
  borderRadius: "6px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: "0.82rem",
});

const Accordion = styled.details({
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "8px",
  "& summary": { cursor: "pointer", listStyle: "none" },
});
const AccordionBody = styled.div({
  color: "#c7d6e5",
  fontSize: "0.85rem",
  marginTop: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const ActionPanel = styled.div({ marginTop: "20px" });
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
});
const ErrorText = styled.p({ color: "#f87171", fontSize: "0.82rem", margin: "8px 0 0" });
const ButtonRow = styled.div({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
});
const ApproveButton = styled.button({
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(34, 197, 94, 0.4)",
  backgroundColor: "rgba(34, 197, 94, 0.12)",
  color: "#22c55e",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
});
const RejectButton = styled.button({
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(248, 113, 113, 0.4)",
  backgroundColor: "rgba(248, 113, 113, 0.1)",
  color: "#f87171",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
});
const MoreButton = styled.button<{ disabled?: boolean }>(({ disabled }) => ({
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(0, 162, 255, 0.4)",
  backgroundColor: "rgba(0, 162, 255, 0.12)",
  color: "#00A2FF",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
}));
const ResolvedNote = styled.p({
  color: "#22c55e",
  fontSize: "0.85rem",
  marginTop: "20px",
});
