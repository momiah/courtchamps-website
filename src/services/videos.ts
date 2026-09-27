import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase/config";
import { GameVideo } from "courtchamps-shared/types";

const GAME_VIDEOS = "gameVideos";

export interface VideoListItem extends GameVideo {
  /** Firestore document id — used to open the video at /videos?v=<id>. */
  id: string;
}

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  const candidate = value as {
    toMillis?: () => number;
    seconds?: number;
  };
  if (typeof candidate.toMillis === "function") return candidate.toMillis();
  if (typeof candidate.seconds === "number") return candidate.seconds * 1000;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value instanceof Date) return value.getTime();
  return 0;
};

const newestFirst = (a: VideoListItem, b: VideoListItem) =>
  toMillis(b.createdAt) - toMillis(a.createdAt);

/** Videos uploaded by the player (approved ones only, newest first). */
export const getUploadedVideos = async (
  userId: string,
): Promise<VideoListItem[]> => {
  const snapshot = await getDocs(
    query(collection(db, GAME_VIDEOS), where("postedBy.userId", "==", userId)),
  );

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as GameVideo) }))
    .filter((video) => video.videoApproved !== false)
    .sort(newestFirst);
};

/**
 * Approved videos the player appears in but did not upload themselves. Uses a
 * single array-contains filter and narrows client-side to avoid needing a
 * composite index.
 */
export const getVideosOfPlayer = async (
  userId: string,
): Promise<VideoListItem[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, GAME_VIDEOS),
      where("playerIds", "array-contains", userId),
    ),
  );

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as GameVideo) }))
    .filter(
      (video) =>
        video.videoApproved === true && video.postedBy?.userId !== userId,
    )
    .sort(newestFirst);
};
