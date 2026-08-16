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
import { useForm, Controller, type SubmitHandler } from "react-hook-form";

import { fetchAllCourts } from "../../services/courts";
import { fetchLadders } from "../../services/ladders";
import {
  Court,
  GenderType,
  Ladder,
  LadderInput,
  LadderType,
} from "courtchamps-shared/types";
import { COUNTRY_OPTIONS, findCountryName } from "../../utils/countries";
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
const LADDER_TYPE_OPTIONS: LadderType[] = ["Singles", "Doubles"];
const GENDER_TYPE_OPTIONS: GenderType[] = ["Mens", "Womens", "Mixed"];
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const REGION_DATALIST_ID = "ladder-region-options";

// Form state mirrors the shared LadderInput, but the fields a user types are
// held as strings until parsed/validated on submit.
type LadderFormState = Omit<
  LadderInput,
  | "registrationOpensAt"
  | "seasonStartsAt"
  | "entryFee"
  | "minRank"
  | "maxPlayers"
> & {
  registrationOpensAt: string;
  seasonStartsAt: string;
  entryFee: string;
  minRank: string;
  maxPlayers: string;
};

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
  ladderType: initialLadder?.ladderType ?? "Singles",
  genderType: initialLadder?.genderType ?? "Mixed",
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
  onSubmit: (input: LadderInput, options: { imageFile: File | null }) => void;
  submitting: boolean;
}) {
  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LadderFormState>({
    defaultValues: buildInitialState(initialLadder),
  });

  const courtIds = watch("courtIds");
  const seasonStartsAt = watch("seasonStartsAt");
  const entryFee = watch("entryFee");
  const maxPlayers = watch("maxPlayers");
  const image = watch("image");

  const [courts, setCourts] = useState<Court[]>([]);
  const [existingRegions, setExistingRegions] = useState<string[]>([]);
  const [regionCourtGroups, setRegionCourtGroups] = useState<
    { region: string; courtIds: string[] }[]
  >([]);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState<boolean>(false);
  const [isCourtsModalOpen, setIsCourtsModalOpen] = useState<boolean>(false);
  const [courtCountryFilter, setCourtCountryFilter] = useState<string>("");
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

        // Group the court ids of every existing ladder by its region so a
        // whole region's courts can be reused in one click. Ladders that share
        // a region string merge into one entry.
        const courtIdsByRegion = new Map<string, Set<string>>();
        loadedLadders.forEach((ladder) => {
          const region = ladder.region.trim();
          if (region.length === 0) {
            return;
          }
          const existing = courtIdsByRegion.get(region) ?? new Set<string>();
          ladder.courtIds.forEach((courtId) => existing.add(courtId));
          courtIdsByRegion.set(region, existing);
        });
        setRegionCourtGroups(
          Array.from(courtIdsByRegion.entries())
            .map(([region, courtIdSet]) => ({
              region,
              courtIds: Array.from(courtIdSet),
            }))
            .sort((first, second) =>
              first.region.localeCompare(second.region),
            ),
        );
      } catch (loadError) {
        console.error("Failed to load ladder reference data", loadError);
      }
    };

    void loadReferenceData();

    return () => {
      isActive = false;
    };
  }, []);

  const verifiedCourts = useMemo(
    () => courts.filter((court) => court.verified === true),
    [courts],
  );

  const availableCourtCountries = useMemo(() => {
    const codes = new Set<string>();
    verifiedCourts.forEach((court) => {
      const code = court.location.countryCode.trim();
      if (code.length > 0) {
        codes.add(code);
      }
    });
    return Array.from(codes)
      .map((code) => ({ code, name: findCountryName(code) || code }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [verifiedCourts]);

  const verifiedCourtOptions = useMemo<MultiSelectOption[]>(
    () =>
      verifiedCourts
        .filter(
          (court) =>
            courtCountryFilter.length === 0 ||
            court.location.countryCode === courtCountryFilter,
        )
        .map((court) => ({
          id: court.courtId,
          label: court.courtName,
          sublabel: court.location.city,
        })),
    [verifiedCourts, courtCountryFilter],
  );

  const selectedCourtCount = courtIds.length;

  const selectedCourts = useMemo(
    () =>
      courtIds
        .map((courtId) => courts.find((court) => court.courtId === courtId))
        .filter((court): court is Court => court !== undefined),
    [courtIds, courts],
  );

  const derivedDatesPreview = useMemo(() => {
    const seasonStart = parseDateInputValue(seasonStartsAt);
    if (!seasonStart) {
      return null;
    }
    return deriveLadderDates({ seasonStartsAt: seasonStart });
  }, [seasonStartsAt]);

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

  const isEntryFeeZero = useMemo(
    () => Number(entryFee) === 0,
    [entryFee],
  );

  const maxPlayersOptions = useMemo(() => {
    const currentValue = Number(maxPlayers);
    if (
      maxPlayers.trim().length > 0 &&
      !Number.isNaN(currentValue) &&
      !MAX_PLAYERS_OPTIONS.includes(currentValue)
    ) {
      return [currentValue, ...MAX_PLAYERS_OPTIONS].sort(
        (first, second) => first - second,
      );
    }
    return MAX_PLAYERS_OPTIONS;
  }, [maxPlayers]);

  const toggleCourt = useCallback(
    (courtId: string) => {
      const current = getValues("courtIds");
      setValue(
        "courtIds",
        current.includes(courtId)
          ? current.filter((existingId) => existingId !== courtId)
          : [...current, courtId],
        { shouldValidate: true },
      );
    },
    [getValues, setValue],
  );

  const removeCourt = useCallback(
    (courtId: string) => {
      setValue(
        "courtIds",
        getValues("courtIds").filter((existingId) => existingId !== courtId),
        { shouldValidate: true },
      );
    },
    [getValues, setValue],
  );

  const bulkToggleCourts = useCallback(
    (ids: string[], selected: boolean) => {
      const nextIds = new Set(getValues("courtIds"));
      if (selected) {
        ids.forEach((courtId) => nextIds.add(courtId));
      } else {
        ids.forEach((courtId) => nextIds.delete(courtId));
      }
      setValue("courtIds", Array.from(nextIds), { shouldValidate: true });
    },
    [getValues, setValue],
  );

  // Regions from existing ladders that still resolve to at least one verified
  // court, so a whole region's courts can be reused in one click.
  const verifiedCourtIdSet = useMemo(
    () => new Set(verifiedCourts.map((court) => court.courtId)),
    [verifiedCourts],
  );

  const reusableRegions = useMemo(
    () =>
      regionCourtGroups
        .map((group) => ({
          region: group.region,
          courtIds: group.courtIds.filter((courtId) =>
            verifiedCourtIdSet.has(courtId),
          ),
        }))
        .filter((group) => group.courtIds.length > 0),
    [regionCourtGroups, verifiedCourtIdSet],
  );

  const reuseRegionCourts = useCallback(
    (region: string) => {
      const group = reusableRegions.find(
        (candidate) => candidate.region === region,
      );
      if (!group) {
        return;
      }
      const nextIds = new Set(getValues("courtIds"));
      group.courtIds.forEach((courtId) => nextIds.add(courtId));
      setValue("courtIds", Array.from(nextIds), { shouldValidate: true });
    },
    [reusableRegions, getValues, setValue],
  );

  const handleCourtCreated = useCallback(
    (createdCourt: Court) => {
      setCourts((previous) => [...previous, createdCourt]);
      const current = getValues("courtIds");
      if (!current.includes(createdCourt.courtId)) {
        setValue("courtIds", [...current, createdCourt.courtId], {
          shouldValidate: true,
        });
      }
      setIsCourtModalOpen(false);
    },
    [getValues, setValue],
  );

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
    setValue("image", "");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [setValue]);

  const imagePreviewSource = useMemo(() => {
    if (imagePreviewUrl) {
      return imagePreviewUrl;
    }
    return image.trim().length > 0 ? image : null;
  }, [imagePreviewUrl, image]);

  const onValid: SubmitHandler<LadderFormState> = (values) => {
    if (submitting) {
      return;
    }

    const registrationOpens = parseDateInputValue(values.registrationOpensAt);
    const seasonStarts = parseDateInputValue(values.seasonStartsAt);
    if (!registrationOpens || !seasonStarts) {
      return;
    }

    onSubmit(
      {
        name: values.name.trim(),
        description: values.description.trim(),
        image: values.image.trim(),
        region: values.region.trim(),
        countryCode: values.countryCode,
        ladderType: values.ladderType,
        genderType: values.genderType,
        courtIds: values.courtIds,
        registrationOpensAt: registrationOpens,
        seasonStartsAt: seasonStarts,
        entryFee: Number(values.entryFee),
        currencyType: values.currencyType,
        minRank: Number(values.minRank),
        maxPlayers: Number(values.maxPlayers),
      },
      { imageFile },
    );
  };

  return (
    <>
      <Form onSubmit={handleSubmit(onValid)}>
        <Section>
          <DetailsRow>
            <DetailsColumn>
              <SectionTitle>Details</SectionTitle>

              <FormField
                label="Name"
                htmlFor="ladder-name"
                error={errors.name?.message ?? null}
              >
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    validate: (value) =>
                      value.trim().length > 0 || "Name is required.",
                  }}
                  render={({ field }) => (
                    <TextInput id="ladder-name" type="text" {...field} />
                  )}
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="ladder-description"
                error={errors.description?.message ?? null}
              >
                <Controller
                  control={control}
                  name="description"
                  rules={{
                    validate: (value) =>
                      value.trim().length > 0 || "Description is required.",
                  }}
                  render={({ field }) => (
                    <TextArea id="ladder-description" {...field} />
                  )}
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
                  {imageFile ? (
                    <FileNameText>{imageFile.name}</FileNameText>
                  ) : null}
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
            </DetailsColumn>

            <TeamTypeColumn>
              <SectionTitle>Team type</SectionTitle>

              <FormField label="Format">
                <Controller
                  control={control}
                  name="ladderType"
                  render={({ field }) => (
                    <RadioRow role="radiogroup" aria-label="Ladder type">
                      {LADDER_TYPE_OPTIONS.map((option) => (
                        <RadioChip
                          key={option}
                          $selected={field.value === option}
                        >
                          <HiddenRadio
                            type="radio"
                            name="ladder-type"
                            value={option}
                            checked={field.value === option}
                            onChange={() => field.onChange(option)}
                          />
                          {option}
                        </RadioChip>
                      ))}
                    </RadioRow>
                  )}
                />
              </FormField>

              <FormField label="Gender">
                <Controller
                  control={control}
                  name="genderType"
                  render={({ field }) => (
                    <RadioRow role="radiogroup" aria-label="Gender type">
                      {GENDER_TYPE_OPTIONS.map((option) => (
                        <RadioChip
                          key={option}
                          $selected={field.value === option}
                        >
                          <HiddenRadio
                            type="radio"
                            name="ladder-gender-type"
                            value={option}
                            checked={field.value === option}
                            onChange={() => field.onChange(option)}
                          />
                          {option}
                        </RadioChip>
                      ))}
                    </RadioRow>
                  )}
                />
              </FormField>
            </TeamTypeColumn>
          </DetailsRow>
        </Section>

        <SectionRow>
          <Section>
            <SectionTitle>Region and courts</SectionTitle>

            <FormField
              label="Region"
              htmlFor="ladder-region"
              hint="e.g. North London"
              error={errors.region?.message ?? null}
            >
              <Controller
                control={control}
                name="region"
                rules={{
                  validate: (value) =>
                    value.trim().length > 0 || "Region is required.",
                }}
                render={({ field }) => (
                  <TextInput
                    id="ladder-region"
                    type="text"
                    list={REGION_DATALIST_ID}
                    {...field}
                  />
                )}
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
              error={errors.countryCode?.message ?? null}
            >
              <Controller
                control={control}
                name="countryCode"
                rules={{
                  validate: (value) =>
                    COUNTRY_CODE_PATTERN.test(value) || "Select a country.",
                }}
                render={({ field }) => (
                  <SelectInput id="ladder-country" {...field}>
                    <option value="">Select a country</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </SelectInput>
                )}
              />
            </FormField>

            <Controller
              control={control}
              name="courtIds"
              rules={{
                validate: (value) =>
                  value.length > 0 || "Select at least one court.",
              }}
              render={({ field }) => (
                <FormField
                  label="Courts"
                  error={errors.courtIds?.message ?? null}
                >
                  <CourtsSelectButton
                    type="button"
                    onClick={() => setIsCourtsModalOpen(true)}
                  >
                    <span>Select courts</span>
                    <CourtsSelectChevron aria-hidden>›</CourtsSelectChevron>
                  </CourtsSelectButton>
                  <SelectedSummary>
                    {field.value.length === 0
                      ? "No courts selected"
                      : `${field.value.length} ${
                          field.value.length === 1 ? "court" : "courts"
                        } selected`}
                  </SelectedSummary>
                </FormField>
              )}
            />
          </Section>

          <Section>
            <SectionTitle>Schedule</SectionTitle>

            <DateRow>
              <FormField
                label="Registration opens"
                htmlFor="ladder-registration-opens"
                error={errors.registrationOpensAt?.message ?? null}
              >
                <Controller
                  control={control}
                  name="registrationOpensAt"
                  rules={{
                    validate: (value) => {
                      if (!parseDateInputValue(value)) {
                        return "Registration opening date is required.";
                      }
                      if (value < minScheduleDate) {
                        return "Registration opening date cannot be in the past.";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <TextInput
                      id="ladder-registration-opens"
                      type="date"
                      min={minScheduleDate}
                      onClick={openDatePicker}
                      {...field}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Season starts"
                htmlFor="ladder-season-starts"
                error={errors.seasonStartsAt?.message ?? null}
              >
                <Controller
                  control={control}
                  name="seasonStartsAt"
                  rules={{
                    validate: (value) => {
                      const seasonStart = parseDateInputValue(value);
                      if (!seasonStart) {
                        return "Season start date is required.";
                      }
                      if (value < minScheduleDate) {
                        return "Season start date cannot be in the past.";
                      }
                      const registrationOpens = parseDateInputValue(
                        getValues("registrationOpensAt"),
                      );
                      if (
                        registrationOpens &&
                        registrationOpens.getTime() >= seasonStart.getTime()
                      ) {
                        return "Season start must be after registration opens.";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <TextInput
                      id="ladder-season-starts"
                      type="date"
                      min={minScheduleDate}
                      onClick={openDatePicker}
                      {...field}
                    />
                  )}
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
                      {formatPreviewDate(
                        derivedDatesPreview.registrationClosesAt,
                      )}
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
              error={errors.entryFee?.message ?? null}
            >
              <Controller
                control={control}
                name="entryFee"
                rules={{
                  validate: (value) => {
                    const parsed = Number(value);
                    if (
                      value.trim().length === 0 ||
                      Number.isNaN(parsed) ||
                      parsed < 0
                    ) {
                      return "Entry fee must be 0 or greater.";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <TextInput
                    id="ladder-entry-fee"
                    type="number"
                    min={0}
                    {...field}
                  />
                )}
              />
            </FormField>

            <FormField label="Currency" htmlFor="ladder-currency">
              <Controller
                control={control}
                name="currencyType"
                render={({ field }) => (
                  <SelectInput
                    id="ladder-currency"
                    disabled={isEntryFeeZero}
                    {...field}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </SelectInput>
                )}
              />
            </FormField>
          </FeeRow>

          <FeeRow>
            <FormField
              label="Minimum rank to enter (0 = open to all)"
              htmlFor="ladder-min-rank"
              error={errors.minRank?.message ?? null}
            >
              <Controller
                control={control}
                name="minRank"
                rules={{
                  validate: (value) => {
                    const parsed = Number(value);
                    if (
                      value.trim().length === 0 ||
                      Number.isNaN(parsed) ||
                      parsed < 0
                    ) {
                      return "Minimum rank must be 0 or greater.";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <TextInput
                    id="ladder-min-rank"
                    type="number"
                    min={0}
                    {...field}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Maximum players"
              htmlFor="ladder-max-players"
              error={errors.maxPlayers?.message ?? null}
            >
              <Controller
                control={control}
                name="maxPlayers"
                rules={{
                  validate: (value) => {
                    const parsed = Number(value);
                    if (
                      value.trim().length === 0 ||
                      Number.isNaN(parsed) ||
                      parsed < 2
                    ) {
                      return "Maximum players must be 2 or greater.";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <SelectInput id="ladder-max-players" {...field}>
                    <option value="">Select</option>
                    {maxPlayersOptions.map((option) => (
                      <option key={option} value={String(option)}>
                        {option}
                      </option>
                    ))}
                  </SelectInput>
                )}
              />
            </FormField>
          </FeeRow>
        </Section>

        <SubmitRow>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting
              ? "Saving…"
              : initialLadder
                ? "Save changes"
                : "Create ladder"}
          </PrimaryButton>
        </SubmitRow>
      </Form>

      {isCourtsModalOpen ? (
        <Modal
          title="Select courts"
          onClose={() => setIsCourtsModalOpen(false)}
          width={1240}
        >
          <CourtsModalBody>
            <CourtsModalColumn>
              {availableCourtCountries.length >= 2 ? (
                <CourtCountrySelect
                  aria-label="Filter courts by country"
                  value={courtCountryFilter}
                  onChange={(changeEvent) =>
                    setCourtCountryFilter(changeEvent.target.value)
                  }
                >
                  <option value="">All countries</option>
                  {availableCourtCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </CourtCountrySelect>
              ) : null}

              {reusableRegions.length > 0 ? (
                <RegionReuseSelect
                  aria-label="Reuse courts from a region"
                  value=""
                  onChange={(changeEvent) =>
                    reuseRegionCourts(changeEvent.target.value)
                  }
                >
                  <option value="">Reuse courts from a region…</option>
                  {reusableRegions.map((group) => (
                    <option key={group.region} value={group.region}>
                      {group.region} ({group.courtIds.length})
                    </option>
                  ))}
                </RegionReuseSelect>
              ) : null}

              {verifiedCourts.length === 0 ? (
                <EmptyCourtsState>
                  <span>No verified courts yet.</span>
                  <Link to="/admin/courts">Manage courts</Link>
                </EmptyCourtsState>
              ) : (
                <MultiSelect
                  options={verifiedCourtOptions}
                  selectedIds={courtIds}
                  onToggle={toggleCourt}
                  onRemove={removeCourt}
                  onBulkToggle={bulkToggleCourts}
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
    </>
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

const DetailsRow = styled.div({
  display: "flex",
  gap: "50px",
  alignItems: "flex-start",
  "@media (max-width: 900px)": {
    flexDirection: "column",
  },
});

const DetailsColumn = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  flex: "2 1 0",
  minWidth: 0,
});

const TeamTypeColumn = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  flex: "1 1 0",
  minWidth: 0,
});

const RadioRow = styled.div({
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
});

const RadioChip = styled.label<{ $selected: boolean }>(({ $selected }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  borderRadius: "8px",
  border: `1px solid ${$selected ? "#0099f0" : "rgba(255, 255, 255, 0.14)"}`,
  backgroundColor: $selected ? "rgba(0, 153, 240, 0.14)" : "#07111f",
  color: $selected ? "#FFFFFF" : "#c7d4e1",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 0.2s, background-color 0.2s, color 0.2s",
  ":hover": {
    borderColor: "#0099f0",
  },
}));

const HiddenRadio = styled.input({
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
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

const CourtCountrySelect = styled(SelectInput)({
  width: "100%",
});

const RegionReuseSelect = styled(SelectInput)({
  width: "100%",
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
