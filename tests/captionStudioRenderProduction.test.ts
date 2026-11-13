import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { execFile } from 'child_process';
import util from 'util';

process.env.NODE_ENV = 'test';

import app from '../server/src/index';
import { resolveAsrProviderPriority } from '../server/src/config';
import { FFmpegHelper } from '../server/src/utils/ffmpegHelper';
import { SpeechRecognitionService } from '../server/src/services/speechRecognitionService';
import { CaptionService } from '../server/src/services/captionService';
import { CaptionVideoService } from '../server/src/services/captionVideoService';
import {
  CaptionRequestDiagnostics,
  sanitizeDiagnosticText
} from '../server/src/utils/captionDiagnostics';
import {
  parseCaptionApiError,
  parseCaptionNetworkError,
  resolveCaptionErrorPresentation
} from '../shared/src/captionErrorHandling';

const execFileAsync = util.promisify(execFile);

interface EnvSnapshot {
  NODE_ENV?: string;
  ASR_PROVIDER_PRIORITY?: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  FISH_API_KEY?: string;
  ASR_MAX_RETRIES?: string;
  ASR_REQUEST_TIMEOUT_MS?: string;
  ASR_MAX_UPLOAD_BYTES?: string;
  FFPROBE_PATH?: string;
}

function captureEnv(): EnvSnapshot {
  return {
    NODE_ENV: process.env.NODE_ENV,
    ASR_PROVIDER_PRIORITY: process.env.ASR_PROVIDER_PRIORITY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    FISH_API_KEY: process.env.FISH_API_KEY,
    ASR_MAX_RETRIES: process.env.ASR_MAX_RETRIES,
    ASR_REQUEST_TIMEOUT_MS: process.env.ASR_REQUEST_TIMEOUT_MS,
    ASR_MAX_UPLOAD_BYTES: process.env.ASR_MAX_UPLOAD_BYTES,
    FFPROBE_PATH: process.env.FFPROBE_PATH
  };
}

