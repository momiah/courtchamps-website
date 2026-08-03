import React, { memo, useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import { useAuth } from "../../context/AuthContext";
import { createCourt, updateCourt } from "../../services/courts";
import { Court } from "../../types/ladder";
import { COUNTRY_OPTIONS, findCountryName } from "../../utils/countries";
import FormField from "./FormField";
import Modal from "./Modal";
import { PrimaryButton, SelectInput, TextInput } from "./formControls";

interface CourtFormState {
  courtName: string;
  countryCode: string;
  city: string;
  postCode: string;
  address: string;
}

const buildInitialForm = (court: Court | undefined): CourtFormState => ({
  courtName: court?.courtName ?? "",
  countryCode: court?.location.countryCode ?? "",
  city: court?.location.city ?? "",
  postCode: court?.location.postCode ?? "",
  address: court?.location.address ?? "",
});

function AddCourtModal({
  onClose,
  onSaved,
  court,
}: {
  onClose: () => void;
  onSaved: (court: Court) => void;
  court?: Court;
}) {
  const { currentUser } = useAuth();
  const isEditMode = court !== undefined;
  const [formState, setFormState] = useState<CourtFormState>(() =>
    buildInitialForm(court),
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = useCallback(
    (field: keyof CourtFormState, value: string) => {
      setFormState((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const isComplete = useMemo(
    () =>
      formState.courtName.trim().length > 0 &&
      formState.countryCode.trim().length > 0 &&
      formState.city.trim().length > 0 &&
      formState.postCode.trim().length > 0 &&
      formState.address.trim().length > 0,
    [formState],
  );

  const handleSubmit = useCallback(
    async (submitEvent: React.FormEvent<HTMLFormElement>) => {
      submitEvent.preventDefault();
      if (!isComplete || submitting) {
        return;
      }

      const actorUserId = currentUser?.uid;
      if (!actorUserId) {
        setErrorMessage("You must be signed in to save a court.");
        return;
      }

      setSubmitting(true);
      setErrorMessage(null);

      const courtInput = {
        courtName: formState.courtName.trim(),
        location: {
          country: findCountryName(formState.countryCode),
          countryCode: formState.countryCode,
          city: formState.city.trim(),
          postCode: formState.postCode.trim(),
          address: formState.address.trim(),
        },
      };

      try {
        if (court) {
          await updateCourt({
            courtId: court.courtId,
            court: courtInput,
            actorUserId,
          });
          onSaved({
            ...court,
            courtName: courtInput.courtName,
            location: courtInput.location,
          });
        } else {
          const createdCourt = await createCourt({
            actorUserId,
            court: courtInput,
          });
          onSaved(createdCourt);
        }
      } catch (saveError) {
        console.error("Failed to save court", saveError);
        setErrorMessage("Could not save the court. Please try again.");
        setSubmitting(false);
      }
    },
    [court, currentUser, formState, isComplete, onSaved, submitting],
  );

  return (
    <Modal title={isEditMode ? "Edit court" : "Add court"} onClose={onClose} width={520}>
      <GuidanceNote>
        Court details help other players find the location, so please make sure
        they are correct.
      </GuidanceNote>

      <Form onSubmit={handleSubmit}>
        <FormField label="Court name" htmlFor="court-name">
          <TextInput
            id="court-name"
            type="text"
            value={formState.courtName}
            onChange={(changeEvent) =>
              updateField("courtName", changeEvent.target.value)
            }
          />
        </FormField>

        <FormField label="Country" htmlFor="court-country">
          <SelectInput
            id="court-country"
            value={formState.countryCode}
            onChange={(changeEvent) =>
              updateField("countryCode", changeEvent.target.value)
            }
          >
            <option value="">Select a country</option>
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="City" htmlFor="court-city">
          <TextInput
            id="court-city"
            type="text"
            value={formState.city}
            onChange={(changeEvent) =>
              updateField("city", changeEvent.target.value)
            }
          />
        </FormField>

        <FormField label="Post code" htmlFor="court-postcode">
          <TextInput
            id="court-postcode"
            type="text"
            value={formState.postCode}
            onChange={(changeEvent) =>
              updateField("postCode", changeEvent.target.value)
            }
          />
        </FormField>

        <FormField label="Address" htmlFor="court-address">
          <TextInput
            id="court-address"
            type="text"
            value={formState.address}
            onChange={(changeEvent) =>
              updateField("address", changeEvent.target.value)
            }
          />
        </FormField>

        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}

        <SubmitRow>
          <PrimaryButton type="submit" disabled={!isComplete || submitting}>
            {submitting
              ? "Saving…"
              : isEditMode
                ? "Save changes"
                : "Add court"}
          </PrimaryButton>
        </SubmitRow>
      </Form>
    </Modal>
  );
}

export default memo(AddCourtModal);

const GuidanceNote = styled.p({
  margin: "0 0 20px",
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(0, 153, 240, 0.1)",
  border: "1px solid rgba(0, 153, 240, 0.3)",
  color: "#c7d4e1",
  fontSize: "0.83rem",
  lineHeight: 1.5,
});

const Form = styled.form({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

const ErrorText = styled.span({
  color: "#ff7a7a",
  fontSize: "0.85rem",
});

const SubmitRow = styled.div({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "4px",
});
