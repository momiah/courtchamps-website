import React, { memo, useEffect, useState } from "react";
import {
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
} from "@vis.gl/react-google-maps";
import styled from "styled-components";

import CourtPin from "../../maps/CourtPin";
import { GOOGLE_MAPS_MAP_ID } from "../../maps/googleMapsConfig";
import { useGeocoder } from "../../maps/useGeocoder";
import {
  buildCourtCandidatesFromCourt,
  GeoPoint,
} from "../../services/geocode";
import { Court } from "../../types/ladder";

interface CourtMapPoint {
  court: Court;
  point: GeoPoint;
}

const courtPointFromCourt = (court: Court): CourtMapPoint | null => {
  if (
    typeof court.location.latitude === "number" &&
    typeof court.location.longitude === "number"
  ) {
    return {
      court,
      point: {
        latitude: court.location.latitude,
        longitude: court.location.longitude,
      },
    };
  }
  return null;
};

function FitBounds({ points }: { points: CourtMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) {
      return;
    }
    if (points.length === 1) {
      map.setCenter({
        lat: points[0].point.latitude,
        lng: points[0].point.longitude,
      });
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((entry) =>
      bounds.extend({
        lat: entry.point.latitude,
        lng: entry.point.longitude,
      }),
    );
    map.fitBounds(bounds, 64);
  }, [points, map]);

  return null;
}

function CourtsMap({ courts }: { courts: Court[] }) {
  const { ready, geocodeFirstMatch } = useGeocoder();
  const [points, setPoints] = useState<CourtMapPoint[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    let isActive = true;

    const resolvePoints = async (): Promise<void> => {
      const immediate: CourtMapPoint[] = [];
      const needsGeocode: Court[] = [];
      courts.forEach((court) => {
        const known = courtPointFromCourt(court);
        if (known) {
          immediate.push(known);
        } else {
          needsGeocode.push(court);
        }
      });

      setPoints(immediate);

      if (needsGeocode.length === 0 || !ready) {
        return;
      }

      setIsLocating(true);
      const resolved = [...immediate];
      for (const court of needsGeocode) {
        const point = await geocodeFirstMatch(
          buildCourtCandidatesFromCourt(court),
          court.location.countryCode,
        );
        if (!isActive) {
          return;
        }
        if (point) {
          resolved.push({ court, point });
          setPoints([...resolved]);
        }
      }
      if (isActive) {
        setIsLocating(false);
      }
    };

    void resolvePoints();

    return () => {
      isActive = false;
    };
  }, [courts, ready, geocodeFirstMatch]);

  const showEmptyState = courts.length === 0;
  const showNoneLocated =
    !showEmptyState && !isLocating && points.length === 0;

  return (
    <MapShell>
      <GoogleMap
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={{ lat: 20, lng: 0 }}
        defaultZoom={2}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        {points.map((entry) => (
          <AdvancedMarker
            key={entry.court.courtId}
            position={{
              lat: entry.point.latitude,
              lng: entry.point.longitude,
            }}
          >
            <MarkerContent>
              <CourtPin />
              <Tooltip className="court-tooltip">
                <TooltipName>{entry.court.courtName}</TooltipName>
                <TooltipLine>{entry.court.location.address}</TooltipLine>
                <TooltipLine>
                  {[entry.court.location.city, entry.court.location.postCode]
                    .filter((part) => part.trim().length > 0)
                    .join(", ")}
                </TooltipLine>
                <TooltipLine>{entry.court.location.country}</TooltipLine>
              </Tooltip>
            </MarkerContent>
          </AdvancedMarker>
        ))}
        <FitBounds points={points} />
      </GoogleMap>

      {showEmptyState ? (
        <MapOverlay>Select courts to see them on the map.</MapOverlay>
      ) : null}
      {isLocating && points.length === 0 ? (
        <MapOverlay>Locating courts…</MapOverlay>
      ) : null}
      {showNoneLocated ? (
        <MapOverlay>Could not locate the selected courts.</MapOverlay>
      ) : null}
    </MapShell>
  );
}

export default memo(CourtsMap);

const MapShell = styled.div({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "320px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.12)",
});

const MarkerContent = styled.div({
  position: "relative",
  display: "flex",
  justifyContent: "center",
  "&:hover .court-tooltip": {
    opacity: 1,
    visibility: "visible",
  },
});

const Tooltip = styled.div({
  position: "absolute",
  bottom: "40px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "200px",
  padding: "8px 10px",
  borderRadius: "8px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
  opacity: 0,
  visibility: "hidden",
  transition: "opacity 0.15s",
  pointerEvents: "none",
  zIndex: 10,
});

const TooltipName = styled.div({
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.8rem",
  marginBottom: "2px",
});

const TooltipLine = styled.div({
  color: "#8fa3b8",
  fontSize: "0.72rem",
  lineHeight: 1.35,
});

const MapOverlay = styled.div({
  position: "absolute",
  inset: 0,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  textAlign: "center",
  backgroundColor: "rgba(7, 17, 31, 0.82)",
  color: "#c7d4e1",
  fontSize: "0.88rem",
  pointerEvents: "none",
});
