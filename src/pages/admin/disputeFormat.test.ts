import { DISPUTE_EVENT_TYPE } from "courtchamps-shared/types";
import { isAdminActor } from "./disputeFormat";

const participants = ["p1", "p2", "p3", "p4"];

describe("isAdminActor", () => {
  it("treats resolved, voided and evidence-requested events by a non-participant as admin", () => {
    [
      DISPUTE_EVENT_TYPE.RESOLVED,
      DISPUTE_EVENT_TYPE.VOIDED,
      DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED,
    ].forEach((type) => {
      expect(isAdminActor(type, "admin-uid", participants)).toBe(true);
    });
  });

  it("shows a participant who resolved the dispute as that player, not admin", () => {
    expect(isAdminActor(DISPUTE_EVENT_TYPE.RESOLVED, "p2", participants)).toBe(
      false,
    );
  });

  it("never treats player-authored events as admin", () => {
    [
      DISPUTE_EVENT_TYPE.OPENED,
      DISPUTE_EVENT_TYPE.EVIDENCE_SUBMITTED,
      DISPUTE_EVENT_TYPE.NOTES_SUBMITTED,
      DISPUTE_EVENT_TYPE.CANCELLED,
    ].forEach((type) => {
      expect(isAdminActor(type, "p1", participants)).toBe(false);
    });
  });

  it("still reads as admin when no participants are known", () => {
    expect(isAdminActor(DISPUTE_EVENT_TYPE.RESOLVED, "anyone")).toBe(true);
  });
});
