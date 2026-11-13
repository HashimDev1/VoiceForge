import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { TranscriptionSegment, TranscriptionWord } from '../../../shared/src/types';
import {
  AsrTranscribeOptions,
  SpeechRecognitionResult,
  SpeechRecognitionService
} from './speechRecognitionService';
import { ScriptConversionService } from './scriptConversionService';
import { TranscriptExportHelper } from '../utils/transcriptExportHelper';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import {
  CaptionError,
  CaptionRequestDiagnostics
} from '../utils/captionDiagnostics';

export interface CaptionGenerationOptions {
  maxWords?: number;
  language?: string;
  script?: 'original' | 'urdu_roman';
  asrOptions?: AsrTranscribeOptions;
  chunkDurationSec?: number;
  chunkOverlapSec?: number;
  maxChunkBytes?: number;
  knownDurationSec?: number;
  disableAutoChunking?: boolean;
  diagnostics?: CaptionRequestDiagnostics;
}

export interface CaptionGenerationResult {
  language: string;
  detected_language: string;
  provider: string;
  timing_mode: 'word' | 'estimated';
  estimated_timing: boolean;
  chunk_count: number;
  total_duration: number;
  total_segments: number;
  segments: TranscriptionSegment[];
  srt: string;
  vtt: string;
}

export interface ChunkWordStream {
  offsetSec: number;
  overlapSec: number;
  words: TranscriptionWord[];
}

function normalizeWordToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();
}

/** Groups timestamped speech words by count, pauses, and sentence boundaries. */
export class CaptionService {
  public static groupWordsIntoSegments(
    words: TranscriptionWord[],
    maxWords = 3
  ): TranscriptionSegment[] {
    const isComplete = maxWords >= 16;
    const limit = isComplete ? 40 : Math.max(1, Math.min(25, Math.round(maxWords)));
    const ordered = [...words]
      .filter((word) => word.word.trim() && Number.isFinite(word.start) && word.end > word.start)
      .sort((a, b) => a.start - b.start);

    const groups: TranscriptionWord[][] = [];
    let current: TranscriptionWord[] = [];
    const sentenceEnd = /[.!?]["\u201d\u2019\u06d4\u061f\u0964]*$/;
    const clauseEnd = /[,;:\u2014-]$/;

    for (const word of ordered) {
      const prev = current[current.length - 1];
      const isPause = prev && word.start - prev.end > (isComplete ? 0.75 : 0.55);
      const isComma = !isComplete && limit <= 3 && prev && clauseEnd.test(prev.word) && current.length >= 2;

      if (current.length && (current.length >= limit || isPause || isComma)) {
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
      const isEstimatedGroup = group.some((w) => w.estimated === true);

      return {
        id: 'caption_' + (index + 1),
        start: group[0].start,
        end: Math.max(group[0].start + 0.1, seamlessEnd),
        text: group.map((word) => word.word.trim()).join(' ').trim(),
        words: group.map((w) => ({ ...w, word: w.word.trim() })),
        estimated: isEstimatedGroup
      };
    });
  }

  /**
   * Extracts timestamped words from a single SpeechRecognitionResult.
   * Never overwrites genuine word-level timestamps with evenly distributed timings.
   * Explicitly marks `estimated: true` whenever fallback interpolation is used.
   */
  public static extractWordsFromTranscription(
    transcription: SpeechRecognitionResult
  ): { words: TranscriptionWord[]; estimatedTiming: boolean } {
    const words: TranscriptionWord[] = [];
    let usedEstimated = Boolean(transcription.estimatedTiming);

    const segments = transcription.segments || [];
    if (segments.length > 0) {
      for (const segment of segments) {
        const realSegWords = (segment.words || []).filter(
          (w) => w.word && w.word.trim() && Number.isFinite(w.start) && w.end > w.start
        );
        if (realSegWords.length > 0) {
          for (const w of realSegWords) {
            if (w.estimated) usedEstimated = true;
            words.push({
              word: w.word.trim(),
              start: w.start,
              end: w.end,
              confidence: w.confidence,
              estimated: Boolean(w.estimated)
            });
          }
          continue;
        }

        const tokens = (segment.text || '').trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) continue;
        usedEstimated = true;
        const span = Math.max(0.1, segment.end - segment.start);
        tokens.forEach((token, index) => {
          words.push({
            word: token,
            start: segment.start + (span * index) / tokens.length,
            end: segment.start + (span * (index + 1)) / tokens.length,
            estimated: true
          });
        });
      }
    } else if (transcription.words && transcription.words.length > 0) {
      for (const w of transcription.words) {
        if (!w.word || !w.word.trim() || !Number.isFinite(w.start) || w.end <= w.start) continue;
        if (w.estimated) usedEstimated = true;
        words.push({
          word: w.word.trim(),
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          estimated: Boolean(w.estimated)
        });
      }
    }

    // Fallback only when segments and words were empty but raw text was returned
    if (words.length === 0 && transcription.text && transcription.text.trim()) {
      const tokens = transcription.text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        usedEstimated = true;
        const totalDur = Math.max(1, transcription.duration || tokens.length * 0.4);
        const span = totalDur / tokens.length;
        tokens.forEach((token, index) => {
          words.push({
            word: token,
            start: index * span,
            end: (index + 1) * span,
            estimated: true
          });
        });
      }
    }

