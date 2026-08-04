import React, { memo, useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import styled from "styled-components";
import "leaflet/dist/leaflet.css";

import { courtPinIcon } from "./courtMapIcon";

function Recenter({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    // Only recenter when the point moves out of view (e.g. a typed value or a
    // fresh lookup), so dragging the pin within view does not jump the map.
    const target = L.latLng(latitude, longitude);
    if (!map.getBounds().contains(target)) {
      map.setView(target, map.getZoom());
    }
  }, [latitude, longitude, map]);

  return null;
}

function ClickToPlace({
  onChange,
}: {
  onChange?: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(clickEvent) {
      onChange?.(clickEvent.latlng.lat, clickEvent.latlng.lng);
    },
  });

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
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[latitude, longitude]}
          icon={courtPinIcon}
          draggable={isEditable}
          eventHandlers={{
            dragend: (dragEvent) => {
              const marker = dragEvent.target as L.Marker;
              const position = marker.getLatLng();
              onChange?.(position.lat, position.lng);
            },
          }}
        />
        <Recenter latitude={latitude} longitude={longitude} />
        <ClickToPlace onChange={onChange} />
      </MapContainer>
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
  zIndex: 500,
  padding: "6px 10px",
  borderRadius: "8px",
  backgroundColor: "rgba(7, 17, 31, 0.82)",
  color: "#c7d4e1",
  fontSize: "0.72rem",
  textAlign: "center",
  pointerEvents: "none",
});
