import { TranscriptionSegment, TranscriptionWord } from '../../../shared/src/types';
import { SpeechRecognitionService } from './speechRecognitionService';
import { ScriptConversionService } from './scriptConversionService';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';

export interface CaptionGenerationOptions {
  maxWords?: number;
  language?: string;
  script?: 'original' | 'urdu_roman';
}

export interface CaptionGenerationResult {
  language: string;
  detected_language: string;
  provider: string;
  total_duration: number;
  total_segments: number;
  segments: TranscriptionSegment[];
  srt: string;
  vtt: string;
}

/** Groups timestamped speech words by count, pauses, and sentence boundaries. */
export class CaptionService {
  public static groupWordsIntoSegments(
    words: TranscriptionWord[],
    maxWords = 3
  ): TranscriptionSegment[] {
    const isComplete = maxWords >= 16;
    const limit = isComplete ? 40 : Math.max(1, Math.min(25, Math.round(maxWords)));
    const ordered = [...words].filter(word => word.word.trim() && word.end > word.start).sort((a,b) => a.start-b.start);
    const groups: TranscriptionWord[][] = [];
    let current: TranscriptionWord[] = [];
    const sentenceEnd = /[.!?]["\u201d\u2019]*$/;
    const clauseEnd = /[,;:\u2014-]$/;
    for (const word of ordered) {
      const prev = current[current.length - 1];
      const isPause = prev && word.start - prev.end > (isComplete ? 0.75 : 0.55);
      const isComma = !isComplete && limit <= 3 && prev && clauseEnd.test(prev.word) && current.length >= 2;

      if (current.length && (
        current.length >= limit ||
        isPause ||
        isComma
      )) {
        groups.push(current);
        current = [];
      }
      current.push(word);
      if (sentenceEnd.test(word.word)) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length) groups.push(current);
    return groups.map((group, index) => {
      const nextGroup = groups[index + 1];
      const rawEnd = group[group.length - 1].end;
      const seamlessEnd = nextGroup
        ? Math.min(nextGroup[0].start, rawEnd + 0.35)
        : rawEnd;
      return {
        id: 'caption_' + (index + 1),
        start: group[0].start,
        end: Math.max(group[0].start + 0.1, seamlessEnd),
        text: group.map(word => word.word.trim()).join(' ').trim(),
        words: group.map(w => ({ ...w, word: w.word.trim() }))
      };
    });
  }

  public static async generateFromAudio(
    audio: Buffer,
    filename: string,
    options: CaptionGenerationOptions = {}
  ): Promise<CaptionGenerationResult> {
    const maxWords = Math.max(1, Math.min(20, Math.round(options.maxWords ?? 3)));

    const requestedLanguage = options.language?.trim();
    const romanLanguage = requestedLanguage === 'ur_roman' ? 'ur'
      : requestedLanguage === 'hi_roman' ? 'hi' : requestedLanguage;
    const transcription = await SpeechRecognitionService.transcribeAudio(audio, filename, romanLanguage);

    const words: TranscriptionWord[] = [];
    for (const segment of transcription.segments || []) {
      if (segment.words?.length) {
        words.push(...segment.words.filter((word) => word.word.trim() && word.end > word.start));
        continue;
      }

      const tokens = segment.text.trim().split(/\s+/).filter(Boolean);
      const span = Math.max(0, segment.end - segment.start);
      tokens.forEach((word, index) => {
        words.push({
          word,
          start: segment.start + (span * index) / tokens.length,
          end: segment.start + (span * (index + 1)) / tokens.length
        });
      });
    }

    const duration = transcription.duration || (transcription.segments || []).reduce(
      (latest, segment) => Math.max(latest, segment.end), 0
    );
    let segments = this.groupWordsIntoSegments(words, maxWords);

    if (options.script === 'urdu_roman' || requestedLanguage === 'ur_roman' || requestedLanguage === 'hi_roman') {
      const code = requestedLanguage === 'hi_roman' ? 'hi' : (transcription.language_code || 'ur');
      segments = ScriptConversionService.convertTranscriptSegments(segments, 'urdu_roman', code);
    }

    const detectedLanguage = transcription.language_code || transcription.language || 'auto';
    return {
      language: requestedLanguage || detectedLanguage,
      detected_language: detectedLanguage,
      provider: transcription.provider,
      total_duration: duration,
      total_segments: segments.length,
      segments,
      srt: TranscriptExportHelper.toSrt(segments),
      vtt: TranscriptExportHelper.toVtt(segments, filename)
    };
  }
}