    return { words, estimatedTiming: usedEstimated };
  }

  /**
   * Merges word streams from sequential overlapping audio chunks, applying exact chunk
   * timestamp offsets, seam midpoint handover, and boundary duplicate word removal.
   */
  public static mergeChunkWordStreams(chunks: ChunkWordStream[]): TranscriptionWord[] {
    const merged: TranscriptionWord[] = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const shifted: TranscriptionWord[] = chunk.words
        .filter((w) => w.word && w.word.trim() && Number.isFinite(w.start) && w.end > w.start)
        .map((w) => ({
          ...w,
          word: w.word.trim(),
          start: Number((w.start + chunk.offsetSec).toFixed(3)),
          end: Number((w.end + chunk.offsetSec).toFixed(3))
        }))
        .sort((a, b) => a.start - b.start);

      if (shifted.length === 0) continue;

      if (idx === 0 || merged.length === 0) {
        merged.push(...shifted);
        continue;
      }

      const overlap = Math.max(0, chunk.overlapSec);
      const seamMid = chunk.offsetSec + overlap / 2;

      // Trim words in the tail of the previous chunk that lie past the overlap midpoint
      while (merged.length > 0) {
        const tail = merged[merged.length - 1];
        const tailMid = (tail.start + tail.end) / 2;
        if (tailMid > seamMid) {
          merged.pop();
        } else {
          break;
        }
      }

      const lastKept = merged[merged.length - 1];
      const cutoff = lastKept ? Math.max(chunk.offsetSec, lastKept.end - 0.04) : chunk.offsetSec;

      for (const candidate of shifted) {
        const candMid = (candidate.start + candidate.end) / 2;
        if (lastKept && candMid <= cutoff) {
          continue;
        }

        // Prevent duplicate words straddling the seam boundary
        const candNorm = normalizeWordToken(candidate.word);
        let isDuplicate = false;
        const checkStart = Math.max(0, merged.length - 3);
        for (let m = checkStart; m < merged.length; m++) {
          const prev = merged[m];
          if (
            candNorm &&
            candNorm === normalizeWordToken(prev.word) &&
            Math.abs(candidate.start - prev.start) < 0.65
          ) {
            isDuplicate = true;
            break;
          }
        }
        if (isDuplicate) continue;

        const prevWord = merged[merged.length - 1];
        let clampedStart = candidate.start;
        let clampedEnd = candidate.end;
        if (prevWord && clampedStart < prevWord.end) {
          clampedStart = prevWord.end;
          clampedEnd = Math.max(clampedStart + 0.04, clampedEnd);
        }

        merged.push({
          ...candidate,
          start: clampedStart,
          end: clampedEnd
        });
      }
    }

    return merged;
  }

  /**
   * Transcribes an audio file on disk (supporting both short clips and chunked long recordings)
   * without buffering large uncompressed media into RAM.
   */
  public static async generateFromAudioFile(
    audioPath: string,
    originalFilename: string,
    options: CaptionGenerationOptions = {}
  ): Promise<CaptionGenerationResult> {
    const maxWords = Math.max(1, Math.min(20, Math.round(options.maxWords ?? 3)));
    const requestedLanguage = options.language?.trim();
    const romanLanguage =
      requestedLanguage === 'ur_roman'
        ? 'ur'
        : requestedLanguage === 'hi_roman'
          ? 'hi'
          : requestedLanguage;

    const maxChunkBytes = options.maxChunkBytes
      ?? options.asrOptions?.maxUploadBytes
      ?? (process.env.ASR_MAX_UPLOAD_BYTES ? parseInt(process.env.ASR_MAX_UPLOAD_BYTES, 10) : config.asrMaxUploadBytes);
    const chunkDurationSec = options.chunkDurationSec
      ?? (process.env.ASR_CHUNK_DURATION_SEC ? parseInt(process.env.ASR_CHUNK_DURATION_SEC, 10) : config.asrChunkDurationSec);
    const chunkOverlapSec = options.chunkOverlapSec
      ?? (process.env.ASR_CHUNK_OVERLAP_SEC ? parseFloat(process.env.ASR_CHUNK_OVERLAP_SEC) : config.asrChunkOverlapSec);

    const stat = await fs.promises.stat(audioPath).catch(() => null);
    if (!stat || stat.size === 0) {
      throw new CaptionError(
        'NO_AUDIO_TRACK',
        422,
        'audio_extraction',
        'Extracted audio file is empty or missing.'
      );
    }

    const mediaDuration =
      options.knownDurationSec && options.knownDurationSec > 0
        ? options.knownDurationSec
        : await FFmpegHelper.getMediaDuration(audioPath);

    const needsChunking =
      !options.disableAutoChunking &&
      ((mediaDuration > 0 && mediaDuration > chunkDurationSec * 1.15) || stat.size > maxChunkBytes);

    if (!needsChunking) {
      options.diagnostics?.setStage('asr_transcription');
      const transcription = await SpeechRecognitionService.transcribeAudioFile(
        audioPath,
        originalFilename,
        romanLanguage,
        { ...options.asrOptions, maxUploadBytes: maxChunkBytes }
      );
      if (options.diagnostics && transcription.provider !== 'fallback') {
        options.diagnostics.selectedProvider = transcription.provider;
      }

      return this.finalizeSingleTranscription(
        transcription,
        originalFilename,
        requestedLanguage,
        maxWords,
        options,
        mediaDuration
      );
    }

    // Long audio / oversized audio path: slice into compressed MP3 chunks on disk
    options.diagnostics?.setStage('audio_chunking');
    const chunkTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-asr-chunks-'));
    try {
      let effectiveChunkDuration = chunkDurationSec;
      if (stat.size > maxChunkBytes && mediaDuration > 0) {
        const safeRatio = (maxChunkBytes * 0.75) / stat.size;
        effectiveChunkDuration = Math.max(10, Math.min(chunkDurationSec, Math.floor(mediaDuration * safeRatio)));
      }

      const slices = await FFmpegHelper.splitAudioIntoChunks(audioPath, chunkTempDir, {
        totalDurationSec: mediaDuration,
        chunkDurationSec: effectiveChunkDuration,
        overlapSec: chunkOverlapSec,
        format: 'mp3'
      });

      if (slices.length === 0) {
        throw new CaptionError(
          'NO_AUDIO_TRACK',
          422,
          'audio_chunking',
          'Could not extract speech audio chunks from this media file.'
        );
      }

      options.diagnostics?.setStage('asr_transcription');
      const chunkStreams: ChunkWordStream[] = [];
      let detectedLanguage = 'auto';
      let detectedLanguageCode = '';
      let activeProvider = 'fallback';
      let anyEstimated = false;

      for (const slice of slices) {
        try {
          if (slice.sizeBytes > maxChunkBytes) {
            throw new CaptionError(
              'AUDIO_TOO_LARGE',
              413,
              'asr_transcription',
              `Audio chunk (${(slice.sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds speech recognition upload limit.`
            );
          }

          const chunkResult = await SpeechRecognitionService.transcribeAudioFile(
            slice.filePath,
            path.basename(slice.filePath),
            romanLanguage,
            { ...options.asrOptions, maxUploadBytes: maxChunkBytes }
          );

          if (chunkResult.provider !== 'fallback') {
            activeProvider = chunkResult.provider;
            if (options.diagnostics) {
              options.diagnostics.selectedProvider = chunkResult.provider;
            }
          }

          if (chunkResult.errorCode && chunkResult.errorCode !== 'NO_SPEECH_DETECTED') {
            throw new CaptionError(
              chunkResult.errorCode,
              chunkResult.httpStatus || 503,
              'asr_transcription',
              chunkResult.error || 'Speech recognition failed while processing long audio.',
              { provider: chunkResult.provider !== 'fallback' ? chunkResult.provider : undefined }
            );
          }

          // Silent chunk (e.g. music interlude) in a multi-chunk recording simply contributes 0 words
          if (chunkResult.errorCode === 'NO_SPEECH_DETECTED') {
            continue;
          }

          if (!detectedLanguageCode && chunkResult.language_code) {
            detectedLanguageCode = chunkResult.language_code;
            detectedLanguage = chunkResult.language_code || chunkResult.language || 'auto';
          }

          const extracted = this.extractWordsFromTranscription(chunkResult);
          if (extracted.estimatedTiming) {
            anyEstimated = true;
          }
          chunkStreams.push({
            offsetSec: slice.offsetSec,
            overlapSec: slice.index === 0 ? 0 : chunkOverlapSec,
            words: extracted.words
          });
        } finally {
          // Immediately delete processed chunk from disk to keep temp storage tiny
          if (fs.existsSync(slice.filePath)) {
            await fs.promises.unlink(slice.filePath).catch(() => {});
          }
        }
      }

      const mergedWords = this.mergeChunkWordStreams(chunkStreams);
      if (mergedWords.length === 0) {
        if (options.diagnostics) {
          options.diagnostics.transcriptionStatus = 'empty_speech';
        }
        throw new CaptionError(
          'NO_SPEECH_DETECTED',
          422,
          'asr_transcription',
          'No recognizable speech was detected in this media file.'
        );
      }

      options.diagnostics?.setStage('caption_grouping');
      let segments = this.groupWordsIntoSegments(mergedWords, maxWords);

      if (
        options.script === 'urdu_roman' ||
        requestedLanguage === 'ur_roman' ||
        requestedLanguage === 'hi_roman'
      ) {
        const code = requestedLanguage === 'hi_roman' ? 'hi' : (detectedLanguageCode || 'ur');
        segments = ScriptConversionService.convertTranscriptSegments(segments, 'urdu_roman', code);
      }

      const totalDuration = Math.max(
        mediaDuration || 0,
        mergedWords[mergedWords.length - 1]?.end || 0
      );

      if (options.diagnostics) {
        options.diagnostics.transcriptionStatus = 'succeeded';
        options.diagnostics.segmentCount = segments.length;
        options.diagnostics.mediaDuration = totalDuration;
      }

      return {
        language: requestedLanguage || detectedLanguage,
        detected_language: detectedLanguage,
        provider: activeProvider,
        timing_mode: anyEstimated ? 'estimated' : 'word',
        estimated_timing: anyEstimated,
        chunk_count: slices.length,
        total_duration: totalDuration,
        total_segments: segments.length,
        segments,
        srt: TranscriptExportHelper.toSrt(segments),
        vtt: TranscriptExportHelper.toVtt(segments, originalFilename)
      };
    } finally {
      await fs.promises.rm(chunkTempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Transcribes an in-memory audio buffer into grouped captions.
   * Preserves fast in-memory execution for short clips while automatically overflowing
   * valid large media files through disk-based FFmpeg chunking (or throwing 413 AUDIO_TOO_LARGE).
   */
  public static async generateFromAudio(
    audio: Buffer,
    filename: string,
    options: CaptionGenerationOptions = {}
  ): Promise<CaptionGenerationResult> {
    if (!audio || audio.byteLength === 0) {
      throw new CaptionError(
        'UPLOAD_ERROR',
        400,
        'upload_validation',
        'Audio file is empty (0 bytes).'
      );
    }

    const maxWords = Math.max(1, Math.min(20, Math.round(options.maxWords ?? 3)));
    const requestedLanguage = options.language?.trim();
    const romanLanguage =
      requestedLanguage === 'ur_roman'
        ? 'ur'
        : requestedLanguage === 'hi_roman'
          ? 'hi'
          : requestedLanguage;

    const maxChunkBytes = options.maxChunkBytes
      ?? options.asrOptions?.maxUploadBytes
      ?? (process.env.ASR_MAX_UPLOAD_BYTES ? parseInt(process.env.ASR_MAX_UPLOAD_BYTES, 10) : config.asrMaxUploadBytes);

    if (audio.byteLength > maxChunkBytes) {
      if (options.disableAutoChunking) {
        throw new CaptionError(
          'AUDIO_TOO_LARGE',
          413,
          'asr_transcription',
          `Uploaded audio (${(audio.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size (${Math.round(maxChunkBytes / (1024 * 1024))} MB).`
        );
      }

      const { ext } = SpeechRecognitionService.resolveAudioFormat(filename);
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-oversized-audio-'));
      const tempAudioPath = path.join(tempDir, `input_${randomUUID().slice(0, 8)}${ext}`);
      try {
        await fs.promises.writeFile(tempAudioPath, audio);
        const probe = await FFmpegHelper.probeMedia(tempAudioPath);
        if (!probe.hasAudio || probe.durationSec <= 0) {
          throw new CaptionError(
            'AUDIO_TOO_LARGE',
            413,
            'asr_transcription',
            `Uploaded audio (${(audio.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size (${Math.round(maxChunkBytes / (1024 * 1024))} MB).`
          );
        }
        return await this.generateFromAudioFile(tempAudioPath, filename, {
          ...options,
          knownDurationSec: probe.durationSec,
          maxChunkBytes
        });
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    options.diagnostics?.setStage('asr_transcription');
    const transcription = await SpeechRecognitionService.transcribeAudio(
      audio,
      filename,
      romanLanguage,
      { ...options.asrOptions, maxUploadBytes: maxChunkBytes }
    );
    if (options.diagnostics && transcription.provider !== 'fallback') {
      options.diagnostics.selectedProvider = transcription.provider;
    }

    return this.finalizeSingleTranscription(
      transcription,
      filename,
      requestedLanguage,
      maxWords,
      options
    );
  }

  private static finalizeSingleTranscription(
    transcription: SpeechRecognitionResult,
    filename: string,
    requestedLanguage: string | undefined,
    maxWords: number,
    options: CaptionGenerationOptions,
    knownDurationSec?: number
  ): CaptionGenerationResult {
    if (transcription.errorCode) {
      if (options.diagnostics) {
        options.diagnostics.transcriptionStatus =
          transcription.errorCode === 'NO_SPEECH_DETECTED' ? 'empty_speech' : 'failed';
      }
      throw new CaptionError(
        transcription.errorCode,
        transcription.httpStatus || 503,
        'asr_transcription',
        transcription.error || 'Speech recognition failed.',
        { provider: transcription.provider !== 'fallback' ? transcription.provider : undefined }
      );
    }

    if (
      transcription.error &&
      (!transcription.segments || transcription.segments.length === 0) &&
      !transcription.text
    ) {
      throw new CaptionError(
        'PROVIDER_UNAVAILABLE',
        503,
        'asr_transcription',
        transcription.error
      );
    }

    const { words, estimatedTiming } = this.extractWordsFromTranscription(transcription);
    if (words.length === 0) {
      if (options.diagnostics) {
        options.diagnostics.transcriptionStatus = 'empty_speech';
      }
      throw new CaptionError(
        'NO_SPEECH_DETECTED',
        422,
        'asr_transcription',
        'No recognizable speech was detected in this media file.'
      );
    }

    options.diagnostics?.setStage('caption_grouping');
    const duration =
      transcription.duration ||
      knownDurationSec ||
      (transcription.segments || []).reduce((latest, segment) => Math.max(latest, segment.end), 0) ||
      (words.length ? words[words.length - 1].end : 0);

    let segments = this.groupWordsIntoSegments(words, maxWords);

    if (
      options.script === 'urdu_roman' ||
      requestedLanguage === 'ur_roman' ||
      requestedLanguage === 'hi_roman'
    ) {
      const code = requestedLanguage === 'hi_roman' ? 'hi' : (transcription.language_code || 'ur');
      segments = ScriptConversionService.convertTranscriptSegments(segments, 'urdu_roman', code);
    }

    const detectedLanguage = transcription.language_code || transcription.language || 'auto';
    if (options.diagnostics) {
      options.diagnostics.transcriptionStatus = 'succeeded';
      options.diagnostics.segmentCount = segments.length;
      options.diagnostics.mediaDuration = duration;
    }

    return {
      language: requestedLanguage || detectedLanguage,
      detected_language: detectedLanguage,
      provider: transcription.provider,
      timing_mode: estimatedTiming ? 'estimated' : 'word',
      estimated_timing: estimatedTiming,
      chunk_count: 1,
      total_duration: duration,
      total_segments: segments.length,
      segments,
      srt: TranscriptExportHelper.toSrt(segments),
      vtt: TranscriptExportHelper.toVtt(segments, filename)
    };
  }
}
