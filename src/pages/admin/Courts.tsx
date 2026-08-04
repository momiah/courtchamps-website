import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import AddCourtModal from "../../components/admin/AddCourtModal";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import FilterTabs, {
  FilterTabItem,
} from "../../components/admin/FilterTabs";
import StatusPill from "../../components/admin/StatusPill";
import { PrimaryButton, TextInput } from "../../components/admin/formControls";
import { useAuth } from "../../context/AuthContext";
import { fetchAllCourts, setCourtVerified } from "../../services/courts";
import { Court } from "../../types/ladder";

type CourtFilterTab = "all" | "unverified" | "verified";

const hasCoordinates = (court: Court): boolean =>
  typeof court.location.latitude === "number" &&
  typeof court.location.longitude === "number";

function Courts() {
  const { currentUser } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CourtFilterTab>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [courtBeingEdited, setCourtBeingEdited] = useState<Court | null>(null);
  const [courtPendingUnverify, setCourtPendingUnverify] =
    useState<Court | null>(null);
  const [busyCourtId, setBusyCourtId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isActive = true;

    const loadCourts = async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const loadedCourts = await fetchAllCourts();
        if (isActive) {
          setCourts(loadedCourts);
        }
      } catch (fetchError) {
        console.error("Failed to load courts", fetchError);
        if (isActive) {
          setLoadError("Could not load courts. Please refresh to try again.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadCourts();

    return () => {
      isActive = false;
    };
  }, []);

  const unverifiedCount = useMemo(
    () => courts.filter((court) => court.verified !== true).length,
    [courts],
  );

  const verifiedCount = useMemo(
    () => courts.filter((court) => court.verified === true).length,
    [courts],
  );

  const filterTabs = useMemo<FilterTabItem<CourtFilterTab>[]>(
    () => [
      { id: "all", label: "All" },
      { id: "unverified", label: "Unverified", count: unverifiedCount },
      { id: "verified", label: "Verified" },
    ],
    [unverifiedCount],
  );

  const visibleCourts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return courts.filter((court) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "verified" && court.verified === true) ||
        (activeTab === "unverified" && court.verified !== true);
      if (!matchesTab) {
        return false;
      }
      if (normalizedSearch.length === 0) {
        return true;
      }
      const haystack =
        `${court.courtName} ${court.location.city}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [courts, activeTab, searchTerm]);

  const applyVerified = useCallback(
    async (court: Court, verified: boolean): Promise<void> => {
      const actorUserId = currentUser?.uid;
      if (!actorUserId) {
        setRowErrors((previous) => ({
          ...previous,
          [court.courtId]: "You must be signed in to change a court.",
        }));
        return;
      }

      setBusyCourtId(court.courtId);
      setRowErrors((previous) => {
        const next = { ...previous };
        delete next[court.courtId];
        return next;
      });

      const previousCourts = courts;
      setCourts((current) =>
        current.map((existing) =>
          existing.courtId === court.courtId
            ? {
                ...existing,
                verified,
                verifiedBy: verified ? actorUserId : null,
                verifiedAt: verified ? new Date() : null,
              }
            : existing,
        ),
      );

      try {
        await setCourtVerified({
          courtId: court.courtId,
          verified,
          actorUserId,
        });
      } catch (updateError) {
        console.error("Failed to update court verification", updateError);
        setCourts(previousCourts);
        setRowErrors((previous) => ({
          ...previous,
          [court.courtId]: "Could not update this court. Please try again.",
        }));
      } finally {
        setBusyCourtId(null);
      }
    },
    [courts, currentUser],
  );

  const handleVerify = useCallback(
    (court: Court) => {
      void applyVerified(court, true);
    },
    [applyVerified],
  );

  const handleConfirmUnverify = useCallback(() => {
    if (!courtPendingUnverify) {
      return;
    }
    const target = courtPendingUnverify;
    setCourtPendingUnverify(null);
    void applyVerified(target, false);
  }, [applyVerified, courtPendingUnverify]);

  const handleCourtSaved = useCallback((savedCourt: Court) => {
    setCourts((previous) => {
      const withoutSaved = previous.filter(
        (existing) => existing.courtId !== savedCourt.courtId,
      );
      return [...withoutSaved, savedCourt].sort((first, second) =>
        first.courtName.localeCompare(second.courtName),
      );
    });
    setIsAddModalOpen(false);
    setCourtBeingEdited(null);
  }, []);

  const closeCourtModal = useCallback(() => {
    setIsAddModalOpen(false);
    setCourtBeingEdited(null);
  }, []);

  const columns = useMemo<AdminTableColumn<Court>[]>(
    () => [
      {
        key: "courtName",
        header: "Court",
        render: (court) => <strong>{court.courtName}</strong>,
      },
      {
        key: "address",
        header: "Address",
        render: (court) => court.location.address,
      },
      { key: "city", header: "City", render: (court) => court.location.city },
      {
        key: "country",
        header: "Country",
        render: (court) => court.location.country,
      },
      {
        key: "postCode",
        header: "Post code",
        render: (court) => court.location.postCode,
      },
      {
        key: "status",
        header: "Status",
        render: (court) =>
          court.verified === true ? (
            <StatusPill tone="positive">Verified</StatusPill>
          ) : (
            <StatusPill tone="warning">Unverified</StatusPill>
          ),
      },
      {
        key: "action",
        header: "Action",
        align: "right",
        render: (court) => (
          <ActionCell>
            <ActionButtons>
              <TableActionButton
                type="button"
                variant="ghost"
                onClick={() => setCourtBeingEdited(court)}
              >
                Edit
              </TableActionButton>
              {court.verified === true ? (
                <TableActionButton
                  type="button"
                  variant="ghost"
                  disabled={busyCourtId === court.courtId}
                  onClick={() => setCourtPendingUnverify(court)}
                >
                  Unverify
                </TableActionButton>
              ) : hasCoordinates(court) ? (
                <TableActionButton
                  type="button"
                  variant="primary"
                  disabled={busyCourtId === court.courtId}
                  onClick={() => handleVerify(court)}
                >
                  Verify
                </TableActionButton>
              ) : (
                <NeedsLocation title="Add coordinates via Edit to verify this court.">
                  Needs location
                </NeedsLocation>
              )}
            </ActionButtons>
            {rowErrors[court.courtId] ? (
              <RowError>{rowErrors[court.courtId]}</RowError>
            ) : null}
          </ActionCell>
        ),
      },
    ],
    [busyCourtId, handleVerify, rowErrors],
  );

  return (
    <AdminLayout title="Courts">
      <HeaderRow>
        <FilterTabs
          tabs={filterTabs}
          activeTabId={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
        <PrimaryButton type="button" onClick={() => setIsAddModalOpen(true)}>
          Add Court
        </PrimaryButton>
      </HeaderRow>

      <SearchRow>
        <TextInput
          type="text"
          placeholder="Search by court name or city…"
          value={searchTerm}
          onChange={(changeEvent) => setSearchTerm(changeEvent.target.value)}
        />
        <ResultCount>
          {verifiedCount} verified · {unverifiedCount} unverified
        </ResultCount>
      </SearchRow>

      {loadError ? <LoadError>{loadError}</LoadError> : null}

      {loading ? (
        <LoadingText>Loading courts…</LoadingText>
      ) : (
        <AdminTable
          compact
          columns={columns}
          rows={visibleCourts}
          rowKey={(court) => court.courtId}
          emptyState={
            courts.length === 0 ? (
              <>
                <EmptyTitle>No courts yet</EmptyTitle>
                <EmptyText>
                  Add the first court so ladders can reference a location.
                </EmptyText>
                <PrimaryButton
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add Court
                </PrimaryButton>
              </>
            ) : (
              <EmptyText>No courts match the current filters.</EmptyText>
            )
          }
        />
      )}

      {isAddModalOpen || courtBeingEdited ? (
        <AddCourtModal
          court={courtBeingEdited ?? undefined}
          onClose={closeCourtModal}
          onSaved={handleCourtSaved}
        />
      ) : null}

      {courtPendingUnverify ? (
        <ConfirmDialog
          title="Unverify court"
          message={`Unverify "${courtPendingUnverify.courtName}"? It will no longer be selectable when creating ladders until it is verified again.`}
          confirmLabel="Unverify"
          destructive
          busy={busyCourtId === courtPendingUnverify.courtId}
          onConfirm={handleConfirmUnverify}
          onCancel={() => setCourtPendingUnverify(null)}
        />
      ) : null}
    </AdminLayout>
  );
}

export default Courts;

const HeaderRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
});

const SearchRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "20px",
  flexWrap: "wrap",
});

const ResultCount = styled.span({
  color: "#8fa3b8",
  fontSize: "0.82rem",
  whiteSpace: "nowrap",
});

const ActionCell = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "6px",
});

const ActionButtons = styled.div({
  display: "flex",
  justifyContent: "flex-end",
  gap: "6px",
});

const TableActionButton = styled.button<{ variant: "primary" | "ghost" }>(
  ({ variant }) => ({
    minWidth: "84px",
    padding: "6px 12px",
    borderRadius: "7px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textAlign: "center",
    transition: "background-color 0.2s, opacity 0.2s",
    ...(variant === "primary"
      ? {
          border: "none",
          backgroundColor: "#0099f0",
          color: "#FFFFFF",
          ":hover": { opacity: 0.9 },
        }
      : {
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background: "none",
          color: "#FFFFFF",
          ":hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
        }),
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  }),
);

const NeedsLocation = styled.span({
  display: "inline-flex",
  alignItems: "center",
  minWidth: "84px",
  justifyContent: "center",
  padding: "6px 12px",
  fontSize: "0.72rem",
  fontStyle: "italic",
  color: "#8fa3b8",
  cursor: "default",
});

const RowError = styled.span({
  color: "#ff7a7a",
  fontSize: "0.72rem",
  maxWidth: "180px",
  textAlign: "right",
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
