import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export interface MemberPhoto {
  id: string;
  contributionId: string;
  sectionId: string | null;
  contributionType: string;
  contributionTitle: string;
  contributionDetail: string;
  contributionModerationStatus: string;
  photoModerationStatus: string;
  caption: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  displayPath: string | null;
  thumbnailPath: string | null;
  originalName: string | null;
  createdAt: string;
  author: {
    id: string | null;
    displayName: string | null;
    email: string | null;
  };
}

export async function fetchMyPhotos(): Promise<MemberPhoto[]> {
  return fetchPhotoEndpoint<{ photos: MemberPhoto[] }>("/api/me/photos").then(
    (result) => result.photos,
  );
}

export async function deletePhoto(photoId: string): Promise<MemberPhoto> {
  return fetchPhotoEndpoint<{ photo: MemberPhoto }>(
    `/api/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  ).then((result) => result.photo);
}

async function fetchPhotoEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before managing photos.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    method: options.method ?? "GET",
  });

  if (!response.ok) {
    throw new Error(`Photo API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
