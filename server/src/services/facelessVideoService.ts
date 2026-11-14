import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import util from 'util';
import https from 'https';
import http from 'http';
import {
  EditorProject,
  TimelineClip,
  TimelineTrack,
  MediaAsset,
  FacelessVisualStyle,
  FacelessScriptRequest,
  FacelessAudioRequest,
  FacelessGenerationResult,
  AspectRatio,
  Keyframe
} from '../../../shared/src/videoEditorTypes';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_SPEED,
  DEFAULT_COLOR_GRADING,
  DEFAULT_AUDIO_SETTINGS
} from '../../../shared/src/videoEditorDefaults';
import { VideoEditorService } from './videoEditorService';
import { OpenSourceTtsService } from './openSourceTtsService';
import { SpeechRecognitionService } from './speechRecognitionService';
import { logger } from '../utils/logger';

const execFileAsync = util.promisify(execFile);

export class FacelessVideoService {
  private static assetsDir = path.join(process.cwd(), 'uploads', 'editor_assets');

  public static initStorage(): void {
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  /**
   * Splits a script into clean, readable sentence chunks for visual scene matching
   */
  public static breakScriptIntoSentences(script: string): string[] {
    if (!script) return [];
    const clean = script.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
    // Split on punctuation (. ! ? \n) followed by whitespace or end
    const rawParts = clean.split(/(?<=[.!?\n])\s+/);
    const sentences: string[] = [];

    for (let i = 0; i < rawParts.length; i++) {
      const p = rawParts[i].trim();
      if (!p) continue;
      // If previous sentence was very short, merge with current
      if (sentences.length > 0 && sentences[sentences.length - 1].length < 20) {
        sentences[sentences.length - 1] += ' ' + p;
      } else {
        sentences.push(p);
      }
    }

    // Safety fallback: if no punctuation, split every ~12 words
    if (sentences.length <= 1 && clean.split(/\s+/).length > 20) {
      const words = clean.split(/\s+/);
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += 12) {
        chunks.push(words.slice(i, i + 12).join(' '));
      }
      return chunks;
    }

    return sentences.length > 0 ? sentences : [clean];
  }

