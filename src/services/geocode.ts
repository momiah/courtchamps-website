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
  return geocodeAddress(buildCourtAddressQuery(court));
};

export const geocodeAddress = async (
  query: string,
): Promise<GeoPoint | null> => {
  if (query.length === 0) {
    return null;
  }

  const cached = geocodeCache.get(query);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const requestUrl = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(
      query,
    )}`;
    const response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      geocodeCache.set(query, null);
      return null;
    }

    const payload: unknown = await response.json();
    if (!isNominatimResultArray(payload) || payload.length === 0) {
      geocodeCache.set(query, null);
      return null;
    }

    const point: GeoPoint = {
      latitude: Number(payload[0].lat),
      longitude: Number(payload[0].lon),
    };

    if (Number.isNaN(point.latitude) || Number.isNaN(point.longitude)) {
      geocodeCache.set(query, null);
      return null;
    }

    geocodeCache.set(query, point);
    return point;
  } catch (geocodeError) {
    console.error("Failed to geocode court", geocodeError);
    return null;
  }
};
