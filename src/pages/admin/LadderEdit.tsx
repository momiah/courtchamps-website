import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import LadderForm from "../../components/admin/LadderForm";
import { useAuth } from "../../context/AuthContext";
import {
  createLadder,
  fetchLadder,
  updateLadder,
} from "../../services/ladders";
import { Ladder, LadderInput } from "../../types/ladder";

function LadderEdit() {
  const { ladderId } = useParams<{ ladderId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isEditMode = Boolean(ladderId);

  const [initialLadder, setInitialLadder] = useState<Ladder | null>(null);
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!ladderId) {
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadLadder = async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const loadedLadder = await fetchLadder({ ladderId });
        if (!isActive) {
          return;
        }
        if (!loadedLadder) {
          setLoadError("This ladder could not be found.");
        } else {
          setInitialLadder(loadedLadder);
        }
      } catch (fetchError) {
        console.error("Failed to load ladder", fetchError);
        if (isActive) {
          setLoadError("Could not load this ladder. Please try again.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadLadder();

    return () => {
      isActive = false;
    };
  }, [ladderId]);

  const handleSubmit = useCallback(
    async (input: LadderInput): Promise<void> => {
      const actorUserId = currentUser?.uid;
      if (!actorUserId) {
        setSubmitError("You must be signed in to save a ladder.");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        if (ladderId && initialLadder) {
          const seasonStartChanged =
            input.seasonStartsAt.getTime() !==
            initialLadder.seasonStartsAt.getTime();
          await updateLadder({
            ladderId,
            input,
            actorUserId,
            seasonStartChanged,
          });
        } else {
          await createLadder({ input, actorUserId });
        }
        navigate("/admin/ladders");
      } catch (saveError) {
        console.error("Failed to save ladder", saveError);
        setSubmitError("Could not save the ladder. Please try again.");
        setSubmitting(false);
      }
    },
    [currentUser, initialLadder, ladderId, navigate],
  );

  const pageTitle = isEditMode ? "Edit ladder" : "New ladder";

  return (
    <AdminLayout title={pageTitle}>
      {loading ? (
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      ) : loadError ? (
        <LoadError>{loadError}</LoadError>
      ) : (
        <>
          {submitError ? <SubmitError>{submitError}</SubmitError> : null}
          <LadderForm
            initialLadder={initialLadder}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </>
      )}
    </AdminLayout>
  );
}

export default LadderEdit;

const LoadingContainer = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "80px 0",
});

const Spinner = styled.div({
  width: "40px",
  height: "40px",
  border: "4px solid rgba(0, 153, 240, 0.25)",
  borderTop: "4px solid #0099f0",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  "@keyframes spin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
});

const LoadError = styled.div({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 122, 122, 0.12)",
  border: "1px solid rgba(255, 122, 122, 0.4)",
  color: "#ff9a9a",
  fontSize: "0.9rem",
});

const SubmitError = styled.div({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 122, 122, 0.12)",
  border: "1px solid rgba(255, 122, 122, 0.4)",
  color: "#ff9a9a",
  fontSize: "0.85rem",
  marginBottom: "20px",
  maxWidth: "720px",
});
