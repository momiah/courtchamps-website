import { CourtInput } from "../types/ladder";

const ID_SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SUFFIX_LENGTH = 5;

// Turn a free-text segment into something safe for a Firestore document id:
// Firestore ids may not contain "/", so we replace any run of whitespace or
// path/illegal characters with a single hyphen and trim stray hyphens.
const toIdSegment = (value: string): string =>
  value
    .trim()
    .replace(/[/\\\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const randomSuffix = (): string =>
  Array.from({ length: ID_SUFFIX_LENGTH }, () =>
    ID_SUFFIX_CHARS.charAt(Math.floor(Math.random() * ID_SUFFIX_CHARS.length)),
  ).join("");

/**
 * Build a human-readable court document id in the same shape the Court Champs
 * mobile app uses: `courtName-city-country-uniqueId`. Empty segments (e.g. a
 * missing city) are dropped so we never produce doubled or leading hyphens.
 */
export const generateCourtId = ({ courtName, location }: CourtInput): string => {
  const segments = [
    toIdSegment(courtName),
    toIdSegment(location.city),
    toIdSegment(location.country),
  ].filter((segment) => segment.length > 0);

  return [...segments, randomSuffix()].join("-");
};
