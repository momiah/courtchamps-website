import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { format } from "date-fns";

import { fetchAllCourts } from "../../services/courts";
import { fetchLadders } from "../../services/ladders";
import { Court, Ladder, LadderInput } from "../../types/ladder";
import { COUNTRY_OPTIONS } from "../../utils/countries";
import { deriveLadderDates } from "../../utils/ladderDates";
import AddCourtModal from "./AddCourtModal";
import FormField from "./FormField";
import MultiSelect, { MultiSelectOption } from "./MultiSelect";
import {
  PrimaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "./formControls";

const CURRENCY_OPTIONS = ["GBP", "USD", "EUR"] as const;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const REGION_DATALIST_ID = "ladder-region-options";

interface LadderFormState {
  name: string;
  description: string;
  image: string;
  region: string;
  countryCode: string;
  courtIds: string[];
  registrationOpensAt: string;
  seasonStartsAt: string;
  entryFee: string;
  currencyType: string;
  minRank: string;
  maxPlayers: string;
}

type LadderFormErrors = Partial<Record<keyof LadderFormState, string>>;

const toDateInputValue = (date: Date): string => {
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "";
  }
  return format(date, "yyyy-MM-dd");
};

const parseDateInputValue = (value: string): Date | null => {
  if (value.trim().length === 0) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildInitialState = (
  initialLadder: Ladder | null | undefined,
): LadderFormState => ({
  name: initialLadder?.name ?? "",
  description: initialLadder?.description ?? "",
  image: initialLadder?.image ?? "",
  region: initialLadder?.region ?? "",
  countryCode: initialLadder?.countryCode ?? "",
  courtIds: initialLadder?.courtIds ?? [],
  registrationOpensAt: initialLadder
    ? toDateInputValue(initialLadder.registrationOpensAt)
    : "",
  seasonStartsAt: initialLadder
    ? toDateInputValue(initialLadder.seasonStartsAt)
    : "",
  entryFee: initialLadder ? String(initialLadder.entryFee) : "0",
  currencyType: initialLadder?.currencyType ?? "GBP",
  minRank: initialLadder ? String(initialLadder.minRank) : "0",
  maxPlayers: initialLadder ? String(initialLadder.maxPlayers) : "",
});

const formatPreviewDate = (date: Date): string => format(date, "d MMM yyyy");

function LadderForm({
  initialLadder,
  onSubmit,
  submitting,
}: {
  initialLadder?: Ladder | null;
  onSubmit: (input: LadderInput) => void;
  submitting: boolean;
}) {
  const [formState, setFormState] = useState<LadderFormState>(() =>
    buildInitialState(initialLadder),
  );
  const [courts, setCourts] = useState<Court[]>([]);
  const [existingRegions, setExistingRegions] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isActive = true;

    const loadReferenceData = async (): Promise<void> => {
      try {
        const [loadedCourts, loadedLadders] = await Promise.all([
          fetchAllCourts(),
          fetchLadders(),
        ]);
        if (!isActive) {
          return;
        }
        setCourts(loadedCourts);
        const distinctRegions = Array.from(
          new Set(
            loadedLadders
              .map((ladder) => ladder.region.trim())
              .filter((region) => region.length > 0),
          ),
        ).sort((first, second) => first.localeCompare(second));
        setExistingRegions(distinctRegions);
      } catch (loadError) {
        console.error("Failed to load ladder reference data", loadError);
      }
    };

    void loadReferenceData();

    return () => {
      isActive = false;
    };
  }, []);

  const updateField = useCallback(
    <FieldName extends keyof LadderFormState>(
      field: FieldName,
      value: LadderFormState[FieldName],
    ) => {
      setFormState((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const verifiedCourtOptions = useMemo<MultiSelectOption[]>(
    () =>
      courts
        .filter((court) => court.verified === true)
        .map((court) => ({
          id: court.courtId,
          label: court.courtName,
          sublabel: court.location.city,
        })),
    [courts],
  );

  const derivedDatesPreview = useMemo(() => {
    const seasonStart = parseDateInputValue(formState.seasonStartsAt);
    if (!seasonStart) {
      return null;
    }
    return deriveLadderDates({ seasonStartsAt: seasonStart });
  }, [formState.seasonStartsAt]);

  const errors = useMemo<LadderFormErrors>(() => {
    const nextErrors: LadderFormErrors = {};

    if (formState.name.trim().length === 0) {
      nextErrors.name = "Name is required.";
    }
    if (formState.description.trim().length === 0) {
      nextErrors.description = "Description is required.";
    }
    if (formState.region.trim().length === 0) {
      nextErrors.region = "Region is required.";
    }
    if (!COUNTRY_CODE_PATTERN.test(formState.countryCode)) {
      nextErrors.countryCode = "Select a country.";
    }
    if (formState.courtIds.length === 0) {
      nextErrors.courtIds = "Select at least one court.";
    }

    const registrationOpens = parseDateInputValue(formState.registrationOpensAt);
    const seasonStarts = parseDateInputValue(formState.seasonStartsAt);
    if (!registrationOpens) {
      nextErrors.registrationOpensAt = "Registration opening date is required.";
    }
    if (!seasonStarts) {
      nextErrors.seasonStartsAt = "Season start date is required.";
    }
    if (
      registrationOpens &&
      seasonStarts &&
      registrationOpens.getTime() >= seasonStarts.getTime()
    ) {
      nextErrors.seasonStartsAt =
        "Season start must be after registration opens.";
    }

    const entryFeeValue = Number(formState.entryFee);
    if (
      formState.entryFee.trim().length === 0 ||
      Number.isNaN(entryFeeValue) ||
      entryFeeValue < 0
    ) {
      nextErrors.entryFee = "Entry fee must be 0 or greater.";
    }

    const minRankValue = Number(formState.minRank);
    if (
      formState.minRank.trim().length === 0 ||
      Number.isNaN(minRankValue) ||
      minRankValue < 0
    ) {
      nextErrors.minRank = "Minimum rank must be 0 or greater.";
    }

    const maxPlayersValue = Number(formState.maxPlayers);
    if (
      formState.maxPlayers.trim().length === 0 ||
      Number.isNaN(maxPlayersValue) ||
      maxPlayersValue < 2
    ) {
      nextErrors.maxPlayers = "Maximum players must be 2 or greater.";
    }

    return nextErrors;
  }, [formState]);

  const isEntryFeeZero = useMemo(
    () => Number(formState.entryFee) === 0,
    [formState.entryFee],
  );

  const toggleCourt = useCallback((courtId: string) => {
    setFormState((previous) => {
      const isSelected = previous.courtIds.includes(courtId);
      return {
        ...previous,
        courtIds: isSelected
          ? previous.courtIds.filter((existingId) => existingId !== courtId)
          : [...previous.courtIds, courtId],
      };
    });
  }, []);

  const removeCourt = useCallback((courtId: string) => {
    setFormState((previous) => ({
      ...previous,
      courtIds: previous.courtIds.filter((existingId) => existingId !== courtId),
    }));
  }, []);

  const handleCourtCreated = useCallback((createdCourt: Court) => {
    setCourts((previous) => [...previous, createdCourt]);
    setFormState((previous) => ({
      ...previous,
      courtIds: previous.courtIds.includes(createdCourt.courtId)
        ? previous.courtIds
        : [...previous.courtIds, createdCourt.courtId],
    }));
    setIsCourtModalOpen(false);
  }, []);

  const handleSubmit = useCallback(
    (submitEvent: React.FormEvent<HTMLFormElement>) => {
      submitEvent.preventDefault();
      setShowErrors(true);

      if (Object.keys(errors).length > 0 || submitting) {
        return;
      }

      const registrationOpens = parseDateInputValue(
        formState.registrationOpensAt,
      );
      const seasonStarts = parseDateInputValue(formState.seasonStartsAt);
      if (!registrationOpens || !seasonStarts) {
        return;
      }

      onSubmit({
        name: formState.name.trim(),
        description: formState.description.trim(),
        image: formState.image.trim(),
        region: formState.region.trim(),
        countryCode: formState.countryCode,
        courtIds: formState.courtIds,
        registrationOpensAt: registrationOpens,
        seasonStartsAt: seasonStarts,
        entryFee: Number(formState.entryFee),
        currencyType: formState.currencyType,
        minRank: Number(formState.minRank),
        maxPlayers: Number(formState.maxPlayers),
      });
    },
    [errors, formState, onSubmit, submitting],
  );

  const fieldError = useCallback(
    (field: keyof LadderFormState): string | null =>
      showErrors ? errors[field] ?? null : null,
    [errors, showErrors],
  );

  return (
    <Form onSubmit={handleSubmit}>
      <Section>
        <SectionTitle>Details</SectionTitle>

        <FormField label="Name" htmlFor="ladder-name" error={fieldError("name")}>
          <TextInput
            id="ladder-name"
            type="text"
            value={formState.name}
            onChange={(changeEvent) =>
              updateField("name", changeEvent.target.value)
            }
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="ladder-description"
          error={fieldError("description")}
        >
          <TextArea
            id="ladder-description"
            value={formState.description}
            onChange={(changeEvent) =>
              updateField("description", changeEvent.target.value)
            }
          />
        </FormField>

        <FormField label="Image URL" htmlFor="ladder-image">
          <TextInput
            id="ladder-image"
            type="url"
            placeholder="https://…"
            value={formState.image}
            onChange={(changeEvent) =>
              updateField("image", changeEvent.target.value)
            }
          />
        </FormField>
        {formState.image.trim().length > 0 ? (
          <ImagePreview
            src={formState.image}
            alt="Ladder preview"
            onError={(imageEvent) => {
              imageEvent.currentTarget.style.display = "none";
            }}
            onLoad={(imageEvent) => {
              imageEvent.currentTarget.style.display = "block";
            }}
          />
        ) : null}
      </Section>

      <Section>
        <SectionTitle>Region and courts</SectionTitle>

        <FormField
          label="Region"
          htmlFor="ladder-region"
          hint="e.g. North London"
          error={fieldError("region")}
        >
          <TextInput
            id="ladder-region"
            type="text"
            list={REGION_DATALIST_ID}
            value={formState.region}
            onChange={(changeEvent) =>
              updateField("region", changeEvent.target.value)
            }
          />
          <datalist id={REGION_DATALIST_ID}>
            {existingRegions.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
        </FormField>

        <FormField
          label="Country"
          htmlFor="ladder-country"
          error={fieldError("countryCode")}
        >
          <SelectInput
            id="ladder-country"
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

        <FormField label="Courts" error={fieldError("courtIds")}>
          {verifiedCourtOptions.length === 0 ? (
            <EmptyCourtsState>
              <span>No verified courts yet.</span>
              <Link to="/admin/courts">Manage courts</Link>
            </EmptyCourtsState>
          ) : (
            <MultiSelect
              options={verifiedCourtOptions}
              selectedIds={formState.courtIds}
              onToggle={toggleCourt}
              onRemove={removeCourt}
              searchPlaceholder="Search courts…"
            />
          )}
          <AddCourtInline
            type="button"
            onClick={() => setIsCourtModalOpen(true)}
          >
            + Add a new court
          </AddCourtInline>
        </FormField>
      </Section>

      <Section>
        <SectionTitle>Schedule</SectionTitle>

        <DateRow>
          <FormField
            label="Registration opens"
            htmlFor="ladder-registration-opens"
            error={fieldError("registrationOpensAt")}
          >
            <TextInput
              id="ladder-registration-opens"
              type="date"
              value={formState.registrationOpensAt}
              onChange={(changeEvent) =>
                updateField("registrationOpensAt", changeEvent.target.value)
              }
            />
          </FormField>

          <FormField
            label="Season starts"
            htmlFor="ladder-season-starts"
            error={fieldError("seasonStartsAt")}
          >
            <TextInput
              id="ladder-season-starts"
              type="date"
              value={formState.seasonStartsAt}
              onChange={(changeEvent) =>
                updateField("seasonStartsAt", changeEvent.target.value)
              }
            />
          </FormField>
        </DateRow>

        <DerivedPreview>
          <DerivedTitle>Derived schedule</DerivedTitle>
          {derivedDatesPreview ? (
            <DerivedGrid>
              <DerivedItem>
                <DerivedLabel>Registration closes</DerivedLabel>
                <DerivedValue>
                  {formatPreviewDate(derivedDatesPreview.registrationClosesAt)}
                </DerivedValue>
              </DerivedItem>
              <DerivedItem>
                <DerivedLabel>Season ends</DerivedLabel>
                <DerivedValue>
                  {formatPreviewDate(derivedDatesPreview.seasonEndsAt)}
                </DerivedValue>
              </DerivedItem>
              <DerivedItem>
                <DerivedLabel>Playoffs start</DerivedLabel>
                <DerivedValue>
                  {formatPreviewDate(derivedDatesPreview.playoffStartsAt)}
                </DerivedValue>
              </DerivedItem>
              <DerivedItem>
                <DerivedLabel>Playoffs end</DerivedLabel>
                <DerivedValue>
                  {formatPreviewDate(derivedDatesPreview.playoffEndsAt)}
                </DerivedValue>
              </DerivedItem>
            </DerivedGrid>
          ) : (
            <DerivedEmpty>
              Set a season start date to preview the derived schedule.
            </DerivedEmpty>
          )}
        </DerivedPreview>
      </Section>

      <Section>
        <SectionTitle>Access and fees</SectionTitle>

        <FeeRow>
          <FormField
            label="Entry fee"
            htmlFor="ladder-entry-fee"
            hint="0 means a free ladder"
            error={fieldError("entryFee")}
          >
            <TextInput
              id="ladder-entry-fee"
              type="number"
              min={0}
              value={formState.entryFee}
              onChange={(changeEvent) =>
                updateField("entryFee", changeEvent.target.value)
              }
            />
          </FormField>

          <FormField label="Currency" htmlFor="ladder-currency">
            <SelectInput
              id="ladder-currency"
              value={formState.currencyType}
              disabled={isEntryFeeZero}
              onChange={(changeEvent) =>
                updateField("currencyType", changeEvent.target.value)
              }
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </FeeRow>

        <FeeRow>
          <FormField
            label="Minimum rank to enter (0 = open to all)"
            htmlFor="ladder-min-rank"
            error={fieldError("minRank")}
          >
            <TextInput
              id="ladder-min-rank"
              type="number"
              min={0}
              value={formState.minRank}
              onChange={(changeEvent) =>
                updateField("minRank", changeEvent.target.value)
              }
            />
          </FormField>

          <FormField
            label="Maximum players"
            htmlFor="ladder-max-players"
            error={fieldError("maxPlayers")}
          >
            <TextInput
              id="ladder-max-players"
              type="number"
              min={2}
              value={formState.maxPlayers}
              onChange={(changeEvent) =>
                updateField("maxPlayers", changeEvent.target.value)
              }
            />
          </FormField>
        </FeeRow>
      </Section>

      <SubmitRow>
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initialLadder ? "Save changes" : "Create ladder"}
        </PrimaryButton>
      </SubmitRow>

      {isCourtModalOpen ? (
        <AddCourtModal
          onClose={() => setIsCourtModalOpen(false)}
          onCreated={handleCourtCreated}
        />
      ) : null}
    </Form>
  );
}

export default memo(LadderForm);

const Form = styled.form({
  display: "flex",
  flexDirection: "column",
  gap: "28px",
  maxWidth: "720px",
});

const Section = styled.section({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
});

const SectionTitle = styled.h2({
  color: "#FFFFFF",
  fontSize: "1.05rem",
  fontWeight: 700,
  margin: 0,
});

const ImagePreview = styled.img({
  width: "160px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
});

const EmptyCourtsState = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "16px",
  borderRadius: "10px",
  border: "1px dashed rgba(255, 255, 255, 0.16)",
  color: "#8fa3b8",
  fontSize: "0.88rem",
  "& a": {
    color: "#0099f0",
    fontWeight: 600,
    textDecoration: "none",
  },
});

const AddCourtInline = styled.button({
  alignSelf: "flex-start",
  border: "none",
  background: "none",
  color: "#0099f0",
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 0",
  ":hover": {
    textDecoration: "underline",
  },
});

const DateRow = styled.div({
  display: "flex",
  gap: "16px",
  "@media (max-width: 600px)": {
    flexDirection: "column",
  },
});

const FeeRow = styled.div({
  display: "flex",
  gap: "16px",
  "@media (max-width: 600px)": {
    flexDirection: "column",
  },
});

const DerivedPreview = styled.div({
  padding: "16px",
  borderRadius: "12px",
  backgroundColor: "#07111f",
  border: "1px solid rgba(255, 255, 255, 0.1)",
});

const DerivedTitle = styled.div({
  color: "#8fa3b8",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "12px",
});

const DerivedGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  "@media (max-width: 480px)": {
    gridTemplateColumns: "1fr",
  },
});

const DerivedItem = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const DerivedLabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.78rem",
});

const DerivedValue = styled.span({
  color: "#e4ecf3",
  fontSize: "0.92rem",
  fontWeight: 600,
});

const DerivedEmpty = styled.span({
  color: "#8fa3b8",
  fontSize: "0.85rem",
});

const SubmitRow = styled.div({
  display: "flex",
  justifyContent: "flex-end",
});
