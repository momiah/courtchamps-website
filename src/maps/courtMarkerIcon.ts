const PIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='34' viewBox='0 0 26 34'><path d='M13 0.5C6.4 0.5 1 5.9 1 12.5c0 8.8 12 20.7 12 20.7s12-11.9 12-20.7C25 5.9 19.6 0.5 13 0.5z' fill='%230099f0' stroke='%23ffffff' stroke-width='2'/><circle cx='13' cy='12.4' r='4.4' fill='%23ffffff'/></svg>`;

export const COURT_PIN_URL = `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`;

// Built lazily because google.maps.Size/Point only exist once the API is loaded.
export const buildCourtPinIcon = (): google.maps.Icon | undefined => {
  if (typeof google === "undefined" || !google.maps) {
    return undefined;
  }
  return {
    url: COURT_PIN_URL,
    scaledSize: new google.maps.Size(26, 34),
    anchor: new google.maps.Point(13, 34),
  };
};
