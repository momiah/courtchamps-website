import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import StatusPill from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { REPORT_REASONS } from "courtchamps-shared/types";
import {
  approveReport,
  fetchPendingReports,
  rejectReport,
  EnrichedReport,
} from "../../services/reports";

type PendingAction = {
  report: EnrichedReport;
  type: "approve" | "reject";
};

const isNoShow = (report: EnrichedReport): boolean =>
  report.reason === REPORT_REASONS.NO_SHOW;

function Reports() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadReports = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      setReports(await fetchPendingReports());
    } catch (fetchError) {
      console.error("Failed to load reports", fetchError);
      setLoadError("Could not load reports. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleResolve = async (): Promise<void> => {
    if (!pendingAction) return;
    const { report, type } = pendingAction;
    const adminUserId = currentUser?.uid ?? "";
    setActionBusy(true);
    setActionError(null);
    try {
      if (type === "approve") {
        await approveReport(report, adminUserId);
      } else {
        await rejectReport(report, adminUserId);
      }
      setReports((prev) => prev.filter((r) => r.reportId !== report.reportId));
      setPendingAction(null);
    } catch (resolveError) {
      console.error("Failed to resolve report", resolveError);
      setActionError(
        resolveError instanceof Error
          ? resolveError.message
          : "Could not resolve this report. Please try again.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<AdminTableColumn<EnrichedReport>[]>(
    () => [
      {
        key: "match",
        header: "Match",
        render: (report) => (
          <MatchCell>
            <strong>{report.courtName || "—"}</strong>
            <MatchMeta>
              {report.matchDate}
              {report.matchTime ? ` · ${report.matchTime}` : ""}
            </MatchMeta>
          </MatchCell>
        ),
      },
      {
        key: "reason",
        header: "Reason",
        render: (report) => (
          <StatusPill tone={isNoShow(report) ? "warning" : "danger"}>
            {report.reasonLabel}
          </StatusPill>
        ),
      },
      {
        key: "target",
        header: "Reported player",
        render: (report) => (
          <TargetCell>
            <strong>{report.targetLabel}</strong>
            {report.description ? (
              <MatchMeta>{report.description}</MatchMeta>
            ) : null}
          </TargetCell>
        ),
      },
      {
        key: "reporter",
        header: "Reported by",
        render: (report) => report.reporterLabel,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (report) => (
          <ActionRow>
            <ApproveButton
              type="button"
              onClick={() => setPendingAction({ report, type: "approve" })}
            >
              Approve
            </ApproveButton>
            <RejectButton
              type="button"
              onClick={() => setPendingAction({ report, type: "reject" })}
            >
              Reject
            </RejectButton>
          </ActionRow>
        ),
      },
    ],
    [],
  );

  const approveMessage = (report: EnrichedReport): string =>
    isNoShow(report)
      ? `Uphold the no-show against ${report.targetLabel}: award the walkover and add a no-show strike. No games are recorded.`
      : `Uphold this ${report.reasonLabel} report and add a strike against ${report.targetLabel} in this ladder. Enough strikes disqualify them.`;

  return (
    <AdminLayout title="Reports">
      <Intro>
        Players report no-shows (from check-in) and conduct — cheating, abuse,
        harassment — from the match menu. Approving adds a strike to the reported
        player in that ladder (and their global record); a no-show also awards the
        walkover. Rejecting dismisses the report with no strike.
      </Intro>

      {loading ? (
        <StateCard>Loading reports…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : (
        <AdminTable<EnrichedReport>
          columns={columns}
          rows={reports}
          rowKey={(report) => report.reportId}
          emptyState={
            <EmptyState>
              <strong>No pending reports</strong>
              <span>Reports awaiting a decision will appear here.</span>
            </EmptyState>
          }
        />
      )}

      {pendingAction ? (
        <ConfirmDialog
          title={
            pendingAction.type === "approve" ? "Approve report?" : "Reject report?"
          }
          message={
            pendingAction.type === "approve"
              ? approveMessage(pendingAction.report)
              : `Dismiss this report against ${pendingAction.report.targetLabel}. No strike is applied.`
          }
          confirmLabel={
            pendingAction.type === "approve" ? "Approve" : "Reject"
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

export default Reports;

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

const TargetCell = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  maxWidth: "260px",
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
