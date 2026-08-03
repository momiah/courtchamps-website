import React, { memo, useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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
    map.setView([latitude, longitude], 14);
  }, [latitude, longitude, map]);

  return null;
}

function LocationPreviewMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <PreviewShell>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={courtPinIcon} />
        <Recenter latitude={latitude} longitude={longitude} />
      </MapContainer>
    </PreviewShell>
  );
}

export default memo(LocationPreviewMap);

const PreviewShell = styled.div({
  width: "100%",
  height: "200px",
  borderRadius: "10px",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.12)",
});
