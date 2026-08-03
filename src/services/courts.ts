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

export const createCourt = async ({
  court,
  actorUserId,
}: {
  court: CourtInput;
  actorUserId: string;
}): Promise<Court> => {
  const createdAt = new Date();
  const verifiedAt = new Date();

  const courtReference = await addDoc(collection(db, COURTS_COLLECTION), {
    courtName: court.courtName,
    location: court.location,
    verified: true,
    submittedBy: actorUserId,
    verifiedBy: actorUserId,
    verifiedAt,
    createdAt,
  });

  return {
    courtId: courtReference.id,
    courtName: court.courtName,
    location: court.location,
    verified: true,
    submittedBy: actorUserId,
    verifiedBy: actorUserId,
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

  await updateDoc(courtReference, {
    courtName: court.courtName,
    location: court.location,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
  });
};

export const setCourtVerified = async ({
  courtId,
  verified,
  actorUserId,
}: {
  courtId: string;
  verified: boolean;
  actorUserId: string;
}): Promise<void> => {
  const courtReference = doc(db, COURTS_COLLECTION, courtId);

  if (verified) {
    await updateDoc(courtReference, {
      verified: true,
      verifiedBy: actorUserId,
      verifiedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(courtReference, {
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
  });
};
