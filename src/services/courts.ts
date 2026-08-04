import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { Court, CourtInput, CourtLocation } from "../types/ladder";

const COURTS_COLLECTION = "courts";

interface CourtDocumentData {
  courtName?: string;
  location?: Partial<CourtLocation>;
  verified?: boolean;
  submittedBy?: string;
  verifiedBy?: string | null;
  verifiedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

const toDateOrNull = (value: Timestamp | null | undefined): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

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
});

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

  const courtReference = await addDoc(collection(db, COURTS_COLLECTION), {
    courtName: court.courtName,
    location: court.location,
    verified: isVerified,
    submittedBy: actorUserId,
    verifiedBy,
    verifiedAt,
    createdAt,
  });

  return {
    courtId: courtReference.id,
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
}): Promise<void> => {
  const courtReference = doc(db, COURTS_COLLECTION, courtId);

  // Coordinates are the single source of truth for verification: a court with
  // coordinates is verified, one without is not.
  const isVerified = hasCoordinates(court.location);

  await updateDoc(courtReference, {
    courtName: court.courtName,
    location: court.location,
    verified: isVerified,
    verifiedBy: isVerified ? actorUserId : null,
    verifiedAt: isVerified ? serverTimestamp() : null,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
  });
};
