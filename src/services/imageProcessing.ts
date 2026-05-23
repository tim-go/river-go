export interface ProcessedContributionPhoto {
  display: ProcessedImage;
  thumbnail: ProcessedImage;
  original: {
    name: string;
    sizeBytes: number;
    mimeType: string;
    width: number;
    height: number;
  };
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

const MAX_INPUT_SIZE_BYTES = 20 * 1024 * 1024;
const DISPLAY_MAX_DIMENSION = 1600;
const THUMBNAIL_MAX_DIMENSION = 480;
const DISPLAY_QUALITY = 0.82;
const THUMBNAIL_QUALITY = 0.76;
const OUTPUT_MIME_TYPE = "image/jpeg";

export async function processContributionPhoto(
  file: File,
): Promise<ProcessedContributionPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > MAX_INPUT_SIZE_BYTES) {
    throw new Error("Choose a photo below 20 MB.");
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const display = await resizeBitmap(
      bitmap,
      DISPLAY_MAX_DIMENSION,
      DISPLAY_QUALITY,
    );
    const thumbnail = await resizeBitmap(
      bitmap,
      THUMBNAIL_MAX_DIMENSION,
      THUMBNAIL_QUALITY,
    );

    return {
      display,
      thumbnail,
      original: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        width: bitmap.width,
        height: bitmap.height,
      },
    };
  } finally {
    bitmap.close();
  }
}

async function resizeBitmap(
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<ProcessedImage> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error("Could not resize this photo in the browser.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, OUTPUT_MIME_TYPE, quality);

  return {
    blob,
    width,
    height,
    sizeBytes: blob.size,
    mimeType: blob.type || OUTPUT_MIME_TYPE,
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the resized photo."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
