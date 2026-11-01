import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";

import AdminLayout from "../../components/admin/AdminLayout";
import CityInput from "../../components/admin/CityInput";
import {
  MIXED_SINGLES_ERROR,
  genderOptionsFor,
  isGenderAllowed,
} from "../../utils/ladderGender";
import FormField from "../../components/admin/FormField";
import StatusPill from "../../components/admin/StatusPill";
import {
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "../../components/admin/formControls";
import { useAuth } from "../../context/AuthContext";
import {
  countLadderPreRegistrants,
  createLadderPreRegistration,
  fetchLadderPreRegistrants,
  fetchLadderPreRegistration,
  LadderPreRegistrationInput,
  setLadderPreRegistrationOpen,
  updateLadderPreRegistration,
} from "../../services/ladderPreRegistrations";
import { COUNTRY_OPTIONS } from "../../utils/countries";
import {
  buildRegistrantsCsv,
  PRE_REGISTRATION_STATUS_STYLES,
} from "../../utils/ladderPreRegistrationDisplay";
import { LADDER_PLAYOFF_SIZES, getPrizeType } from "courtchamps-shared/helpers";
import { currencyTypes } from "courtchamps-shared/schema";
import {
  GENDER_TYPE,
  LADDER_PRE_REGISTRATION_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import type {
  GenderType,
  LadderPreRegistration,
  LadderType,
} from "courtchamps-shared/types";

interface FormState {
  name: string;
  description: string;
  region: string;
  city: string;
  countryCode: string;
  ladderType: LadderType;
  genderType: GenderType;
  entryFee: string;
  currencyType: string;
  maxPlayers: string;
  expectedOpensAt: string;
}

const toFormState = (
  preRegistration: LadderPreRegistration | null,
): FormState => ({
  name: preRegistration?.name ?? "",
  description: preRegistration?.description ?? "",
  region: preRegistration?.region ?? "",
  city: preRegistration?.city ?? "",
  countryCode: preRegistration?.countryCode ?? "GB",
  ladderType: preRegistration?.ladderType ?? LADDER_TYPE.SINGLES,
  genderType: preRegistration?.genderType ?? GENDER_TYPE.MENS,
  entryFee: preRegistration ? String(preRegistration.entryFee) : "0",
  currencyType: preRegistration?.currencyType ?? "GBP",
  maxPlayers: String(preRegistration?.maxPlayers ?? 2048),
  expectedOpensAt: preRegistration?.expectedOpensAt
    ? format(preRegistration.expectedOpensAt, "yyyy-MM-dd")
    : "",
});

const toInput = (
  state: FormState,
  image: string,
): LadderPreRegistrationInput => ({
  name: state.name.trim(),
  description: state.description.trim(),
  image,
  region: state.region.trim(),
  city: state.city.trim(),
  countryCode: state.countryCode,
  ladderType: state.ladderType,
  genderType: state.genderType,
  entryFee: Number(state.entryFee),
  currencyType: state.currencyType,
  maxPlayers: Number(state.maxPlayers),
  expectedOpensAt: state.expectedOpensAt
    ? new Date(`${state.expectedOpensAt}T00:00:00`)
    : null,
});

const validate = (state: FormState): string | null => {
  if (!state.name.trim()) return "Give the pre-registration a name.";
  if (!state.region.trim()) return "Add the region the ladder is for.";
  if (!state.city.trim()) return "Add the city the ladder is in.";
  if (!isGenderAllowed(state.ladderType, state.genderType)) {
    return MIXED_SINGLES_ERROR;
  }
  const entryFee = Number(state.entryFee);
  if (!Number.isFinite(entryFee) || entryFee < 0) {
    return "Entry fee must be 0 or more.";
  }
  return null;
};

const downloadCsv = (fileName: string, csv: string): void => {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

function LadderPreRegistrationEdit() {
  const { preRegistrationId } = useParams<{ preRegistrationId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEditMode = Boolean(preRegistrationId);

  const [preRegistration, setPreRegistration] =
    useState<LadderPreRegistration | null>(null);
  const [form, setForm] = useState<FormState>(toFormState(null));
  const [registrantCount, setRegistrantCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    if (!preRegistrationId) return;
    setLoading(true);
    setError(null);
    try {
      const loaded = await fetchLadderPreRegistration(preRegistrationId);
      if (!loaded) {
        setError("This pre-registration could not be found.");
        return;
      }
      setPreRegistration(loaded);
      setForm(toFormState(loaded));
      setRegistrantCount(
        await countLadderPreRegistrants(preRegistrationId).catch(() => null),
      );
    } catch (loadError) {
      console.error("Failed to load pre-registration", loadError);
      setError("Could not load this pre-registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [preRegistrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const launched =
    preRegistration?.status === LADDER_PRE_REGISTRATION_STATUS.LAUNCHED;
  const hasChanges =
    !isEditMode ||
    JSON.stringify(form) !== JSON.stringify(toFormState(preRegistration));

  const setField = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async (): Promise<void> => {
    const actorUserId = currentUser?.uid;
    if (!actorUserId) {
      setError("You must be signed in to save a pre-registration.");
      return;
    }
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = toInput(form, preRegistration?.image ?? "");
      if (preRegistrationId) {
        await updateLadderPreRegistration({
          preRegistrationId,
          input,
          actorUserId,
        });
        await load();
        navigate(`/admin/pre-registrations/${preRegistrationId}`, {
          replace: true,
          state: { saved: "Pre-registration saved" },
        });
      } else {
        const createdId = await createLadderPreRegistration({
          input,
          actorUserId,
        });
        navigate(`/admin/pre-registrations/${createdId}`, {
          replace: true,
          state: { saved: "Pre-registration created" },
        });
      }
    } catch (saveError) {
      console.error("Failed to save pre-registration", saveError);
      setError("Could not save the pre-registration. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOpen = async (): Promise<void> => {
    const actorUserId = currentUser?.uid;
    if (!preRegistrationId || !preRegistration || !actorUserId) return;
    setBusy(true);
    setError(null);
    try {
      const open =
        preRegistration.status !== LADDER_PRE_REGISTRATION_STATUS.OPEN;
      await setLadderPreRegistrationOpen({
        preRegistrationId,
        open,
        actorUserId,
      });
      await load();
      navigate(`/admin/pre-registrations/${preRegistrationId}`, {
        replace: true,
        state: {
          saved: open ? "Pre-registration opened" : "Pre-registration closed",
        },
      });
    } catch (toggleError) {
      console.error("Failed to change pre-registration status", toggleError);
      setError("Could not change the status. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (!preRegistrationId || !preRegistration) return;
    setBusy(true);
    setError(null);
    try {
      const registrants = await fetchLadderPreRegistrants(preRegistrationId);
      downloadCsv(
        `${preRegistration.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-registrants.csv`,
        buildRegistrantsCsv(registrants),
      );
    } catch (exportError) {
      console.error("Failed to export registrants", exportError);
      setError("Could not export the registrants. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const statusStyle = preRegistration
    ? PRE_REGISTRATION_STATUS_STYLES[preRegistration.status]
    : null;

  return (
    <AdminLayout
      title={isEditMode ? "Edit pre-registration" : "New pre-registration"}
    >
      {loading ? (
        <Muted>Loading pre-registration…</Muted>
      ) : (
        <>
          {error ? <ErrorBox>{error}</ErrorBox> : null}

          {preRegistration && statusStyle ? (
            <Panel>
              <PanelRow>
                <StatusPill tone={statusStyle.tone}>
                  {statusStyle.label}
                </StatusPill>
                <Muted>
                  {getPrizeType(preRegistration.entryFee)} ·{" "}
                  {registrantCount === null
                    ? "Registrants unavailable"
                    : `${registrantCount} registrant${registrantCount === 1 ? "" : "s"}`}
                </Muted>
              </PanelRow>
              {launched ? (
                <Muted>
                  Launched as{" "}
                  <Link to={`/admin/ladders/${preRegistration.ladderId}`}>
                    this ladder
                  </Link>
                  .{" "}
                  {preRegistration.notifiedAt
                    ? `Registrants were notified on ${format(preRegistration.notifiedAt, "EEE d MMM yyyy")}.`
                    : "Registrants are notified when the ladder's registration opens."}
                </Muted>
              ) : null}
              <ActionRow>
                {!launched ? (
                  <>
                    <PrimaryButton
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        navigate(
                          `/admin/ladders/new?preRegistrationId=${preRegistration.preRegistrationId}`,
                        )
                      }
                    >
                      Create ladder from this
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      disabled={busy}
                      onClick={handleToggleOpen}
                    >
                      {preRegistration.status ===
                      LADDER_PRE_REGISTRATION_STATUS.OPEN
                        ? "Hide from app"
                        : "Show in app"}
                    </SecondaryButton>
                  </>
                ) : null}
                <SecondaryButton
                  type="button"
                  disabled={busy || !registrantCount}
                  onClick={handleExport}
                >
                  Export registrants (CSV)
                </SecondaryButton>
              </ActionRow>
            </Panel>
          ) : null}

          <Panel>
            <FormField label="Name" htmlFor="pre-registration-name">
              <TextInput
                id="pre-registration-name"
                value={form.name}
                disabled={launched}
                onChange={(event) => setField("name", event.target.value)}
              />
            </FormField>
            <FormField
              label="Description"
              htmlFor="pre-registration-description"
              hint="Shown on the ladder's card and sign-up screen in the app."
            >
              <TextArea
                id="pre-registration-description"
                rows={3}
                value={form.description}
                disabled={launched}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
              />
            </FormField>
            <Grid>
              <FormField label="Region" htmlFor="pre-registration-region">
                <TextInput
                  id="pre-registration-region"
                  value={form.region}
                  disabled={launched}
                  onChange={(event) => setField("region", event.target.value)}
                />
              </FormField>
              <FormField label="Country" htmlFor="pre-registration-country">
                <SelectInput
                  id="pre-registration-country"
                  value={form.countryCode}
                  disabled={launched}
                  onChange={(event) =>
                    setField("countryCode", event.target.value)
                  }
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="City"
                htmlFor="pre-registration-city"
                hint="Shown on ladder cards with the country code, e.g. London, GB."
              >
                <CityInput
                  id="pre-registration-city"
                  countryCode={form.countryCode}
                  value={form.city}
                  disabled={launched}
                  onChange={(event) => setField("city", event.target.value)}
                />
              </FormField>
              <FormField label="Type" htmlFor="pre-registration-type">
                <SelectInput
                  id="pre-registration-type"
                  value={form.ladderType}
                  disabled={launched}
                  onChange={(event) =>
                    setField("ladderType", event.target.value as LadderType)
                  }
                >
                  {Object.values(LADDER_TYPE).map((ladderType) => (
                    <option key={ladderType} value={ladderType}>
                      {ladderType}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label="Gender" htmlFor="pre-registration-gender">
                <SelectInput
                  id="pre-registration-gender"
                  value={form.genderType}
                  disabled={launched}
                  onChange={(event) =>
                    setField("genderType", event.target.value as GenderType)
                  }
                >
                  {isGenderAllowed(form.ladderType, form.genderType) ? null : (
                    <option value={form.genderType} disabled hidden>
                      Choose Mens or Womens
                    </option>
                  )}
                  {genderOptionsFor(form.ladderType).map((genderType) => (
                    <option key={genderType} value={genderType}>
                      {genderType}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Entry fee"
                htmlFor="pre-registration-entry-fee"
                hint="0 makes it a Community Ladder; anything more is a Cash Ladder."
              >
                <TextInput
                  id="pre-registration-entry-fee"
                  type="number"
                  min={0}
                  value={form.entryFee}
                  disabled={launched}
                  onChange={(event) => setField("entryFee", event.target.value)}
                />
              </FormField>
              <FormField label="Currency" htmlFor="pre-registration-currency">
                <SelectInput
                  id="pre-registration-currency"
                  value={form.currencyType}
                  disabled={launched}
                  onChange={(event) =>
                    setField("currencyType", event.target.value)
                  }
                >
                  {currencyTypes.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Max players"
                htmlFor="pre-registration-max-players"
              >
                <SelectInput
                  id="pre-registration-max-players"
                  value={form.maxPlayers}
                  disabled={launched}
                  onChange={(event) =>
                    setField("maxPlayers", event.target.value)
                  }
                >
                  {LADDER_PLAYOFF_SIZES.map((size) => (
                    <option key={size} value={String(size)}>
                      {size.toLocaleString()}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Expected to open"
                htmlFor="pre-registration-expected"
                hint="Optional."
              >
                <TextInput
                  id="pre-registration-expected"
                  type="date"
                  value={form.expectedOpensAt}
                  disabled={launched}
                  onChange={(event) =>
                    setField("expectedOpensAt", event.target.value)
                  }
                />
              </FormField>
            </Grid>
            {!launched ? (
              <ActionRow>
                <PrimaryButton
                  type="button"
                  disabled={busy || !hasChanges}
                  onClick={handleSave}
                >
                  {isEditMode ? "Save changes" : "Create pre-registration"}
                </PrimaryButton>
              </ActionRow>
            ) : (
              <Muted>
                This pre-registration has launched, so its details live on the
                ladder now.
              </Muted>
            )}
          </Panel>
        </>
      )}
    </AdminLayout>
  );
}

export default LadderPreRegistrationEdit;

const Panel = styled.section({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px",
  marginBottom: "24px",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
});

const PanelRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
});

const ActionRow = styled.div({
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
});

const Grid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "16px",
});

const Muted = styled.div({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});

const ErrorBox = styled.div({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 122, 122, 0.12)",
  border: "1px solid rgba(255, 122, 122, 0.4)",
  color: "#ff9a9a",
  fontSize: "0.85rem",
  marginBottom: "16px",
});