  /**
   * Generates a descriptive AI prompt tailored to the visual style
   */
  public static buildVisualPrompt(sentence: string, style: FacelessVisualStyle): string {
    // Strip common filler words and keep visual nouns & actions
    const cleaned = sentence
      .replace(/^(and|so|then|therefore|however|moreover|in fact|basically|literally)[,\s]+/i, '')
      .replace(/[":*#_]/g, '')
      .trim();

    const styleModifiers: Record<FacelessVisualStyle, string> = {
      cinematic: 'cinematic 35mm photograph, 8k resolution, photorealistic, Arri Alexa, volumetric lighting, award winning cinematography',
      dark_mystery: 'dark atmospheric cinematic lighting, moody noir thriller, deep shadows, foggy haze, true crime documentary aesthetic, 4k',
      cyberpunk: 'futuristic cyberpunk city, glowing cyan and neon magenta lights, holographic tech, rainy reflective street, sci-fi concept art',
      anime: 'Makoto Shinkai style, breathtaking vibrant sky, emotional anime aesthetic, detailed illustration, 4k masterpiece',
      pixar_3d: 'cute stylized 3D render, Disney Pixar animation style, warm soft studio lighting, Octane 3D render, smooth textures',
      vintage: '1920s vintage photograph, sepia tones, Kodak Portra film grain, historical archival documentary photography',
      stock_video: 'high quality 4K stock video b-roll footage, smooth camera motion, clean modern aesthetic'
    };

    const modifier = styleModifiers[style] || styleModifiers.cinematic;
    return `${cleaned}, ${modifier}`;
  }

  /**
   * Generates or fetches a visual asset (AI Image or Stock Video) for a scene
   */
  public static async generateVisualAsset(
    prompt: string,
    style: FacelessVisualStyle,
    aspectRatio: AspectRatio,
    sceneIndex: number
  ): Promise<{ localPath: string; mediaType: 'image' | 'video'; name: string }> {
    this.initStorage();
    const filename = `faceless_scene_${Date.now()}_${sceneIndex + 1}.jpg`;
    const outputPath = path.join(this.assetsDir, filename);

    let width = 1280;
    let height = 720;
    if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    }

    // 1. Try Pexels API if stock_video style and API key is configured
    if (style === 'stock_video' && process.env.PEXELS_API_KEY) {
      try {
        const query = encodeURIComponent(prompt.split(',')[0].slice(0, 50));
        const orientation = aspectRatio === '9:16' ? 'portrait' : 'landscape';
        const res = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=3&orientation=${orientation}`, {
          headers: { Authorization: process.env.PEXELS_API_KEY }
        });
        if (res.ok) {
          const data: any = await res.json();
          const videoFile = data.videos?.[0]?.video_files?.find((f: any) => f.quality === 'hd' || f.width >= 720);
          if (videoFile?.link) {
            const vidFilename = `faceless_stock_${Date.now()}_${sceneIndex + 1}.mp4`;
            const vidPath = path.join(this.assetsDir, vidFilename);
            const vidRes = await fetch(videoFile.link);
            if (vidRes.ok) {
              const buffer = Buffer.from(await vidRes.arrayBuffer());
              await fs.promises.writeFile(vidPath, buffer);
              if (fs.existsSync(vidPath) && fs.statSync(vidPath).size > 10000) {
                return { localPath: vidPath, mediaType: 'video', name: `Scene ${sceneIndex + 1} (Stock B-Roll)` };
              }
            }
          }
        }
      } catch (err: any) {
        logger.warn(`Pexels API video fetch failed, falling back to AI: ${err?.message}`);
      }
    }

    // 2. Try Pollinations AI with short timeout
    try {
      const cleanPrompt = encodeURIComponent(prompt.slice(0, 180));
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const res = await fetch(pollinationsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VoiceForgeStudio/1.0'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('image')) {
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > 5000) {
            await fs.promises.writeFile(outputPath, buffer);
            if (fs.existsSync(outputPath)) {
              return { localPath: outputPath, mediaType: 'image', name: `Scene ${sceneIndex + 1} (${style})` };
            }
          }
        }
      }
    } catch {}

    // 3. Fallback: High-quality Procedural AI Scene Synthesis via Python/PIL
    try {
      const candidates = [
        path.join(__dirname, '../scripts/synthesize_scene_image.py'),
        path.join(__dirname, '../../src/scripts/synthesize_scene_image.py'),
        path.join(process.cwd(), 'server', 'src', 'scripts', 'synthesize_scene_image.py'),
        path.join(process.cwd(), 'src', 'scripts', 'synthesize_scene_image.py')
      ];
      const scriptPath = candidates.find((c) => fs.existsSync(c));
      if (scriptPath) {
        const pythonCmd = process.env.PYTHON_PATH || 'python';
        await execFileAsync(pythonCmd, [scriptPath, prompt, outputPath, aspectRatio, style], {
          timeout: 10000
        });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          return { localPath: outputPath, mediaType: 'image', name: `Scene ${sceneIndex + 1} (${style})` };
        }
      }
    } catch (err: any) {
      logger.warn(`Python procedural visual fallback failed: ${err?.message}`);
    }

    // 4. Absolute Fallback: Generate via FFmpeg lavfi solid canvas
    try {
      const ffmpeg = await VideoEditorService.getAssetsDir(); // trigger init
      const ffmpegBin = await (require('../utils/ffmpegHelper').FFmpegHelper.getFfmpegPath());
      const color = style === 'cyberpunk' ? '0x0d1527' : style === 'dark_mystery' ? '0x090a0f' : style === 'vintage' ? '0x2a221b' : '0x121a24';
      await execFileAsync(ffmpegBin, [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=${color}:s=${width}x${height}:d=1`,
        '-vframes', '1',
        outputPath
      ]);
    } catch {}

    return { localPath: outputPath, mediaType: 'image', name: `Scene ${sceneIndex + 1}` };
  }

