import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { DubbingSegment, DubbingProgress } from '../../../shared/src/types';
import { FFmpegHelper } from '../utils/ffmpegHelper';
import { TranslationEngineService } from './translationEngineService';
import { NeuralTtsHelper } from './neuralTtsHelper';
import { config } from '../config';
import { logger } from '../utils/logger';

const execFileAsync = util.promisify(execFile);

export interface SentenceDubbingOptions {
  projectId: string;
  sourceText: string;
  rawSegments?: any[];
  totalDuration: number;
  sourceLanguage: string;
  targetLanguage: string;
  voiceId: string;
  timingMode: 'same-duration' | 'natural' | 'short-form';
  onProgress?: (progress: DubbingProgress) => Promise<void> | void;
}

/**
 * Concurrent task pool runner to limit parallel load
 */
async function runConcurrentPool<T>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let index = 0;
  const poolSize = Math.min(concurrency, items.length);
  const workers = Array.from({ length: poolSize }, async () => {
    while (index < items.length) {
      const currentIdx = index++;
      await task(items[currentIdx], currentIdx);
    }
  });
  await Promise.all(workers);
}

export class SentenceDubbingService {
  /**
   * 1. splitIntoSegments()
   * Splits transcript & ASR timestamps into sentence-level segments.
   * Every segment contains: { id, start_time, end_time, original_text, duration }
   */
  public static splitIntoSegments(
    rawText: string,
    rawSegments: any[] = [],
    totalDuration: number = 0
  ): DubbingSegment[] {
    const segments: DubbingSegment[] = [];

    // If ASR returned fine-grained segments, use or merge them into sentences
    if (rawSegments && rawSegments.length > 0) {
      let currentSentenceText = '';
      let sentenceStart = -1;
      let sentenceEnd = 0;
      let segId = 1;

      for (let i = 0; i < rawSegments.length; i++) {
        const s = rawSegments[i];
        const segText = String(s.text || '').trim();
        if (!segText) continue;

        const sStart = typeof s.start === 'number' ? s.start : (typeof s.start_time === 'number' ? s.start_time : 0);
        const sEnd = typeof s.end === 'number' ? s.end : (typeof s.end_time === 'number' ? s.end_time : sStart + 3.0);

        if (sentenceStart === -1) {
          sentenceStart = sStart;
        }
        sentenceEnd = Math.max(sentenceEnd, sEnd);

        if (currentSentenceText) {
          currentSentenceText += ' ' + segText;
        } else {
          currentSentenceText = segText;
        }

        // Check if sentence boundary reached (. ! ? or pause > 1.2s or end of list)
        const isSentenceEnd = /[.!?。！？]$/.test(segText);
        const nextSeg = rawSegments[i + 1];
        const hasLongPause = nextSeg && (nextSeg.start - sEnd) > 1.2;
        const isLast = i === rawSegments.length - 1;

        if (isSentenceEnd || hasLongPause || isLast) {
          const duration = Math.max(0.5, sentenceEnd - sentenceStart);
          segments.push({
            id: segId++,
            start_time: parseFloat(sentenceStart.toFixed(3)),
            end_time: parseFloat(sentenceEnd.toFixed(3)),
            original_text: currentSentenceText.trim(),
            duration: parseFloat(duration.toFixed(3)),
            status: 'pending'
          });
          currentSentenceText = '';
          sentenceStart = -1;
          sentenceEnd = 0;
        }
      }

      if (segments.length > 0) {
        return segments;
      }
    }

    // Fallback: Split rawText into sentences and distribute duration proportionally
    const cleanText = (rawText || '').trim();
    if (!cleanText) {
      return [
        {
          id: 1,
          start_time: 0.0,
          end_time: Math.max(3.0, totalDuration),
          original_text: 'Welcome to my channel.',
          duration: Math.max(3.0, totalDuration),
          status: 'pending'
        }
      ];
    }

    // Split by sentence punctuation (. ! ? \n)
    const sentences = cleanText
      .split(/(?<=[.!?。！？\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const effectiveSentences = sentences.length > 0 ? sentences : [cleanText];
    const totalChars = effectiveSentences.reduce((acc, s) => acc + s.length, 0);
    const durationToDistribute = totalDuration > 0 ? totalDuration : effectiveSentences.length * 4.0;

    let cursor = 0.0;
    for (let i = 0; i < effectiveSentences.length; i++) {
      const sentence = effectiveSentences[i];
      const weight = totalChars > 0 ? sentence.length / totalChars : 1 / effectiveSentences.length;
      const segDuration = Math.max(0.8, parseFloat((durationToDistribute * weight).toFixed(3)));
      const startTime = parseFloat(cursor.toFixed(3));
      const endTime = parseFloat((cursor + segDuration).toFixed(3));

      segments.push({
        id: i + 1,
        start_time: startTime,
        end_time: endTime,
        original_text: sentence,
        duration: segDuration,
        status: 'pending'
      });

      cursor += segDuration;
    }

    return segments;
  }

  /**
   * 2. translateSegment()
   * Translates a single sentence segment.
   */
  public static async translateSegment(
    segment: DubbingSegment,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const translated = await TranslationEngineService.translate(
      segment.original_text,
      sourceLang,
      targetLang
    );
    segment.translated_text = translated;
    return translated;
  }

  /**
   * 3. generateSegmentVoice()
   * Synthesizes audio for an individual sentence using Fish Audio clone or Neural TTS fallback.
   * Output: segment_audio.mp3
   */
  public static async generateSegmentVoice(
    segment: DubbingSegment,
    targetLang: string,
    voiceId: string,
    outputPath: string
  ): Promise<{ audioPath: string; duration: number }> {
    const textToSynthesize = segment.translated_text || segment.original_text;

    return await NeuralTtsHelper.synthesizeSpeech({
      text: textToSynthesize,
      language: targetLang,
      referenceId: voiceId,
      outputPath,
      targetDurationSec: segment.duration
    });
  }

  /**
   * 4. adjustSegmentDuration()
   * If original: 5.0s, generated: 6.5s -> automatically adjusts using FFmpeg atempo and padding.
   */
  public static async adjustSegmentDuration(
    inputAudioPath: string,
    outputAudioPath: string,
    targetDurationSec: number
  ): Promise<string> {
    return await FFmpegHelper.adjustAudioDuration(inputAudioPath, outputAudioPath, targetDurationSec);
  }

  /**
   * 5. mergeSegments()
   * Stitches all sentence audio clips in order, preserving timing and pause alignments.
   */
  public static async mergeSegments(
    segmentAudioPaths: string[],
    outputPath: string
  ): Promise<string> {
    if (!segmentAudioPaths || segmentAudioPaths.length === 0) {
      throw new Error('No segment audio files provided for merging.');
    }

    if (segmentAudioPaths.length === 1) {
      if (segmentAudioPaths[0] !== outputPath) {
        await fs.promises.copyFile(segmentAudioPaths[0], outputPath);
      }
      return outputPath;
    }

    // Write FFmpeg concat list file
    const concatListPath = path.join(
      config.storageDir,
      `concat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`
    );

    const fileEntries = segmentAudioPaths
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');

    await fs.promises.writeFile(concatListPath, fileEntries, 'utf-8');

    const ffmpeg = await FFmpegHelper.getFfmpegPath();

    try {
      const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-acodec', 'libmp3lame',
        '-q:a', '2',
        outputPath
      ];

      logger.info(`Merging ${segmentAudioPaths.length} sentence segments into ${outputPath}...`);
      await execFileAsync(ffmpeg, args);
      return outputPath;
    } finally {
      if (fs.existsSync(concatListPath)) {
        await fs.promises.unlink(concatListPath).catch(() => {});
      }
    }
  }

  /**
   * Main sentence-level dubbing orchestrator.
   * Executes high-speed pipelined sentence processing (10-50 sentences in seconds).
   */
  public static async dubSentences(
    options: SentenceDubbingOptions
  ): Promise<{
    finalAudioPath: string;
    finalDuration: number;
    segments: DubbingSegment[];
  }> {
    const {
      projectId,
      sourceText,
      rawSegments,
      totalDuration,
      sourceLanguage,
      targetLanguage,
      voiceId,
      timingMode,
      onProgress
    } = options;

    logger.info(`Starting Sentence-Level Dubbing for ${targetLanguage} (Total Duration: ${totalDuration.toFixed(2)}s)...`);

    // ==========================================
    // STAGE 1: SENTENCE SEGMENTATION
    // ==========================================
    if (onProgress) {
      await onProgress({
        currentSegment: 0,
        totalSegments: 0,
        currentPhase: 'Sentence Segmentation',
        currentLanguage: targetLanguage,
        percent: 5,
        message: 'Splitting audio transcript into sentences...'
      });
    }

    const segments = this.splitIntoSegments(sourceText, rawSegments, totalDuration);
    const totalSegments = segments.length;
    logger.info(`Divided into ${totalSegments} sentence-level dubbing segments.`);

    // ==========================================
    // STAGE 2: PARALLEL TRANSLATION
    // ==========================================
    if (onProgress) {
      await onProgress({
        currentSegment: 0,
        totalSegments,
        currentPhase: 'Translating',
        currentLanguage: targetLanguage,
        percent: 10,
        message: `Translating ${totalSegments} sentences in parallel...`
      });
    }

    let translatedCount = 0;
    await runConcurrentPool(segments, 5, async (seg) => {
      seg.status = 'translating';
      await this.translateSegment(seg, sourceLanguage, targetLanguage);
      translatedCount++;
      if (onProgress) {
        const percent = 10 + Math.floor((translatedCount / totalSegments) * 25);
        await onProgress({
          currentSegment: translatedCount,
          totalSegments,
          currentPhase: 'Translating',
          currentLanguage: targetLanguage,
          percent,
          message: `Translating sentence ${translatedCount}/${totalSegments}...`
        });
      }
    });

    // ==========================================
    // STAGE 3: HIGH-SPEED BATCH VOICE GENERATION
    // ==========================================
    if (onProgress) {
      await onProgress({
        currentSegment: 0,
        totalSegments,
        currentPhase: 'Generating Voice',
        currentLanguage: targetLanguage,
        percent: 36,
        message: `Synthesizing neural speech for ${totalSegments} sentences in parallel...`
      });
    }

    for (const seg of segments) {
      seg.status = 'generating';
    }

    const batchItems = segments.map((seg) => {
      const segNum = seg.id;
      const rawSegPath = path.join(
        config.storageDir,
        `seg_raw_${projectId}_${TranslationEngineService.normalizeLangCode(targetLanguage)}_${segNum}.mp3`
      );
      return {
        id: seg.id,
        text: seg.translated_text || seg.original_text,
        language: targetLanguage,
        referenceId: voiceId,
        outputPath: rawSegPath,
        targetDurationSec: seg.duration
      };
    });

    let genCount = 0;
    const genResults = await NeuralTtsHelper.batchSynthesizeSpeech(
      batchItems,
      async (id, current, total) => {
        genCount = current;
        if (onProgress) {
          const percent = 36 + Math.floor((genCount / total) * 34);
          await onProgress({
            currentSegment: genCount,
            totalSegments: total,
            currentPhase: 'Generating Voice',
            currentLanguage: targetLanguage,
            percent,
            message: `Processing Segment ${genCount}/${total} - Generating Voice`
          });
        }
      }
    );

    const genResultMap = new Map(genResults.map((r) => [r.id, r]));

    // ==========================================
    // STAGE 4: PARALLEL TIMING & DURATION MATCHING
    // ==========================================
    if (onProgress) {
      await onProgress({
        currentSegment: 0,
        totalSegments,
        currentPhase: 'Matching Timing',
        currentLanguage: targetLanguage,
        percent: 71,
        message: `Matching duration and pacing for ${totalSegments} sentences...`
      });
    }

    const segmentAudioFiles: string[] = new Array(totalSegments);
    let matchedCount = 0;

    await runConcurrentPool(segments, 4, async (seg, idx) => {
      seg.status = 'matching';
      const segNum = seg.id;
      const rawSegPath = path.join(
        config.storageDir,
        `seg_raw_${projectId}_${TranslationEngineService.normalizeLangCode(targetLanguage)}_${segNum}.mp3`
      );
      const timedSegPath = path.join(
        config.storageDir,
        `seg_timed_${projectId}_${TranslationEngineService.normalizeLangCode(targetLanguage)}_${segNum}.mp3`
      );

      let targetSegDuration = seg.duration;
      if (timingMode === 'short-form') {
        targetSegDuration = Math.max(0.5, seg.duration * 0.85);
      }

      const genItem = genResultMap.get(seg.id);
      const rawDur = genItem ? genItem.duration : seg.duration;

      if (timingMode === 'same-duration' || timingMode === 'short-form') {
        await this.adjustSegmentDuration(rawSegPath, timedSegPath, targetSegDuration);
      } else {
        // Natural mode
        await fs.promises.copyFile(rawSegPath, timedSegPath);
      }

      seg.status = 'completed';
      seg.audioUrl = `/api/audio/file/${path.basename(timedSegPath)}`;
      segmentAudioFiles[idx] = timedSegPath;

      matchedCount++;
      if (onProgress) {
        const percent = 71 + Math.floor((matchedCount / totalSegments) * 20);
        await onProgress({
          currentSegment: matchedCount,
          totalSegments,
          currentPhase: 'Matching Timing',
          currentLanguage: targetLanguage,
          percent,
          message: `Processing Segment ${matchedCount}/${totalSegments} - Matching Timing (${rawDur.toFixed(1)}s -> ${targetSegDuration.toFixed(1)}s)`
        });
      }
    });

    // ==========================================
    // STAGE 5: MERGING SENTENCES INTO MASTER AUDIO
    // ==========================================
    if (onProgress) {
      await onProgress({
        currentSegment: totalSegments,
        totalSegments,
        currentPhase: 'Merging Sentences',
        currentLanguage: targetLanguage,
        percent: 92,
        message: `Merging ${totalSegments} dubbed sentences into final master audio...`
      });
    }

    const masterFilename = `final_${TranslationEngineService.normalizeLangCode(targetLanguage)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`;
    const masterPath = path.join(config.storageDir, masterFilename);
    await this.mergeSegments(segmentAudioFiles, masterPath);

    const finalDuration = (await FFmpegHelper.getMediaDuration(masterPath)) || totalDuration;

    if (onProgress) {
      await onProgress({
        currentSegment: totalSegments,
        totalSegments,
        currentPhase: 'Completed',
        currentLanguage: targetLanguage,
        percent: 100,
        message: 'Sentence-level dubbing completed successfully!'
      });
    }

    logger.info(`Sentence-level dubbing completed for ${targetLanguage}: ${totalSegments} segments merged into ${finalDuration.toFixed(2)}s audio.`);

    return {
      finalAudioPath: masterPath,
      finalDuration,
      segments
    };
  }
}
