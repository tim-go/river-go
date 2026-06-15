import { useEffect } from "react";
import { X } from "lucide-react";
import type { PhotoLightboxItem } from "../types";

export function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: PhotoLightboxItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="photo-lightbox-backdrop" role="presentation" onClick={onClose}>
      <section
        className="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={photo.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button photo-lightbox__close"
          type="button"
          aria-label="Close photo"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <img src={photo.src} alt={photo.alt ?? photo.title} />
        <footer>
          <strong>{photo.title}</strong>
          {photo.caption ? <span>{photo.caption}</span> : null}
        </footer>
      </section>
    </div>
  );
}
