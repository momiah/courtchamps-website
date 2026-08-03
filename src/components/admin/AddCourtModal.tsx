import React, { memo, useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import { useAuth } from "../../context/AuthContext";
import { createCourt, updateCourt } from "../../services/courts";
import {
  buildAddressQuery,
  geocodeFirstMatch,
} from "../../services/geocode";
import { Court } from "../../types/ladder";
import { COUNTRY_OPTIONS, findCountryName } from "../../utils/countries";
import FormField from "./FormField";
import LocationPreviewMap from "./LocationPreviewMap";
import Modal from "./Modal";
import {
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextInput,
} from "./formControls";

interface CourtFormState {
  courtName: string;
  countryCode: string;
  city: string;
  postCode: string;
  address: string;
  latitude: string;
  longitude: string;
}

const buildInitialForm = (court: Court | undefined): CourtFormState => ({
  courtName: court?.courtName ?? "",
  countryCode: court?.location.countryCode ?? "",
  city: court?.location.city ?? "",
  postCode: court?.location.postCode ?? "",
  address: court?.location.address ?? "",
  latitude:
    typeof court?.location.latitude === "number"
      ? String(court.location.latitude)
      : "",
  longitude:
    typeof court?.location.longitude === "number"
      ? String(court.location.longitude)
      : "",
});

const parseCoordinate = (
  value: string,
  bound: number,
): number | null => {
  if (value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < -bound || parsed > bound) {
    return null;
  }
  return parsed;
};

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
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const updateField = useCallback(
    (field: keyof CourtFormState, value: string) => {
      setFormState((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const parsedCoordinates = useMemo(() => {
    const latitude = parseCoordinate(formState.latitude, 90);
    const longitude = parseCoordinate(formState.longitude, 180);
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  }, [formState.latitude, formState.longitude]);

  const isComplete = useMemo(
    () =>
      formState.courtName.trim().length > 0 &&
      formState.countryCode.trim().length > 0 &&
      formState.city.trim().length > 0 &&
      formState.postCode.trim().length > 0 &&
      formState.address.trim().length > 0 &&
      parsedCoordinates !== null,
    [formState, parsedCoordinates],
  );

  const handleLookup = useCallback(async () => {
    const country = findCountryName(formState.countryCode);
    const candidateQueries = [
      buildAddressQuery({
        address: formState.address,
        city: formState.city,
        postCode: formState.postCode,
        country,
      }),
      buildAddressQuery({
        address: formState.address,
        city: formState.city,
        postCode: "",
        country,
      }),
      buildAddressQuery({
        address: "",
        city: formState.city,
        postCode: formState.postCode,
        country,
      }),
      buildAddressQuery({
        address: "",
        city: formState.city,
        postCode: "",
        country,
      }),
    ];

    if (candidateQueries.every((candidate) => candidate.trim().length === 0)) {
      setLookupMessage("Enter the address details first.");
      return;
    }

    setIsLookingUp(true);
    setLookupMessage(null);

    const point = await geocodeFirstMatch(
      candidateQueries,
      formState.countryCode,
    );
    setIsLookingUp(false);

    if (!point) {
      setLookupMessage(
        "Couldn't find that location. Check the address or enter coordinates manually.",
      );
      return;
    }

    setFormState((previous) => ({
      ...previous,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
    }));
    setLookupMessage(
      "Location found and pinned below. Adjust the coordinates if the pin is off.",
    );
  }, [
    formState.address,
    formState.city,
    formState.postCode,
    formState.countryCode,
  ]);

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

      if (!parsedCoordinates) {
        setErrorMessage("Add a valid latitude and longitude for the court.");
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
          latitude: parsedCoordinates.latitude,
          longitude: parsedCoordinates.longitude,
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
    [
      court,
      currentUser,
      formState,
      isComplete,
      onSaved,
      parsedCoordinates,
      submitting,
    ],
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

        <CoordinatesHeader>
          <CoordinatesTitle>Location coordinates</CoordinatesTitle>
          <SecondaryButton
            type="button"
            onClick={() => void handleLookup()}
            disabled={isLookingUp}
          >
            {isLookingUp ? "Looking up…" : "Look up from address"}
          </SecondaryButton>
        </CoordinatesHeader>

        <CoordinatesRow>
          <FormField label="Latitude" htmlFor="court-latitude">
            <TextInput
              id="court-latitude"
              type="number"
              step="any"
              placeholder="51.5074"
              value={formState.latitude}
              onChange={(changeEvent) =>
                updateField("latitude", changeEvent.target.value)
              }
            />
          </FormField>
          <FormField label="Longitude" htmlFor="court-longitude">
            <TextInput
              id="court-longitude"
              type="number"
              step="any"
              placeholder="-0.1278"
              value={formState.longitude}
              onChange={(changeEvent) =>
                updateField("longitude", changeEvent.target.value)
              }
            />
          </FormField>
        </CoordinatesRow>

        {lookupMessage ? <LookupNote>{lookupMessage}</LookupNote> : null}

        {parsedCoordinates ? (
          <LocationPreviewMap
            latitude={parsedCoordinates.latitude}
            longitude={parsedCoordinates.longitude}
          />
        ) : null}

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

const CoordinatesHeader = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "4px",
});

const CoordinatesTitle = styled.span({
  color: "#c7d4e1",
  fontSize: "0.85rem",
  fontWeight: 600,
});

const CoordinatesRow = styled.div({
  display: "flex",
  gap: "12px",
  "@media (max-width: 480px)": {
    flexDirection: "column",
  },
});

const LookupNote = styled.span({
  color: "#8fa3b8",
  fontSize: "0.78rem",
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
