import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import StatusPill from "../../components/admin/StatusPill";
import { LADDER_TYPE } from "courtchamps-shared/types";
import {
  fetchActiveDisputes,
  EnrichedDispute,
} from "../../services/disputes";
import { scoreLabel } from "./disputeFormat";

const hasEvidence = (dispute: EnrichedDispute): boolean =>
  dispute.hasVideo ||
  (dispute.evidence ?? []).some((e) => e.notes || e.courtPositions);

function GameDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<EnrichedDispute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      setDisputes(await fetchActiveDisputes());
    } catch (error) {
      console.error("Failed to load disputes", error);
      setLoadError("Could not load disputes. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<AdminTableColumn<EnrichedDispute>[]>(
    () => [
      {
        key: "status",
        header: "",
        render: (dispute) =>
          dispute.needsAttention ? (
            <StatusPill tone="warning">Needs review</StatusPill>
          ) : (
            <StatusPill tone="neutral">Awaiting player</StatusPill>
          ),
      },
      {
        key: "ladder",
        header: "Ladder",
        render: (dispute) => (
          <LadderCell>
            <strong>{dispute.ladderName || "—"}</strong>
            <Meta>
              {dispute.ladderType === LADDER_TYPE.DOUBLES ? "Doubles" : "Singles"}
            </Meta>
          </LadderCell>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (dispute) => dispute.matchDate || "—",
      },
      {
        key: "gameId",
        header: "Game ID",
        render: (dispute) => <Mono>{dispute.gameId}</Mono>,
      },
      {
        key: "current",
        header: "Current score",
        render: (dispute) => scoreLabel(dispute.originalGame),
      },
      {
        key: "disputed",
        header: "Disputed score",
        render: (dispute) => scoreLabel(dispute.disputedGame),
      },
      {
        key: "evidence",
        header: "Evidence",
        render: (dispute) =>
          hasEvidence(dispute) ? (
            <StatusPill tone="info">Provided</StatusPill>
          ) : (
            <StatusPill tone="neutral">None</StatusPill>
          ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (dispute) => (
          <ViewButton
            type="button"
            onClick={() => navigate(`/admin/disputes/${dispute.disputeId}`)}
          >
            View
          </ViewButton>
        ),
      },
    ],
    [navigate],
  );

  return (
    <AdminLayout title="Game Disputes">
      <Intro>
        A player disputes a game when they reject the reported score. Rows
        marked <strong>Needs review</strong> have a new submission from the
        player waiting on you. Open one to approve the disputed score, keep the
        original, or ask for more evidence.
      </Intro>

      {loading ? (
        <StateCard>Loading disputes…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : (
        <AdminTable<EnrichedDispute>
          columns={columns}
          rows={disputes}
          rowKey={(dispute) => dispute.disputeId}
          emptyState={
            <EmptyState>
              <strong>No open disputes</strong>
              <span>Disputed games awaiting a decision will appear here.</span>
            </EmptyState>
          }
        />
      )}
    </AdminLayout>
  );
}

export default GameDisputes;

const Intro = styled.p({
  color: "#8fa3b8",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  margin: "0 0 20px",
  maxWidth: "760px",
});

const LadderCell = styled.div({ display: "flex", flexDirection: "column", gap: "2px" });
const Meta = styled.span({ color: "#8fa3b8", fontSize: "0.8rem" });
const Mono = styled.span({
  fontFamily: "monospace",
  fontSize: "0.8rem",
  color: "#c7d6e5",
});

const ViewButton = styled.button({
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(0, 162, 255, 0.4)",
  backgroundColor: "rgba(0, 162, 255, 0.12)",
  color: "#00A2FF",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
});

const StateCard = styled.div({
  padding: "20px",
  borderRadius: "12px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#8fa3b8",
  fontSize: "0.9rem",
  marginTop: "16px",
});

const EmptyState = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#8fa3b8",
});
