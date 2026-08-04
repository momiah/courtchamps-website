import { useCallback, useMemo } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { GeoPoint } from "../services/geocode";

export interface GeocoderApi {
  ready: boolean;
  geocodeQuery: (
    query: string,
    countryCode?: string,
  ) => Promise<GeoPoint | null>;
  geocodeFirstMatch: (
    candidates: string[],
    countryCode?: string,
  ) => Promise<GeoPoint | null>;
}

export function useGeocoder(): GeocoderApi {
  const geocodingLibrary = useMapsLibrary("geocoding");

  const geocoder = useMemo(
    () => (geocodingLibrary ? new geocodingLibrary.Geocoder() : null),
    [geocodingLibrary],
  );

  const geocodeQuery = useCallback(
    async (query: string, countryCode?: string): Promise<GeoPoint | null> => {
      if (!geocoder || query.trim().length === 0) {
        return null;
      }

      const request: google.maps.GeocoderRequest = { address: query };
      if (countryCode && countryCode.trim().length > 0) {
        request.componentRestrictions = { country: countryCode };
      }

      try {
        const response = await geocoder.geocode(request);
        const firstResult = response.results[0];
        if (!firstResult) {
          return null;
        }
        const location = firstResult.geometry.location;
        return { latitude: location.lat(), longitude: location.lng() };
      } catch {
        // geocode() rejects on ZERO_RESULTS; treat as "not found".
        return null;
      }
    },
    [geocoder],
  );

  const geocodeFirstMatch = useCallback(
    async (
      candidates: string[],
      countryCode?: string,
    ): Promise<GeoPoint | null> => {
      for (const candidate of candidates) {
        const point = await geocodeQuery(candidate, countryCode);
        if (point) {
          return point;
        }
      }
      return null;
    },
    [geocodeQuery],
  );

  return { ready: geocoder !== null, geocodeQuery, geocodeFirstMatch };
}
