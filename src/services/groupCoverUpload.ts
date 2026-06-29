import { getClientAuth } from "./firebaseAuth";
import { processContributionPhoto } from "./imageProcessing";
import { generateUuid } from "../lib/uuid";

/**
 * Upload a group cover photo to Firebase Storage and return its download URL +
 * storage path. The image is reprocessed to a display-sized JPEG. The API
 * authorises whether the uploader may attach it to the group (managers only);
 * storage rules only require the upload to live under the uploader's own uid.
 */
export async function uploadGroupCover(
  groupId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const auth = getClientAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before uploading a cover photo.");
  }

  if (!navigator.onLine) {
    throw new Error("Uploading a cover needs a network connection.");
  }

  const processed = await processContributionPhoto(file);

  // Lazy-loaded: firebase/storage is only needed when a manager actually
  // uploads, so it stays out of the first-paint bundle.
  const { getDownloadURL, getStorage, ref, uploadBytes } = await import(
    "firebase/storage"
  );

  const photoId = generateUuid();
  const path = `group-covers/${user.uid}/${groupId}/${photoId}/cover.jpg`;
  const storage = getStorage();
  const coverRef = ref(storage, path);

  await uploadBytes(coverRef, processed.display.blob, {
    contentType: processed.display.mimeType,
    customMetadata: { groupId, photoId, derivative: "cover" },
  });

  const url = await getDownloadURL(coverRef);
  return { url, path };
}
