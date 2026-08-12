import React, { memo, useEffect, useState } from "react";
import {
  InfoWindow,
  Map as GoogleMap,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import styled from "styled-components";

import { buildCourtPinIcon } from "../../maps/courtMarkerIcon";
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
  const [hoveredCourtId, setHoveredCourtId] = useState<string | null>(null);

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
  const hoveredEntry = points.find(
    (entry) => entry.court.courtId === hoveredCourtId,
  );

  return (
    <MapShell>
      <GoogleMap
        defaultCenter={{ lat: 20, lng: 0 }}
        defaultZoom={2}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        {points.map((entry) => (
          <Marker
            key={entry.court.courtId}
            position={{
              lat: entry.point.latitude,
              lng: entry.point.longitude,
            }}
            icon={buildCourtPinIcon()}
            onMouseOver={() => setHoveredCourtId(entry.court.courtId)}
            onMouseOut={() => setHoveredCourtId(null)}
          />
        ))}

        {hoveredEntry ? (
          <InfoWindow
            position={{
              lat: hoveredEntry.point.latitude,
              lng: hoveredEntry.point.longitude,
            }}
            pixelOffset={[0, -34]}
            headerDisabled
            disableAutoPan
          >
            <TooltipName>{hoveredEntry.court.courtName}</TooltipName>
            <TooltipLine>{hoveredEntry.court.location.address}</TooltipLine>
            <TooltipLine>
              {[
                hoveredEntry.court.location.city,
                hoveredEntry.court.location.postCode,
              ]
                .filter((part) => part.trim().length > 0)
                .join(", ")}
            </TooltipLine>
            <TooltipLine>{hoveredEntry.court.location.country}</TooltipLine>
          </InfoWindow>
        ) : null}

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

const TooltipName = styled.div({
  color: "#0a1929",
  fontWeight: 700,
  fontSize: "0.82rem",
  marginBottom: "2px",
});

const TooltipLine = styled.div({
  color: "#33475b",
  fontSize: "0.74rem",
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
