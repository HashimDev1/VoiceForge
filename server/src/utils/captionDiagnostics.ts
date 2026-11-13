import { randomUUID } from 'crypto';
import { CaptionErrorCode } from '../../../shared/src/types';
import { config } from '../config';
import { logger } from './logger';

export type { CaptionErrorCode };

export type CaptionStageName =
  | 'upload_validation'
  | 'media_probe'
  | 'audio_extraction'
  | 'audio_chunking'
  | 'asr_transcription'
  | 'caption_grouping'
  | 'ass_generation'
  | 'subtitle_burn_in'
  | 'completed';

export type CaptionOperationName =
  | 'transcribe-video'
  | 'render-video'
  | 'transcribe-audio'
  | 'caption-video';

export type CaptionTranscriptionStatus =
  | 'not_applicable'
  | 'pending'
  | 'succeeded'
  | 'empty_speech'
  | 'failed';

export interface CaptionErrorOptions {
  provider?: string;
  retriable?: boolean;
  causeDetail?: string;
}

export class CaptionError extends Error {
  public readonly code: CaptionErrorCode;
  public readonly httpStatus: number;
  public readonly stage: CaptionStageName;
  public readonly userMessage: string;
  public readonly provider?: string;
  public readonly retriable: boolean;
  public readonly causeDetail?: string;

  constructor(
    code: CaptionErrorCode,
    httpStatus: number,
    stage: CaptionStageName,
    userMessage: string,
    options: CaptionErrorOptions = {}
  ) {
    super(userMessage);
    this.name = 'CaptionError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.stage = stage;
    this.userMessage = userMessage;
    this.provider = options.provider;
    this.retriable = Boolean(options.retriable);
    this.causeDetail = options.causeDetail ? sanitizeDiagnosticText(options.causeDetail) : undefined;
  }
}

/**
 * Scrubs any API keys, Bearer tokens, Authorization headers, or oversized payloads
 * so sensitive secrets and private transcripts can never leak into logs or responses.
 */
