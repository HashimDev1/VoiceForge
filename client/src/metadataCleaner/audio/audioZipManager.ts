import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { AudioItem } from './audioTypes';

export function getCleanAudioFileName(originalName: string, format?: string): string {
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot === -1) {
    return `${originalName}_clean.${format || 'mp3'}`;
  }
  const base = originalName.substring(0, lastDot);
  const ext = originalName.substring(lastDot + 1);
  return `${base}_clean.${ext}`;
}

export function downloadSingleAudio(item: AudioItem) {
  if (!item.cleanedBlob) return;
  const filename = getCleanAudioFileName(item.name, item.format);
  saveAs(item.cleanedBlob, filename);
}

export async function downloadAudioBatchAsZip(
  items: AudioItem[],
  zipFilename = 'clean_audio_batch.zip'
): Promise<void> {
  const cleanedItems = items.filter((i) => i.cleanedBlob !== null);
  if (cleanedItems.length === 0) return;

  const zip = new JSZip();

  cleanedItems.forEach((item) => {
    const filename = getCleanAudioFileName(item.name, item.format);
    if (item.cleanedBlob) {
      zip.file(filename, item.cleanedBlob);
    }
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(zipBlob, zipFilename);
}

