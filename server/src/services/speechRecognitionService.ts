import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import util from 'util';
import { AsrProviderId, config, resolveAsrProviderPriority } from '../config';
import { logger } from '../utils/logger';
import { FishAudioService } from './fishAudioService';
import { TranslationEngineService } from './translationEngineService';
import {
  CaptionErrorCode,
  TranscriptionSegment,
  TranscriptionWord
} from '../../../shared/src/types';
import {
  CaptionError,
  sanitizeDiagnosticText
} from '../utils/captionDiagnostics';

const execFileAsync = util.promisify(execFile);

export interface SpeechRecognitionResult {
  text: string;
  duration?: number;
  language?: string;
  language_code?: string;
  language_probability?: number;
  is_ambiguous_hindi_urdu?: boolean;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
  timingMode?: 'word' | 'estimated';
  estimatedTiming?: boolean;
  provider: 'local' | 'groq' | 'openai' | 'fish_audio' | 'huggingface' | 'fallback';
  error?: string;
  errorCode?: CaptionErrorCode;
  httpStatus?: number;
}

export interface AsrTranscribeOptions {
  language?: string;
  providerPriority?: AsrProviderId[];
  timeoutMs?: number;
  maxRetries?: number;
  maxUploadBytes?: number;
}

export interface ResolvedAudioFormat {
  ext: string;
  safeFilename: string;
  mimeType: string;
}

export interface LocalWhisperAvailability {
  available: boolean;
  checkedAt: number;
  pythonPath?: string;
  reason?: string;
}

const AUDIO_EXT_MIME_MAP: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.mpga': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/opus',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm',
  '.flac': 'audio/flac'
};

const LANGUAGE_NAME_TO_ISO: Record<string, string> = {
  english: 'en',
  urdu: 'ur',
  ur_roman: 'ur',
  roman_urdu: 'ur',
  hindi: 'hi',
  hi_roman: 'hi',
  hinglish: 'hi',
  roman_hindi: 'hi',
  spanish: 'es',
  arabic: 'ar',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  turkish: 'tr'
};

function isValidApiKey(val: string | undefined, placeholder: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === placeholder || trimmed === 'undefined' || trimmed === 'null') {
    return false;
  }
  return true;
}

export class SpeechRecognitionService {
  private static localWhisperCache: LocalWhisperAvailability | null = null;
  private static localWhisperOverride: { available: boolean; reason?: string } | null = null;
  private static readonly UNAVAILABLE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Resets cached local faster-whisper availability state (useful for tests or runtime reconfiguration).
   */
  public static resetAvailabilityCache(): void {
    this.localWhisperCache = null;
    this.localWhisperOverride = null;
  }

  /**
   * Test hook to deterministically simulate missing/present local faster-whisper without modifying host Python.
   */
  public static setLocalWhisperAvailabilityForTesting(
    available: boolean | null,
    reason = 'Local faster-whisper disabled in test environment'
  ): void {
    if (available === null) {
      this.localWhisperOverride = null;
      this.localWhisperCache = null;
      return;
    }
    this.localWhisperOverride = { available, reason: available ? undefined : reason };
  }

  /**
   * Discovers the working Python executable across Windows and Linux/Docker environments.
   */
  public static getPythonPath(): string {
    if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
      return process.env.PYTHON_PATH;
    }

    const isWin = process.platform === 'win32';
    const candidates = isWin
      ? [
          'C:\\Users\\Muhammad Hashim\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
          'C:\\Users\\Muhammad Hashim\\AppData\\Local\\Programs\\Python\\Python314\\python.exe',
          'python',
          'py'
        ]
      : [
          '/usr/bin/python3',
          '/usr/local/bin/python3',
          'python3',
          'python'
        ];

