// Keep false until the updated privacy policy is live and existing players
// have been told that profiles can appear in search engines.
export const PROFILE_SEARCH_LISTING_ENABLED = false;

// A profile is listed only when listing is switched on site-wide and the
// player hasn't turned off "Show my profile in search engines" in the app.
export const isProfileListable = (
  profile: { showInSearchEngines?: boolean } | null,
  listingEnabled = PROFILE_SEARCH_LISTING_ENABLED,
): boolean =>
  listingEnabled && !!profile && profile.showInSearchEngines !== false;
