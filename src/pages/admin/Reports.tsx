import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import StatusPill from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { REPORT_REASONS, REPORT_STATUS } from "courtchamps-shared/types";
import type { ReportStatus } from "courtchamps-shared/types";
import {
  approveReport,
  fetchReports,
  rejectReport,
  revertReport,
  EnrichedReport,
} from "../../services/reports";
import type { StatusTone } from "../../components/admin/StatusPill";

type ActionType = "approve" | "reject" | "revert";

type PendingAction = {
  report: EnrichedReport;
  type: ActionType;
};

type StatusFilter = "all" | ReportStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: REPORT_STATUS.PENDING, label: "Pending" },
  { key: REPORT_STATUS.APPROVED, label: "Approved" },
  { key: REPORT_STATUS.REJECTED, label: "Rejected" },
];

const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  pending: "warning",
  approved: "positive",
  rejected: "danger",
};

const isNoShow = (report: EnrichedReport): boolean =>
  report.reason === REPORT_REASONS.NO_SHOW;

const isPending = (report: EnrichedReport): boolean =>
  report.status === REPORT_STATUS.PENDING;

function Reports() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadReports = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      setReports(await fetchReports());
    } catch (fetchError) {
      console.error("Failed to load reports", fetchError);
      setLoadError("Could not load reports. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const visibleReports = useMemo(
    () =>
      statusFilter === "all"
        ? reports
        : reports.filter((report) => report.status === statusFilter),
    [reports, statusFilter],
  );

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
      const nextStatus: ReportStatus =
        type === "approve"
          ? REPORT_STATUS.APPROVED
          : type === "reject"
            ? REPORT_STATUS.REJECTED
            : REPORT_STATUS.PENDING;
      if (type === "approve") {
        await approveReport(report, adminUserId);
      } else if (type === "reject") {
        await rejectReport(report, adminUserId);
      } else {
        await revertReport(report, adminUserId);
      }
      setReports((prev) =>
        prev.map((r) =>
          r.reportId === report.reportId ? { ...r, status: nextStatus } : r,
        ),
      );
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
              {report.matchTime ? ` ${report.matchTime}` : ""}
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
        key: "status",
        header: "Status",
        render: (report) => (
          <StatusPill tone={STATUS_TONE[report.status]}>
            {report.status}
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
        render: (report) => {
          const resolved = !isPending(report);
          return (
            <ActionRow>
              <ApproveButton
                type="button"
                disabled={resolved}
                onClick={() => setPendingAction({ report, type: "approve" })}
              >
                Approve
              </ApproveButton>
              <RejectButton
                type="button"
                disabled={resolved}
                onClick={() => setPendingAction({ report, type: "reject" })}
              >
                Reject
              </RejectButton>
              <RevertButton
                type="button"
                disabled={!resolved}
                onClick={() => setPendingAction({ report, type: "revert" })}
              >
                Revert
              </RevertButton>
            </ActionRow>
          );
        },
      },
    ],
    [],
  );

  const dialogMessage = ({ report, type }: PendingAction): string => {
    if (type === "approve") {
      return isNoShow(report)
        ? `Uphold the no-show against ${report.targetLabel}: award the walkover and add a no-show strike. No games are recorded.`
        : `Uphold this ${report.reasonLabel} report and add a strike against ${report.targetLabel} in this ladder. Enough strikes disqualify them.`;
    }
    if (type === "reject") {
      return `Dismiss this report against ${report.targetLabel}. No strike is applied.`;
    }
    return report.status === REPORT_STATUS.APPROVED
      ? `Undo the approval against ${report.targetLabel}: remove the strike${
          isNoShow(report) ? " and reverse the walkover" : ""
        }. The report returns to pending.`
      : `Reopen this dismissed report against ${report.targetLabel}. It returns to pending.`;
  };

  return (
    <AdminLayout title="Reports">
      <Intro>
        Players report no-shows (from check-in) and conduct — cheating, abuse,
        harassment — from the match menu. Approving adds a strike to the
        reported player in that ladder (and their global record); a no-show also
        awards the walkover. Rejecting dismisses the report with no strike.
      </Intro>

      <FilterRow>
        {STATUS_FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            type="button"
            $active={statusFilter === filter.key}
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label}
          </FilterChip>
        ))}
      </FilterRow>

      {loading ? (
        <StateCard>Loading reports…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : (
        <AdminTable<EnrichedReport>
          columns={columns}
          rows={visibleReports}
          rowKey={(report) => report.reportId}
          emptyState={
            <EmptyState>
              <strong>No reports</strong>
              <span>
                {statusFilter === "all"
                  ? "Reports will appear here as players raise them."
                  : `No ${statusFilter} reports.`}
              </span>
            </EmptyState>
          }
        />
      )}

      {pendingAction ? (
        <ConfirmDialog
          title={
            pendingAction.type === "approve"
              ? "Approve report?"
              : pendingAction.type === "reject"
                ? "Reject report?"
                : "Revert decision?"
          }
          message={dialogMessage(pendingAction)}
          confirmLabel={
            pendingAction.type === "approve"
              ? "Approve"
              : pendingAction.type === "reject"
                ? "Reject"
                : "Revert"
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

const ActionButton = styled.button({
  padding: "8px 14px",
  borderRadius: "8px",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
  "&:disabled": {
    opacity: 0.4,
    cursor: "not-allowed",
  },
});

const ApproveButton = styled(ActionButton)({
  border: "1px solid rgba(34, 197, 94, 0.4)",
  backgroundColor: "rgba(34, 197, 94, 0.12)",
  color: "#22c55e",
});

const RejectButton = styled(ActionButton)({
  border: "1px solid rgba(248, 113, 113, 0.4)",
  backgroundColor: "rgba(248, 113, 113, 0.1)",
  color: "#f87171",
});

const RevertButton = styled(ActionButton)({
  border: "1px solid rgba(143, 184, 214, 0.4)",
  backgroundColor: "rgba(143, 184, 214, 0.1)",
  color: "#8fb8d6",
});

const FilterRow = styled.div({
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
  flexWrap: "wrap",
});

const FilterChip = styled.button<{ $active: boolean }>(({ $active }) => ({
  padding: "6px 14px",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  border: `1px solid ${$active ? "#4db8ff" : "rgba(255, 255, 255, 0.14)"}`,
  backgroundColor: $active ? "rgba(0, 153, 240, 0.16)" : "transparent",
  color: $active ? "#4db8ff" : "#8fa3b8",
}));

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
