import { isProfileListable } from "./profileListing";

describe("isProfileListable", () => {
  it("never lists a profile while listing is switched off", () => {
    expect(isProfileListable({ showInSearchEngines: true }, false)).toBe(false);
    expect(isProfileListable({}, false)).toBe(false);
  });

  it("lists players who haven't opted out once listing is on", () => {
    expect(isProfileListable({ showInSearchEngines: true }, true)).toBe(true);
    expect(isProfileListable({}, true)).toBe(true);
  });

  it("never lists players who opted out", () => {
    expect(isProfileListable({ showInSearchEngines: false }, true)).toBe(false);
  });

  it("does not list a profile that hasn't loaded", () => {
    expect(isProfileListable(null, true)).toBe(false);
  });
});
