import { getClientAuth } from "./firebaseAuth";
import { processContributionPhoto } from "./imageProcessing";
import { generateUuid } from "../lib/uuid";

/**
 * Upload a member profile picture to Firebase Storage and return its download
 * URL + storage path. The image is reprocessed to a display-sized JPEG; the
 * circle crop is applied at render time via framing (x/position/zoom). Storage
 * rules only allow writes under the uploader's own uid.
 */
export async function uploadProfileAvatar(
  file: File,
): Promise<{ url: string; path: string }> {
  const auth = getClientAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before uploading a profile picture.");
  }

  if (!navigator.onLine) {
    throw new Error("Uploading a profile picture needs a network connection.");
  }

  const processed = await processContributionPhoto(file);

  // Lazy-loaded: firebase/storage is only needed when a member actually
  // uploads, so it stays out of the first-paint bundle.
  const { getDownloadURL, getStorage, ref, uploadBytes } = await import(
    "firebase/storage"
  );

  const photoId = generateUuid();
  const path = `profile-avatars/${user.uid}/${photoId}/avatar.jpg`;
  const storage = getStorage();
  const avatarRef = ref(storage, path);

  await uploadBytes(avatarRef, processed.display.blob, {
    contentType: processed.display.mimeType,
    customMetadata: { photoId, derivative: "avatar" },
  });

  const url = await getDownloadURL(avatarRef);
  return { url, path };
}
