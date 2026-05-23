import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { ContributionPhoto } from "../types";
import { getClientAuth } from "./firebaseAuth";
import type { ProcessedContributionPhoto } from "./imageProcessing";

export async function uploadContributionPhoto(
  contributionId: string,
  processedPhoto: ProcessedContributionPhoto,
  caption: string,
): Promise<ContributionPhoto> {
  const auth = getClientAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before uploading photos.");
  }

  if (!navigator.onLine) {
    throw new Error("Photo upload needs a network connection for this version.");
  }

  const photoId = crypto.randomUUID();
  const basePath = `contribution-photos/${user.uid}/${contributionId}/${photoId}`;
  const displayPath = `${basePath}/display.jpg`;
  const thumbnailPath = `${basePath}/thumb.jpg`;
  const storage = getStorage();
  const displayRef = ref(storage, displayPath);
  const thumbnailRef = ref(storage, thumbnailPath);

  await uploadBytes(displayRef, processedPhoto.display.blob, {
    contentType: processedPhoto.display.mimeType,
    customMetadata: {
      contributionId,
      photoId,
      derivative: "display",
    },
  });
  await uploadBytes(thumbnailRef, processedPhoto.thumbnail.blob, {
    contentType: processedPhoto.thumbnail.mimeType,
    customMetadata: {
      contributionId,
      photoId,
      derivative: "thumbnail",
    },
  });

  const [displayUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(displayRef),
    getDownloadURL(thumbnailRef),
  ]);

  return {
    id: photoId,
    caption,
    storagePath: displayPath,
    displayPath,
    thumbnailPath,
    displayUrl,
    thumbnailUrl,
    width: processedPhoto.display.width,
    height: processedPhoto.display.height,
    thumbnailWidth: processedPhoto.thumbnail.width,
    thumbnailHeight: processedPhoto.thumbnail.height,
    sizeBytes: processedPhoto.display.sizeBytes,
    thumbnailSizeBytes: processedPhoto.thumbnail.sizeBytes,
    mimeType: processedPhoto.display.mimeType,
    originalName: processedPhoto.original.name,
  };
}
