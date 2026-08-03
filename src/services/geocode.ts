import { Court } from "../types/ladder";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Cache resolved (or failed) lookups for the session so the same court is not
// geocoded repeatedly as the modal opens and closes.
const geocodeCache = new Map<string, GeoPoint | null>();

export const buildCourtAddressQuery = (court: Court): string =>
  buildAddressQuery({
    address: court.location.address,
    city: court.location.city,
    postCode: court.location.postCode,
    country: court.location.country,
  });

export const buildAddressQuery = ({
  address,
  city,
  postCode,
  country,
}: {
  address: string;
  city: string;
  postCode: string;
  country: string;
}): string =>
  [address, city, postCode, country]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(", ");

interface NominatimResult {
  lat: string;
  lon: string;
}

const isNominatimResultArray = (
  value: unknown,
): value is NominatimResult[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { lat?: unknown }).lat === "string" &&
      typeof (entry as { lon?: unknown }).lon === "string",
  );

export const geocodeCourt = async (
  court: Court,
): Promise<GeoPoint | null> => {
  if (
    typeof court.location.latitude === "number" &&
    typeof court.location.longitude === "number"
  ) {
    return {
      latitude: court.location.latitude,
      longitude: court.location.longitude,
    };
  }
  return geocodeCourtAddress(court);
};

// Full addresses (unit numbers, mall levels) often miss on Nominatim, so try
// progressively broader queries and bias to the court's country.
export const geocodeCourtAddress = async (
  court: Court,
): Promise<GeoPoint | null> => {
  const { address, city, postCode, countryCode } = court.location;

  // Country is applied via countrycodes, so it is kept out of the query text.
  const candidateQueries = [
    buildAddressQuery({ address, city, postCode, country: "" }),
    buildAddressQuery({ address, city, postCode: "", country: "" }),
    postCode.trim(),
    buildAddressQuery({ address: "", city, postCode: "", country: "" }),
  ];

  return geocodeFirstMatch(candidateQueries, countryCode);
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const geocodeFirstMatch = async (
  candidateQueries: string[],
  countryCode?: string,
): Promise<GeoPoint | null> => {
  const seenQueries = new Set<string>();
  let hasRequested = false;

  for (const candidate of candidateQueries) {
    const query = candidate.trim();
    if (query.length === 0 || seenQueries.has(query)) {
      continue;
    }
    seenQueries.add(query);

    // Space out requests to stay within Nominatim's fair-use rate limit.
    if (hasRequested) {
      await delay(400);
    }
    hasRequested = true;

    const point = await geocodeAddress(query, countryCode);
    if (point) {
      return point;
    }
  }

  return null;
};

export const geocodeAddress = async (
  query: string,
  countryCode?: string,
): Promise<GeoPoint | null> => {
  if (query.length === 0) {
    return null;
  }

  const normalizedCountry = countryCode?.trim().toLowerCase() ?? "";
  const cacheKey = normalizedCountry
    ? `${normalizedCountry}|${query}`
    : query;

  const cached = geocodeCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const countryParam = normalizedCountry
      ? `&countrycodes=${normalizedCountry}`
      : "";
    const requestUrl = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(
      query,
    )}${countryParam}`;
    const response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const payload: unknown = await response.json();
    if (!isNominatimResultArray(payload) || payload.length === 0) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const point: GeoPoint = {
      latitude: Number(payload[0].lat),
      longitude: Number(payload[0].lon),
    };

    if (Number.isNaN(point.latitude) || Number.isNaN(point.longitude)) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    geocodeCache.set(cacheKey, point);
    return point;
  } catch (geocodeError) {
    console.error("Failed to geocode court", geocodeError);
    return null;
  }
};