    for (const c of candidates) {
      if (path.isAbsolute(c) && fs.existsSync(c)) {
        return c;
      }
    }
    return isWin ? 'python' : 'python3';
  }

  /**
   * Probes once (and caches) whether Python + faster-whisper + transcribe_audio.py are genuinely runnable.
   * Prevents repeatedly spawning broken Python subprocesses on Render native Node deployments.
   */
  public static async isLocalWhisperAvailable(forceRefresh = false): Promise<LocalWhisperAvailability> {
    if (this.localWhisperOverride !== null) {
      return {
        available: this.localWhisperOverride.available,
        checkedAt: Date.now(),
        reason: this.localWhisperOverride.reason
      };
    }

    if (!forceRefresh && this.localWhisperCache) {
      const age = Date.now() - this.localWhisperCache.checkedAt;
      if (this.localWhisperCache.available || age < this.UNAVAILABLE_CACHE_TTL_MS) {
        return this.localWhisperCache;
      }
    }

    const scriptPath = path.resolve(__dirname, '../scripts/transcribe_audio.py');
    if (!fs.existsSync(scriptPath)) {
      this.localWhisperCache = {
        available: false,
        checkedAt: Date.now(),
        reason: 'transcribe_audio.py script not found'
      };
      return this.localWhisperCache;
    }

    const isWin = process.platform === 'win32';
    const candidates = Array.from(
      new Set([
        ...(process.env.PYTHON_PATH ? [process.env.PYTHON_PATH] : []),
        this.getPythonPath(),
        ...(isWin ? ['python', 'py'] : ['python3', 'python'])
      ])
    );

    let lastErr = 'Python executable not found';
    for (const candidate of candidates) {
      try {
        const { stdout } = await execFileAsync(
          candidate,
          [
            '-c',
            'import importlib.util; print("FASTER_WHISPER_READY" if importlib.util.find_spec("faster_whisper") else "MISSING")'
          ],
          { timeout: 15000, maxBuffer: 1024 * 1024 }
        );
        if (stdout && stdout.includes('FASTER_WHISPER_READY')) {
          this.localWhisperCache = {
            available: true,
            checkedAt: Date.now(),
            pythonPath: candidate
          };
          return this.localWhisperCache;
        }
        lastErr = `faster_whisper package not installed in ${candidate}`;
      } catch (err: any) {
        lastErr = sanitizeDiagnosticText(err?.stderr || err?.message || String(err), 180);
      }
    }

    this.localWhisperCache = {
      available: false,
      checkedAt: Date.now(),
      reason: lastErr
    };
    return this.localWhisperCache;
  }

  /**
   * Resolves true audio extension, MIME type, and cross-platform safe filename (Windows + Linux).
   * Fixes the bug where WAV/OGG/M4A/WEBM files were previously saved with an `.mp3` filename.
   */
  public static resolveAudioFormat(filename?: string): ResolvedAudioFormat {
    const rawName = (filename || 'audio.mp3').trim();
    const parsedBase = path.basename(rawName.replace(/\\/g, '/'));
    const rawExt = path.extname(parsedBase).toLowerCase();
    const ext = AUDIO_EXT_MIME_MAP[rawExt] ? rawExt : '.mp3';
    const mimeType = AUDIO_EXT_MIME_MAP[ext] || 'audio/mpeg';

    const stemRaw = rawExt ? parsedBase.slice(0, -rawExt.length) : parsedBase;
    const cleanStem = stemRaw
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 96) || 'audio';

    return {
      ext,
      safeFilename: `${cleanStem}${ext}`,
      mimeType
    };
  }

  /**
   * Normalizes user-selected or detected language into a clean 2-letter ISO-639-1 code for Whisper APIs.
   */
  public static normalizeWhisperLangCode(targetOrSourceLanguage?: string): string | undefined {
    if (!targetOrSourceLanguage) return undefined;
    const raw = targetOrSourceLanguage.trim().toLowerCase();
    if (!raw || raw === 'auto') return undefined;
    if (LANGUAGE_NAME_TO_ISO[raw]) return LANGUAGE_NAME_TO_ISO[raw];
    if (/^[a-z]{2}$/.test(raw)) return raw;
    const normalized = TranslationEngineService.normalizeLangCode(raw);
    return /^[a-z]{2}$/.test(normalized) ? normalized : undefined;
  }

  /**
   * Production-safe boolean readiness inspection (never returns API key values).
   */
  public static async getProviderReadiness(): Promise<{
    priorityOrder: AsrProviderId[];
    providersConfigured: {
      local: boolean;
      groq: boolean;
      openai: boolean;
      fishAudio: boolean;
    };
  }> {
    const localAvail = await this.isLocalWhisperAvailable();
    const groqKey = process.env.GROQ_API_KEY ?? config.groqApiKey;
    const openaiKey = process.env.OPENAI_API_KEY ?? config.openaiApiKey;
    const fishKey = process.env.FISH_API_KEY ?? config.fishApiKey;

    return {
      priorityOrder: resolveAsrProviderPriority(),
      providersConfigured: {
        local: localAvail.available,
        groq: isValidApiKey(groqKey, 'YOUR_GROQ_API_KEY_HERE'),
        openai: isValidApiKey(openaiKey, 'YOUR_OPENAI_API_KEY_HERE'),
        fishAudio: isValidApiKey(fishKey, 'YOUR_FISH_AUDIO_API_KEY_HERE')
      }
    };
  }

  /**
   * Parses Groq and OpenAI Whisper `verbose_json` responses accurately.
   * Supports BOTH:
   * - Top-level `data.words` (standard Groq whisper-large-v3-turbo & OpenAI whisper-1 format)
   * - Nested `data.segments[].words`
   * - Segment-only responses (explicitly marked `timingMode: 'estimated'`, `estimatedTiming: true`)
   */
  public static parseWhisperVerboseJson(
    data: any,
    fallbackLangCode?: string
  ): Omit<SpeechRecognitionResult, 'provider'> {
    const rawTopWords = Array.isArray(data?.words) ? data.words : [];
    const topWords: TranscriptionWord[] = [];

    for (let i = 0; i < rawTopWords.length; i++) {
      const w = rawTopWords[i];
      const token = String(w?.word ?? '').trim();
      if (!token) continue;
      const start = Number(w?.start);
      let end = Number(w?.end);
      if (!Number.isFinite(start) || start < 0) continue;
      if (!Number.isFinite(end) || end <= start) {
        const nextStart = Number(rawTopWords[i + 1]?.start);
        end = Number.isFinite(nextStart) && nextStart > start
          ? Math.min(start + 0.08, nextStart)
          : start + 0.06;
      }
      topWords.push({
        word: token,
        start,
        end,
        confidence: typeof w?.probability === 'number'
          ? w.probability
          : typeof w?.confidence === 'number'
            ? w.confidence
            : undefined,
        estimated: false
      });
    }

    const rawSegments = Array.isArray(data?.segments) ? data.segments : [];
    const segments: TranscriptionSegment[] = rawSegments
      .map((s: any, idx: number) => {
        const segStart = Number.isFinite(Number(s?.start)) ? Math.max(0, Number(s.start)) : 0;
        const rawEnd = Number(s?.end);
        const segEnd = Number.isFinite(rawEnd) && rawEnd > segStart ? rawEnd : segStart + 0.2;
        const nestedRawWords = Array.isArray(s?.words) ? s.words : [];
        const nestedWords: TranscriptionWord[] = [];

        for (let wi = 0; wi < nestedRawWords.length; wi++) {
          const nw = nestedRawWords[wi];
          const token = String(nw?.word ?? '').trim();
          if (!token) continue;
          const ws = Number(nw?.start);
          let we = Number(nw?.end);
          if (!Number.isFinite(ws) || ws < 0) continue;
          if (!Number.isFinite(we) || we <= ws) {
            const nextWs = Number(nestedRawWords[wi + 1]?.start);
            we = Number.isFinite(nextWs) && nextWs > ws ? Math.min(ws + 0.08, nextWs) : ws + 0.06;
          }
          nestedWords.push({
            word: token,
            start: ws,
            end: we,
            confidence: typeof nw?.probability === 'number' ? nw.probability : undefined,
            estimated: false
          });
        }

        return {
          id: `seg_${idx + 1}`,
          start: segStart,
          end: segEnd,
          text: String(s?.text ?? '').trim(),
          words: nestedWords
        };
      })
      .filter((s: TranscriptionSegment) => s.text.length > 0 || (s.words && s.words.length > 0));

    let hasRealWordTimestamps = segments.some((s) => s.words && s.words.length > 0);
    let collectedWords: TranscriptionWord[] = [];

    if (hasRealWordTimestamps) {
      collectedWords = segments.flatMap((s) => s.words || []);
    } else if (topWords.length > 0) {
      hasRealWordTimestamps = true;
      collectedWords = topWords;

      if (segments.length > 0) {
        const buckets: TranscriptionWord[][] = segments.map(() => []);
        let cursor = 0;

        for (const word of topWords) {
          const mid = (word.start + word.end) / 2;
          while (
            cursor < segments.length - 1 &&
            mid > segments[cursor].end + 0.08 &&
            mid >= segments[cursor + 1].start - 0.15
          ) {
            cursor++;
          }

          // Pick best matching segment around cursor without ever dropping a top-level word
          let bestIdx = cursor;
          const curSeg = segments[cursor];
          if (!(mid >= curSeg.start - 0.2 && mid <= curSeg.end + 0.2)) {
            let bestDist = Infinity;
            for (let si = 0; si < segments.length; si++) {
              const seg = segments[si];
              const dist = mid < seg.start
                ? seg.start - mid
                : mid > seg.end
                  ? mid - seg.end
                  : 0;
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = si;
              }
            }
          }
          buckets[bestIdx].push(word);
        }

        for (let si = 0; si < segments.length; si++) {
          if (buckets[si].length > 0) {
            segments[si].words = buckets[si];
            segments[si].start = Math.min(segments[si].start, buckets[si][0].start);
            segments[si].end = Math.max(segments[si].end, buckets[si][buckets[si].length - 1].end);
            segments[si].estimated = false;
            if (!segments[si].text) {
              segments[si].text = buckets[si].map((w) => w.word).join(' ');
            }
          }
        }
      } else {
        // Top-level words returned without `data.segments`
        segments.push({
          id: 'seg_1',
          start: topWords[0].start,
          end: topWords[topWords.length - 1].end,
          text: (String(data?.text ?? '').trim()) || topWords.map((w) => w.word).join(' '),
          words: topWords,
          estimated: false
        });
      }
    }

    const fullText = String(data?.text ?? '').trim() || segments.map((s) => s.text).join(' ').trim();

    if (segments.length === 0 && fullText) {
      const fallbackDur = typeof data?.duration === 'number' && data.duration > 0 ? data.duration : 5;
      segments.push({
        id: 'seg_1',
        start: 0,
        end: fallbackDur,
        text: fullText,
        words: [],
        estimated: true
      });
    }

    if (!hasRealWordTimestamps) {
      for (const seg of segments) {
        seg.estimated = true;
      }
    }

    const rawDetectedLang = String(data?.language || fallbackLangCode || 'en').trim();
    const resolvedIso = this.normalizeWhisperLangCode(rawDetectedLang) || fallbackLangCode || rawDetectedLang.slice(0, 2).toLowerCase() || 'en';
    const isHindiUrdu = ['hi', 'ur', 'hindi', 'urdu'].includes(rawDetectedLang.toLowerCase()) || ['hi', 'ur'].includes(resolvedIso);

    const computedDuration =
      typeof data?.duration === 'number' && data.duration > 0
        ? data.duration
        : segments.length > 0
          ? segments[segments.length - 1].end
          : collectedWords.length > 0
            ? collectedWords[collectedWords.length - 1].end
            : undefined;

    return {
      text: fullText,
      duration: computedDuration,
      language: rawDetectedLang,
      language_code: resolvedIso,
      language_probability: 0.95,
      is_ambiguous_hindi_urdu: isHindiUrdu,
      segments,
      words: collectedWords,
      timingMode: hasRealWordTimestamps ? 'word' : 'estimated',
      estimatedTiming: !hasRealWordTimestamps
    };
  }

  /**
   * Transcribes an audio file already on disk without unnecessary duplicate temp-file writes.
   */
  public static async transcribeAudioFile(
    audioFilePath: string,
    originalFilename?: string,
    targetOrSourceLanguage?: string,
    options: AsrTranscribeOptions = {}
  ): Promise<SpeechRecognitionResult> {
    const stat = await fs.promises.stat(audioFilePath).catch(() => null);
    if (!stat || stat.size === 0) {
      return {
        text: '',
        provider: 'fallback',
        segments: [],
        words: [],
        error: 'Uploaded or extracted audio file is empty.',
        errorCode: 'UPLOAD_ERROR',
        httpStatus: 400
      };
    }

    const effectiveName = originalFilename || path.basename(audioFilePath);
    return this.runProviderPipeline(
      { filePath: audioFilePath, byteLength: stat.size },
      effectiveName,
      targetOrSourceLanguage,
      options
    );
  }

  /**
   * Transcribes an in-memory audio buffer with configurable provider priority,
   * genuine word-level timestamps, HTTP error classification, timeouts, and retries.
   */
  public static async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    targetOrSourceLanguage?: string,
    options: AsrTranscribeOptions = {}
  ): Promise<SpeechRecognitionResult> {
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return {
        text: '',
        provider: 'fallback',
        segments: [],
        words: [],
        error: 'Uploaded audio buffer is empty.',
        errorCode: 'UPLOAD_ERROR',
        httpStatus: 400
      };
    }

    return this.runProviderPipeline(
      { buffer: audioBuffer, byteLength: audioBuffer.byteLength },
      filename,
      targetOrSourceLanguage,
      options
    );
  }

  private static async runProviderPipeline(
    source: { buffer?: Buffer; filePath?: string; byteLength: number },
    filename: string,
    targetOrSourceLanguage?: string,
    options: AsrTranscribeOptions = {}
  ): Promise<SpeechRecognitionResult> {
    const { ext, safeFilename, mimeType } = this.resolveAudioFormat(filename || source.filePath);
    const requestedLang = options.language ?? targetOrSourceLanguage;
    const langCode = this.normalizeWhisperLangCode(requestedLang);

    const priorityOrder = options.providerPriority && options.providerPriority.length > 0
      ? options.providerPriority
      : resolveAsrProviderPriority();

    const maxUploadBytes = options.maxUploadBytes
      ?? (process.env.ASR_MAX_UPLOAD_BYTES ? parseInt(process.env.ASR_MAX_UPLOAD_BYTES, 10) : config.asrMaxUploadBytes);
    const timeoutMs = options.timeoutMs
      ?? (process.env.ASR_REQUEST_TIMEOUT_MS ? parseInt(process.env.ASR_REQUEST_TIMEOUT_MS, 10) : config.asrRequestTimeoutMs);
    const maxRetries = options.maxRetries
      ?? (process.env.ASR_MAX_RETRIES ? parseInt(process.env.ASR_MAX_RETRIES, 10) : config.asrMaxRetries);

    const groqKey = process.env.GROQ_API_KEY ?? config.groqApiKey;
    const openaiKey = process.env.OPENAI_API_KEY ?? config.openaiApiKey;
    const fishKey = process.env.FISH_API_KEY ?? config.fishApiKey;

    const providerErrors: CaptionError[] = [];
    let configuredProvidersCount = 0;
    let cachedBuffer: Buffer | undefined = source.buffer;

    const getBufferOnce = async (): Promise<Buffer> => {
      if (cachedBuffer) return cachedBuffer;
      if (!source.filePath) throw new Error('Audio source missing.');
      cachedBuffer = await fs.promises.readFile(source.filePath);
      return cachedBuffer;
    };

    for (const provider of priorityOrder) {
      if (provider === 'local') {
        const localAvail = await this.isLocalWhisperAvailable();
        if (!localAvail.available) {
          continue;
        }
        configuredProvidersCount++;

        let tempPath: string | null = null;
        try {
          logger.info(`[ASR] Attempting transcription via local faster-whisper (${ext})...`);
          let targetPath = source.filePath;
          if (!targetPath) {
            const tempDir = path.join(os.tmpdir(), 'voiceforge-local-asr');
            await fs.promises.mkdir(tempDir, { recursive: true });
            tempPath = path.join(tempDir, `asr_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`);
            await fs.promises.writeFile(tempPath, await getBufferOnce());
            targetPath = tempPath;
          }

          const localResult = await this.transcribeWithPython(
            targetPath,
            langCode,
            localAvail.pythonPath,
            timeoutMs
          );

          const hasSpeech = Boolean(
            (localResult.text && localResult.text.trim()) ||
            (localResult.segments && localResult.segments.length > 0)
          );

          if (hasSpeech) {
            const hasWords = Boolean(localResult.segments?.some((s) => s.words && s.words.length > 0));
            logger.info(
              `[ASR] Transcribed ${localResult.text.length} chars via local faster-whisper (${localResult.segments?.length || 0} segments, lang: ${localResult.language_code}).`
            );
            return {
              ...localResult,
              words: localResult.segments?.flatMap((s) => s.words || []) || [],
              timingMode: hasWords ? 'word' : 'estimated',
              estimatedTiming: !hasWords,
              provider: 'local'
            };
          }

          return {
            ...localResult,
            text: '',
            segments: [],
            words: [],
            provider: 'local',
            errorCode: 'NO_SPEECH_DETECTED',
            httpStatus: 422,
            error: 'No recognizable speech was detected in this media file.'
          };
        } catch (localErr: any) {
          const sanitized = sanitizeDiagnosticText(localErr?.message || localErr);
          logger.warn(`[ASR] Local faster-whisper failed: ${sanitized}`);
          const isDecodeError = /invalid data found|ebml|header|moov atom|format not recognised|could not open/i.test(sanitized);
          providerErrors.push(
            new CaptionError(
              isDecodeError ? 'UPLOAD_ERROR' : 'PROVIDER_UNAVAILABLE',
              isDecodeError ? 422 : 503,
              'asr_transcription',
              isDecodeError
                ? 'The uploaded audio stream is corrupted or unreadable.'
                : 'Local speech recognition engine failed to process this file.',
              { provider: 'local', causeDetail: sanitized }
            )
          );
        } finally {
          if (tempPath && fs.existsSync(tempPath)) {
            await fs.promises.unlink(tempPath).catch(() => {});
          }
        }
        continue;
      }

      if (provider === 'groq') {
        if (!isValidApiKey(groqKey, 'YOUR_GROQ_API_KEY_HERE')) {
          continue;
        }
        configuredProvidersCount++;

        if (source.byteLength > maxUploadBytes) {
          providerErrors.push(
            new CaptionError(
              'AUDIO_TOO_LARGE',
              413,
              'asr_transcription',
              `Audio payload (${(source.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds cloud speech recognition limit (${Math.round(maxUploadBytes / (1024 * 1024))} MB).`,
              { provider: 'groq' }
            )
          );
          continue;
        }

        try {
          logger.info(`[ASR] Attempting transcription via Groq Whisper API (${safeFilename}, ${source.byteLength} bytes)...`);
          const buf = await getBufferOnce();
          const result = await this.executeWithResilience(
            'groq',
            timeoutMs,
            maxRetries,
            (signal) => this.transcribeWithGroq(buf, safeFilename, mimeType, langCode, groqKey.trim(), signal)
          );

          const hasSpeech = Boolean(
            (result.text && result.text.trim()) ||
            (result.segments && result.segments.length > 0)
          );

          if (hasSpeech) {
            logger.info(
              `[ASR] Transcribed ${result.text.length} chars via Groq Whisper (${result.segments?.length || 0} segments, timing=${result.timingMode}).`
            );
            return { ...result, provider: 'groq' };
          }

          return {
            ...result,
            text: '',
            segments: [],
            words: [],
            provider: 'groq',
            errorCode: 'NO_SPEECH_DETECTED',
            httpStatus: 422,
            error: 'No recognizable speech was detected in this media file.'
          };
        } catch (groqErr: any) {
          const classified = groqErr instanceof CaptionError
            ? groqErr
            : this.classifyProviderHttpError('groq', groqErr);
          logger.warn(`[ASR] Groq Whisper failed [${classified.code}]: ${sanitizeDiagnosticText(classified.causeDetail || classified.message)}`);
          providerErrors.push(classified);
        }
        continue;
      }

      if (provider === 'openai') {
        if (!isValidApiKey(openaiKey, 'YOUR_OPENAI_API_KEY_HERE')) {
          continue;
        }
        configuredProvidersCount++;

        if (source.byteLength > maxUploadBytes) {
          providerErrors.push(
            new CaptionError(
              'AUDIO_TOO_LARGE',
              413,
              'asr_transcription',
              `Audio payload (${(source.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds OpenAI Whisper limit (${Math.round(maxUploadBytes / (1024 * 1024))} MB).`,
              { provider: 'openai' }
            )
          );
          continue;
        }

        try {
          logger.info(`[ASR] Attempting transcription via OpenAI Whisper API (${safeFilename}, ${source.byteLength} bytes)...`);
          const buf = await getBufferOnce();
          const result = await this.executeWithResilience(
            'openai',
            timeoutMs,
            maxRetries,
            (signal) => this.transcribeWithOpenAI(buf, safeFilename, mimeType, langCode, openaiKey.trim(), signal)
          );

          const hasSpeech = Boolean(
            (result.text && result.text.trim()) ||
            (result.segments && result.segments.length > 0)
          );

          if (hasSpeech) {
            logger.info(
              `[ASR] Transcribed ${result.text.length} chars via OpenAI Whisper (${result.segments?.length || 0} segments, timing=${result.timingMode}).`
            );
            return { ...result, provider: 'openai' };
          }

          return {
            ...result,
            text: '',
            segments: [],
            words: [],
            provider: 'openai',
            errorCode: 'NO_SPEECH_DETECTED',
            httpStatus: 422,
            error: 'No recognizable speech was detected in this media file.'
          };
        } catch (oaiErr: any) {
          const classified = oaiErr instanceof CaptionError
            ? oaiErr
            : this.classifyProviderHttpError('openai', oaiErr);
          logger.warn(`[ASR] OpenAI Whisper failed [${classified.code}]: ${sanitizeDiagnosticText(classified.causeDetail || classified.message)}`);
          providerErrors.push(classified);
        }
        continue;
      }

      if (provider === 'fish_audio') {
        if (!isValidApiKey(fishKey, 'YOUR_FISH_AUDIO_API_KEY_HERE')) {
          continue;
        }
        configuredProvidersCount++;

        if (source.byteLength > maxUploadBytes) {
          providerErrors.push(
            new CaptionError(
              'AUDIO_TOO_LARGE',
              413,
              'asr_transcription',
              `Audio payload (${(source.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds Fish Audio ASR limit (${Math.round(maxUploadBytes / (1024 * 1024))} MB).`,
              { provider: 'fish_audio' }
            )
          );
          continue;
        }

        try {
          logger.info(`[ASR] Attempting transcription via Fish Audio ASR (${safeFilename}, ${source.byteLength} bytes)...`);
          const buf = await getBufferOnce();
          const result = await this.executeWithResilience(
            'fish_audio',
            timeoutMs,
            maxRetries,
            (signal) => FishAudioService.transcribeAudio(buf, safeFilename, langCode, signal)
          );

          const cleanText = String(result?.text ?? '').trim();
          const rawSegs = Array.isArray(result?.segments) && result.segments.length > 0
            ? result.segments
            : cleanText
              ? [{ id: 'seg_1', start: 0, end: result.duration || Math.max(2, cleanText.split(/\s+/).length * 0.4), text: cleanText }]
              : [];

          if (cleanText || rawSegs.length > 0) {
            const mappedSegs: TranscriptionSegment[] = rawSegs.map((s: any, idx: number) => ({
              id: `seg_${idx + 1}`,
              start: Number(s.start ?? s.start_time ?? 0),
              end: Math.max(Number(s.start ?? s.start_time ?? 0) + 0.1, Number(s.end ?? s.end_time ?? 0)),
              text: String(s.text ?? '').trim(),
              estimated: true
            })).filter((s: TranscriptionSegment) => s.text.length > 0);

            const detectedCode = this.normalizeWhisperLangCode(result.language_code || result.language) || langCode || 'en';
            return {
              text: cleanText || mappedSegs.map((s) => s.text).join(' '),
              duration: result.duration,
              language: result.language || detectedCode,
              language_code: detectedCode,
              segments: mappedSegs,
              words: [],
              timingMode: 'estimated',
              estimatedTiming: true,
              provider: 'fish_audio'
            };
          }

          return {
            text: '',
            duration: result?.duration,
            language: result?.language || 'English',
            language_code: langCode || 'en',
            segments: [],
            words: [],
            provider: 'fish_audio',
            errorCode: 'NO_SPEECH_DETECTED',
            httpStatus: 422,
            error: 'No recognizable speech was detected in this media file.'
          };
        } catch (fishErr: any) {
          const classified = fishErr instanceof CaptionError
            ? fishErr
            : this.classifyProviderHttpError('fish_audio', fishErr);
          logger.warn(`[ASR] Fish Audio ASR failed [${classified.code}]: ${sanitizeDiagnosticText(classified.causeDetail || classified.message)}`);
          providerErrors.push(classified);
        }
      }
    }

    // Zero speech recognition providers available or configured
    if (configuredProvidersCount === 0) {
      const localAvail = await this.isLocalWhisperAvailable();
      const missingErr = new CaptionError(
        'MISSING_CREDENTIALS',
        503,
        'asr_transcription',
        'Speech recognition is not configured on this server. Add GROQ_API_KEY, OPENAI_API_KEY, or FISH_API_KEY in environment variables.',
        { causeDetail: `localAvailable=false (${localAvail.reason || 'unavailable'}), cloudKeys=0` }
      );
      logger.warn(`[ASR] No configured ASR providers available.`);
      return {
        text: '',
        provider: 'fallback',
        language: targetOrSourceLanguage || 'English',
        language_code: langCode || 'en',
        language_probability: 0.0,
        segments: [],
        words: [],
        error: missingErr.userMessage,
        errorCode: missingErr.code,
        httpStatus: missingErr.httpStatus
      };
    }

    // Select the most specific, actionable failure from attempted providers (NEVER misreport as "No speech detected")
    const primaryError = this.selectPrimaryProviderError(providerErrors);
    return {
      text: '',
      provider: 'fallback',
      language: targetOrSourceLanguage || 'English',
      language_code: langCode || 'en',
      language_probability: 0.0,
      segments: [],
      words: [],
      error: primaryError.userMessage,
      errorCode: primaryError.code,
      httpStatus: primaryError.httpStatus
    };
  }

  private static selectPrimaryProviderError(errors: CaptionError[]): CaptionError {
    if (errors.length === 0) {
      return new CaptionError(
        'PROVIDER_UNAVAILABLE',
        503,
        'asr_transcription',
        'Speech recognition service is currently unavailable. Please try again shortly.'
      );
    }

    // Prefer cloud provider errors first if present, ranked by specificity
    const rank: Record<CaptionErrorCode, number> = {
      AUDIO_TOO_LARGE: 100,
      RATE_LIMITED: 95,
      SERVER_TIMEOUT: 90,
      INVALID_API_KEY: 85,
      PROVIDER_UNAVAILABLE: 80,
      UPLOAD_ERROR: 75,
      MISSING_CREDENTIALS: 70,
      FFMPEG_ERROR: 65,
      SUBTITLE_RENDER_ERROR: 60,
      NO_AUDIO_TRACK: 55,
      NO_SPEECH_DETECTED: 10
    };

    const sorted = [...errors].sort((a, b) => {
      const aCloud = a.provider && a.provider !== 'local' ? 5 : 0;
      const bCloud = b.provider && b.provider !== 'local' ? 5 : 0;
      return (rank[b.code] + bCloud) - (rank[a.code] + aCloud);
    });

    return sorted[0];
  }

  /**
   * Executes a cloud ASR operation with request timeout and bounded exponential-backoff retries
   * on transient failures (network errors, 408, 429, 500/502/503/504).
   */
  private static async executeWithResilience<T>(
    provider: AsrProviderId,
    timeoutMs: number,
    maxRetries: number,
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const totalAttempts = Math.max(1, maxRetries + 1);
    let delayMs = 450;
    let lastError: CaptionError | null = null;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));

      try {
        return await fn(controller.signal);
      } catch (err: any) {
        const classified = err instanceof CaptionError
          ? err
          : this.classifyProviderHttpError(provider, err, controller.signal.aborted);
        lastError = classified;

        if (!classified.retriable || attempt >= totalAttempts) {
          throw classified;
        }

        let waitMs = delayMs;
        const retryAfterHeader = err?.headers?.get?.('retry-after');
        if (retryAfterHeader) {
          const parsedSec = parseFloat(retryAfterHeader);
          if (Number.isFinite(parsedSec) && parsedSec > 0) {
            waitMs = Math.min(4000, Math.round(parsedSec * 1000));
          }
        }

        logger.warn(
          `[ASR] Transient ${classified.code} from ${provider} (attempt ${attempt}/${totalAttempts}). Retrying in ${waitMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        delayMs = Math.min(3000, delayMs * 2);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new CaptionError(
      'PROVIDER_UNAVAILABLE',
      503,
      'asr_transcription',
      `Speech recognition provider (${provider}) failed after retries.`,
      { provider }
    );
  }

  private static classifyProviderHttpError(
    provider: AsrProviderId,
    err: any,
    timedOut = false
  ): CaptionError {
    const status = Number(err?.statusCode ?? err?.status ?? 0);
    const rawDetail = sanitizeDiagnosticText(err?.message || String(err));
    const providerLabel =
      provider === 'groq'
        ? 'Groq Whisper'
        : provider === 'openai'
          ? 'OpenAI Whisper'
          : provider === 'fish_audio'
            ? 'Fish Audio ASR'
            : 'Local Whisper';

    if (timedOut || err?.name === 'AbortError' || /aborterror|timed?\s*out/i.test(rawDetail)) {
      return new CaptionError(
        'SERVER_TIMEOUT',
        504,
        'asr_transcription',
        `${providerLabel} timed out while transcribing audio. Please try again or use a shorter clip.`,
        { provider, retriable: true, causeDetail: rawDetail }
      );
    }

    if (status === 401 || status === 403) {
      return new CaptionError(
        'INVALID_API_KEY',
        401,
        'asr_transcription',
        `${providerLabel} rejected the configured API credentials (${status}). Please verify the API key in your server environment.`,
        { provider, retriable: false, causeDetail: rawDetail }
      );
    }

    if (status === 402) {
      return new CaptionError(
        'PROVIDER_UNAVAILABLE',
        503,
        'asr_transcription',
        `${providerLabel} account has insufficient credits (402). Configure a free GROQ_API_KEY or top up provider credits.`,
        { provider, retriable: false, causeDetail: rawDetail }
      );
    }

    if (status === 413) {
      return new CaptionError(
        'AUDIO_TOO_LARGE',
        413,
        'asr_transcription',
        `Extracted audio exceeded ${providerLabel}'s maximum upload size limit (413).`,
        { provider, retriable: false, causeDetail: rawDetail }
      );
    }

    if (status === 429) {
      return new CaptionError(
        'RATE_LIMITED',
        429,
        'asr_transcription',
        `${providerLabel} rate limit reached (429). Please wait 30–60 seconds and retry.`,
        { provider, retriable: true, causeDetail: rawDetail }
      );
    }

    if (status === 408 || status >= 500) {
      return new CaptionError(
        'PROVIDER_UNAVAILABLE',
        503,
        'asr_transcription',
        `${providerLabel} is temporarily unavailable (${status}). Please try again shortly.`,
        { provider, retriable: true, causeDetail: rawDetail }
      );
    }

    if (status === 400 || status === 415 || status === 422) {
      return new CaptionError(
        'UPLOAD_ERROR',
        422,
        'asr_transcription',
        `${providerLabel} could not decode the uploaded audio format (${status}). Please upload a valid video/audio file.`,
        { provider, retriable: false, causeDetail: rawDetail }
      );
    }

    const isNetworkError = /fetch failed|econnreset|enotfound|etimedout|network/i.test(rawDetail);
    return new CaptionError(
      'PROVIDER_UNAVAILABLE',
      503,
      'asr_transcription',
      isNetworkError
        ? `Unable to reach ${providerLabel} over the network. Please check server connectivity and retry.`
        : `${providerLabel} failed to transcribe audio.`,
      { provider, retriable: isNetworkError, causeDetail: rawDetail }
    );
  }

  /**
   * Transcribe via local Python script using faster-whisper
   */
  public static async transcribeWithPython(
    audioPath: string,
    langCode?: string,
    resolvedPythonExe?: string,
    timeoutMs = 180000
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const scriptPath = path.resolve(__dirname, '../scripts/transcribe_audio.py');
    const pythonExe = resolvedPythonExe || this.getPythonPath();

    const args = [scriptPath, audioPath];
    if (langCode && langCode.trim()) {
      args.push(langCode.trim());
    }

    const { stdout, stderr } = await execFileAsync(pythonExe, args, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: Math.max(15000, timeoutMs),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    if (stderr && stderr.includes('Error')) {
      logger.warn('[ASR] transcribe_audio.py stderr:', sanitizeDiagnosticText(stderr));
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(stdout || '{}');
    } catch {
      throw new Error(`Failed to parse ASR python output: ${sanitizeDiagnosticText(stdout, 180)}`);
    }

    if (parsed.error) {
      throw new Error(`ASR engine error: ${sanitizeDiagnosticText(parsed.error, 200)}`);
    }

    const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
    const segments: TranscriptionSegment[] = rawSegments.map((s: any, idx: number) => {
      const rawWords = Array.isArray(s.words) ? s.words : [];
      const words: TranscriptionWord[] = [];
      for (let wi = 0; wi < rawWords.length; wi++) {
        const w = rawWords[wi];
        const token = String(w?.word ?? '').trim();
        if (!token) continue;
        const ws = Number(w?.start ?? 0);
        let we = Number(w?.end ?? 0);
        if (!Number.isFinite(ws) || ws < 0) continue;
        if (!Number.isFinite(we) || we <= ws) {
          const nextWs = Number(rawWords[wi + 1]?.start);
          we = Number.isFinite(nextWs) && nextWs > ws ? Math.min(ws + 0.08, nextWs) : ws + 0.06;
        }
        words.push({
          word: token,
          start: ws,
          end: we,
          confidence: typeof w.probability === 'number' ? w.probability : undefined,
          estimated: false
        });
      }

      return {
        id: s.id || `seg_${idx + 1}`,
        start: Number(s.start || 0),
        end: Number(s.end || 0),
        text: String(s.text || '').trim(),
        words,
        estimated: words.length === 0
      };
    });

    return {
      text: (parsed.text || '').trim(),
      duration: parsed.duration,
      language: parsed.language || 'English',
      language_code: parsed.language_code || langCode || 'en',
      language_probability: typeof parsed.language_probability === 'number' ? parsed.language_probability : undefined,
      is_ambiguous_hindi_urdu: Boolean(parsed.is_ambiguous_hindi_urdu),
      segments
    };
  }

  /**
   * Transcribe via Groq Cloud Whisper API (whisper-large-v3-turbo)
   */
  private static async transcribeWithGroq(
    audioBuffer: Buffer,
    filename: string,
    mimeType: string,
    langCode: string | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, filename || 'audio.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    if (langCode && langCode.length === 2) {
      formData.append('language', langCode);
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData,
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      const httpErr: any = new Error(`Groq Whisper API returned ${response.status}: ${sanitizeDiagnosticText(errText, 220)}`);
      httpErr.statusCode = response.status;
      httpErr.headers = response.headers;
      throw httpErr;
    }

    const data: any = await response.json();
    return this.parseWhisperVerboseJson(data, langCode);
  }

  /**
   * Transcribe via OpenAI Whisper API (whisper-1)
   */
  private static async transcribeWithOpenAI(
    audioBuffer: Buffer,
    filename: string,
    mimeType: string,
    langCode: string | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Omit<SpeechRecognitionResult, 'provider'>> {
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, filename || 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    if (langCode && langCode.length === 2) {
      formData.append('language', langCode);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData,
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      const httpErr: any = new Error(`OpenAI Whisper API returned ${response.status}: ${sanitizeDiagnosticText(errText, 220)}`);
      httpErr.statusCode = response.status;
      httpErr.headers = response.headers;
      throw httpErr;
    }

    const data: any = await response.json();
    return this.parseWhisperVerboseJson(data, langCode);
  }
}
