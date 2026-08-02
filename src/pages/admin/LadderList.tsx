import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import StatusPill, {
  StatusTone,
} from "../../components/admin/StatusPill";
import { PrimaryButton } from "../../components/admin/formControls";
import { fetchLadders } from "../../services/ladders";
import { Ladder, LADDER_STATUS, LadderStatus } from "../../types/ladder";

interface LadderStatusStyle {
  label: string;
  tone: StatusTone;
}

const LADDER_STATUS_STYLES: Record<LadderStatus, LadderStatusStyle> = {
  [LADDER_STATUS.DRAFT]: { label: "Draft", tone: "neutral" },
  [LADDER_STATUS.REGISTRATION_OPEN]: {
    label: "Registration open",
    tone: "info",
  },
  [LADDER_STATUS.REGISTRATION_CLOSED]: {
    label: "Registration closed",
    tone: "warning",
  },
  [LADDER_STATUS.IN_PROGRESS]: { label: "In progress", tone: "info" },
  [LADDER_STATUS.PLAYOFFS]: { label: "Playoffs", tone: "info" },
  [LADDER_STATUS.COMPLETED]: { label: "Completed", tone: "positive" },
  [LADDER_STATUS.CANCELLED]: { label: "Cancelled", tone: "danger" },
};

const formatEntryFee = (ladder: Ladder): string =>
  ladder.entryFee === 0
    ? "Free"
    : `${ladder.entryFee.toLocaleString()} ${ladder.currencyType}`;

function LadderList() {
  const navigate = useNavigate();
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadLadders = async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const loadedLadders = await fetchLadders();
        if (isActive) {
          setLadders(loadedLadders);
        }
      } catch (fetchError) {
        console.error("Failed to load ladders", fetchError);
        if (isActive) {
          setLoadError("Could not load ladders. Please refresh to try again.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadLadders();

    return () => {
      isActive = false;
    };
  }, []);

  const goToNewLadder = useCallback(() => {
    navigate("/admin/ladders/new");
  }, [navigate]);

  const columns = useMemo<AdminTableColumn<Ladder>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (ladder) => <strong>{ladder.name}</strong>,
      },
      { key: "region", header: "Region", render: (ladder) => ladder.region },
      {
        key: "status",
        header: "Status",
        render: (ladder) => {
          const statusStyle = LADDER_STATUS_STYLES[ladder.status];
          return (
            <StatusPill tone={statusStyle.tone}>
              {statusStyle.label}
            </StatusPill>
          );
        },
      },
      {
        key: "entryFee",
        header: "Entry fee",
        render: (ladder) => formatEntryFee(ladder),
      },
      {
        key: "participants",
        header: "Participants",
        render: (ladder) => `${ladder.participantCount} / ${ladder.maxPlayers}`,
      },
      {
        key: "seasonStart",
        header: "Season start",
        render: (ladder) =>
          ladder.seasonStartsAt.getTime() === 0
            ? "—"
            : format(ladder.seasonStartsAt, "d MMM yyyy"),
      },
    ],
    [],
  );

  return (
    <AdminLayout title="Ladders">
      <HeaderRow>
        <Subtitle>Manage competitive ladders</Subtitle>
        <PrimaryButton type="button" onClick={goToNewLadder}>
          New Ladder
        </PrimaryButton>
      </HeaderRow>

      {loadError ? <LoadError>{loadError}</LoadError> : null}

      {loading ? (
        <LoadingText>Loading ladders…</LoadingText>
      ) : (
        <AdminTable
          columns={columns}
          rows={ladders}
          rowKey={(ladder) => ladder.ladderId}
          onRowClick={(ladder) =>
            navigate(`/admin/ladders/${ladder.ladderId}`)
          }
          emptyState={
            <>
              <EmptyTitle>No ladders yet</EmptyTitle>
              <EmptyText>Create your first ladder to get started.</EmptyText>
              <PrimaryButton type="button" onClick={goToNewLadder}>
                New Ladder
              </PrimaryButton>
            </>
          }
        />
      )}
    </AdminLayout>
  );
}

export default LadderList;

const HeaderRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "20px",
});

const Subtitle = styled.span({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});

const LoadError = styled.div({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 122, 122, 0.12)",
  border: "1px solid rgba(255, 122, 122, 0.4)",
  color: "#ff9a9a",
  fontSize: "0.85rem",
  marginBottom: "16px",
});

const LoadingText = styled.div({
  color: "#8fa3b8",
  fontSize: "0.9rem",
  padding: "40px 0",
  textAlign: "center",
});

const EmptyTitle = styled.span({
  color: "#FFFFFF",
  fontSize: "1.05rem",
  fontWeight: 700,
});

const EmptyText = styled.span({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});