  /**
   * Generates a complete faceless video project from raw text script
   */
  public static async generateFromScript(req: FacelessScriptRequest): Promise<FacelessGenerationResult> {
    this.initStorage();
    const script = req.script?.trim();
    if (!script) {
      throw new Error('Script text is required to generate a faceless video.');
    }

    const style = req.style || 'cinematic';
    const aspectRatio = req.aspectRatio || '9:16';
    const voiceId = req.voiceId || 'en-US-ChristopherNeural';
    const projectName = req.projectName || `Faceless ${style.toUpperCase()} - ${new Date().toLocaleDateString()}`;

    logger.info(`Starting Faceless Video generation from script (${script.length} chars, style: ${style}, ratio: ${aspectRatio})`);

    // 1. Synthesize Voiceover Audio
    let audioBuffer: Buffer;
    let audioDuration: number;

    try {
      const ttsResult = await OpenSourceTtsService.generateTTS({
        text: script,
        voiceId,
        format: 'mp3'
      });
      audioBuffer = ttsResult.audioBuffer;
      audioDuration = ttsResult.duration;
    } catch (ttsErr: any) {
      logger.warn(`TTS synthesis with ${voiceId} failed (${ttsErr.message}), falling back to Kokoro or offline tone.`);
      try {
        const kokoroRes = await OpenSourceTtsService.generateTTS({
          text: script,
          voiceId: 'kokoro_af_heart',
          format: 'mp3'
        });
        audioBuffer = kokoroRes.audioBuffer;
        audioDuration = kokoroRes.duration;
      } catch {
        const wordCount = script.split(/\s+/).length;
        const estDuration = Math.max(3, parseFloat((wordCount * 0.4).toFixed(1)));
        const ffmpegBin = await (require('../utils/ffmpegHelper').FFmpegHelper.getFfmpegPath());
        const fallbackAudioPath = path.join(this.assetsDir, `fallback_audio_${Date.now()}.mp3`);
        await execFileAsync(ffmpegBin, [
          '-y',
          '-f', 'lavfi', '-i', `sine=frequency=320:duration=${estDuration}`,
          '-c:a', 'libmp3lame',
          fallbackAudioPath
        ]);
        audioBuffer = await fs.promises.readFile(fallbackAudioPath);
        audioDuration = estDuration;
        try { fs.unlinkSync(fallbackAudioPath); } catch {}
      }
    }

    const voiceoverFilename = `voiceover_faceless_${Date.now()}.mp3`;
    const voiceoverPath = path.join(this.assetsDir, voiceoverFilename);
    await fs.promises.writeFile(voiceoverPath, audioBuffer);

    const voiceoverAsset = await VideoEditorService.probeMedia(voiceoverPath, voiceoverFilename);
    const totalDuration = Math.max(2, voiceoverAsset.duration || audioDuration || 10);

    // 2. Break script into sentences
    const sentences = this.breakScriptIntoSentences(script);
    const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);

    // 3. Compute timestamps for each sentence proportionally based on word count
    let currentStart = 0;
    const scenePrompts = sentences.map((sentence, idx) => {
      const words = Math.max(1, sentence.split(/\s+/).length);
      const share = words / Math.max(1, totalWords);
      const duration = Math.max(1.8, parseFloat((share * totalDuration).toFixed(2)));
      const start = parseFloat(currentStart.toFixed(2));
      currentStart += duration;

      const visualPrompt = (req.customPrompts && req.customPrompts[idx])
        ? req.customPrompts[idx]
        : this.buildVisualPrompt(sentence, style);

      return {
        index: idx,
        sentence,
        start,
        duration,
        visualPrompt,
        style
      };
    });

    // Normalize last scene duration to match exact voiceover duration
    if (scenePrompts.length > 0) {
      const last = scenePrompts[scenePrompts.length - 1];
      last.duration = Math.max(1.5, totalDuration - last.start);
    }

    // 4. Generate/Fetch Visual Assets concurrently
    const generatedClips: TimelineClip[] = [];
    const projectAssets: MediaAsset[] = [voiceoverAsset];

