import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, {
  AdminTableColumn,
} from "../../components/admin/AdminTable";
import StatusPill from "../../components/admin/StatusPill";
import { PrimaryButton } from "../../components/admin/formControls";
import {
  countLadderPreRegistrants,
  fetchLadderPreRegistrations,
} from "../../services/ladderPreRegistrations";
import { getPrizeType } from "courtchamps-shared/helpers";
import { LadderPreRegistration } from "courtchamps-shared/types";
import {
  formatPreRegistrationEntryFee,
  PRE_REGISTRATION_STATUS_STYLES,
} from "../../utils/ladderPreRegistrationDisplay";

interface PreRegistrationRow extends LadderPreRegistration {
  registrantCount: number | null;
}

function LadderPreRegistrationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PreRegistrationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const preRegistrations = await fetchLadderPreRegistrations();
        const counts = await Promise.all(
          preRegistrations.map((preRegistration) =>
            countLadderPreRegistrants(preRegistration.preRegistrationId).catch(
              () => null,
            ),
          ),
        );
        if (isActive) {
          setRows(
            preRegistrations.map((preRegistration, index) => ({
              ...preRegistration,
              registrantCount: counts[index],
            })),
          );
        }
      } catch (fetchError) {
        console.error("Failed to load pre-registrations", fetchError);
        if (isActive) {
          setLoadError(
            "Could not load pre-registrations. Please refresh to try again.",
          );
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const goToNew = useCallback(() => {
    navigate("/admin/pre-registrations/new");
  }, [navigate]);

  const columns = useMemo<AdminTableColumn<PreRegistrationRow>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => <strong>{row.name}</strong>,
      },
      { key: "region", header: "Region", render: (row) => row.region },
      {
        key: "prizeType",
        header: "Prize",
        render: (row) => getPrizeType(row.entryFee),
      },
      {
        key: "entryFee",
        header: "Entry fee",
        render: (row) => formatPreRegistrationEntryFee(row),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const statusStyle = PRE_REGISTRATION_STATUS_STYLES[row.status];
          return (
            <StatusPill tone={statusStyle.tone}>{statusStyle.label}</StatusPill>
          );
        },
      },
      {
        key: "registrants",
        header: "Registrants",
        render: (row) =>
          row.registrantCount === null ? "—" : String(row.registrantCount),
      },
    ],
    [],
  );

  return (
    <AdminLayout title="Pre-registrations">
      <HeaderRow>
        <Subtitle>
          Advertise upcoming ladders in the app and collect players before they
          open.
        </Subtitle>
        <PrimaryButton type="button" onClick={goToNew}>
          New pre-registration
        </PrimaryButton>
      </HeaderRow>

      {loadError ? <LoadError>{loadError}</LoadError> : null}

      {loading ? (
        <LoadingText>Loading pre-registrations…</LoadingText>
      ) : (
        <AdminTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.preRegistrationId}
          onRowClick={(row) =>
            navigate(`/admin/pre-registrations/${row.preRegistrationId}`)
          }
          emptyState={
            <>
              <EmptyTitle>No pre-registrations yet</EmptyTitle>
              <EmptyText>
                Create one to start collecting players for a ladder.
              </EmptyText>
              <PrimaryButton type="button" onClick={goToNew}>
                New pre-registration
              </PrimaryButton>
            </>
          }
        />
      )}
    </AdminLayout>
  );
}

export default LadderPreRegistrationList;

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
