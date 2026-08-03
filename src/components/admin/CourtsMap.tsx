import React, { memo, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import styled from "styled-components";
import "leaflet/dist/leaflet.css";

import { GeoPoint, geocodeCourt } from "../../services/geocode";
import { Court } from "../../types/ladder";
import { courtPinIcon } from "./courtMapIcon";

interface CourtMapPoint {
  court: Court;
  point: GeoPoint;
}

function FitBounds({ points }: { points: CourtMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }
    if (points.length === 1) {
      map.setView(
        [points[0].point.latitude, points[0].point.longitude],
        12,
      );
      return;
    }
    const bounds = L.latLngBounds(
      points.map((entry) => [entry.point.latitude, entry.point.longitude]),
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [points, map]);

  return null;
}

function CourtsMap({ courts }: { courts: Court[] }) {
  const [points, setPoints] = useState<CourtMapPoint[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    let isActive = true;

    const resolvePoints = async (): Promise<void> => {
      if (courts.length === 0) {
        setPoints([]);
        return;
      }

      setIsLocating(true);
      const resolved: CourtMapPoint[] = [];

      for (const court of courts) {
        const point = await geocodeCourt(court);
        if (!isActive) {
          return;
        }
        if (point) {
          resolved.push({ court, point });
          setPoints([...resolved]);
        }
      }

      if (isActive) {
        setPoints([...resolved]);
        setIsLocating(false);
      }
    };

    void resolvePoints();

    return () => {
      isActive = false;
    };
  }, [courts]);

  const showEmptyState = courts.length === 0;
  const showNoneLocated =
    !showEmptyState && !isLocating && points.length === 0;

  return (
    <MapShell>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((entry) => (
          <Marker
            key={entry.court.courtId}
            position={[entry.point.latitude, entry.point.longitude]}
            icon={courtPinIcon}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <TooltipName>{entry.court.courtName}</TooltipName>
              <TooltipLine>{entry.court.location.address}</TooltipLine>
              <TooltipLine>
                {[entry.court.location.city, entry.court.location.postCode]
                  .filter((part) => part.trim().length > 0)
                  .join(", ")}
              </TooltipLine>
              <TooltipLine>{entry.court.location.country}</TooltipLine>
            </Tooltip>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>

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

const MapOverlay = styled.div({
  position: "absolute",
  inset: 0,
  zIndex: 500,
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

const TooltipName = styled.div({
  fontWeight: 700,
  fontSize: "0.82rem",
  marginBottom: "2px",
});

const TooltipLine = styled.div({
  fontSize: "0.75rem",
  color: "#33475b",
});
