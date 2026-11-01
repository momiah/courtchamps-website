import React, { useCallback, useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import LadderActivity from "../../components/admin/LadderActivity";
import LadderForm from "../../components/admin/LadderForm";
import { useAuth } from "../../context/AuthContext";
import { uploadLadderImage } from "../../services/ladderImages";
import {
  createLadder,
  fetchLadder,
  updateLadder,
} from "../../services/ladders";
import { fetchLadderPreRegistration } from "../../services/ladderPreRegistrations";
import {
  Ladder,
  LadderInput,
  LADDER_PRE_REGISTRATION_STATUS,
  LadderPreRegistration,
} from "courtchamps-shared/types";
import { isLadderLocked } from "../../utils/ladderActivity";

function LadderEdit() {
  const { ladderId } = useParams<{ ladderId: string }>();
  const [searchParams] = useSearchParams();
  const preRegistrationId = ladderId
    ? null
    : searchParams.get("preRegistrationId");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isEditMode = Boolean(ladderId);

  const [initialLadder, setInitialLadder] = useState<Ladder | null>(null);
  const [preRegistration, setPreRegistration] =
    useState<LadderPreRegistration | null>(null);
  const [loading, setLoading] = useState<boolean>(
    isEditMode || Boolean(preRegistrationId),
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!preRegistrationId) return;

    let isActive = true;
    fetchLadderPreRegistration(preRegistrationId)
      .then((loaded) => {
        if (!isActive) return;
        if (!loaded) {
          setLoadError("This pre-registration could not be found.");
        } else if (loaded.status === LADDER_PRE_REGISTRATION_STATUS.LAUNCHED) {
          setLoadError("This pre-registration already has a ladder.");
        } else {
          setPreRegistration(loaded);
        }
      })
      .catch((fetchError) => {
        console.error("Failed to load pre-registration", fetchError);
        if (isActive) {
          setLoadError(
            "Could not load the pre-registration. Please try again.",
          );
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [preRegistrationId]);

  useEffect(() => {
    if (!ladderId) {
      if (!preRegistrationId) setLoading(false);
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
  }, [ladderId, preRegistrationId]);

  const handleSubmit = useCallback(
    async (
      input: LadderInput,
      { imageFile }: { imageFile: File | null },
    ): Promise<void> => {
      if (initialLadder && isLadderLocked(initialLadder)) {
        setSubmitError("This ladder has started and can no longer be edited.");
        return;
      }

      const actorUserId = currentUser?.uid;
      if (!actorUserId) {
        setSubmitError("You must be signed in to save a ladder.");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        const inputToSave: LadderInput = imageFile
          ? { ...input, image: await uploadLadderImage({ file: imageFile }) }
          : input;

        if (ladderId && initialLadder) {
          const registrationOpensChanged =
            inputToSave.registrationOpensAt.getTime() !==
            initialLadder.registrationOpensAt.getTime();
          await updateLadder({
            ladderId,
            input: inputToSave,
            actorUserId,
            registrationOpensChanged,
          });
        } else {
          await createLadder({
            input: inputToSave,
            actorUserId,
            preRegistrationId: preRegistration?.preRegistrationId ?? null,
          });
        }
        navigate("/admin/ladders", {
          state: { saved: ladderId ? "Ladder saved" : "Ladder created" },
        });
      } catch (saveError) {
        console.error("Failed to save ladder", saveError);
        setSubmitError("Could not save the ladder. Please try again.");
        setSubmitting(false);
      }
    },
    [currentUser, initialLadder, ladderId, navigate, preRegistration],
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
      ) : !isEditMode && !preRegistration ? (
        <LoadError>
          Ladders are created from a pre-registration.{" "}
          <Link to="/admin/pre-registrations">Go to pre-registrations</Link>
        </LoadError>
      ) : (
        <>
          {submitError ? <SubmitError>{submitError}</SubmitError> : null}
          {initialLadder && isLadderLocked(initialLadder) ? (
            <LadderActivity ladder={initialLadder} />
          ) : null}
          <LadderForm
            initialLadder={initialLadder}
            prefill={preRegistration}
            onSubmit={handleSubmit}
            submitting={submitting}
            locked={!!initialLadder && isLadderLocked(initialLadder)}
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
});
