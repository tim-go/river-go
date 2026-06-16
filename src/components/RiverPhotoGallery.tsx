import { useEffect, useState } from "react";
import type { PhotoLightboxItem } from "../types";
import { fetchRiverPhotos, type RiverPhoto } from "../services/riverPhotoApi";

interface RiverPhotoGalleryProps {
  riverId: string;
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
}

// River-wide photo gallery (RIVERDISC-B7): published contribution photos rolled
// up across the river's sections. Self-contained fetch; opens the shared
// lightbox via onOpenPhoto.
export function RiverPhotoGallery({
  riverId,
  onOpenPhoto,
}: RiverPhotoGalleryProps) {
  const [photos, setPhotos] = useState<RiverPhoto[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    fetchRiverPhotos(riverId)
      .then((result) => {
        if (active) {
          setPhotos(result);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setPhotos([]);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [riverId]);

  if (!ready) {
    return null;
  }

  return (
    <div className="watercourse-context">
      <h3>Photos</h3>
      {photos.length ? (
        <div className="river-photo-gallery">
          {photos.map((photo) => {
            const src = photo.displayUrl ?? photo.thumbnailUrl;
            const thumb = photo.thumbnailUrl ?? photo.displayUrl;
            if (!src || !thumb) {
              return null;
            }
            const alt = photo.caption || photo.originalName || "River photo";
            return (
              <button
                key={photo.id}
                type="button"
                className="river-photo-thumb"
                onClick={() =>
                  onOpenPhoto({
                    src,
                    title: photo.caption || "River photo",
                    caption: photo.caption,
                    alt,
                  })
                }
              >
                <img src={thumb} alt={alt} loading="lazy" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">
          No photos yet — add one from a point on this river.
        </p>
      )}
    </div>
  );
}
