import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem } from './types';

export function getCleanFileName(originalName: string, targetFormat?: string): string {
  const dotIndex = originalName.lastIndexOf('.');
  const base = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const ext = dotIndex !== -1 ? originalName.substring(dotIndex + 1).toLowerCase() : 'jpg';

  let finalExt = ext;
  if (ext === 'heic' || ext === 'heif') {
    finalExt = 'jpg';
  } else if (targetFormat) {
    finalExt = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
  }

  return `${base}_clean.${finalExt}`;
}

export function downloadSingleImage(item: ImageItem): void {
  if (!item.cleanedBlob) return;
  const filename = getCleanFileName(item.name, item.format);
  saveAs(item.cleanedBlob, filename);
}

export async function downloadAllAsZip(
  items: ImageItem[],
  zipName = 'cleaned_images.zip',
  onProgress?: (percent: number) => void
): Promise<void> {
  const readyItems = items.filter((item) => item.status === 'done' && item.cleanedBlob);
  if (readyItems.length === 0) return;

  const zip = new JSZip();
  const nameCounts = new Map<string, number>();

  readyItems.forEach((item) => {
    let filename = getCleanFileName(item.name, item.format);
    const count = nameCounts.get(filename) || 0;
    if (count > 0) {
      const dotIndex = filename.lastIndexOf('.');
      const base = filename.substring(0, dotIndex);
      const ext = filename.substring(dotIndex + 1);
      filename = `${base}_${count}.${ext}`;
    }
    nameCounts.set(filename, count + 1);

    zip.file(filename, item.cleanedBlob!);
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  saveAs(zipBlob, zipName);
}

