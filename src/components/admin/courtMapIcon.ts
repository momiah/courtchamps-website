import L from "leaflet";

const PIN_MARKUP = `
  <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0.5C6.4 0.5 1 5.9 1 12.5c0 8.8 12 20.7 12 20.7s12-11.9 12-20.7C25 5.9 19.6 0.5 13 0.5z" fill="#0099f0" stroke="#ffffff" stroke-width="2"/>
    <circle cx="13" cy="12.4" r="4.4" fill="#ffffff"/>
  </svg>
`;

export const courtPinIcon = L.divIcon({
  className: "court-map-pin",
  html: PIN_MARKUP,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  tooltipAnchor: [0, -30],
});
