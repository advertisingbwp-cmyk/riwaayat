/**
 * Multi-pass client-side image compressor.
 * Guarantees output is strictly bounded under the hard ceiling (default 200 KB)
 * to avoid exceeding Firestore's 1 MiB document limit.
 * Throws on failure or un-renderable canvas rather than returning raw 10MB blobs.
 */

const HARD_CEILING_BYTES = 200 * 1024; // 200 KB

function getBase64ByteSize(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64 = dataUrl.slice(commaIdx + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function compressImage(
  file: File,
  maxDimension = 1200,
  maxBytes = HARD_CEILING_BYTES
): Promise<string> {
  if(file.size>4*1024*1024)throw new Error('Choose a photograph smaller than 4 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= 0 || height <= 0 || width * height > 20000000) {
          reject(new Error('Choose a photograph under 20 megapixels.'));
          return;
        }

        // Initial scale down to maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser 2D canvas context is unavailable.'));
          return;
        }

        let quality = 0.80;
        let finalDataUrl = '';

        // Multi-pass iterative loop
        for (let iteration = 0; iteration < 6; iteration++) {
          canvas.width = Math.max(1, Math.round(width));
          canvas.height = Math.max(1, Math.round(height));

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const byteSize = getBase64ByteSize(dataUrl);
          if (byteSize <= maxBytes) {
            finalDataUrl = dataUrl;
            break;
          }

          // If too large, lower quality first; then downscale dimensions
          if (quality > 0.50) {
            quality -= 0.15;
          } else {
            width *= 0.80;
            height *= 0.80;
          }
        }

        if (!finalDataUrl) {
          reject(
            new Error(
              `Photograph exceeds the maximum allowed size limit of ${Math.round(
                maxBytes / 1024
              )} KB after compression. Please select a different image.`
            )
          );
          return;
        }

        resolve(finalDataUrl);
      };

      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}
