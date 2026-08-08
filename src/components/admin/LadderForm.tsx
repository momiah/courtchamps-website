import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import CourtsMap from "./CourtsMap";
import FormField from "./FormField";
import Modal from "./Modal";
import MultiSelect, { MultiSelectOption } from "./MultiSelect";
import {
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "./formControls";

const CURRENCY_OPTIONS = ["GBP", "USD", "EUR"] as const;
const MAX_PLAYERS_OPTIONS = [32, 64, 128, 256, 512, 1024, 2048];
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

const formatPreviewDate = (date: Date): string =>
  format(date, "EEE d MMM yyyy");

const openDatePicker = (
  clickEvent: React.MouseEvent<HTMLInputElement>,
): void => {
  const inputElement = clickEvent.currentTarget;
  if (typeof inputElement.showPicker === "function") {
    try {
      inputElement.showPicker();
    } catch {
      // Some browsers disallow showPicker outside a user gesture; ignore.
    }
  }
};

function LadderForm({
  initialLadder,
  onSubmit,
  submitting,
}: {
  initialLadder?: Ladder | null;
  onSubmit: (
    input: LadderInput,
    options: { imageFile: File | null },
  ) => void;
  submitting: boolean;
}) {
  const [formState, setFormState] = useState<LadderFormState>(() =>
    buildInitialState(initialLadder),
  );
  const [courts, setCourts] = useState<Court[]>([]);
  const [existingRegions, setExistingRegions] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState<boolean>(false);
  const [isCourtsModalOpen, setIsCourtsModalOpen] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

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

  const selectedCourtCount = formState.courtIds.length;

  const selectedCourts = useMemo(
    () =>
      formState.courtIds
        .map((courtId) =>
          courts.find((court) => court.courtId === courtId),
        )
        .filter((court): court is Court => court !== undefined),
    [formState.courtIds, courts],
  );

  const derivedDatesPreview = useMemo(() => {
    const seasonStart = parseDateInputValue(formState.seasonStartsAt);
    if (!seasonStart) {
      return null;
    }
    return deriveLadderDates({ seasonStartsAt: seasonStart });
  }, [formState.seasonStartsAt]);

  const minScheduleDate = useMemo(() => {
    const todayInputValue = format(new Date(), "yyyy-MM-dd");
    if (!initialLadder) {
      return todayInputValue;
    }
    // Keep an already-scheduled ladder editable even if its dates have passed.
    const initialRegistration = toDateInputValue(
      initialLadder.registrationOpensAt,
    );
    return initialRegistration && initialRegistration < todayInputValue
      ? initialRegistration
      : todayInputValue;
  }, [initialLadder]);

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
    } else if (formState.registrationOpensAt < minScheduleDate) {
      nextErrors.registrationOpensAt =
        "Registration opening date cannot be in the past.";
    }
    if (!seasonStarts) {
      nextErrors.seasonStartsAt = "Season start date is required.";
    } else if (formState.seasonStartsAt < minScheduleDate) {
      nextErrors.seasonStartsAt = "Season start date cannot be in the past.";
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
  }, [formState, minScheduleDate]);

  const isEntryFeeZero = useMemo(
    () => Number(formState.entryFee) === 0,
    [formState.entryFee],
  );

  const maxPlayersOptions = useMemo(() => {
    const currentValue = Number(formState.maxPlayers);
    if (
      formState.maxPlayers.trim().length > 0 &&
      !Number.isNaN(currentValue) &&
      !MAX_PLAYERS_OPTIONS.includes(currentValue)
    ) {
      return [currentValue, ...MAX_PLAYERS_OPTIONS].sort(
        (first, second) => first - second,
      );
    }
    return MAX_PLAYERS_OPTIONS;
  }, [formState.maxPlayers]);

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

  const handleImageFileChange = useCallback(
    (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = changeEvent.target.files?.[0] ?? null;
      setImageFile(selectedFile);
    },
    [],
  );

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setFormState((previous) => ({ ...previous, image: "" }));
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

  const imagePreviewSource = useMemo(() => {
    if (imagePreviewUrl) {
      return imagePreviewUrl;
    }
    return formState.image.trim().length > 0 ? formState.image : null;
  }, [imagePreviewUrl, formState.image]);

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

      onSubmit(
        {
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
        },
        { imageFile },
      );
    },
    [errors, formState, imageFile, onSubmit, submitting],
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

        <FormField
          label="Image"
          hint="Uploaded to storage when the ladder is saved."
        >
          <HiddenFileInput
            ref={imageInputRef}
            id="ladder-image"
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
          />
          <ImageUploadRow>
            <SecondaryButton type="button" onClick={openImagePicker}>
              {imagePreviewSource ? "Change image" : "Upload image"}
            </SecondaryButton>
            {imageFile ? <FileNameText>{imageFile.name}</FileNameText> : null}
            {imagePreviewSource ? (
              <RemoveImageButton type="button" onClick={clearImage}>
                Remove
              </RemoveImageButton>
            ) : null}
          </ImageUploadRow>
          {imagePreviewSource ? (
            <ImagePreview src={imagePreviewSource} alt="Ladder preview" />
          ) : null}
        </FormField>
      </Section>

      <SectionRow>
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
          <CourtsSelectButton
            type="button"
            onClick={() => setIsCourtsModalOpen(true)}
          >
            <span>Select courts</span>
            <CourtsSelectChevron aria-hidden>›</CourtsSelectChevron>
          </CourtsSelectButton>
          <SelectedSummary>
            {selectedCourtCount === 0
              ? "No courts selected"
              : `${selectedCourtCount} ${
                  selectedCourtCount === 1 ? "court" : "courts"
                } selected`}
          </SelectedSummary>
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
              min={minScheduleDate}
              value={formState.registrationOpensAt}
              onClick={openDatePicker}
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
              min={minScheduleDate}
              value={formState.seasonStartsAt}
              onClick={openDatePicker}
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
      </SectionRow>

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
            <SelectInput
              id="ladder-max-players"
              value={formState.maxPlayers}
              onChange={(changeEvent) =>
                updateField("maxPlayers", changeEvent.target.value)
              }
            >
              <option value="">Select</option>
              {maxPlayersOptions.map((option) => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </FeeRow>
      </Section>

      <SubmitRow>
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initialLadder ? "Save changes" : "Create ladder"}
        </PrimaryButton>
      </SubmitRow>

      {isCourtsModalOpen ? (
        <Modal
          title="Select courts"
          onClose={() => setIsCourtsModalOpen(false)}
          width={1240}
        >
          <CourtsModalBody>
            <CourtsModalColumn>
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
                  listMaxHeight={520}
                />
              )}
              <AddCourtInline
                type="button"
                onClick={() => setIsCourtModalOpen(true)}
              >
                + Add a new court
              </AddCourtInline>
            </CourtsModalColumn>

            <CourtsMapColumn>
              <CourtsMap courts={selectedCourts} />
            </CourtsMapColumn>
          </CourtsModalBody>

          <CourtsModalActions>
            <SelectedSummary>
              {selectedCourtCount === 0
                ? "No courts selected"
                : `${selectedCourtCount} ${
                    selectedCourtCount === 1 ? "court" : "courts"
                  } selected`}
            </SelectedSummary>
            <PrimaryButton
              type="button"
              onClick={() => setIsCourtsModalOpen(false)}
            >
              Done
            </PrimaryButton>
          </CourtsModalActions>
        </Modal>
      ) : null}

      {isCourtModalOpen ? (
        <AddCourtModal
          onClose={() => setIsCourtModalOpen(false)}
          onSaved={handleCourtCreated}
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
  width: "100%",
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

const SectionRow = styled.div({
  display: "flex",
  gap: "28px",
  alignItems: "stretch",
  "& > section": {
    flex: "1 1 0",
    minWidth: 0,
  },
  "@media (max-width: 900px)": {
    flexDirection: "column",
  },
});

const SectionTitle = styled.h2({
  color: "#FFFFFF",
  fontSize: "1.05rem",
  fontWeight: 700,
  margin: 0,
});

const HiddenFileInput = styled.input({
  display: "none",
});

const ImageUploadRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
});