export function sanitizeDiagnosticText(input: unknown, maxLength = 360): string {
  if (input === null || input === undefined) return '';
  let raw = typeof input === 'string'
    ? input
    : input instanceof Error
      ? input.message
      : String(input);

  // Strip Authorization headers and Bearer tokens
  raw = raw.replace(/Authorization["'\s:=]+Bearer\s+[^\s"',;]+/gi, 'Authorization: [REDACTED]');
  raw = raw.replace(/Bearer\s+[A-Za-z0-9._\-+/=]{6,}/gi, 'Bearer [REDACTED]');

  // Strip common provider token prefixes
  raw = raw.replace(/\bgsk_[A-Za-z0-9_]{8,}\b/g, 'gsk_[REDACTED]');
  raw = raw.replace(/\bsk-[A-Za-z0-9._\-]{8,}\b/g, 'sk-[REDACTED]');
  raw = raw.replace(/\bhf_[A-Za-z0-9_]{8,}\b/g, 'hf_[REDACTED]');
  raw = raw.replace(/\bgithub_pat_[A-Za-z0-9_]{8,}\b/g, '[REDACTED]');
  raw = raw.replace(/(api[_-]?key|x-api-key|token|secret)(["'\s:=]+)[A-Za-z0-9._\-]{8,}/gi, '$1$2[REDACTED]');

  // Scrub any active configured keys by exact match if present in env/config
  const candidateSecrets = [
    config.groqApiKey,
    config.openaiApiKey,
    config.fishApiKey,
    config.huggingFaceApiKey,
    process.env.GROQ_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.FISH_API_KEY,
    process.env.HUGGINGFACE_API_KEY,
    process.env.HF_TOKEN
  ].filter((v): v is string => Boolean(v && v.trim().length >= 6 && !v.startsWith('YOUR_')));

  for (const secret of candidateSecrets) {
    if (raw.includes(secret)) {
      raw = raw.split(secret).join('[REDACTED]');
    }
  }

  raw = raw.replace(/\s+/g, ' ').trim();
  if (raw.length > maxLength) {
    return `${raw.slice(0, maxLength)}...[truncated]`;
  }
  return raw;
}

export interface CaptionDiagnosticRecord {
  requestId: string;
  operation: CaptionOperationName;
  stage: CaptionStageName;
  selectedProvider: string | null;
  fileSize: number;
  mediaDuration: number | null;
  ffmpegAvailable: boolean | null;
  transcriptionStatus: CaptionTranscriptionStatus;
  segmentCount: number;
  elapsedMs: number;
  errorCode: CaptionErrorCode | null;
  errorMessage: string | null;
}

/**
 * Production-safe per-request diagnostic recorder for Caption Studio operations.
 * Records operational telemetry without ever logging API keys, auth headers,
 * private transcripts, or media contents.
 */
export class CaptionRequestDiagnostics {
  public readonly requestId: string;
  public readonly operation: CaptionOperationName;
  public stage: CaptionStageName = 'upload_validation';
  public selectedProvider: string | null = null;
  public fileSize = 0;
  public mediaDuration: number | null = null;
  public ffmpegAvailable: boolean | null = null;
  public transcriptionStatus: CaptionTranscriptionStatus = 'pending';
  public segmentCount = 0;
  private readonly startedAtMs: number;

  private static recentRecords: CaptionDiagnosticRecord[] = [];
  private static readonly MAX_RECENT = 50;

  constructor(operation: CaptionOperationName, requestId?: string) {
    this.operation = operation;
    this.requestId = requestId || randomUUID();
    this.startedAtMs = Date.now();
    if (operation === 'render-video') {
      this.transcriptionStatus = 'not_applicable';
    }
  }

  public setStage(stage: CaptionStageName): void {
    this.stage = stage;
  }

  public toRecord(error?: CaptionError | Error | null): CaptionDiagnosticRecord {
    const elapsedMs = Math.max(0, Date.now() - this.startedAtMs);
    let errorCode: CaptionErrorCode | null = null;
    let errorMessage: string | null = null;

    if (error) {
      if (error instanceof CaptionError) {
        errorCode = error.code;
        errorMessage = sanitizeDiagnosticText(error.causeDetail || error.userMessage);
      } else {
        errorCode = classifyUnknownCaptionError(error, this.stage).code;
        errorMessage = sanitizeDiagnosticText(error.message);
      }
    }

    return {
      requestId: this.requestId,
      operation: this.operation,
      stage: this.stage,
      selectedProvider: this.selectedProvider,
      fileSize: this.fileSize,
      mediaDuration: this.mediaDuration !== null && Number.isFinite(this.mediaDuration)
        ? Number(this.mediaDuration.toFixed(2))
        : null,
      ffmpegAvailable: this.ffmpegAvailable,
      transcriptionStatus: this.transcriptionStatus,
      segmentCount: this.segmentCount,
      elapsedMs,
      errorCode,
      errorMessage
    };
  }

  public logSuccess(): CaptionDiagnosticRecord {
    this.stage = 'completed';
    const record = this.toRecord(null);
    CaptionRequestDiagnostics.pushRecord(record);
    logger.info(`[CaptionDiag] ${JSON.stringify(record)}`);
    return record;
  }

  public logFailure(error: CaptionError | Error): CaptionDiagnosticRecord {
    if (error instanceof CaptionError) {
      this.stage = error.stage;
      if (error.provider && !this.selectedProvider) {
        this.selectedProvider = error.provider;
      }
    }
    if (this.transcriptionStatus === 'pending') {
      this.transcriptionStatus = error instanceof CaptionError && error.code === 'NO_SPEECH_DETECTED'
        ? 'empty_speech'
        : 'failed';
    }
    const record = this.toRecord(error);
    CaptionRequestDiagnostics.pushRecord(record);
    logger.error(`[CaptionDiag] ${JSON.stringify(record)}`);
    return record;
  }

  private static pushRecord(record: CaptionDiagnosticRecord): void {
    this.recentRecords.push(record);
    if (this.recentRecords.length > this.MAX_RECENT) {
      this.recentRecords.splice(0, this.recentRecords.length - this.MAX_RECENT);
    }
  }

  public static getRecentRecords(): CaptionDiagnosticRecord[] {
    return [...this.recentRecords];
  }

  public static clearRecentRecords(): void {
    this.recentRecords = [];
  }
}

/**
 * Ensures any unexpected Error is normalized into a structured CaptionError.
 */
export function classifyUnknownCaptionError(
  error: unknown,
  fallbackStage: CaptionStageName = 'asr_transcription'
): CaptionError {
  if (error instanceof CaptionError) {
    return error;
  }

  const rawMsg = error instanceof Error ? error.message : String(error || 'Caption processing failed.');
  const lower = rawMsg.toLowerCase();

  if (lower.includes('does not contain an audio track') || lower.includes('no audio track')) {
    return new CaptionError('NO_AUDIO_TRACK', 422, 'media_probe', rawMsg, { causeDetail: rawMsg });
  }
  if (lower.includes('no speech was detected') || lower.includes('no recognizable speech')) {
    return new CaptionError('NO_SPEECH_DETECTED', 422, 'asr_transcription', rawMsg, { causeDetail: rawMsg });
  }
  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborterror')) {
    return new CaptionError(
      'SERVER_TIMEOUT',
      504,
      fallbackStage,
      'The caption operation timed out. Please retry or try a shorter clip.',
      { retriable: true, causeDetail: rawMsg }
    );
  }
  if (lower.includes('413') || lower.includes('too large') || lower.includes('limit_file_size')) {
    return new CaptionError(
      'AUDIO_TOO_LARGE',
      413,
      fallbackStage,
      'The media file or extracted audio exceeds the maximum allowed upload size.',
      { causeDetail: rawMsg }
    );
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return new CaptionError(
      'RATE_LIMITED',
      429,
      'asr_transcription',
      'Speech recognition provider rate limit reached. Please wait a moment and try again.',
      { retriable: true, causeDetail: rawMsg }
    );
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('invalid api key') || lower.includes('unauthorized')) {
    return new CaptionError(
      'INVALID_API_KEY',
      401,
      'asr_transcription',
      'Speech recognition API credentials were rejected. Verify GROQ_API_KEY, OPENAI_API_KEY, or FISH_API_KEY on the server.',
      { causeDetail: rawMsg }
    );
  }
  if (lower.includes('speech recognition is not configured') || lower.includes('no speech recognition engine configured') || lower.includes('missing credentials')) {
    return new CaptionError(
      'MISSING_CREDENTIALS',
      503,
      'asr_transcription',
      'Speech recognition is not configured on this server. Set GROQ_API_KEY, OPENAI_API_KEY, or FISH_API_KEY in environment variables.',
      { causeDetail: rawMsg }
    );
  }
  if (fallbackStage === 'subtitle_burn_in' || fallbackStage === 'ass_generation' || lower.includes('libass') || lower.includes('subtitles')) {
    return new CaptionError(
      'SUBTITLE_RENDER_ERROR',
      500,
      fallbackStage === 'ass_generation' ? 'ass_generation' : 'subtitle_burn_in',
      'Failed to render styled subtitles onto the video.',
      { causeDetail: rawMsg }
    );
  }
  if (fallbackStage === 'audio_extraction' || fallbackStage === 'media_probe' || lower.includes('ffmpeg') || lower.includes('enoent')) {
    return new CaptionError(
      'FFMPEG_ERROR',
      500,
      fallbackStage,
      'FFmpeg failed to process the media file on the server.',
      { causeDetail: rawMsg }
    );
  }

  return new CaptionError(
    'PROVIDER_UNAVAILABLE',
    503,
    fallbackStage,
    sanitizeDiagnosticText(rawMsg, 220) || 'Speech recognition service is currently unavailable.',
    { retriable: true, causeDetail: rawMsg }
  );
}
