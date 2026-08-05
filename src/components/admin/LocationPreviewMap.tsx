import React, { memo, useEffect } from "react";
import { Map as GoogleMap, Marker, useMap } from "@vis.gl/react-google-maps";
import styled from "styled-components";

import { buildCourtPinIcon } from "../../maps/courtMarkerIcon";

function Recenter({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      return;
    }
    // Only recenter when the point leaves the current view, so dragging the
    // pin within view does not jump the map.
    const bounds = map.getBounds();
    const target = { lat: latitude, lng: longitude };
    if (!bounds || !bounds.contains(target)) {
      map.setCenter(target);
    }
  }, [latitude, longitude, map]);

  return null;
}

function LocationPreviewMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange?: (latitude: number, longitude: number) => void;
}) {
  const isEditable = onChange !== undefined;

  return (
    <PreviewShell>
      <GoogleMap
        defaultCenter={{ lat: latitude, lng: longitude }}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
        onClick={(mapEvent) => {
          const clicked = mapEvent.detail.latLng;
          if (clicked && onChange) {
            onChange(clicked.lat, clicked.lng);
          }
        }}
      >
        <Marker
          position={{ lat: latitude, lng: longitude }}
          icon={buildCourtPinIcon()}
          draggable={isEditable}
          onDragEnd={(dragEvent) => {
            const nextLat = dragEvent.latLng?.lat();
            const nextLng = dragEvent.latLng?.lng();
            if (
              typeof nextLat === "number" &&
              typeof nextLng === "number" &&
              onChange
            ) {
              onChange(nextLat, nextLng);
            }
          }}
        />
        <Recenter latitude={latitude} longitude={longitude} />
      </GoogleMap>
      {isEditable ? (
        <MapHint>Drag the pin or click the map to fine-tune the location</MapHint>
      ) : null}
    </PreviewShell>
  );
}

export default memo(LocationPreviewMap);

const PreviewShell = styled.div({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "300px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.12)",
});

const MapHint = styled.div({
  position: "absolute",
  left: "12px",
  right: "12px",
  bottom: "12px",
  zIndex: 5,
  padding: "6px 10px",
  borderRadius: "8px",
  backgroundColor: "rgba(7, 17, 31, 0.82)",
  color: "#c7d4e1",
  fontSize: "0.72rem",
  textAlign: "center",
  pointerEvents: "none",
});