    for (let i = 0; i < scenePrompts.length; i++) {
      const sp = scenePrompts[i];
      const visual = await this.generateVisualAsset(sp.visualPrompt, style, aspectRatio, i);
      const asset = await VideoEditorService.probeMedia(visual.localPath, path.basename(visual.localPath));
      projectAssets.push(asset);

      // Alternating Ken Burns pan & zoom keyframes for cinematic motion
      const keyframes: Keyframe[] = [];
      const isEven = i % 2 === 0;

      if (visual.mediaType === 'image') {
        if (isEven) {
          // Slow zoom in
          keyframes.push(
            { id: `kf-${i}-1`, time: 0, property: 'scale', value: 1.0, easing: 'linear' },
            { id: `kf-${i}-2`, time: sp.duration, property: 'scale', value: 1.14, easing: 'linear' }
          );
        } else {
          // Slow zoom out with subtle pan
          keyframes.push(
            { id: `kf-${i}-1`, time: 0, property: 'scale', value: 1.14, easing: 'linear' },
            { id: `kf-${i}-2`, time: sp.duration, property: 'scale', value: 1.0, easing: 'linear' },
            { id: `kf-${i}-3`, time: 0, property: 'positionX', value: -1.5, easing: 'linear' },
            { id: `kf-${i}-4`, time: sp.duration, property: 'positionX', value: 1.5, easing: 'linear' }
          );
        }
      }

      generatedClips.push({
        id: `clip_scene_${Date.now()}_${i}`,
        trackId: 'track-v1',
        assetId: asset.id,
        name: visual.name,
        type: visual.mediaType,
        start: sp.start,
        duration: sp.duration,
        sourceStart: 0,
        sourceDuration: sp.duration,
        url: asset.url,
        transform: { ...DEFAULT_TRANSFORM, fitMode: 'fill' },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        transitionIn: i > 0 ? { type: 'fade', duration: 0.35 } : undefined,
        effects: [],
        keyframes
      });
    }

    // 5. Build Subtitle / Caption Clips on Track text
    const captionClips: TimelineClip[] = scenePrompts.map((sp, i) => {
      return {
        id: `clip_cap_${Date.now()}_${i}`,
        trackId: 'track-text',
        name: `Caption: ${sp.sentence.slice(0, 18)}...`,
        type: 'caption',
        start: sp.start,
        duration: sp.duration,
        sourceStart: 0,
        sourceDuration: sp.duration,
        text: sp.sentence,
        captionPresetId: req.captionPreset || 'hormozi_bold',
        transform: { ...DEFAULT_TRANSFORM, y: aspectRatio === '9:16' ? 240 : 180 },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        effects: [],
        keyframes: []
      };
    });

