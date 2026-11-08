export async function nuclearCanvasReencode(
  blob: Blob,
  targetFormat: 'jpeg' | 'png' | 'webp' = 'jpeg',
  quality = 0.95
): Promise<Blob> {
  if (typeof window !== 'undefined') {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to get 2D canvas context'));
            return;
          }

          if (targetFormat === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const mimeType =
            targetFormat === 'png'
              ? 'image/png'
              : targetFormat === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

          canvas.toBlob(
            (cleanBlob) => {
              URL.revokeObjectURL(url);
              if (cleanBlob) {
                resolve(cleanBlob);
              } else {
                reject(new Error('Canvas toBlob conversion failed'));
              }
            },
            mimeType,
            quality
          );
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = async (err) => {
        URL.revokeObjectURL(url);
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const fallbackFile = await imageCompression(blob as File, {
            maxSizeMB: 50,
            useWebWorker: true,
            initialQuality: quality,
            fileType: targetFormat === 'png' ? 'image/png' : 'image/jpeg',
          });
          resolve(fallbackFile);
        } catch (compressionErr) {
          reject(new Error(`Nuclear re-encode failed: ${err}`));
        }
      };

      img.src = url;
    });
  }

  throw new Error('Canvas re-encoding requires browser DOM environment');
}