const FileNameText = styled.span({
  color: "#c7d4e1",
  fontSize: "0.82rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "220px",
});

const RemoveImageButton = styled.button({
  border: "none",
  background: "none",
  color: "#ff9a9a",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 0",
  ":hover": {
    textDecoration: "underline",
  },
});

const ImagePreview = styled.img({
  width: "160px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  marginTop: "12px",
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

const CourtsSelectButton = styled.button({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  backgroundColor: "#07111f",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  cursor: "pointer",
  transition: "border-color 0.2s",
  ":hover": {
    borderColor: "#0099f0",
  },
});

const CourtsSelectChevron = styled.span({
  color: "#8fa3b8",
  fontSize: "1.3rem",
  lineHeight: 1,
});

const SelectedSummary = styled.span({
  color: "#8fa3b8",
  fontSize: "0.8rem",
});

const CourtsModalBody = styled.div({
  display: "flex",
  gap: "20px",
  alignItems: "stretch",
  "@media (max-width: 760px)": {
    flexDirection: "column",
  },
});

const CourtsModalColumn = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  flex: "1 1 0",
  minWidth: 0,
});

const CourtsMapColumn = styled.div({
  flex: "1.6 1 0",
  minWidth: 0,
  minHeight: "580px",
  display: "flex",
  "@media (max-width: 760px)": {
    minHeight: "320px",
  },
});

const CourtsModalActions = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "20px",
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
