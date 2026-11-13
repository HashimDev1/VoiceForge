import { CaptionErrorCode } from './types';

export interface CaptionUiErrorState {
  code: CaptionErrorCode;
  title: string;
  message: string;
  hint: string;
  canRetry: boolean;
  canPasteScript: boolean;
  requestId?: string;
  stage?: string;
}

interface ErrorPresentationMeta {
  title: string;
  defaultMessage: string;
  hint: string;
  canRetry: boolean;
  canPasteScript: boolean;
}

const ERROR_PRESENTATION_MAP: Record<CaptionErrorCode, ErrorPresentationMeta> = {
  UPLOAD_ERROR: {
    title: 'Upload Error',
    defaultMessage: 'The video file could not be uploaded or is in an unsupported format.',
    hint: 'Upload a valid MP4, MOV, M4V, WEBM, or MKV video under 500 MB.',
    canRetry: true,
    canPasteScript: false
  },
  NO_AUDIO_TRACK: {
    title: 'No Audio Track',
    defaultMessage: 'This video does not contain an audible audio stream.',
    hint: 'Upload a video with spoken narration, or paste your script manually in Auto Captions.',
    canRetry: false,
    canPasteScript: true
  },
  NO_SPEECH_DETECTED: {
    title: 'No Recognizable Speech',
    defaultMessage: 'Speech recognition completed, but no spoken words were detected in the audio track.',
    hint: 'Verify the video contains clear dialogue, select the spoken language explicitly, or paste your script directly.',
    canRetry: false,
    canPasteScript: true
  },
  MISSING_CREDENTIALS: {
    title: 'Speech Provider Unavailable (Missing Credentials)',
    defaultMessage: 'No speech recognition API key is configured on the server.',
    hint: 'Set GROQ_API_KEY, OPENAI_API_KEY, or FISH_API_KEY in your server environment variables and redeploy.',
    canRetry: false,
    canPasteScript: true
  },
  PROVIDER_UNAVAILABLE: {
    title: 'Speech Provider Unavailable',
    defaultMessage: 'The speech recognition service is temporarily unreachable or returned a server error.',
    hint: 'Retry in a few moments, or paste your script directly to generate captions immediately.',
    canRetry: true,
    canPasteScript: true
  },
  INVALID_API_KEY: {
    title: 'Invalid API Credentials',
    defaultMessage: 'The configured speech recognition API key was rejected (401/403).',
    hint: 'Check that GROQ_API_KEY, OPENAI_API_KEY, or FISH_API_KEY is valid and active in your server environment.',
    canRetry: false,
    canPasteScript: true
  },
  RATE_LIMITED: {
    title: 'Provider Rate Limit Reached',
    defaultMessage: 'The speech recognition provider temporarily rate-limited requests (429).',
    hint: 'Wait 30–60 seconds and click Retry.',
    canRetry: true,
    canPasteScript: false
  },
  AUDIO_TOO_LARGE: {
    title: 'Audio / Video Too Large',
    defaultMessage: 'The uploaded media or extracted audio exceeds the maximum allowed size limit.',
    hint: 'Export a smaller MP4/WEBM file (under 500 MB) or trim unused silent sections before uploading.',
    canRetry: false,
    canPasteScript: false
  },
  SERVER_TIMEOUT: {
    title: 'Server Timeout',
    defaultMessage: 'The server timed out before completing caption processing.',
    hint: 'Retry now, or test with a shorter clip if the server is under heavy load.',
    canRetry: true,
    canPasteScript: false
  },
  FFMPEG_ERROR: {
    title: 'FFmpeg Processing Error',
    defaultMessage: 'FFmpeg failed while processing the video or audio stream on the server.',
    hint: 'Ensure the video uses a standard H.264/AAC MP4 container and try again.',
    canRetry: true,
    canPasteScript: false
  },
  SUBTITLE_RENDER_ERROR: {
    title: 'Subtitle Rendering Error',
    defaultMessage: 'Failed to burn styled ASS subtitles onto the exported video.',
    hint: 'Check segment timestamps in the timeline or try exporting with a standard preset.',
    canRetry: true,
    canPasteScript: false
  }
};

export function resolveCaptionErrorPresentation(
  code: CaptionErrorCode,
  customMessage?: string,
  requestId?: string,
  stage?: string
): CaptionUiErrorState {
  const meta = ERROR_PRESENTATION_MAP[code] || ERROR_PRESENTATION_MAP.PROVIDER_UNAVAILABLE;
  return {
    code,
    title: meta.title,
    message: (customMessage && customMessage.trim()) || meta.defaultMessage,
    hint: meta.hint,
    canRetry: meta.canRetry,
    canPasteScript: meta.canPasteScript,
    requestId,
    stage
  };
}

function inferCodeFromHttpStatus(
  status: number,
  operation: 'transcribe' | 'render'
): CaptionErrorCode {
  if (status === 413) return 'AUDIO_TOO_LARGE';
  if (status === 401 || status === 403) return 'INVALID_API_KEY';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 408 || status === 504) return 'SERVER_TIMEOUT';
  if (status === 502 || status === 503) return 'PROVIDER_UNAVAILABLE';
  if (status === 400 || status === 415 || status === 422) return 'UPLOAD_ERROR';
  return operation === 'render' ? 'SUBTITLE_RENDER_ERROR' : 'FFMPEG_ERROR';
}

export function parseCaptionApiError(
  status: number,
  rawBody: string,
  operation: 'transcribe' | 'render',
  headerRequestId?: string | null
): CaptionUiErrorState {
  let parsed: any = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }

  const code: CaptionErrorCode =
    parsed?.errorCode && parsed.errorCode in ERROR_PRESENTATION_MAP
      ? (parsed.errorCode as CaptionErrorCode)
      : inferCodeFromHttpStatus(status, operation);

  const serverMessage = typeof parsed?.error === 'string' ? parsed.error : undefined;
  const requestId = parsed?.requestId || headerRequestId || undefined;
  const stage = typeof parsed?.stage === 'string' ? parsed.stage : undefined;

  return resolveCaptionErrorPresentation(code, serverMessage, requestId, stage);
}

export function parseCaptionNetworkError(
  err: unknown,
  operation: 'transcribe' | 'render'
): CaptionUiErrorState {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (
    (err instanceof Error && err.name === 'AbortError') ||
    /timed?\s*out|aborterror/i.test(msg)
  ) {
    return resolveCaptionErrorPresentation(
      'SERVER_TIMEOUT',
      operation === 'render'
        ? 'Video subtitle export timed out before the server responded.'
        : 'Video transcription timed out before the server responded.'
    );
  }

  return resolveCaptionErrorPresentation(
    'UPLOAD_ERROR',
    'Network connection was interrupted while uploading media to the server.'
  );
}