function restoreEnv(snap: EnvSnapshot): void {
  const keys = Object.keys(snap) as Array<keyof EnvSnapshot>;
  for (const k of keys) {
    if (snap[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snap[k];
    }
  }
}

async function runTests() {
  console.log('===================================================================');
  console.log(' Running Caption Studio Render Production & ASR Integration Tests');
  console.log('===================================================================');

  const originalFetch = global.fetch;
  const envBackup = captureEnv();
  const tempWorkDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'voiceforge-prod-test-'));

  let server: http.Server | null = null;
  let baseUrl = '';

  try {
    // Start isolated Express HTTP server on ephemeral port for route-level integration tests
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const addr = server.address();
    assert(addr && typeof addr === 'object', 'Test HTTP server must bind to a valid port');
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // =========================================================================
    // TEST 1: Local Temp Audio Extension Resolution & Cross-Platform Safety
    // =========================================================================
    console.log('\n[Test 1] Verifying audio format extension preservation & filename safety...');
    {
      const wavFmt = SpeechRecognitionService.resolveAudioFormat('source-audio.wav');
      assert.strictEqual(wavFmt.ext, '.wav');
      assert.strictEqual(wavFmt.mimeType, 'audio/wav');
      assert.strictEqual(wavFmt.safeFilename, 'source-audio.wav');

      const oggFmt = SpeechRecognitionService.resolveAudioFormat('C:\\Users\\Demo\\clip:test?.OGG');
      assert.strictEqual(oggFmt.ext, '.ogg');
      assert.strictEqual(oggFmt.mimeType, 'audio/ogg');
      assert(oggFmt.safeFilename.endsWith('.ogg'), 'Must preserve .ogg extension');
      assert(!/[<>:"/\\|?*]/.test(oggFmt.safeFilename), 'Must sanitize Windows/Linux unsafe chars');

      const m4aFmt = SpeechRecognitionService.resolveAudioFormat('/tmp/podcast_episode.m4a');
      assert.strictEqual(m4aFmt.ext, '.m4a');
      assert.strictEqual(m4aFmt.mimeType, 'audio/mp4');
      assert.strictEqual(m4aFmt.safeFilename, 'podcast_episode.m4a');

      const webmFmt = SpeechRecognitionService.resolveAudioFormat('browser-recording.webm');
      assert.strictEqual(webmFmt.ext, '.webm');
      assert.strictEqual(webmFmt.mimeType, 'audio/webm');

      const noExtFmt = SpeechRecognitionService.resolveAudioFormat('raw_recording');
      assert.strictEqual(noExtFmt.ext, '.mp3');
      assert.strictEqual(noExtFmt.safeFilename, 'raw_recording.mp3');

      console.log('✓ Audio extensions (.wav, .ogg, .m4a, .webm, .mp3) & cross-platform filenames verified.');
    }

    // =========================================================================
    // TEST 2: Groq Verbose JSON Top-Level `data.words` + `data.segments` Mapping
    // =========================================================================
    console.log('\n[Test 2] Verifying Groq verbose_json top-level data.words & real timestamp preservation...');
    {
      const realisticGroqVerboseJson = {
        task: 'transcribe',
        language: 'english',
        duration: 4.82,
        text: 'Welcome back to VoiceForge Studio captions today.',
        // Realistic Groq output: non-uniform real word timings at top-level `data.words`, NO nested `segment.words`
        words: [
          { word: ' Welcome', start: 0.14, end: 0.62 },
          { word: ' back', start: 0.62, end: 0.88 },
          { word: ' to', start: 0.88, end: 0.96 },
          { word: ' VoiceForge', start: 1.05, end: 1.84 },
          { word: ' Studio', start: 1.84, end: 2.39 },
          { word: ' captions', start: 2.95, end: 3.68 },
          { word: ' today.', start: 3.68, end: 4.41 }
        ],
        segments: [
          {
            id: 0,
            seek: 0,
            start: 0.14,
            end: 2.39,
            text: ' Welcome back to VoiceForge Studio',
            temperature: 0,
            avg_logprob: -0.19,
            no_speech_prob: 0.008
          },
          {
            id: 1,
            seek: 0,
            start: 2.95,
            end: 4.41,
            text: ' captions today.',
            temperature: 0,
            avg_logprob: -0.15,
            no_speech_prob: 0.004
          }
        ]
      };

      process.env.ASR_PROVIDER_PRIORITY = 'groq';
      process.env.GROQ_API_KEY = 'gsk_test_valid_groq_key_123456';
      delete process.env.OPENAI_API_KEY;
      delete process.env.FISH_API_KEY;
      SpeechRecognitionService.setLocalWhisperAvailabilityForTesting(false);

      let uploadedFileName = '';
      let requestedGranularities: string[] = [];

      global.fetch = (async (input: any, init?: any) => {
        const url = String(input);
        if (url.includes('api.groq.com/openai/v1/audio/transcriptions')) {
          const body = init?.body as FormData;
          const fileEntry = body.get('file') as File;
          uploadedFileName = fileEntry?.name || '';
          requestedGranularities = body.getAll('timestamp_granularities[]').map(String);
          return new Response(JSON.stringify(realisticGroqVerboseJson), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      const generated = await CaptionService.generateFromAudio(
        Buffer.from('RIFF_SYNTHETIC_WAV_PAYLOAD_FOR_MOCK_TEST'),
        'interview_take.wav',
        { maxWords: 3 }
      );

      assert.strictEqual(uploadedFileName, 'interview_take.wav', 'Must preserve .wav filename on Groq upload');
      assert(requestedGranularities.includes('word') && requestedGranularities.includes('segment'), 'Must request both word and segment granularities');
      assert.strictEqual(generated.provider, 'groq');
      assert.strictEqual(generated.timing_mode, 'word', 'Must report genuine word timing mode');
      assert.strictEqual(generated.estimated_timing, false, 'Must NOT mark real Groq word timestamps as estimated');

      const flatWords = generated.segments.flatMap((s) => s.words || []);
      assert.strictEqual(flatWords.length, 7, 'All 7 top-level Groq words must be mapped');
      // Verify exact non-uniform timestamps were preserved (NOT evenly spaced!)
      assert.strictEqual(flatWords[0].word, 'Welcome');
      assert.strictEqual(flatWords[0].start, 0.14);
      assert.strictEqual(flatWords[0].end, 0.62);
      assert.strictEqual(flatWords[3].word, 'VoiceForge');
      assert.strictEqual(flatWords[3].start, 1.05);
      assert.strictEqual(flatWords[3].end, 1.84);
      assert.strictEqual(flatWords[5].word, 'captions');
      assert.strictEqual(flatWords[5].start, 2.95);
      assert.strictEqual(flatWords[5].end, 3.68);
      assert(flatWords.every((w) => w.estimated === false), 'Every word must have estimated=false');

      // Also verify segment-only response explicitly marks estimated timing
      global.fetch = (async () =>
        new Response(
          JSON.stringify({
            language: 'en',
            duration: 3.0,
            text: 'Estimated segment fallback test',
            segments: [{ id: 0, start: 0.0, end: 3.0, text: 'Estimated segment fallback test' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as typeof fetch;

      const estimatedResult = await CaptionService.generateFromAudio(
        Buffer.from('SEGMENT_ONLY_AUDIO'),
        'clip.mp3',
        { maxWords: 2 }
      );
      assert.strictEqual(estimatedResult.timing_mode, 'estimated');
      assert.strictEqual(estimatedResult.estimated_timing, true);
      assert(
        estimatedResult.segments.every((s) => s.estimated === true),
        'Estimated segments must be explicitly flagged estimated=true'
      );

      console.log('✓ Groq top-level data.words timestamps & explicit estimated-timing flags verified.');
    }

    // =========================================================================
    // TEST 3: Missing Local faster-whisper + Missing Credentials / Auth / Rate Limit / Oversized
    // =========================================================================
    console.log('\n[Test 3] Verifying missing faster-whisper caching & strict error classification (401/403/413/429/503)...');
    {
      // 3A: Missing local faster-whisper + Missing cloud credentials -> MISSING_CREDENTIALS (NEVER "No speech detected")
      SpeechRecognitionService.setLocalWhisperAvailabilityForTesting(false, 'No module named faster_whisper');
      process.env.NODE_ENV = 'production';
      delete process.env.ASR_PROVIDER_PRIORITY;
      process.env.GROQ_API_KEY = '';
      process.env.OPENAI_API_KEY = '';
      process.env.FISH_API_KEY = '';

      const prodPriority = resolveAsrProviderPriority();
      assert.strictEqual(prodPriority[0], 'groq', 'Production default priority must prefer cloud ASR first');

      let pythonCalledCount = 0;
      const origPythonFn = SpeechRecognitionService.transcribeWithPython;
      SpeechRecognitionService.transcribeWithPython = async (...args) => {
        pythonCalledCount++;
        return origPythonFn.apply(SpeechRecognitionService, args);
      };

      try {
        await assert.rejects(
          () => CaptionService.generateFromAudio(Buffer.from('VALID_AUDIO_BYTES'), 'test.mp3'),
          (err: any) => {
            assert.strictEqual(err.code, 'MISSING_CREDENTIALS');
            assert.strictEqual(err.httpStatus, 503);
            assert(!/no speech/i.test(err.message), 'Must NEVER report No speech detected when credentials are missing');
            return true;
          }
        );
        assert.strictEqual(pythonCalledCount, 0, 'Unavailable local faster-whisper must NOT be invoked');
      } finally {
        SpeechRecognitionService.transcribeWithPython = origPythonFn;
      }

      // 3B: Invalid API Key (401 & 403) -> INVALID_API_KEY (NEVER "No speech detected")
      process.env.GROQ_API_KEY = 'gsk_invalid_secret_key_value_999999';
      process.env.ASR_MAX_RETRIES = '1';
      let authAttempts = 0;
      global.fetch = (async () => {
        authAttempts++;
        return new Response(
          JSON.stringify({ error: { message: 'Invalid API Key gsk_invalid_secret_key_value_999999' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      await assert.rejects(
        () => CaptionService.generateFromAudio(Buffer.from('AUDIO_DATA'), 'speech.mp3'),
        (err: any) => {
          assert.strictEqual(err.code, 'INVALID_API_KEY');
          assert.strictEqual(err.httpStatus, 401);
          assert(!err.message.includes('gsk_invalid_secret_key_value_999999'), 'Must never leak raw API key');
          assert(!/no speech/i.test(err.message), 'Must NEVER report No speech detected on 401');
          return true;
        }
      );
      assert.strictEqual(authAttempts, 1, '401 Unauthorized must NOT be retried');

      // 3C: Provider Rate Limiting (429): transient retry succeeds, persistent 429 -> RATE_LIMITED
      process.env.ASR_MAX_RETRIES = '2';
      let rateCalls = 0;
      global.fetch = (async () => {
        rateCalls++;
        if (rateCalls === 1) {
          return new Response('Rate limit exceeded', {
            status: 429,
            headers: { 'Retry-After': '0.05' }
          });
        }
        return new Response(
          JSON.stringify({
            language: 'en',
            duration: 1.5,
            text: 'Recovered after retry.',
            words: [
              { word: 'Recovered', start: 0.1, end: 0.6 },
              { word: 'after', start: 0.6, end: 0.9 },
              { word: 'retry.', start: 0.9, end: 1.4 }
            ],
            segments: [{ id: 0, start: 0.1, end: 1.4, text: 'Recovered after retry.' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      const recovered = await CaptionService.generateFromAudio(Buffer.from('AUDIO_DATA'), 'retry.mp3');
      assert.strictEqual(rateCalls, 2, 'Should retry transient 429 and succeed');
      assert.strictEqual(recovered.segments[0].text, 'Recovered after retry.');

      // Persistent 429 -> RATE_LIMITED
      process.env.ASR_MAX_RETRIES = '1';
      global.fetch = (async () =>
        new Response('Too many requests', { status: 429, headers: { 'Retry-After': '0.05' } })) as typeof fetch;

      await assert.rejects(
        () => CaptionService.generateFromAudio(Buffer.from('AUDIO_DATA'), 'ratelimit.mp3'),
        (err: any) => {
          assert.strictEqual(err.code, 'RATE_LIMITED');
          assert.strictEqual(err.httpStatus, 429);
          assert(!/no speech/i.test(err.message));
          return true;
        }
      );

      // 3D: Oversized audio -> AUDIO_TOO_LARGE (413)
      const oversizedBuf = Buffer.alloc(2 * 1024 * 1024, 1); // 2 MB buffer against 512 KB test ceiling
      await assert.rejects(
        () =>
          CaptionService.generateFromAudio(oversizedBuf, 'huge.wav', {
            maxChunkBytes: 512 * 1024,
            disableAutoChunking: true
          }),
        (err: any) => {
          assert.strictEqual(err.code, 'AUDIO_TOO_LARGE');
          assert.strictEqual(err.httpStatus, 413);
          return true;
        }
      );

      // 3E: Request Timeout -> SERVER_TIMEOUT (504)
      process.env.ASR_MAX_RETRIES = '0';
      process.env.ASR_REQUEST_TIMEOUT_MS = '500';
      global.fetch = ((_input: any, init?: any) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        })) as typeof fetch;

      await assert.rejects(
        () => CaptionService.generateFromAudio(Buffer.from('AUDIO_DATA'), 'slow.mp3'),
        (err: any) => {
          assert.strictEqual(err.code, 'SERVER_TIMEOUT');
          assert.strictEqual(err.httpStatus, 504);
          return true;
        }
      );
      process.env.ASR_REQUEST_TIMEOUT_MS = '90000';

      console.log('✓ Missing faster-whisper, MISSING_CREDENTIALS, 401 INVALID_API_KEY, 429 RATE_LIMITED (+retry), 413 AUDIO_TOO_LARGE & 504 SERVER_TIMEOUT verified.');
    }

    // =========================================================================
    // TEST 4: Urdu & Hindi Transcription (Native Script + Roman Urdu / Hinglish)
    // =========================================================================
    console.log('\n[Test 4] Verifying Urdu, Hindi, Roman Urdu, and Hinglish transcription...');
    {
      process.env.GROQ_API_KEY = 'gsk_test_multilingual_key_123456';
      SpeechRecognitionService.setLocalWhisperAvailabilityForTesting(false);

      // 4A: Native Urdu script
      global.fetch = (async (_input: any, init?: any) => {
        const body = init?.body as FormData;
        assert.strictEqual(body.get('language'), 'ur', 'Must send ISO code ur for Urdu');
        return new Response(
          JSON.stringify({
            language: 'urdu',
            duration: 3.2,
            text: 'آپ کیسے ہیں دوست',
            words: [
              { word: 'آپ', start: 0.2, end: 0.7 },
              { word: 'کیسے', start: 0.7, end: 1.4 },
              { word: 'ہیں', start: 1.4, end: 2.0 },
              { word: 'دوست', start: 2.0, end: 2.9 }
            ],
            segments: [{ id: 0, start: 0.2, end: 2.9, text: 'آپ کیسے ہیں دوست' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      const urduNative = await CaptionService.generateFromAudio(Buffer.from('URDU_AUDIO'), 'urdu.mp3', {
        language: 'ur',
        maxWords: 2
      });
      assert.strictEqual(urduNative.total_segments, 2);
      assert(urduNative.segments[0].text.includes('آپ'));

      // 4B: Hindi -> Hinglish / Roman Hindi conversion (`hi_roman`)
      global.fetch = (async (_input: any, init?: any) => {
        const body = init?.body as FormData;
        assert.strictEqual(body.get('language'), 'hi', 'hi_roman must request ISO code hi from Whisper');
        return new Response(
          JSON.stringify({
            language: 'hindi',
            duration: 2.8,
            text: 'नमस्ते आप कैसे हैं',
            words: [
              { word: 'नमस्ते', start: 0.1, end: 0.8 },
              { word: 'आप', start: 0.8, end: 1.3 },
              { word: 'कैसे', start: 1.3, end: 2.0 },
              { word: 'हैं', start: 2.0, end: 2.6 }
            ],
            segments: [{ id: 0, start: 0.1, end: 2.6, text: 'नमस्ते आप कैसे हैं' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      const hindiRoman = await CaptionService.generateFromAudio(Buffer.from('HINDI_AUDIO'), 'hindi.mp3', {
        language: 'hi_roman',
        maxWords: 4
      });
      assert.strictEqual(hindiRoman.language, 'hi_roman');
      assert(!/[\u0900-\u097F]/.test(hindiRoman.segments[0].text), 'Devanagari must be transliterated into Roman script');
      assert(/namaste/i.test(hindiRoman.segments[0].text), `Expected transliterated 'Namaste', got: ${hindiRoman.segments[0].text}`);

      console.log(`✓ Urdu native & Hindi/Roman transliteration verified ("${hindiRoman.segments[0].text}").`);
    }

    // =========================================================================
    // TEST 5: Long Audio Chunking, Offset Preservation & Seam Word Deduplication
    // =========================================================================
    console.log('\n[Test 5] Verifying long audio FFmpeg chunking, timestamp offsets & overlap deduplication...');
    {
      const longAudioPath = path.join(tempWorkDir, 'long_recording.mp3');
      // Generate a real 14-second audio fixture and split into 6s chunks with 1.5s overlap (3 chunks: 0s, 4.5s, 9.0s)
      await FFmpegHelper.generateToneAudio(longAudioPath, 14.0);

      const chunkCallOffsets: string[] = [];
      let callIdx = 0;

      global.fetch = (async (_input: any, init?: any) => {
        const currentChunk = callIdx++;
        const body = init?.body as FormData;
        const f = body.get('file') as File;
        chunkCallOffsets.push(f?.name || `chunk_${currentChunk}`);

        // Simulate realistic overlapping transcriptions across the 3 chunks:
        // Chunk 0 (offset 0.0s, window 0..6.0s): "Welcome to long video" + boundary word "chapter" at 5.0..5.4s
        // Chunk 1 (offset 4.5s, window 4.5..10.5s): duplicate boundary word "chapter" at local 0.52..0.92s (5.02..5.42s) + "one narration continues" + "smoothly" at local 5.0..5.45s (9.5..9.95s)
        // Chunk 2 (offset 9.0s, window 9.0..14.0s): duplicate boundary word "smoothly" at local 0.5..0.95s (9.5..9.95s) + "until the end."
        const payloads = [
          {
            language: 'en',
            duration: 6.0,
            text: 'Welcome to long video chapter',
            words: [
              { word: 'Welcome', start: 0.4, end: 0.9 },
              { word: 'to', start: 0.9, end: 1.2 },
              { word: 'long', start: 1.5, end: 2.1 },
              { word: 'video', start: 2.1, end: 2.8 },
              { word: 'chapter', start: 5.0, end: 5.4 }
            ]
          },
          {
            language: 'en',
            duration: 6.0,
            text: 'chapter one narration continues smoothly',
            words: [
              { word: 'chapter', start: 0.52, end: 0.92 }, // 5.02..5.42s global (overlap duplicate!)
              { word: 'one', start: 1.1, end: 1.5 },       // 5.6..6.0s global
              { word: 'narration', start: 2.0, end: 2.8 }, // 6.5..7.3s global
              { word: 'continues', start: 3.0, end: 3.8 }, // 7.5..8.3s global
              { word: 'smoothly', start: 5.0, end: 5.45 }  // 9.5..9.95s global (seam 2)
            ]
          },
          {
            language: 'en',
            duration: 5.0,
            text: 'smoothly until the end.',
            words: [
              { word: 'smoothly', start: 0.5, end: 0.95 }, // 9.5..9.95s global (overlap duplicate!)
              { word: 'until', start: 1.3, end: 1.8 },     // 10.3..10.8s global
              { word: 'the', start: 1.8, end: 2.1 },       // 10.8..11.1s global
              { word: 'end.', start: 2.1, end: 2.9 }       // 11.1..11.9s global
            ]
          }
        ];

        const chosen = payloads[Math.min(currentChunk, payloads.length - 1)];
        return new Response(JSON.stringify(chosen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }) as typeof fetch;

      const longResult = await CaptionService.generateFromAudioFile(
        longAudioPath,
        'long_recording.mp3',
        {
          maxWords: 3,
          chunkDurationSec: 6,
          chunkOverlapSec: 1.5
        }
      );

      assert.strictEqual(longResult.chunk_count, 3, `Expected 3 chunks, got ${longResult.chunk_count}`);
      const allWords = longResult.segments.flatMap((s) => s.words || []);
      const joinedSentence = allWords.map((w) => w.word).join(' ');
      assert.strictEqual(
        joinedSentence,
        'Welcome to long video chapter one narration continues smoothly until the end.',
        `Boundary duplicate words must be cleanly deduplicated, got: "${joinedSentence}"`
      );

      // Verify monotonic non-overlapping word offsets across the full 14s timeline
      for (let i = 1; i < allWords.length; i++) {
        assert(
          allWords[i].start >= allWords[i - 1].end - 0.001,
          `Word ${i} (${allWords[i].word} @ ${allWords[i].start}) overlapped previous (${allWords[i - 1].word} @ ${allWords[i - 1].end})`
        );
      }
      assert(allWords[allWords.length - 1].end > 11.0, 'Final chunk timestamps must include chunk offset (> 11s)');

      console.log(`✓ Long audio chunking (${longResult.chunk_count} chunks) & seam deduplication verified ("${joinedSentence}").`);
    }

    // =========================================================================
    // TEST 6: Render-Style Environment (Missing ffprobe, No-Audio Video, Production Diagnostics)
    // =========================================================================
    console.log('\n[Test 6] Verifying Render-style missing ffprobe fallback, NO_AUDIO_TRACK & secret-safe diagnostics...');
    {
      const ffmpeg = await FFmpegHelper.getFfmpegPath();

      // Create a 16:9 silent video WITHOUT an audio stream (-an)
      const silentVideo16x9 = path.join(tempWorkDir, 'silent_16x9.mp4');
      await execFileAsync(ffmpeg, [
        '-y',
        '-f', 'lavfi',
        '-i', 'color=c=navy:s=1280x720:d=1.5',
        '-an',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        silentVideo16x9
      ]);

      // Simulate Render's ffmpeg-static environment where `ffprobe` binary does NOT exist!
      process.env.FFPROBE_PATH = path.join(tempWorkDir, 'nonexistent_ffprobe_binary');
      FFmpegHelper.resetCache();

      // Override getFfprobePath temporarily so even local Windows fallback ffprobe is hidden
      const origGetFfprobe = FFmpegHelper.getFfprobePath;
      FFmpegHelper.getFfprobePath = async () => 'nonexistent_ffprobe_on_render';
      try {
        const probe = await FFmpegHelper.probeMedia(silentVideo16x9);
        assert.strictEqual(probe.hasVideo, true, 'ffmpeg -i fallback must detect video stream without ffprobe');
        assert.strictEqual(probe.hasAudio, false, 'ffmpeg -i fallback must detect absence of audio stream');
        assert.strictEqual(probe.width, 1280, 'ffmpeg -i fallback must parse exact 1280 width without ffprobe');
        assert.strictEqual(probe.height, 720, 'ffmpeg -i fallback must parse exact 720 height without ffprobe');
        assert(probe.durationSec > 1.0, 'ffmpeg -i fallback must parse duration without ffprobe');

        // POST /api/captions/transcribe-video on video without audio track -> 422 NO_AUDIO_TRACK
        const videoBytes = await fs.promises.readFile(silentVideo16x9);
        const form = new FormData();
        form.append('video', new Blob([new Uint8Array(videoBytes)], { type: 'video/mp4' }), 'silent_16x9.mp4');
        form.append('settings', JSON.stringify({ maxWords: 3 }));

        const resp = await originalFetch(`${baseUrl}/api/captions/transcribe-video`, {
          method: 'POST',
          body: form
        });
        const body: any = await resp.json();
        assert.strictEqual(resp.status, 422);
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.errorCode, 'NO_AUDIO_TRACK');
        assert(body.requestId, 'Must include X-Request-Id / requestId');
      } finally {
        FFmpegHelper.getFfprobePath = origGetFfprobe;
        delete process.env.FFPROBE_PATH;
        FFmpegHelper.resetCache();
      }

      // Verify diagnostic sanitizer scrubs keys & tokens completely
      process.env.GROQ_API_KEY = 'gsk_super_secret_live_key_abcdef12345';
      const scrubbed = sanitizeDiagnosticText(
        'Authorization: Bearer gsk_super_secret_live_key_abcdef12345 failed with sk-proj-9876543210abcdef and api_key=mysecretvalue12345'
      );
      assert(!scrubbed.includes('gsk_super_secret_live_key_abcdef12345'), 'Must scrub configured GROQ_API_KEY');
      assert(!scrubbed.includes('sk-proj-9876543210abcdef'), 'Must scrub sk- key');
      assert(!scrubbed.includes('mysecretvalue12345'), 'Must scrub api_key= value');

      const recentDiag = CaptionRequestDiagnostics.getRecentRecords();
      assert(recentDiag.length > 0, 'Diagnostic records must be captured for caption requests');
      const lastDiag = recentDiag[recentDiag.length - 1];
      assert.strictEqual(lastDiag.errorCode, 'NO_AUDIO_TRACK');
      assert.strictEqual(typeof lastDiag.elapsedMs, 'number');
      assert.strictEqual(lastDiag.ffmpegAvailable, true);

      console.log('✓ Render-style ffprobe-free media probing, NO_AUDIO_TRACK & secret-safe diagnostics verified.');
    }

    // =========================================================================
    // TEST 7: Real Short Spoken Media Fixture End-to-End Video Caption Pipeline
    //         (Independent POST /api/captions/transcribe-video AND POST /api/captions/render-video)
    // =========================================================================
    console.log('\n[Test 7] Testing real short spoken media fixture through full video caption HTTP pipeline...');
    {
      // Restore real fetch & real local/cloud environment for genuine fixture test
      global.fetch = originalFetch;
      restoreEnv(envBackup);
      SpeechRecognitionService.resetAvailabilityCache();
      FFmpegHelper.resetCache();

      const sampleSpeechMp3 = path.resolve('server/models/kokoro/cloned_test.mp3');
      assert(fs.existsSync(sampleSpeechMp3), `Real speech fixture must exist at ${sampleSpeechMp3}`);

      const ffmpeg = await FFmpegHelper.getFfmpegPath();
      const spokenVideoPath = path.join(tempWorkDir, 'real_spoken_fixture.mp4');

      // Mux real spoken narration audio into a real 640x360 H.264/AAC MP4 video
      await execFileAsync(ffmpeg, [
        '-y',
        '-f', 'lavfi',
        '-i', 'color=c=darkslategray:s=640x360:r=24',
        '-i', sampleSpeechMp3,
        '-shortest',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        spokenVideoPath
      ]);

      const spokenVideoBytes = await fs.promises.readFile(spokenVideoPath);

      // 7A: Check GET /api/captions/health readiness endpoint
      const healthRes = await originalFetch(`${baseUrl}/api/captions/health`);
      const healthJson: any = await healthRes.json();
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthJson.success, true);
      assert.strictEqual(healthJson.ffmpeg.available, true);
      assert.strictEqual(healthJson.ffmpeg.subtitlesFilter, true);

      // 7B: Independently test POST /api/captions/transcribe-video on real spoken video
      const transcribeForm = new FormData();
      transcribeForm.append(
        'video',
        new Blob([new Uint8Array(spokenVideoBytes)], { type: 'video/mp4' }),
        'real_spoken_fixture.mp4'
      );
      transcribeForm.append(
        'settings',
        JSON.stringify({ maxWords: 3, preset: 'bold_viral', wordHighlight: true })
      );

      const transRes = await originalFetch(`${baseUrl}/api/captions/transcribe-video`, {
        method: 'POST',
        body: transcribeForm
      });
      const transJson: any = await transRes.json();
      assert.strictEqual(transRes.status, 200, `Expected 200 from /transcribe-video, got ${transRes.status}: ${JSON.stringify(transJson)}`);
      assert.strictEqual(transJson.success, true);
      assert(Array.isArray(transJson.segments) && transJson.segments.length > 0, 'Real spoken video must produce caption segments');
      assert(transJson.srt && transJson.srt.includes('-->'), 'Must generate valid SRT');
      assert(transJson.ass && transJson.ass.includes('PlayResX: 640'), 'ASS must use actual probed 640x360 dimensions');
      assert(transJson.vtt && transJson.vtt.startsWith('WEBVTT'), 'Must generate valid WebVTT');

      console.log(
        `✓ POST /api/captions/transcribe-video succeeded on real media (provider=${transJson.provider}, segments=${transJson.segments.length}, text="${transJson.segments.map((s: any) => s.text).join(' ')}").`
      );

      // 7C: Independently test POST /api/captions/render-video (ASS burn-in via libass + MP4 streaming verification)
      const renderForm = new FormData();
      renderForm.append(
        'video',
        new Blob([new Uint8Array(spokenVideoBytes)], { type: 'video/mp4' }),
        'real_spoken_fixture.mp4'
      );
      renderForm.append(
        'settings',
        JSON.stringify({
          preset: 'bold_viral',
          maxWords: 3,
          wordHighlight: true,
          uppercase: true
        })
      );
      renderForm.append('segments', JSON.stringify(transJson.segments));

      const renderRes = await originalFetch(`${baseUrl}/api/captions/render-video`, {
        method: 'POST',
        body: renderForm
      });
      const renderJson: any = await renderRes.json();
      assert.strictEqual(renderRes.status, 200, `Expected 200 from /render-video, got ${renderRes.status}: ${JSON.stringify(renderJson)}`);
      assert.strictEqual(renderJson.success, true);
      assert(renderJson.videoUrl && renderJson.filename.startsWith('captioned_'), 'Must return exported MP4 videoUrl');

      // Fetch the exported MP4 via HTTP range request to confirm it was written and is streamable
      const streamRes = await originalFetch(`${baseUrl}${renderJson.videoUrl}`, {
        headers: { Range: 'bytes=0-1023' }
      });
      assert.strictEqual(streamRes.status, 206, 'Exported captioned MP4 must support HTTP 206 byte-range streaming');
      const streamedChunk = Buffer.from(await streamRes.arrayBuffer());
      assert(streamedChunk.length > 0, 'Exported MP4 stream must return non-empty bytes');

      // Clean up test-exported MP4 from storageDir
      const exportedDiskPath = path.resolve(process.cwd(), 'temp_storage', renderJson.filename);
      if (fs.existsSync(exportedDiskPath)) {
        const exportedProbe = await FFmpegHelper.probeMedia(exportedDiskPath);
        assert.strictEqual(exportedProbe.hasVideo, true, 'Rendered MP4 must contain valid H.264 video stream');
        assert.strictEqual(exportedProbe.hasAudio, true, 'Rendered MP4 must preserve AAC audio stream');
        await fs.promises.unlink(exportedDiskPath).catch(() => {});
      }

      console.log(`✓ POST /api/captions/render-video ASS burn-in & MP4 export verified (${renderJson.filename}).`);
    }

    // =========================================================================
    // TEST 8: Frontend Caption Studio Error Classification (All 10 Categories + HTML Proxy Pages)
    // =========================================================================
    console.log('\n[Test 8] Verifying Caption Studio frontend error classification across all 10 categories...');
    {
      const requiredCodes = [
        'UPLOAD_ERROR',
        'NO_AUDIO_TRACK',
        'NO_SPEECH_DETECTED',
        'PROVIDER_UNAVAILABLE',
        'INVALID_API_KEY',
        'RATE_LIMITED',
        'AUDIO_TOO_LARGE',
        'SERVER_TIMEOUT',
        'FFMPEG_ERROR',
        'SUBTITLE_RENDER_ERROR'
      ] as const;

      const seenTitles = new Set<string>();
      for (const code of requiredCodes) {
        const uiState = parseCaptionApiError(
          500,
          JSON.stringify({ success: false, errorCode: code, error: `Test ${code}`, requestId: 'req-12345678' }),
          'transcribe'
        );
        assert.strictEqual(uiState.code, code);
        assert(uiState.title.length > 0 && uiState.hint.length > 0);
        seenTitles.add(uiState.title);
      }
      assert.strictEqual(seenTitles.size, requiredCodes.length, 'Every error category must have a distinct UI title');

      // Verify Render reverse-proxy non-JSON HTML 504 Gateway Timeout & 413 Entity Too Large handling
      const proxy504 = parseCaptionApiError(504, '<html><body>504 Gateway Time-out</body></html>', 'transcribe');
      assert.strictEqual(proxy504.code, 'SERVER_TIMEOUT');

      const proxy413 = parseCaptionApiError(413, '<html><body>413 Request Entity Too Large</body></html>', 'transcribe');
      assert.strictEqual(proxy413.code, 'AUDIO_TOO_LARGE');

      const netDrop = parseCaptionNetworkError(new TypeError('Failed to fetch'), 'transcribe');
      assert.strictEqual(netDrop.code, 'UPLOAD_ERROR');

      const missingCreds = resolveCaptionErrorPresentation('MISSING_CREDENTIALS');
      assert.strictEqual(missingCreds.code, 'MISSING_CREDENTIALS');
      assert.strictEqual(missingCreds.canPasteScript, true);

      console.log('✓ All 10 frontend error states + HTML gateway error resilience verified.');
    }

    console.log('\n===================================================================');
    console.log(' ✅ ALL CAPTION STUDIO RENDER PRODUCTION TESTS PASSED!');
    console.log('===================================================================');
  } finally {
    global.fetch = originalFetch;
    restoreEnv(envBackup);
    SpeechRecognitionService.resetAvailabilityCache();
    FFmpegHelper.resetCache();
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await fs.promises.rm(tempWorkDir, { recursive: true, force: true }).catch(() => {});
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ CAPTION STUDIO RENDER PRODUCTION TEST FAILED:', err);
    process.exit(1);
  });
