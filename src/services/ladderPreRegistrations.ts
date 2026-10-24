import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  LADDER_PRE_REGISTRATIONS_COLLECTION,
  LADDER_PRE_REGISTRATION_STATUS,
} from "courtchamps-shared/types";
import type {
  GenderType,
  LadderPreRegistrant,
  LadderPreRegistration,
  LadderPreRegistrationDetails,
  LadderPreRegistrationStatus,
  LadderType,
} from "courtchamps-shared/types";

export type LadderPreRegistrationInput = LadderPreRegistrationDetails & {
  expectedOpensAt: Date | null;
};

const toDate = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

const mapPreRegistration = (
  preRegistrationId: string,
  data: Record<string, unknown>,
): LadderPreRegistration => ({
  preRegistrationId,
  name: String(data.name ?? ""),
  description: String(data.description ?? ""),
  image: String(data.image ?? ""),
  region: String(data.region ?? ""),
  countryCode: String(data.countryCode ?? ""),
  ladderType: (data.ladderType as LadderType) ?? "Singles",
  genderType: (data.genderType as GenderType) ?? "Mixed",
  entryFee: Number(data.entryFee ?? 0),
  currencyType: String(data.currencyType ?? "GBP"),
  maxPlayers: Number(data.maxPlayers ?? 0),
  status:
    (data.status as LadderPreRegistrationStatus) ??
    LADDER_PRE_REGISTRATION_STATUS.CLOSED,
  expectedOpensAt: toDate(data.expectedOpensAt),
  ladderId: (data.ladderId as string | null) ?? null,
  notifiedAt: toDate(data.notifiedAt),
  createdBy: String(data.createdBy ?? ""),
  createdAt: toDate(data.createdAt) ?? new Date(0),
  updatedBy: String(data.updatedBy ?? ""),
  updatedAt: toDate(data.updatedAt) ?? new Date(0),
});

const preRegistrationRef = (preRegistrationId: string) =>
  doc(db, LADDER_PRE_REGISTRATIONS_COLLECTION, preRegistrationId);

const registrantsRef = (preRegistrationId: string) =>
  collection(
    db,
    LADDER_PRE_REGISTRATIONS_COLLECTION,
    preRegistrationId,
    LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  );

export const fetchLadderPreRegistrations = async (): Promise<
  LadderPreRegistration[]
> => {
  const snapshot = await getDocs(
    query(
      collection(db, LADDER_PRE_REGISTRATIONS_COLLECTION),
      orderBy("createdAt", "desc"),
    ),
  );
  return snapshot.docs.map((preRegistration) =>
    mapPreRegistration(preRegistration.id, preRegistration.data()),
  );
};

export const fetchLadderPreRegistration = async (
  preRegistrationId: string,
): Promise<LadderPreRegistration | null> => {
  const snapshot = await getDoc(preRegistrationRef(preRegistrationId));
  return snapshot.exists()
    ? mapPreRegistration(snapshot.id, snapshot.data())
    : null;
};

export const createLadderPreRegistration = async ({
  input,
  actorUserId,
}: {
  input: LadderPreRegistrationInput;
  actorUserId: string;
}): Promise<string> => {
  const now = new Date();
  const created = await addDoc(
    collection(db, LADDER_PRE_REGISTRATIONS_COLLECTION),
    {
      ...input,
      status: LADDER_PRE_REGISTRATION_STATUS.OPEN,
      ladderId: null,
      notifiedAt: null,
      createdBy: actorUserId,
      createdAt: now,
      updatedBy: actorUserId,
      updatedAt: now,
    },
  );
  return created.id;
};

export const updateLadderPreRegistration = async ({
  preRegistrationId,
  input,
  actorUserId,
}: {
  preRegistrationId: string;
  input: LadderPreRegistrationInput;
  actorUserId: string;
}): Promise<void> => {
  await updateDoc(preRegistrationRef(preRegistrationId), {
    ...input,
    updatedBy: actorUserId,
    updatedAt: new Date(),
  });
};

/** Open shows a pre-registration in the app; closed hides it. */
export const setLadderPreRegistrationOpen = async ({
  preRegistrationId,
  open,
  actorUserId,
}: {
  preRegistrationId: string;
  open: boolean;
  actorUserId: string;
}): Promise<void> => {
  await updateDoc(preRegistrationRef(preRegistrationId), {
    status: open
      ? LADDER_PRE_REGISTRATION_STATUS.OPEN
      : LADDER_PRE_REGISTRATION_STATUS.CLOSED,
    updatedBy: actorUserId,
    updatedAt: new Date(),
  });
};

export const countLadderPreRegistrants = async (
  preRegistrationId: string,
): Promise<number> =>
  (await getCountFromServer(registrantsRef(preRegistrationId))).data().count;

export const fetchLadderPreRegistrants = async (
  preRegistrationId: string,
): Promise<LadderPreRegistrant[]> => {
  const snapshot = await getDocs(
    query(registrantsRef(preRegistrationId), orderBy("createdAt", "asc")),
  );
  return snapshot.docs.map((registrant) => {
    const data = registrant.data();
    return {
      userId: String(data.userId ?? registrant.id),
      email: String(data.email ?? ""),
      createdAt: toDate(data.createdAt) ?? new Date(0),
      notifiedAt: toDate(data.notifiedAt),
    };
  });
};