    // 6. Voiceover Audio Clip on Track A1
    const voiceoverClip: TimelineClip = {
      id: `clip_vo_${Date.now()}`,
      trackId: 'track-a1',
      assetId: voiceoverAsset.id,
      name: `Voiceover (${voiceId})`,
      type: 'audio',
      start: 0,
      duration: totalDuration,
      sourceStart: 0,
      sourceDuration: totalDuration,
      url: voiceoverAsset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS, volume: 100 },
      effects: [],
      keyframes: []
    };

    // 7. Assemble Full EditorProject
    const projectTracks: TimelineTrack[] = [
      { id: 'track-text', name: 'Kinetic Captions', type: 'text', muted: false, locked: false, hidden: false, order: 0 },
      { id: 'track-v1', name: 'Main Visual Scenes', type: 'video', muted: false, locked: false, hidden: false, order: 1 },
      { id: 'track-a1', name: 'Voiceover Audio', type: 'audio', muted: false, locked: false, hidden: false, order: 2 }
    ];

    const project: EditorProject = {
      id: `proj_${Date.now()}_${randomUUID().slice(0, 8)}`,
      name: projectName,
      aspectRatio,
      fps: 30,
      duration: totalDuration,
      tracks: projectTracks,
      clips: [...generatedClips, voiceoverClip, ...captionClips],
      assets: projectAssets,
      background: { color: '#000000', type: 'color' },
      previewQuality: '720p',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await VideoEditorService.saveProject(project);

    return {
      success: true,
      project: saved,
      scenesCount: generatedClips.length,
      totalDuration,
      voiceoverUrl: voiceoverAsset.url
    };
  }

  /**
   * Generates a faceless video project from an existing uploaded voiceover and transcript
   */
  public static async generateFromAudio(req: FacelessAudioRequest): Promise<FacelessGenerationResult> {
    this.initStorage();
    const audioTarget = req.audioUrl || req.audioAssetId;
    if (!audioTarget) {
      throw new Error('Audio URL, asset ID, or uploaded file is required.');
    }

    const style = req.style || 'cinematic';
    const aspectRatio = req.aspectRatio || '9:16';
    const projectName = req.projectName || `Faceless Audio - ${new Date().toLocaleDateString()}`;

    const resolvedAudio = await VideoEditorService.resolveLocalMediaFile(audioTarget);
    if (!resolvedAudio || !fs.existsSync(resolvedAudio)) {
      throw new Error('Failed to resolve uploaded audio file on server.');
    }

    const voiceoverAsset = await VideoEditorService.probeMedia(resolvedAudio, path.basename(resolvedAudio));
    const totalDuration = Math.max(2, voiceoverAsset.duration || 10);

    let sentencesWithTiming: Array<{ sentence: string; start: number; duration: number }> = [];

    // Case 1: If transcript text is provided, split and calculate timing
    const rawTranscript = req.transcriptText || req.transcript;
    if (rawTranscript && rawTranscript.trim().length > 0) {
      const sentences = this.breakScriptIntoSentences(rawTranscript);
      const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
      let cur = 0;
      sentencesWithTiming = sentences.map((sentence) => {
        const words = Math.max(1, sentence.split(/\s+/).length);
        const dur = Math.max(1.8, parseFloat(((words / Math.max(1, totalWords)) * totalDuration).toFixed(2)));
        const st = parseFloat(cur.toFixed(2));
        cur += dur;
        return { sentence, start: st, duration: dur };
      });
    } else {
      // Case 2: Auto-transcribe audio using Whisper
      try {
        const audioBuffer = await fs.promises.readFile(resolvedAudio);
        const asr = await SpeechRecognitionService.transcribeAudio(audioBuffer, path.basename(resolvedAudio), undefined, {
          timeoutMs: 40000
        });

        if (asr.segments && asr.segments.length > 0) {
          sentencesWithTiming = asr.segments.map((seg) => ({
            sentence: seg.text.trim(),
            start: Math.max(0, seg.start),
            duration: Math.max(1.5, seg.end - seg.start)
          }));
        } else if (asr.text) {
          const sentences = this.breakScriptIntoSentences(asr.text);
          const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
          let cur = 0;
          sentencesWithTiming = sentences.map((sentence) => {
            const words = Math.max(1, sentence.split(/\s+/).length);
            const dur = Math.max(1.8, parseFloat(((words / Math.max(1, totalWords)) * totalDuration).toFixed(2)));
            const st = parseFloat(cur.toFixed(2));
            cur += dur;
            return { sentence, start: st, duration: dur };
          });
        }
      } catch (err: any) {
        logger.warn(`Auto-transcription fallback to fixed intervals: ${err?.message}`);
      }
    }

    // Safety fallback: if no sentences, create 5-second interval scenes
    if (sentencesWithTiming.length === 0) {
      const sceneDur = 4.5;
      const count = Math.max(1, Math.ceil(totalDuration / sceneDur));
      for (let i = 0; i < count; i++) {
        const start = i * sceneDur;
        const duration = Math.min(sceneDur, totalDuration - start);
        sentencesWithTiming.push({
          sentence: `Cinematic scene ${i + 1}`,
          start,
          duration: Math.max(1.5, duration)
        });
      }
    }

    // Generate visuals for each sentence
    const generatedClips: TimelineClip[] = [];
    const projectAssets: MediaAsset[] = [voiceoverAsset];

    for (let i = 0; i < sentencesWithTiming.length; i++) {
      const s = sentencesWithTiming[i];
      const visualPrompt = (req.customPrompts && req.customPrompts[i])
        ? req.customPrompts[i]
        : this.buildVisualPrompt(s.sentence, style);

      const visual = await this.generateVisualAsset(visualPrompt, style, aspectRatio, i);
      const asset = await VideoEditorService.probeMedia(visual.localPath, path.basename(visual.localPath));
      projectAssets.push(asset);

      const keyframes: Keyframe[] = [];
      if (visual.mediaType === 'image') {
        const isEven = i % 2 === 0;
        keyframes.push(
          { id: `kf-${i}-1`, time: 0, property: 'scale', value: isEven ? 1.0 : 1.14, easing: 'linear' },
          { id: `kf-${i}-2`, time: s.duration, property: 'scale', value: isEven ? 1.14 : 1.0, easing: 'linear' }
        );
      }

      generatedClips.push({
        id: `clip_scene_${Date.now()}_${i}`,
        trackId: 'track-v1',
        assetId: asset.id,
        name: visual.name,
        type: visual.mediaType,
        start: s.start,
        duration: s.duration,
        sourceStart: 0,
        sourceDuration: s.duration,
        url: asset.url,
        transform: { ...DEFAULT_TRANSFORM, fitMode: 'fill' },
        speed: { ...DEFAULT_SPEED },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        audio: { ...DEFAULT_AUDIO_SETTINGS },
        transitionIn: i > 0 ? { type: 'fade', duration: 0.35 } : undefined,
        effects: [],
        keyframes
      });
    }

    const captionClips: TimelineClip[] = sentencesWithTiming.map((s, i) => ({
      id: `clip_cap_${Date.now()}_${i}`,
      trackId: 'track-text',
      name: `Caption: ${s.sentence.slice(0, 18)}...`,
      type: 'caption',
      start: s.start,
      duration: s.duration,
      sourceStart: 0,
      sourceDuration: s.duration,
      text: s.sentence,
      captionPresetId: req.captionPreset || 'hormozi_bold',
      transform: { ...DEFAULT_TRANSFORM, y: aspectRatio === '9:16' ? 240 : 180 },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      effects: [],
      keyframes: []
    }));

    const voiceoverClip: TimelineClip = {
      id: `clip_vo_${Date.now()}`,
      trackId: 'track-a1',
      assetId: voiceoverAsset.id,
      name: voiceoverAsset.name || 'Uploaded Voiceover',
      type: 'audio',
      start: 0,
      duration: totalDuration,
      sourceStart: 0,
      sourceDuration: totalDuration,
      url: voiceoverAsset.url,
      transform: { ...DEFAULT_TRANSFORM },
      speed: { ...DEFAULT_SPEED },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audio: { ...DEFAULT_AUDIO_SETTINGS, volume: 100 },
      effects: [],
      keyframes: []
    };

    const projectTracks: TimelineTrack[] = [
      { id: 'track-text', name: 'Kinetic Captions', type: 'text', muted: false, locked: false, hidden: false, order: 0 },
      { id: 'track-v1', name: 'Main Visual Scenes', type: 'video', muted: false, locked: false, hidden: false, order: 1 },
      { id: 'track-a1', name: 'Voiceover Audio', type: 'audio', muted: false, locked: false, hidden: false, order: 2 }
    ];

    const project: EditorProject = {
      id: `proj_${Date.now()}_${randomUUID().slice(0, 8)}`,
      name: projectName,
      aspectRatio,
      fps: 30,
      duration: totalDuration,
      tracks: projectTracks,
      clips: [...generatedClips, voiceoverClip, ...captionClips],
      assets: projectAssets,
      background: { color: '#000000', type: 'color' },
      previewQuality: '720p',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await VideoEditorService.saveProject(project);

    return {
      success: true,
      project: saved,
      scenesCount: generatedClips.length,
      totalDuration,
      voiceoverUrl: voiceoverAsset.url
    };
  }
}
