export const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? "";

// Advanced Markers require a Map ID; fall back to Google's demo id when the
// project has not created its own.
export const GOOGLE_MAPS_MAP_ID =
  process.env.REACT_APP_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
