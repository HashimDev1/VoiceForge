import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { VideoItem } from './videoTypes';

export function getCleanVideoFileName(originalName: string, format?: string): string {
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot === -1) {
    return `${originalName}_clean.${format || 'mp4'}`;
  }
  const base = originalName.substring(0, lastDot);
  const ext = originalName.substring(lastDot + 1);
  return `${base}_clean.${ext}`;
}

export function downloadSingleVideo(item: VideoItem) {
  if (!item.cleanedBlob) return;
  const filename = getCleanVideoFileName(item.name, item.format);
  saveAs(item.cleanedBlob, filename);
}

export async function downloadVideoBatchAsZip(
  items: VideoItem[],
  zipFilename = 'clean_videos_batch.zip'
): Promise<void> {
  const cleanedItems = items.filter((i) => i.cleanedBlob !== null);
  if (cleanedItems.length === 0) return;

  const zip = new JSZip();

  cleanedItems.forEach((item) => {
    const filename = getCleanVideoFileName(item.name, item.format);
    if (item.cleanedBlob) {
      zip.file(filename, item.cleanedBlob);
    }
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE', // videos are already compressed
  });

  saveAs(zipBlob, zipFilename);
}

