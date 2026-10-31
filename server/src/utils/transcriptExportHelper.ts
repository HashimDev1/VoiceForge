import { TranscriptionSegment } from '../../../shared/src/types';

export class TranscriptExportHelper {
  /**
   * Format seconds to HH:MM:SS.mmm for readable transcripts
   */
  public static formatTimestamp(sec: number, separator: '.' | ',' = '.'): string {
    const s = Math.max(0, Number(sec || 0));
    const totalMs = Math.round(s * 1000);
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(3, '0');

    return `${hStr}:${mStr}:${sStr}${separator}${msStr}`;
  }

  /**
   * Formats segments into human-readable timestamped TXT
   * [00:00:02.400 – 00:00:05.100] Segment text
   */
  public static toTxt(segments: TranscriptionSegment[], title?: string): string {
    const lines: string[] = [];
    if (title) {
      lines.push(`# ${title}`);
      lines.push('');
    }

    segments.forEach((seg) => {
      const start = this.formatTimestamp(seg.start, '.');
      const end = this.formatTimestamp(seg.end, '.');
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : '';
      lines.push(`[${start} – ${end}] ${speakerPrefix}${seg.text}`);
    });

    return lines.join('\n');
  }

  /**
   * Formats segments into valid SubRip (SRT) subtitle file
   * Note: SRT strictly uses commas (,) for millisecond separator
   */
  public static toSrt(segments: TranscriptionSegment[]): string {
    const blocks: string[] = [];

    segments.forEach((seg, index) => {
      const idx = index + 1;
      const start = this.formatTimestamp(seg.start, ',');
      const end = this.formatTimestamp(seg.end, ',');
      const text = seg.text.trim();

      blocks.push(`${idx}\n${start} --> ${end}\n${text}`);
    });

    return blocks.join('\n\n') + '\n';
  }

  /**
   * Formats segments into valid WebVTT (.vtt) subtitle file
   * Note: WebVTT starts with WEBVTT and uses periods (.) for millisecond separator
   */
  public static toVtt(segments: TranscriptionSegment[], title?: string): string {
    const lines: string[] = ['WEBVTT'];
    if (title) {
      lines.push(`NOTE Title: ${title}`);
    }
    lines.push('');

    segments.forEach((seg, index) => {
      const start = this.formatTimestamp(seg.start, '.');
      const end = this.formatTimestamp(seg.end, '.');
      const text = seg.text.trim();

      lines.push(`${index + 1}`);
      lines.push(`${start} --> ${end}`);
      lines.push(text);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Formats project and segments into clean, structured JSON
   */
  public static toJson(projectData: any): string {
    return JSON.stringify(projectData, null, 2);
  }
}
