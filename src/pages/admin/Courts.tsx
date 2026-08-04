import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FaPencilAlt, FaTrashAlt } from "react-icons/fa";

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
import { deleteCourt, fetchAllCourts } from "../../services/courts";
import { countLaddersUsingCourt } from "../../services/ladders";
import { Court } from "../../types/ladder";

type CourtFilterTab = "all" | "unverified" | "verified";

function Courts() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CourtFilterTab>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [courtBeingEdited, setCourtBeingEdited] = useState<Court | null>(null);
  const [courtPendingDelete, setCourtPendingDelete] = useState<Court | null>(
    null,
  );
  const [referencingLadderCount, setReferencingLadderCount] = useState<
    number | null
  >(null);
  const [deleteBusy, setDeleteBusy] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const requestDeleteCourt = useCallback((court: Court) => {
    setCourtPendingDelete(court);
    setDeleteError(null);
    setReferencingLadderCount(null);
    countLaddersUsingCourt({ courtId: court.courtId })
      .then((count) => setReferencingLadderCount(count))
      .catch((countError) => {
        console.error("Failed to count ladders using court", countError);
        setReferencingLadderCount(null);
      });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!courtPendingDelete) {
      return;
    }
    const target = courtPendingDelete;

    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteCourt({ courtId: target.courtId });
      setCourts((previous) =>
        previous.filter((existing) => existing.courtId !== target.courtId),
      );
      setCourtPendingDelete(null);
    } catch (deleteFailure) {
      console.error("Failed to delete court", deleteFailure);
      setDeleteError("Could not delete this court. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  }, [courtPendingDelete]);

  const deleteMessage = useMemo(() => {
    const courtName = courtPendingDelete?.courtName ?? "this court";
    const base = `Delete "${courtName}"? This permanently removes the court and cannot be undone.`;
    if (referencingLadderCount && referencingLadderCount > 0) {
      const ladderWord = referencingLadderCount === 1 ? "ladder" : "ladders";
      return `${base} It is currently used by ${referencingLadderCount} ${ladderWord}, which will be left referencing a court that no longer exists.`;
    }
    return base;
  }, [courtPendingDelete, referencingLadderCount]);

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
            <TableActionButton
              type="button"
              aria-label={`Edit ${court.courtName}`}
              title="Edit court"
              onClick={() => setCourtBeingEdited(court)}
            >
              <FaPencilAlt aria-hidden />
            </TableActionButton>
            <DeleteActionButton
              type="button"
              aria-label={`Delete ${court.courtName}`}
              title="Delete court"
              onClick={() => requestDeleteCourt(court)}
            >
              <FaTrashAlt aria-hidden />
            </DeleteActionButton>
          </ActionCell>
        ),
      },
    ],
    [requestDeleteCourt],
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

      {courtPendingDelete ? (
        <ConfirmDialog
          title="Delete court"
          message={deleteMessage}
          confirmLabel="Delete court"
          destructive
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setCourtPendingDelete(null)}
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
  justifyContent: "flex-end",
  gap: "6px",
});

const TableActionButton = styled.button({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  fontSize: "0.82rem",
  cursor: "pointer",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "none",
  color: "#c7d4e1",
  transition: "background-color 0.2s, color 0.2s",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
  },
});

const DeleteActionButton = styled.button({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  fontSize: "0.82rem",
  cursor: "pointer",
  border: "1px solid rgba(224, 85, 85, 0.45)",
  background: "none",
  color: "#ff8f8f",
  transition: "background-color 0.2s, color 0.2s",
  ":hover": {
    backgroundColor: "rgba(224, 85, 85, 0.16)",
    color: "#ffb3b3",
  },
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
