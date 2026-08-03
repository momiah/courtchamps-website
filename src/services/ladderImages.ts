import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "../firebase/config";

const LADDER_IMAGES_FOLDER = "LadderImages";

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

export const uploadLadderImage = async ({
  file,
}: {
  file: File;
}): Promise<string> => {
  const uniquePrefix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const storagePath = `${LADDER_IMAGES_FOLDER}/${uniquePrefix}-${sanitizeFileName(
    file.name,
  )}`;
  const imageReference = ref(storage, storagePath);

  await uploadBytes(imageReference, file, { contentType: file.type });
  return getDownloadURL(imageReference);
};
