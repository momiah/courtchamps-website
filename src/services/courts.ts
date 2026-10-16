import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  COURT_SUBMISSION_STATUS,
  Court,
  CourtInput,
  CourtLocation,
  CourtSubmission,
} from "courtchamps-shared/types";
import { notificationSchema, notificationTypes } from "courtchamps-shared/schema";
import { isPendingCourtSubmission } from "courtchamps-shared/helpers";
import { generateCourtId } from "../utils/generateCourtId";

const COURTS_COLLECTION = "courts";
const LADDERS_COLLECTION = "ladders";
const USERS_COLLECTION = "users";
const NOTIFICATIONS_SUBCOLLECTION = "notifications";
const LADDER_MATCHMAKING_TAB = "Matchmaking";

type CourtSubmissionDocument = Omit<
  CourtSubmission,
  "submittedAt" | "reviewedAt"
> & {
  submittedAt?: Timestamp | Date | null;
  reviewedAt?: Timestamp | Date | null;
};

interface CourtDocumentData {
  courtName?: string;
  location?: Partial<CourtLocation>;
  verified?: boolean;
  submittedBy?: string;
  verifiedBy?: string | null;
  verifiedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  submission?: CourtSubmissionDocument;
}

const toDateOrNull = (value: Timestamp | null | undefined): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

const toSubmissionDate = (
  value: Timestamp | Date | null | undefined,
): Date | null =>
  value instanceof Date ? value : toDateOrNull(value as Timestamp | null);

const mapSubmission = (
  submission: CourtSubmissionDocument | undefined,
): CourtSubmission | undefined =>
  submission
    ? {
        ...submission,
        submittedAt: toSubmissionDate(submission.submittedAt) ?? new Date(0),
        reviewedAt: toSubmissionDate(submission.reviewedAt),
      }
    : undefined;

const mapCourtDocument = (
  courtId: string,
  data: CourtDocumentData,
): Court => ({
  courtId,
  courtName: data.courtName ?? "",
  location: {
    address: data.location?.address ?? "",
    city: data.location?.city ?? "",
    country: data.location?.country ?? "",
    countryCode: data.location?.countryCode ?? "",
    postCode: data.location?.postCode ?? "",
    latitude:
      typeof data.location?.latitude === "number"
        ? data.location.latitude
        : null,
    longitude:
      typeof data.location?.longitude === "number"
        ? data.location.longitude
        : null,
  },
  verified: data.verified === true,
  submittedBy: data.submittedBy ?? "",
  verifiedBy: data.verifiedBy ?? null,
  verifiedAt: toDateOrNull(data.verifiedAt),
  createdAt: toDateOrNull(data.createdAt) ?? new Date(0),
  ...(data.submission ? { submission: mapSubmission(data.submission) } : {}),
});

const buildSubmissionNotification = ({
  submission,
  message,
  courtId,
}: {
  submission: Pick<CourtSubmission, "submittedBy" | "ladderId">;
  message: string;
  courtId: string;
}) => ({
  ...notificationSchema,
  createdAt: new Date(),
  recipientId: submission.submittedBy,
  senderId: "system",
  message,
  type: notificationTypes.INFORMATION.LADDER.TYPE,
  data: {
    ladderId: submission.ladderId,
    courtId,
    tab: LADDER_MATCHMAKING_TAB,
  },
});

const submissionNotificationRef = (submittedBy: string) =>
  doc(collection(db, USERS_COLLECTION, submittedBy, NOTIFICATIONS_SUBCOLLECTION));

export const fetchAllCourts = async (): Promise<Court[]> => {
  const courtsQuery = query(
    collection(db, COURTS_COLLECTION),
    orderBy("courtName"),
  );
  const snapshot = await getDocs(courtsQuery);

  return snapshot.docs.map((courtDocument) =>
    mapCourtDocument(courtDocument.id, courtDocument.data() as CourtDocumentData),
  );
};

const hasCoordinates = (location: CourtLocation): boolean =>
  typeof location.latitude === "number" &&
  typeof location.longitude === "number";

export const createCourt = async ({
  court,
  actorUserId,
}: {
  court: CourtInput;
  actorUserId: string;
}): Promise<Court> => {
  const createdAt = new Date();
  // A court is verified purely by having coordinates.
  const isVerified = hasCoordinates(court.location);
  const verifiedAt = isVerified ? new Date() : null;
  const verifiedBy = isVerified ? actorUserId : null;

  const courtId = generateCourtId(court);
  const courtReference = doc(db, COURTS_COLLECTION, courtId);
  await setDoc(courtReference, {
    courtName: court.courtName,
    location: court.location,
    verified: isVerified,
    submittedBy: actorUserId,
    verifiedBy,
    verifiedAt,
    createdAt,
  });

  return {
    courtId,
    courtName: court.courtName,
    location: court.location,
    verified: isVerified,
    submittedBy: actorUserId,
    verifiedBy,
    verifiedAt,
    createdAt,
  };
};

export const updateCourt = async ({
  courtId,
  court,
  actorUserId,
}: {
  courtId: string;
  court: CourtInput;
  actorUserId: string;
}): Promise<CourtSubmission | undefined> => {
  const courtReference = doc(db, COURTS_COLLECTION, courtId);

  // Coordinates are the single source of truth for verification: a court with
  // coordinates is verified, one without is not.
  const isVerified = hasCoordinates(court.location);

  const courtUpdate = {
    courtName: court.courtName,
    location: court.location,
    verified: isVerified,
    verifiedBy: isVerified ? actorUserId : null,
    verifiedAt: isVerified ? serverTimestamp() : null,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
  };

  const existingSnapshot = await getDoc(courtReference);
  const existing = existingSnapshot.exists()
    ? mapCourtDocument(courtId, existingSnapshot.data() as CourtDocumentData)
    : null;
  const submission = existing?.submission;

  if (!isVerified || !submission || !isPendingCourtSubmission(existing)) {
    await updateDoc(courtReference, courtUpdate);
    return submission;
  }

  const reviewedAt = new Date();
  const approvedSubmission: CourtSubmission = {
    ...submission,
    status: COURT_SUBMISSION_STATUS.APPROVED,
    reviewedBy: actorUserId,
    reviewedAt,
  };

  const batch = writeBatch(db);
  batch.update(courtReference, {
    ...courtUpdate,
    submission: approvedSubmission,
  });
  batch.update(doc(db, LADDERS_COLLECTION, submission.ladderId), {
    courtIds: arrayUnion(courtId),
  });
  batch.set(
    submissionNotificationRef(submission.submittedBy),
    buildSubmissionNotification({
      submission,
      courtId,
      message: `${court.courtName} has been approved. You can now select it in ${submission.ladderName}.`,
    }),
  );
  await batch.commit();

  return approvedSubmission;
};

export const deleteCourt = async ({
  courtId,
}: {
  courtId: string;
}): Promise<void> => {
  const courtReference = doc(db, COURTS_COLLECTION, courtId);
  const existingSnapshot = await getDoc(courtReference);
  const existing = existingSnapshot.exists()
    ? mapCourtDocument(courtId, existingSnapshot.data() as CourtDocumentData)
    : null;
  const submission = existing?.submission;

  if (!existing || !submission || !isPendingCourtSubmission(existing)) {
    await deleteDoc(courtReference);
    return;
  }

  const batch = writeBatch(db);
  batch.delete(courtReference);
  batch.set(
    submissionNotificationRef(submission.submittedBy),
    buildSubmissionNotification({
      submission,
      courtId,
      message: `${existing.courtName} was not accepted for ${submission.ladderName}.`,
    }),
  );
  await batch.commit();
};
