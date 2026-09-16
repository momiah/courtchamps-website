import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import StatusPill from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import {
  approveNoShowClaim,
  fetchPendingNoShowClaims,
  rejectNoShowClaim,
  EnrichedNoShowClaim,
} from "../../services/noShows";

type PendingAction = {
  claim: EnrichedNoShowClaim;
  type: "approve" | "reject";
};

function NoShows() {
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState<EnrichedNoShowClaim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadClaims = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchPendingNoShowClaims();
      setClaims(rows);
    } catch (fetchError) {
      console.error("Failed to load no-show claims", fetchError);
      setLoadError("Could not load no-show claims. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const handleResolve = async (): Promise<void> => {
    if (!pendingAction) return;
    const { claim, type } = pendingAction;
    const adminUserId = currentUser?.uid ?? "";
    setActionBusy(true);
    setActionError(null);
    try {
      if (type === "approve") {
        await approveNoShowClaim(claim, adminUserId);
      } else {
        await rejectNoShowClaim(claim, adminUserId);
      }
      setClaims((prev) => prev.filter((c) => c.claimId !== claim.claimId));
      setPendingAction(null);
    } catch (resolveError) {
      console.error("Failed to resolve no-show claim", resolveError);
      setActionError(
        resolveError instanceof Error
          ? resolveError.message
          : "Could not resolve this claim. Please try again.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<AdminTableColumn<EnrichedNoShowClaim>[]>(
    () => [
      {
        key: "match",
        header: "Match",
        render: (claim) => (
          <MatchCell>
            <strong>{claim.courtName || "—"}</strong>
            <MatchMeta>
              {claim.matchDate}
              {claim.matchTime ? ` · ${claim.matchTime}` : ""}
            </MatchMeta>
          </MatchCell>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (claim) => (
          <StatusPill tone="info">
            {claim.isDoubles ? "Doubles" : "Singles"}
          </StatusPill>
        ),
      },
      {
        key: "winner",
        header: "Claiming (walkover win)",
        render: (claim) => <strong>{claim.claimantLabel}</strong>,
      },
      {
        key: "noShow",
        header: "No-show",
        render: (claim) => claim.noShowLabel,
      },
      {
        key: "reporter",
        header: "Reported by",
        render: (claim) => claim.reporterLabel,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (claim) => (
          <ActionRow>
            <ApproveButton
              type="button"
              onClick={() => setPendingAction({ claim, type: "approve" })}
            >
              Approve
            </ApproveButton>
            <RejectButton
              type="button"
              onClick={() => setPendingAction({ claim, type: "reject" })}
            >
              Reject
            </RejectButton>
          </ActionRow>
        ),
      },
    ],
    [],
  );

  return (
    <AdminLayout title="No Shows">
      <Intro>
        Players report a no-show when an opponent doesn&apos;t turn up and they
        can&apos;t check in. Approving awards a plain walkover win — no games,
        so no game points or medals — just the match win. Rejecting dismisses
        the claim.
      </Intro>

      {loading ? (
        <StateCard>Loading no-show claims…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : (
        <AdminTable<EnrichedNoShowClaim>
          columns={columns}
          rows={claims}
          rowKey={(claim) => claim.claimId}
          emptyState={
            <EmptyState>
              <strong>No pending no-shows</strong>
              <span>Reported no-shows awaiting a decision will appear here.</span>
            </EmptyState>
          }
        />
      )}

      {pendingAction ? (
        <ConfirmDialog
          title={
            pendingAction.type === "approve"
              ? "Approve walkover?"
              : "Reject no-show?"
          }
          message={
            pendingAction.type === "approve"
              ? `Award the match to ${pendingAction.claim.claimantLabel} as a walkover. ${pendingAction.claim.noShowLabel} takes the loss. No games are recorded.`
              : `Dismiss the no-show reported against ${pendingAction.claim.noShowLabel}. The match stays open.`
          }
          confirmLabel={
            pendingAction.type === "approve" ? "Approve walkover" : "Reject"
          }
          busy={actionBusy}
          onConfirm={handleResolve}
          onCancel={() => {
            if (actionBusy) return;
            setPendingAction(null);
            setActionError(null);
          }}
        />
      ) : null}

      {actionError ? <StateCard>{actionError}</StateCard> : null}
    </AdminLayout>
  );
}

export default NoShows;

const Intro = styled.p({
  color: "#8fa3b8",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  margin: "0 0 20px",
  maxWidth: "760px",
});

const MatchCell = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const MatchMeta = styled.span({
  color: "#8fa3b8",
  fontSize: "0.8rem",
});

const ActionRow = styled.div({
  display: "inline-flex",
  gap: "8px",
  justifyContent: "flex-end",
});

const ApproveButton = styled.button({
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(34, 197, 94, 0.4)",
  backgroundColor: "rgba(34, 197, 94, 0.12)",
  color: "#22c55e",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
});

const RejectButton = styled.button({
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(248, 113, 113, 0.4)",
  backgroundColor: "rgba(248, 113, 113, 0.1)",
  color: "#f87171",
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
